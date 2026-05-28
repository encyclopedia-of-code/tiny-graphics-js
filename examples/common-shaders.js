import * as tiny from '../tiny-graphics.js';
import { MatVec, matvec, Shape, Shader, Component } from '../tiny-graphics.js';

export class PBR_Shader extends Shader {
    constructor (num_lights = 2, num_materials = 0, options) {
      super();
      const defaults = { has_instancing: true, has_textures: true };
      Object.assign (this, defaults, options, {num_lights, num_materials});
    }
    update_GPU (renderer, renderListItem) {
      const gpu_addresses = renderer.uniform_addresses.get(this);
      const state = renderListItem.render_state;

      if( !renderer.gpu_versions.get(this) ) renderer.gpu_versions.set(this, {} );
      const cache = renderer.gpu_versions.get(this);

      if( cache?.previous_animation_time != state.animation_time ) {
        cache.previous_animation_time = state.animation_time;
        renderer.context.uniform1f (gpu_addresses.animation_time, state.animation_time / 1000);
      }
      if( ! cache?.previous_group_matrix?.equals(renderListItem.group_transform) ) {
        if( !cache.previous_group_matrix ) cache.previous_group_matrix = renderListItem.group_transform.clone();
        else cache.previous_group_matrix.loadVector( renderListItem.group_transform.data );
        renderer.context.uniformMatrix4fv (gpu_addresses.group_transform, true, renderListItem.group_transform.data );
      }
    }
    shared_glsl_code () {           // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return "#version 300 es " + `
                precision mediump float;
                precision mediump sampler2DArray;
    `;
    }
    vertex_glsl_code () {          // ********* VERTEX SHADER *********
        return this.shared_glsl_code () + `
      layout(location = 0) in vec3 position; // Position is expressed in object coordinates
      layout(location = 1) in vec3 normal;
      layout(location = 2) in vec3 tangent;
      layout(location = 3) in vec2 texture_coord;
      ${this.has_instancing ? `
              layout(location = 4) in mat4 model_transform;
              layout(location = 8) in vec3 color;
              layout(location = 9) in float material_index;`
              : ``}

      uniform float animation_time;
      uniform mat4 group_transform;

      uniform Camera
      {
        mat4 camera_inverse;
        mat4 projection;
        vec4 camera_position;
      };

      out vec3 VERTEX_POS;
      out vec3 VERTEX_NORMAL;
      out vec3 VERTEX_TANGENT;
      out vec3 VERTEX_BITANGENT;
      out vec2 VERTEX_TEXCOORD;
      out vec3 INSTANCE_COLOR;
      out float INSTANCE_MATERIAL_INDEX;

      void main() {
        ${this.has_instancing ? `
                mat4 world_space = group_transform * model_transform;`
                :
                `mat4 world_space = group_transform;`}

        vec4 world_position = world_space * vec4( position, 1.0 );
        gl_Position = projection * camera_inverse * world_position;
        VERTEX_POS = vec3(world_position);

        // *** Optimization ("Eric's Blog") for normal transform in place of inverse(): ***
        vec3 squared_scale = vec3(
          dot(mat3(world_space)[0], mat3(world_space)[0]),
          dot(mat3(world_space)[1], mat3(world_space)[1]),
          dot(mat3(world_space)[2], mat3(world_space)[2])
        );
        vec3 inv_squared_scale = 1.0 / squared_scale;
        mat3 rotation = mat3(
          normalize(mat3(world_space)[0]),
          normalize(mat3(world_space)[1]),
          normalize(mat3(world_space)[2])
        );
        vec3 scaled_normal = normal * inv_squared_scale;
        VERTEX_NORMAL = rotation * scaled_normal;
        // *** Slow method: Use inverse() and transpose as normals require: ***
        //VERTEX_NORMAL = mat3(inverse(transpose(world_space))) * normal;

        VERTEX_TANGENT = mat3(world_space) * tangent;
        VERTEX_BITANGENT = cross( VERTEX_NORMAL, VERTEX_TANGENT);
        VERTEX_TEXCOORD = texture_coord * vec2(1,-1) + vec2(0,1);
        INSTANCE_COLOR = clamp( color, 0., 1.);
        INSTANCE_MATERIAL_INDEX = material_index;
      }`;
    }
    fragment_glsl_code () {         // ********* FRAGMENT SHADER *********
      // Good PBR reference: https://github.com/emeiri/ogldev/blob/master/Common/Shaders/lighting_new.fs
        return this.shared_glsl_code () + `
      uniform Camera {
        mat4 camera_inverse;
        mat4 projection;
        vec4 camera_position;
      };

      struct Light {
        vec4 direction_or_position;
        vec4 color;
        float diffuse;
        float specular;
        float attenuation_factor;
        bool casts_shadow;
      };
      const int N_LIGHTS = ${this.num_lights};

      uniform LightArray {
        float ambient;
        Light lights[N_LIGHTS];
      };

      struct Material {
        float starting_texture_layer;
        float is_textured;
        float fallback_roughness;
        float fallback_metallicity;
        float textured_albedo_amount;
        float textured_roughness_amount;
        float textured_metallicity_amount;
        float textured_ao_amount;
        float textured_normal_amount;
        float textured_height_amount;
        float collapse_textures;
      };
      const int N_MATERIALS = ${this.num_materials};
      uniform Materials {
        Material materials[N_MATERIALS];
      };

      ${this.has_textures ? `
              uniform sampler2DArray texture_array;`
              : ``}

      in vec3 VERTEX_POS;
      in vec3 VERTEX_NORMAL;
      in vec3 VERTEX_TANGENT;
      in vec3 VERTEX_BITANGENT;
      in vec2 VERTEX_TEXCOORD;
      in vec3 INSTANCE_COLOR;
      in float INSTANCE_MATERIAL_INDEX;

      out vec4 frag_color;

      const float PI = 3.1415926535;

      vec3 PBRLight(
          vec3 n, vec3 v, vec3 l,
          vec3 albedo,
          float metallicity,
          float roughness,
          vec3 F0,
          vec3 intensity
      ) {
          vec3 h = normalize(v + l);
          float nDotL = max(dot(n, l), 0.0);
          float nDotV = max(dot(n, v), 0.0);
          float nDotH = max(dot(n, h), 0.0);
          float vDotH = max(dot(v, h), 0.0);

          float alpha = roughness * roughness;
          float alpha2 = alpha * alpha;
          float denom = (nDotH * nDotH) * (alpha2 - 1.0) + 1.0;
          float D = alpha2 / (PI * denom * denom);

          float k = roughness + 1.0;
          k = k * k / 8.0;
          float G_V = nDotV / (nDotV * (1.0 - k) + k);
          float G_L = nDotL / (nDotL * (1.0 - k) + k);
          float G = G_V * G_L;

          vec3 F = F0 + (1.0 - F0) * pow(clamp(1.0 - vDotH, 0.0, 1.0), 5.0);

          vec3 kS = F;
          vec3 kD = (1.0 - kS) * (1.0 - metallicity);

          vec3 specular = (D * F * G) / max(4.0 * nDotV * nDotL, 0.001);
          vec3 diffuse = kD * albedo / PI;

          return (diffuse + specular) * intensity * nDotL;
      }

      void main() {
          vec3 n = normalize(VERTEX_NORMAL);
          mat3 TBN = mat3(normalize(VERTEX_TANGENT), normalize(VERTEX_BITANGENT), n);
          vec3 v = normalize(camera_position.xyz - VERTEX_POS);
          vec2 uv = VERTEX_TEXCOORD;

          Material mat = materials[int(INSTANCE_MATERIAL_INDEX + .5)];
          float c = 1. - mat.collapse_textures;
          if( mat.textured_height_amount > 0. && mat.is_textured > 0. ) {
            float height = texture(texture_array, vec3(VERTEX_TEXCOORD, mat.starting_texture_layer+5.*c)).r;
            vec3 v_tangent = normalize( transpose(TBN) * v );
            float parallaxScale = 0.07; // Tweak for depth strength
            float parallaxBias = parallaxScale * -0.5;
            float height_offset = height * parallaxScale + parallaxBias;
            uv += v_tangent.xy * height_offset;
          }

          vec3 albedo = INSTANCE_COLOR;
          float alpha = 1.;
          if( mat.textured_albedo_amount > 0. && mat.is_textured > 0. ) {
            vec4 albedo_texture = texture( texture_array, vec3(uv, mat.starting_texture_layer) );
            alpha = albedo_texture.a;
            vec3 texture_color = pow( albedo_texture.rgb, vec3(2.2) );    //2.2
            albedo = mix(albedo, albedo * texture_color, mat.textured_albedo_amount);
          }
          float metallicity = mat.fallback_metallicity;
          if( mat.textured_metallicity_amount > 0. && mat.is_textured > 0. ) {
            float metallic_tex = texture(texture_array, vec3(uv, mat.starting_texture_layer+2.*c)).r;
            metallicity = mix(metallicity, metallic_tex, mat.textured_metallicity_amount);
          }
          float roughness = mat.fallback_roughness;
          if( mat.textured_roughness_amount > 0. && mat.is_textured > 0. ) {
            float roughness_tex = texture(texture_array, vec3(uv, mat.starting_texture_layer+1.*c)).r;
            roughness = mix(roughness, roughness_tex, mat.textured_roughness_amount);
          }
          vec3 F0 = mix(vec3(0.04), albedo, metallicity);  // (Base reflectance)
          float ao = 1.;
          if( mat.textured_ao_amount > 0. && mat.is_textured > 0. ) {
            float ao_tex = texture(texture_array, vec3(uv, mat.starting_texture_layer+3.*c)).r;
            ao = mix(ao, ao_tex, mat.textured_ao_amount);
          }
          if( mat.textured_normal_amount > 0. && mat.is_textured > 0. ) {
            vec3 normalmap_value = texture(texture_array, vec3(uv, mat.starting_texture_layer+4.*c)).rgb;
            normalmap_value = normalmap_value * 2.0 - 1.0;
            float amount = c > .0 ? 1. : .75;   // A little less for collapsed textures, since the values are off.
            n = mix(n, TBN * normalmap_value, amount * mat.textured_normal_amount);
            n = normalize(n);
          }

          vec3 totalLight = vec3(0.0);
          for (int i = 0; i < N_LIGHTS; i++) {
              vec3 l = lights[i].direction_or_position.xyz - lights[i].direction_or_position.w * VERTEX_POS;
              float dist = length(l);
              l = normalize(l);
              vec3 intensity = lights[i].color.xyz * lights[i].diffuse;
              if (lights[i].direction_or_position.w > 0.5)
                  intensity /= (1.0 + lights[i].attenuation_factor * dist * dist);

              totalLight += PBRLight(n, v, l, ao * albedo, metallicity, roughness, F0, intensity);
          }

          totalLight += ao * albedo * ambient * (1.0 - metallicity);
          //vec3 tone_mapped = totalLight / (totalLight + vec3(1.0)); // simple Reinhard operator
          float exposure = 1.0;
          vec3 tone_mapped = vec3(1.0) - exp(-totalLight * exposure);
          vec3 gamma_corrected = pow(tone_mapped, vec3(1.0 / 2.2));
          frag_color = vec4(gamma_corrected, alpha);
        //  frag_color.xyz = normalize(VERTEX_NORMAL);
        //  frag_color.xyz = totalLight;
      }`
    }
};

export class Minimal_Phong_Shader extends Shader {
    constructor (num_lights = 2, num_materials = 0, options) {
      super();
      Object.assign (this, options, {num_lights, num_materials});
    }
    update_GPU (renderer, renderListItem) {
      const gpu_addresses = renderer.uniform_addresses.get(this);
      const state = renderListItem.render_state;

      if( !renderer.gpu_versions.get(this) ) renderer.gpu_versions.set(this, {} );
      const cache = renderer.gpu_versions.get(this);

      if( cache?.previous_animation_time != state.animation_time ) {
        cache.previous_animation_time = state.animation_time;
        renderer.context.uniform1f (gpu_addresses.animation_time, state.animation_time / 1000);
      }
      if( ! cache?.previous_group_matrix?.equals(renderListItem.group_transform) ) {
        if( !cache.previous_group_matrix ) cache.previous_group_matrix = renderListItem.group_transform.clone();
        else cache.previous_group_matrix.loadVector( renderListItem.group_transform.data );
        renderer.context.uniformMatrix4fv (gpu_addresses.group_transform, true, renderListItem.group_transform.data );
      }
    }
    shared_glsl_code () {           // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return `#version 300 es
      precision mediump float;

      uniform Camera {
        mat4 camera_inverse;
        mat4 projection;
        vec4 camera_position;
      };

      struct Light {
        vec4 direction_or_position;
        vec4 color;
        float diffuse;
        float specular;
        float attenuation_factor;
      };
      const int N_LIGHTS = ${this.num_lights};

      uniform LightArray {
        float ambient;
        Light lights[N_LIGHTS];
      };

      struct Material {
        float diffusivity;
        float specularity;
        float smoothness;
      };
      const int N_MATERIALS = ${this.num_materials};
      uniform Simple_Materials {
        Material materials[N_MATERIALS];
      };

      vec3 phong_model_lights( vec3 N, vec3 vertex_worldspace, Material mat ) {
          vec3 E = normalize( camera_position.xyz - vertex_worldspace );
          vec3 result = vec3( 0.0 );
          for(int i = 0; i < N_LIGHTS; i++) {
            vec3 surface_to_light_vector = lights[i].direction_or_position.xyz -
                                            lights[i].direction_or_position.w * vertex_worldspace;
            float distance_to_light = length( surface_to_light_vector );

            vec3 L = normalize( surface_to_light_vector );
            vec3 H = normalize( L + E );

              // Compute diffuse and specular components of Phong Reflection Model.
            float diffuse  =      max( dot( N, L ), 0.0 );
            float specular = pow( max( dot( N, H ), 0.0 ), mat.smoothness );     // Use Blinn's "halfway vector" method.
            float attenuation = 1.0 / (1.0 + lights[i].attenuation_factor * distance_to_light * distance_to_light );

            vec3 light_contribution = lights[i].color.xyz;
            light_contribution *= diffuse * lights[i].diffuse * mat.diffusivity
                                    + specular * lights[i].specular * mat.specularity;

            result += attenuation * light_contribution;
          }
          return result;
        } `;
    }
    vertex_glsl_code () {          // ********* VERTEX SHADER *********
        return this.shared_glsl_code () + `
      layout(location = 0) in vec3 position; // Position is expressed in object coordinates
      layout(location = 1) in vec3 normal;
      layout(location = 4) in mat4 model_transform;
      layout(location = 8) in vec3 color;
      layout(location = 9) in float material_index;

      uniform float animation_time;
      uniform mat4 group_transform;

      out vec3 VERTEX_POS;
      out vec3 VERTEX_NORMAL;
      out vec3 INSTANCE_COLOR;
      out float INSTANCE_MATERIAL_INDEX;

      vec3 transform_normal(mat4 world_space) {
        // *** Optimization ("Eric's Blog") for normal transform in place of inverse(): ***
        // Replaces slow method of using inverse() and transpose as normals require:
        // return mat3(inverse(transpose(world_space))) * normal;

        vec3 squared_scale = vec3(
          dot(mat3(world_space)[0], mat3(world_space)[0]),
          dot(mat3(world_space)[1], mat3(world_space)[1]),
          dot(mat3(world_space)[2], mat3(world_space)[2])
        );
        vec3 inv_squared_scale = 1.0 / squared_scale;
        mat3 rotation = mat3(
          normalize(mat3(world_space)[0]),
          normalize(mat3(world_space)[1]),
          normalize(mat3(world_space)[2])
        );
        vec3 scaled_normal = normal * inv_squared_scale;
        return rotation * scaled_normal;
      }

      void main() {
        mat4 world_space = group_transform * model_transform;
        vec4 world_position = world_space * vec4( position, 1.0 );
        gl_Position = projection * camera_inverse * world_position;

        VERTEX_POS = vec3(world_position);
        VERTEX_NORMAL = transform_normal( world_space );
        INSTANCE_COLOR = clamp( color, 0., 1.);
        INSTANCE_MATERIAL_INDEX = material_index;
      }`;
    }
    fragment_glsl_code () {         // ********* FRAGMENT SHADER *********
        return this.shared_glsl_code () + `
      in vec3 VERTEX_POS;
      in vec3 VERTEX_NORMAL;
      in vec3 INSTANCE_COLOR;
      in float INSTANCE_MATERIAL_INDEX;

      out vec4 frag_color;

      void main() {
        Material mat = materials[int(INSTANCE_MATERIAL_INDEX + .5)];

        // Compute an initial (ambient) color:
        frag_color = vec4( INSTANCE_COLOR * ambient, 1.0 );

        // Compute the final color with contributions from lights:
        frag_color.xyz += phong_model_lights( normalize( VERTEX_NORMAL ), VERTEX_POS, mat );
        // frag_color = vec4(1.,1.,1.,1.);
        // frag_color.xyz += normalize( VERTEX_NORMAL );
      }`
    }
};

