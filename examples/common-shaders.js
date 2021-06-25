import {tiny} from '../tiny-graphics.js';
// Pull these names into this module's scope for convenience:
const {Vector, Vector3, vec, vec3, vec4, color, Matrix, Mat4, Shape, Shader, Component} = tiny;

const defs = {};

export {tiny, defs};

const Universal_Shader = defs.Universal_Shader =
class Universal_Shader extends Shader {
    constructor (num_lights = 2, options) {
      super ();
      const defaults = { has_instancing: true, has_shadows: true, has_texture: true };
      Object.assign (this, defaults, options, {num_lights});

      this.ubo_binding = [
        {shader_name: "Material",  binding_point: 2},
      ];

      this.ubo_layout = [
        {num_instances: 1,
          data_layout:[{name:"color", type:"vec4"},
                      {name:"diffuse", type:"vec3"},
                      {name:"specular", type:"vec3"},
                      {name:"smoothness", type:"float"}]
        }
        ];
    }
    copy_onto_graphics_card (context) {
      const instance = super.copy_onto_graphics_card (context);
      this.init_UBO (context, this.gpu_instances.get(context).program, this.ubo_binding);
      return instance;
    }
    update_GPU (context, gpu_addresses, uniforms, model_transform, material) {
      material.initialize(context, this.ubo_layout);
      if (this.has_shadows)
        for (let light of uniforms.lights)
          if (light.casts_shadow)
            light.bind(context, gpu_addresses);
      material.bind(this.ubo_binding[0].binding_point, gpu_addresses);
      context.uniformMatrix4fv (gpu_addresses.model_transform, true, Matrix.flatten_2D_to_1D (model_transform));
    }
    static default_values () {
      return {
              color: vec4 (1.0, 1.0, 1.0, 1.0),
              ambient: 0.0,
              diffuse: vec3(1.0, 1.0, 1.0),
              specular: vec3 (1.0, 1.0, 1.0),
              smoothness: 32.0
            };
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
        layout(location = 3) in mat4 instance_transform;`
        : ``}

      uniform mat4 model_transform;

      layout (std140) uniform Camera
      {
        mat4 camera_inverse;
        mat4 projection;
        vec3 camera_position;
      };

      out vec3 VERTEX_POS;
      out vec3 VERTEX_NORMAL;
      out vec2 VERTEX_TEXCOORD;

      void main() {
        ${this.has_instancing ? `
          mat4 world_space = model_transform * instance_transform;`
          :
          `mat4 world_space = model_transform;`}
        vec4 world_position = world_space * vec4( position, 1.0 );
        gl_Position = projection * camera_inverse * world_position;
        VERTEX_POS = vec3(world_position);
        VERTEX_NORMAL = mat3(inverse(transpose(world_space))) * normal;
        VERTEX_TEXCOORD = texture_coord;
      }`;
    }
    fragment_glsl_code () {         // ********* FRAGMENT SHADER *********
        return this.shared_glsl_code () + `
      layout (std140) uniform Camera
      {
        mat4 camera_inverse;
        mat4 projection;
        vec3 camera_position;
      };

      struct Light
      {
        vec4 direction_or_position;
        vec3 color;
        float diffuse;
        float specular;
        float attenuation_factor;
        bool casts_shadow;
      };

      const int N_LIGHTS = ${this.num_lights};

      layout (std140) uniform Lights
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

      layout (std140) uniform Material
      {
        vec4 color;
        vec3 diffuse;
        vec3 specular;
        float smoothness;
      };
      ${this.has_texture ? `
      uniform sampler2D diffuse_texture;`
      : ``}

      in vec3 VERTEX_POS;
      in vec3 VERTEX_NORMAL;
      in vec2 VERTEX_TEXCOORD;

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
                            ${this.has_texture ? `, vec4 texture_color` : ``}
                            ) {
          vec3 E = normalize( camera_position - vertex_worldspace );
          vec3 result = vec3( 0.0 );
          for(int i = 0; i < N_LIGHTS; i++) {
            vec3 surface_to_light_vector = lights[i].direction_or_position.xyz -
                                            lights[i].direction_or_position.w * vertex_worldspace;
            float distance_to_light = length( surface_to_light_vector );

            vec3 L = normalize( surface_to_light_vector );
            vec3 H = normalize( L + E );

              // Compute diffuse and specular components of Phong Reflection Model.
            float diffuse  =      max( dot( N, L ), 0.0 );
            float specular = pow( max( dot( N, H ), 0.0 ), smoothness );     // Use Blinn's "halfway vector" method.
            float attenuation = 1.0 / (1.0 + lights[i].attenuation_factor * distance_to_light * distance_to_light );

            vec3 light_contribution = ${this.has_texture ? `texture_color.xyz` : `vec3(1,1,1)`}
                                                      * diffuse * lights[i].diffuse * diffuse
                                                    + specular * lights[i].specular * specular;
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
        vec4 tex_color = texture( diffuse_texture, VERTEX_TEXCOORD );
        frag_color = vec4( ( tex_color.xyz + color.xyz ) * ambient, color.w * tex_color.w );
        // Compute the final color with contributions from lights:
        frag_color.xyz += phong_model_lights( normalize( VERTEX_NORMAL ), VERTEX_POS, tex_color);
        `
        :
        `
        // Compute an initial (ambient) color:
        frag_color = vec4( color.xyz * ambient, color.w );
        // Compute the final color with contributions from lights:
        frag_color.xyz += phong_model_lights( normalize( VERTEX_NORMAL ), VERTEX_POS );
        `}
      }`
    }
};

const Shadow_Pass_Shader = defs.Shadow_Pass_Shader =
class Shadow_Pass_Shader extends Shader {
    update_GPU (context, gpu_addresses, uniforms, model_transform, material) {

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

    layout (std140) uniform Camera
    {
      mat4 camera_inverse;
      mat4 projection;
      vec3 camera_position;
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

// const Funny_Shader = defs.Funny_Shader =
//   class Funny_Shader extends Shader {
//       update_GPU (context, gpu_addresses, uniforms, model_transform, material) {
//           const [P, C, M] = [uniforms.projection_transform, uniforms.camera_inverse, model_transform],
//                 PCM       = P.times (C).times (M);
//           context.uniformMatrix4fv (gpu_addresses.projection_camera_model_transform, false,
//                                     Matrix.flatten_2D_to_1D (PCM.transposed ()));
//           context.uniform1f (gpu_addresses.animation_time, uniforms.animation_time / 1000);
//       }
//       shared_glsl_code () {
//           return `precision mediump float;
//                   varying vec2 f_tex_coord;
//       `;
//       }
//       vertex_glsl_code () {
//           return this.shared_glsl_code () + `
//         attribute vec3 position;                            // Position is expressed in object coordinates.
//         attribute vec2 texture_coord;
//         uniform mat4 projection_camera_model_transform;

//         void main() {
//           gl_Position = projection_camera_model_transform * vec4( position, 1.0 );  // Move vertex to final space
//           f_tex_coord = texture_coord;                 // Supply the original texture coords for interpolation.
//         }`;
//       }
//       fragment_glsl_code () {
//           return this.shared_glsl_code () + `
//         uniform float animation_time;
//         void main() {
//           float a = animation_time, u = f_tex_coord.x, v = f_tex_coord.y;

//           // To color in all pixels, use an arbitrary math function based only on time and UV texture coordinates.
//           gl_FragColor = vec4(
//             2.0 * u * sin(17.0 * u ) + 3.0 * v * sin(11.0 * v ) + 1.0 * sin(13.0 * a),
//             3.0 * u * sin(18.0 * u ) + 4.0 * v * sin(12.0 * v ) + 2.0 * sin(14.0 * a),
//             4.0 * u * sin(19.0 * u ) + 5.0 * v * sin(13.0 * v ) + 3.0 * sin(15.0 * a),
//             5.0 * u * sin(20.0 * u ) + 6.0 * v * sin(14.0 * v ) + 4.0 * sin(16.0 * a));
//         }`;
//       }
//   };


const Basicer_Shader = defs.Basicer_Shader =
  class Basicer_Shader extends Shader {
      shared_glsl_code () {           // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
          return "#version 300 es " + `
                  precision mediump float;
      `;
      }
      vertex_glsl_code () {          // ********* VERTEX SHADER *********
          return this.shared_glsl_code () + `
        layout(location = 0) in vec3 position;
        void main() {
          gl_Position = vec4( position, 1.0 );
        }`;
      }
      fragment_glsl_code () {         // ********* FRAGMENT SHADER *********
          return this.shared_glsl_code () + `
        out vec4 frag_color;
        void main() {
          frag_color = vec4(1.0, 0.0, 0.0, 1.0);
        }`;
      }
  };

const Basic_Shader = defs.Basic_Shader =
  class Basic_Shader extends Shader {
      // Basic_Shader is nearly the simplest way to subclass Shader, which stores and manages a GPU program.
      update_GPU (context, gpu_addresses, uniforms, model_transform, material) {
          // update_GPU():  Define how to synchronize our JavaScript's variables to the GPU's:
          const [P, C, M] = [uniforms.projection_transform, uniforms.camera_inverse, model_transform],
                PCM       = P.times (C).times (M);
          context.uniformMatrix4fv (gpu_addresses.projection_camera_model_transform, false,
                                    Matrix.flatten_2D_to_1D (PCM.transposed ()));
      }
      shared_glsl_code () {           // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
          return "#version 300 es " + `
                  precision mediump float;
      `;
      }
      vertex_glsl_code () {          // ********* VERTEX SHADER *********
          return this.shared_glsl_code () + `
        layout(location = 0) in vec3 position;                       // Position is expressed in object coordinates
        layout(location = 1) in vec4 color;
        out vec4 VERTEX_COLOR;
        uniform mat4 projection_camera_model_transform;

        void main() {
          gl_Position = projection_camera_model_transform * vec4( position, 1.0 );      // Move vertex to final space.
          VERTEX_COLOR = color;                                 // Use the hard-coded color of the vertex.
        }`;
      }
      fragment_glsl_code () {         // ********* FRAGMENT SHADER *********
          return this.shared_glsl_code () + `
        in vec4 VERTEX_COLOR;
        out vec4 frag_color;
        void main() {
          frag_color = VERTEX_COLOR;    // Directly use per-vertex colors for interpolation.
        }`;
      }
  };

const Phong_Shader = defs.Phong_Shader =
  class Phong_Shader extends Shader {
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


const Textured_Phong = defs.Textured_Phong =
  class Textured_Phong extends Phong_Shader {
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

const Fake_Bump_Map = defs.Fake_Bump_Map =
  class Fake_Bump_Map extends Textured_Phong {
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
