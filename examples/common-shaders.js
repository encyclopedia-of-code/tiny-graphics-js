import * as tiny from '../tiny-graphics.js';
import { Vector, Vector3, vec, vec3, vec4, color, Matrix, Mat4, Shape, Shader, Component } from '../tiny-graphics.js';

/* Firefox bug: Won't run unless Material UBO is removed from shader. Even simplifying the UBO to one vector isn't enough. */


export class PBR_Shader extends Shader {
    constructor (num_lights = 2, num_materials = 0, options) {
      super();
      const defaults = { has_instancing: true, has_textures: true };
      Object.assign (this, defaults, options, {num_lights, num_materials});
    }
    update_GPU (renderer, renderListItem) {
      const gpu_addresses = renderer.uniform_addresses.get(this);
      const state = renderListItem.render_state;

      if( this.previous_animation_time != state.animation_time ) {
        this.previous_animation_time = state.animation_time;
        renderer.context.uniform1f (gpu_addresses.animation_time, state.animation_time / 1000);
      }
      if( !this.previous_group_matrix || !this.previous_group_matrix.equals(renderListItem.group_transform) ) {
        if( !this.previous_group_matrix ) this.previous_group_matrix = Mat4.of(...renderListItem.group_transform);
        else this.previous_group_matrix.set(renderListItem.group_transform);
        renderer.context.uniformMatrix4fv (gpu_addresses.group_transform, true, Matrix.flatten_2D_to_1D (renderListItem.group_transform));
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

          float alpha2 = roughness * roughness * roughness * roughness;
          float denom = (nDotH * nDotH) * (alpha2 - 1.0) + 1.0;
          float D = alpha2 / (PI * denom * denom);

          float k = pow(roughness + 1.0, 2.0) / 8.0;
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
            vec4 albedo_tex = texture(texture_array, vec3(uv, mat.starting_texture_layer));
            alpha = albedo_tex.a;
            albedo = mix(albedo, pow(albedo_tex.rgb, vec3(2.2)), mat.textured_albedo_amount);    //2.2
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
            if(c > 0.)
              n = normalize(TBN * normalmap_value);
            else
              n += .25 * normalize(TBN * normalmap_value);
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

          vec3 tone_mapped = totalLight / (totalLight + vec3(1.0)); // simple Reinhard operator
          vec3 gamma_corrected = pow(tone_mapped, vec3(1.0 / 2.2));
          gamma_corrected = max(gamma_corrected, vec3(ambient));
          frag_color = vec4(gamma_corrected, alpha);
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

      if( this.previous_animation_time != state.animation_time ) {
        this.previous_animation_time = state.animation_time;
        renderer.context.uniform1f (gpu_addresses.animation_time, state.animation_time / 1000);
      }
      if( !this.previous_group_matrix || !this.previous_group_matrix.equals(renderListItem.group_transform) ) {
        if( !this.previous_group_matrix ) this.previous_group_matrix = Mat4.of(...renderListItem.group_transform);
        else this.previous_group_matrix.set(renderListItem.group_transform);
        renderer.context.uniformMatrix4fv (gpu_addresses.group_transform, true, Matrix.flatten_2D_to_1D (renderListItem.group_transform));
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

        // frag_color.xyz += normalize( VERTEX_NORMAL );
      }`
    }
};

export class Shader_Without_UBOs  extends Shader {
    constructor (num_lights = 1, options) {
      super();
      const defaults = { has_instancing: true, has_shadows: true, has_texture: true };
      Object.assign (this, defaults, options, {num_lights});

    }
    static default_values () {
      return {};
    }
    update_GPU (renderer, renderListItem) {
      const gpu_addresses = renderer.uniform_addresses.get(this);
      const state = renderListItem.render_state;

      if( this.previous_animation_time != state.animation_time ) {
        this.previous_animation_time = state.animation_time;
        renderer.context.uniform1f (gpu_addresses.animation_time, state.animation_time / 1000);
      }
      if( !this.previous_group_matrix || !this.previous_group_matrix.equals(renderListItem.group_transform) ) {
        if( !this.previous_group_matrix ) this.previous_group_matrix = Mat4.of(...renderListItem.group_transform);
        else this.previous_group_matrix.set(renderListItem.group_transform);
        renderer.context.uniformMatrix4fv (gpu_addresses.group_transform, true, Matrix.flatten_2D_to_1D (renderListItem.group_transform));
      }
    }
    shared_glsl_code () {           // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return "#version 300 es " + `
                precision mediump float;
    `;
    }
    vertex_glsl_code () {          // ********* VERTEX SHADER *********
        return this.shared_glsl_code () + `
      layout(location = 0) in vec3 position; // Position is expressed in object coordinates
      layout(location = 1) in vec3 normal;
      layout(location = 2) in vec2 texture_coord;
      ${this.has_instancing ? `
              layout(location = 3) in mat4 model_transform;`
              : ``}

      uniform float animation_time;
      uniform mat4 group_transform;

      out vec3 VERTEX_POS;
      out vec3 VERTEX_NORMAL;
      out vec2 VERTEX_TEXCOORD;

      void main() {
        ${this.has_instancing ? `
                mat4 world_space = group_transform * model_transform;`
                :
                `mat4 world_space = group_transform;`}

        mat4 modelview = mat4(
            0.56,  0.00,  0.00,  0.00,
            0.00,  0.97, -0.24, -0.24,
            0.00, -0.24, -0.97, -0.97,
            0.00,  0.00, 20.60, 20.62
        );

        vec4 world_position = world_space * vec4( position, 1.0 );
        gl_Position = modelview * world_position;
        VERTEX_POS = vec3(world_position);
        VERTEX_NORMAL = mat3(inverse(transpose(world_space))) * normal;
        VERTEX_TEXCOORD = texture_coord;
      }`;
    }
    fragment_glsl_code () {         // ********* FRAGMENT SHADER *********
        return this.shared_glsl_code () + `
      in vec3 VERTEX_POS;
      in vec3 VERTEX_NORMAL;
      in vec2 VERTEX_TEXCOORD;

      out vec4 frag_color;

      // ***** PHONG SHADING HAPPENS HERE: *****
      vec3 phong_model_lights( vec3 N, vec3 vertex_worldspace) {
          vec3 camera_position = vec3(0.0, 5.0, 20.0);
          vec4 light_direction_or_position = vec4(1.0, 2.0, 1.0, 0.0);
          float smoothness = 32.0;
          float attenuation_factor = 0.1;
          vec3 light_color = vec3(1.0, 1.0, 1.0);
          vec3 light_diffuse = vec3(1.0, 1.0, 1.0);
          vec3 light_specular = vec3(1.0, 1.0, 1.0);
          vec3 E = normalize( camera_position - vertex_worldspace );
          vec3 surface_to_light_vector = light_direction_or_position.xyz -
                                          light_direction_or_position.w * vertex_worldspace;
          float distance_to_light = length( surface_to_light_vector );

          vec3 L = normalize( surface_to_light_vector );
          vec3 H = normalize( L + E );

            // Compute diffuse and specular components of Phong Reflection Model.
          float diffuse  =      max( dot( N, L ), 0.0 );
          float specular = pow( max( dot( N, H ), 0.0 ), smoothness );     // Use Blinn's "halfway vector" method.

          float attenuation = 1.0 / (1.0 + attenuation_factor * distance_to_light * distance_to_light );

          vec3 light_contribution = vec3(1.,1.,1.) * diffuse * light_diffuse
                                                  + specular * light_specular;
          light_contribution *= light_color.xyz;

          return attenuation * light_contribution;
        }

      void main() {
                // Compute the final color with contributions from lights:
                frag_color = vec4(0.0, 0.0, 0.0, 1.0);
                frag_color.xyz = phong_model_lights( normalize( VERTEX_NORMAL ), VERTEX_POS );
      }`
    }
};

export class Universal_Shader extends Shader {
    constructor (num_lights = 2, options) {
      super();
      const defaults = { has_instancing: true, has_shadows: true, has_texture: true };
      Object.assign (this, defaults, options, {num_lights});
    }
    update_GPU (renderer, renderListItem) {
      const gpu_addresses = renderer.uniform_addresses.get(this);

      // FINISH:  Move lightArray bind out of demo to here instead of the below?  And will shadows use a fully separate lightArray?
      if( false )
      if (this.has_shadows)
        for (let light of state.lights)
          if (!light.supports_shadow)
            throw `Simpler lights do not have compatible UBO layouts to use with shadowed shaders!`;
          else if (light.casts_shadow)
            light.bind(renderer, gpu_addresses);

      const state = renderListItem.render_state;
    //  state[ state.camera.get_binding_point() ] = state.camera;
    //  state[ state.lightArray.get_binding_point() ] = state.lightArray;
    //  state[ state.material.get_binding_point() ] = state.material;

      if( this.previous_animation_time != state.animation_time ) {
        this.previous_animation_time = state.animation_time;
        renderer.context.uniform1f (gpu_addresses.animation_time, state.animation_time / 1000);
      }
      if( !this.previous_group_matrix || !this.previous_group_matrix.equals(renderListItem.group_transform) ) {
        if( !this.previous_group_matrix ) this.previous_group_matrix = Mat4.of(...renderListItem.group_transform);
        else this.previous_group_matrix.set(renderListItem.group_transform);
        renderer.context.uniformMatrix4fv (gpu_addresses.group_transform, true, Matrix.flatten_2D_to_1D (renderListItem.group_transform));
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
      layout(location = 2) in vec2 texture_coord;
      ${this.has_instancing ? `
              layout(location = 3) in mat4 model_transform;
              layout(location = 7) in vec4 color;
              layout(location = 8) in float material_index;`
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
      out vec2 VERTEX_TEXCOORD;
      out vec4 VERTEX_COLOR;

      void main() {
        ${this.has_instancing ? `
                mat4 world_space = group_transform * model_transform;`
                :
                `mat4 world_space = group_transform;`}

     //        vec4 world_position = vec4( position, 1.0 );
        vec4 world_position = world_space * vec4( position, 1.0 );
        gl_Position = projection * camera_inverse * world_position;
      //           gl_Position = camera_inverse * world_position;
        VERTEX_POS = vec3(world_position);
        VERTEX_NORMAL = mat3(inverse(transpose(world_space))) * normal;
        VERTEX_TEXCOORD = texture_coord;
        VERTEX_COLOR = color;
      }`;
    }
    fragment_glsl_code () {         // ********* FRAGMENT SHADER *********
        return this.shared_glsl_code () + `
      uniform Camera
      {
        mat4 camera_inverse;
        mat4 projection;
        vec4 camera_position;
      };

      struct Light
      {
        vec4 direction_or_position;
        vec4 color;
        float diffuse;
        float specular;
        float attenuation_factor;
        bool casts_shadow;
      };

      const int N_LIGHTS = ${this.num_lights};

      uniform LightArray
      {
        float ambient;
        Light lights[N_LIGHTS];
        ${this.has_shadows ? `
                mat4 light_space_matrix[N_LIGHTS * 6];`
                : ``}
      };

      ${this.has_shadows ? `
              const int NUM_SHADOW_MAPS = N_LIGHTS * 6;
              uniform sampler2D shadow_maps[NUM_SHADOW_MAPS]; //since point lights have up to 6 samplers`
              : ``}

      uniform Material
      {
        vec4 color;
        vec4 diffuse;
        vec4 specular;
        float smoothness;
      } mat;

      ${this.has_texture ? `
              uniform sampler2DArray diffuse_texture;`
              : ``}

      in vec3 VERTEX_POS;
      in vec3 VERTEX_NORMAL;
      in vec2 VERTEX_TEXCOORD;
      in vec4 VERTEX_COLOR;

      out vec4 frag_color;

      ${this.has_shadows ? `
              float ShadowCalculation(vec4 fragPosLightSpace, int index, vec3 N, vec3 L )
              {
                // perform perspective divide
                vec3 projCoords = fragPosLightSpace.xyz / fragPosLightSpace.w;

                // transform to [0,1] range
                projCoords = projCoords * 0.5 + 0.5;

                // Workaround for unsupported TEXTURE_BORDER_COLOR setting in WebGL2
                if( projCoords.x < 0.0 || projCoords.y < 0.0 || projCoords.x > 1.0 || projCoords.y > 1.0 )
                  return 0.0;

                // get closest depth value from light's perspective (using [0,1] range fragPosLight as coords)
                // float closestDepth = texture(shadow_maps[i*6], projCoords.xy).r;
                float closestDepth = texture(shadow_maps[0], projCoords.xy).r;

                // get depth of current fragment from light's perspective
                float currentDepth = projCoords.z;

                // calculate bias (based on depth map resolution and slope)
                float bias = max(0.05 * (1.0 - dot(N, L)), 0.005);

                // WITHOUT PCF - check whether current frag pos is in shadow
                // float shadow = currentDepth - bias > closestDepth  ? 1.0 : 0.0;

                // PCF
                float shadow = 0.0;
                vec2 temp = vec2(textureSize(shadow_maps[0], 0));
                vec2 texelSize = 1.0 / temp;
                for(int x = -1; x <= 1; ++x)
                    for(int y = -1; y <= 1; ++y) {
                        float pcfDepth = texture(shadow_maps[0], projCoords.xy + vec2(x, y) * texelSize).r;
                        shadow += currentDepth - bias > pcfDepth  ? 1.0 : 0.0;
                    }
                shadow /= 9.0;

                // keep the shadow at 0.0 when outside the far_plane region of the light's frustum.
                if(projCoords.z > 1.0)
                    shadow = 0.0;
                return shadow;
              }`


              : ``}

      // ***** PHONG SHADING HAPPENS HERE: *****
      vec3 phong_model_lights( vec3 N, vec3 vertex_worldspace
                            ${this.has_texture ?
                                    `, vec3 texture_color` : ``}
                            ) {
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

            vec3 light_contribution = ${this.has_texture ?
                                              `texture_color` : `vec3(1.,1.,1.)`}
                                                      * diffuse * lights[i].diffuse * mat.diffuse.xyz
                                                    + specular * lights[i].specular * mat.specular.xyz;
            light_contribution *= lights[i].color.xyz;

            ${this.has_shadows ? `
                    vec4 fragPosLightSpace = light_space_matrix[i * 6] * vec4 (VERTEX_POS, 1.0);
                    float shadow = ShadowCalculation(fragPosLightSpace, i, N, L);
                    result += attenuation * (1.0 - shadow) * light_contribution;`
                    :
                    `result += attenuation * light_contribution;`}
          }
          return result;
        }

      void main() {
        ${this.has_texture ? `
                // Compute an initial (ambient) color:
                vec4 tex_color = texture( diffuse_texture, vec3(VERTEX_TEXCOORD, 2) );
//                vec4 tex_color = texture( diffuse_texture, VERTEX_TEXCOORD );
                vec3 base_color = mix( tex_color.xyz, VERTEX_COLOR.xyz, .7);

                // Compute the final color with contributions from lights:
                vec3 lighting = phong_model_lights( normalize( VERTEX_NORMAL ), VERTEX_POS, base_color );
                frag_color = vec4(lighting * base_color, VERTEX_COLOR.w * tex_color.w);
                frag_color = tex_color;
                `
                :
                `
                // Compute an initial (ambient) color:
                frag_color = vec4( VERTEX_COLOR.xyz * ambient, VERTEX_COLOR.w );
                // Compute the final color with contributions from lights:
                frag_color.xyz += phong_model_lights( normalize( VERTEX_NORMAL ), VERTEX_POS );
                `}
      }`
    }
};

export class Shadow_Pass_Shader extends Shader {
    update_GPU (context, uniforms, model_transform, material) {

      const gpu_addresses = renderer.uniform_addresses.get(this);

      if(uniforms.light_space_matrix)
        context.uniformMatrix4fv (gpu_addresses.light_space_matrix, true, Matrix.flatten_2D_to_1D (uniforms.light_space_matrix));
      context.uniformMatrix4fv (gpu_addresses.model_transform, true, Matrix.flatten_2D_to_1D (model_transform));
    }
    shared_glsl_code () {           // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
      return "#version 300 es " + `
              precision mediump float;
      `;
    }
    vertex_glsl_code () {          // ********* VERTEX SHADER *********
      return this.shared_glsl_code () + `
    layout(location = 0) in vec3 position; // Position is expressed in object coordinates
    layout(location = 3) in mat4 instance_transform;

    uniform mat4 model_transform;
    uniform mat4 light_space_matrix;

    uniform Camera
    {
      mat4 camera_inverse;
      mat4 projection;
      vec4 camera_position;
    };

    void main() {
      gl_Position =  light_space_matrix * model_transform * instance_transform * vec4( position, 1.0 );
    }`;
  }
    fragment_glsl_code () {         // ********* FRAGMENT SHADER *********
        return this.shared_glsl_code () + `

      void main() {
      }`;
    }
};

/*
export class Phong_Shader extends Shader {
      constructor (num_lights = 2) {
          super ();
          this.num_lights = num_lights;
      }
      shared_glsl_code () {          // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
          return "#version 300 es " + `
        precision mediump float;
        const int N_LIGHTS = ` + this.num_lights + `;
        uniform float ambient, diffusivity, specularity, smoothness;
        uniform vec4 light_positions_or_vectors[N_LIGHTS], light_colors[N_LIGHTS];
        uniform float light_attenuation_factors[N_LIGHTS];
        uniform vec4 shape_color;
        uniform vec3 squared_scale, camera_center;

                                             // ***** PHONG SHADING HAPPENS HERE: *****
        vec3 phong_model_lights( vec3 N, vec3 vertex_worldspace ) {
            vec3 E = normalize( camera_center - vertex_worldspace );
            vec3 result = vec3( 0.0 );
            for(int i = 0; i < N_LIGHTS; i++) {
                vec3 surface_to_light_vector = light_positions_or_vectors[i].xyz -
                                               light_positions_or_vectors[i].w * vertex_worldspace;
                float distance_to_light = length( surface_to_light_vector );

                vec3 L = normalize( surface_to_light_vector );
                vec3 H = normalize( L + E );

                  // Compute diffuse and specular components of Phong Reflection Model.
                float diffuse  =      max( dot( N, L ), 0.0 );
                float specular = pow( max( dot( N, H ), 0.0 ), smoothness );     // Use Blinn's "halfway vector" method.
                float attenuation = 1.0 / (1.0 + light_attenuation_factors[i] * distance_to_light * distance_to_light );


                vec3 light_contribution = shape_color.xyz * light_colors[i].xyz * diffusivity * diffuse
                                                          + light_colors[i].xyz * specularity * specular;

                result += attenuation * light_contribution;
              }
            return result;
          } `;
      }
      vertex_glsl_code () {           // ********* VERTEX SHADER *********
          return this.shared_glsl_code () + `
        in vec3 position, normal;                            // Position is expressed in object coordinates.
        out vec3 N, vertex_worldspace;

        uniform mat4 model_transform, projection_camera_model_transform;

        void main() {
            gl_Position = projection_camera_model_transform * vec4( position, 1.0 );     // Move vertex to final space.
                                            // The final normal vector in screen space.
            N = normalize( mat3( model_transform ) * normal / squared_scale);

            vertex_worldspace = ( model_transform * vec4( position, 1.0 ) ).xyz;
          } `;
      }
      fragment_glsl_code () {          // ********* FRAGMENT SHADER *********
          return this.shared_glsl_code () + `
        in vec3 N, vertex_worldspace;
        out vec4 frag_color;
        void main() {
                                           // Compute an initial (ambient) color:
            frag_color = vec4( shape_color.xyz * ambient, shape_color.w );
                                           // Compute the final color with contributions from lights:
            frag_color.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
          } `;
      }
      static light_source (position, color, size) {
          return {position, color, attenuation: 1 / size};
      }
      send_material (gl, gpu, material) {
          gl.uniform4fv (gpu.shape_color, material.color);
          gl.uniform1f (gpu.ambient, material.ambient);
          gl.uniform1f (gpu.diffusivity, material.diffusivity);
          gl.uniform1f (gpu.specularity, material.specularity);
          gl.uniform1f (gpu.smoothness, material.smoothness);
      }
      send_uniforms (gl, gpu, uniforms, model_transform) {
          const O = vec4 (0, 0, 0, 1), camera_center = uniforms.camera_transform.times (O).to3 ();
          gl.uniform3fv (gpu.camera_center, camera_center);

          // Use the squared scale trick from "Eric's blog" instead of inverse transpose matrix:
          const squared_scale = model_transform.reduce (
            (acc, r) => { return acc.plus (vec4 (...r).times_pairwise (r)); }, vec4 (0, 0, 0, 0)).to3 ();
          gl.uniform3fv (gpu.squared_scale, squared_scale);

          // Send the current matrices to the shader as a single pre-computed final matrix, the product.
          const PCM = uniforms.projection_transform.times (uniforms.camera_inverse).times (model_transform);
          gl.uniformMatrix4fv (gpu.model_transform, false, Matrix.flatten_2D_to_1D (model_transform.transposed ()));
          gl.uniformMatrix4fv (gpu.projection_camera_model_transform, false,
                               Matrix.flatten_2D_to_1D (PCM.transposed ()));

          if ( !uniforms.lights || !uniforms.lights.length)
              return;         // Lights omitted, ambient only

          const light_positions_flattened = [], light_colors_flattened = [];
          for (var i = 0; i < 4 * uniforms.lights.length; i++) {
              light_positions_flattened.push (uniforms.lights[ Math.floor (i / 4) ].position[ i % 4 ]);
              light_colors_flattened.push (uniforms.lights[ Math.floor (i / 4) ].color[ i % 4 ]);
          }
          gl.uniform4fv (gpu.light_positions_or_vectors, light_positions_flattened);
          gl.uniform4fv (gpu.light_colors, light_colors_flattened);
          gl.uniform1fv (gpu.light_attenuation_factors, uniforms.lights.map (l => l.attenuation));
      }
      update_GPU (context, gpu_addresses, uniforms, model_transform, material) {
          const defaults    = {color: color (0, 0, 0, 1), ambient: 0, diffusivity: 1, specularity: 1, smoothness: 40};
          let full_material = Object.assign (defaults, material);

          this.send_material (context, gpu_addresses, full_material);
          this.send_uniforms (context, gpu_addresses, uniforms, model_transform);
      }
  };


export class Textured_Phong extends Phong_Shader {
      vertex_glsl_code () {         // ********* VERTEX SHADER *********
          return this.shared_glsl_code () + `
        varying vec2 f_tex_coord;
        attribute vec3 position, normal;                            // Position is expressed in object coordinates.
        attribute vec2 texture_coord;

        uniform mat4 model_transform;
        uniform mat4 projection_camera_model_transform;

        void main() {
            gl_Position = projection_camera_model_transform * vec4( position, 1.0 );     // Move vertex to final space.
                                              // The final normal vector in screen space.
            N = normalize( mat3( model_transform ) * normal / squared_scale);

            vertex_worldspace = ( model_transform * vec4( position, 1.0 ) ).xyz;
                                              // Turn the per-vertex texture coordinate into an interpolated variable.
            f_tex_coord = texture_coord;
          } `;
      }
      fragment_glsl_code () {        // ********* FRAGMENT SHADER *********
          return this.shared_glsl_code () + `
        varying vec2 f_tex_coord;
        uniform sampler2D texture;

        void main() {
            vec4 tex_color = texture2D( texture, f_tex_coord );       // Sample texture image in the correct place.
            if( tex_color.w < .01 ) discard;
                                                                     // Compute an initial (ambient) color:
            gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w );
                                                                     // Compute the final color with contributions from lights:
            gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
          } `;
      }
      update_GPU (context, gpu_addresses, uniforms, model_transform, material) {
          super.update_GPU (context, gpu_addresses, uniforms, model_transform, material);

          if (material.texture && material.texture.ready) {
              // Select texture unit 0 for the fragment shader Sampler2D uniform called "texture":
              context.uniform1i (gpu_addresses.texture, 0);
              // For this draw, use the texture image from correct the GPU buffer:
              material.texture.activate (context, 0);
          }
      }
  };

export class Fake_Bump_Map extends Textured_Phong {
      fragment_glsl_code () {                            // ********* FRAGMENT SHADER *********
          return this.shared_glsl_code () + `
        varying vec2 f_tex_coord;
        uniform sampler2D texture;

        void main()  {
            vec4 tex_color = texture2D( texture, f_tex_coord );       // Sample texture image in the correct place.
            if( tex_color.w < .01 ) discard;

            // This time, slightly disturb normals based on sampling the same image that was used for texturing.
            vec3 bumped_N  = N + tex_color.rgb - .5*vec3(1,1,1);
            gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w );
            gl_FragColor.xyz += phong_model_lights( normalize( bumped_N ), vertex_worldspace );
          } `;
      }
  };
*/
