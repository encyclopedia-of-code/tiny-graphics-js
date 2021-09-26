import {tiny} from '../tiny-graphics.js';
// Pull these names into this module's scope for convenience:
const {Vector, Vector3, vec, vec3, vec4, color, Matrix, Mat4, Shape, Shader, Component} = tiny;

const defs = {};

export {tiny, defs};

const Universal_Shader = defs.Universal_Shader =
class Universal_Shader extends Shader {
    constructor (num_lights = 2, options) {
      super();
      const defaults = { has_instancing: true, has_shadows: true, has_texture: true };
      Object.assign (this, defaults, options, {num_lights});

      // this.ubo_binding = [
      //   {shader_name: "Material",  binding_point: 2},
      // ];

      // this.ubo_layout = [
      //   {num_instances: 1,
      //     data_layout:[{name:"color", type:"vec4"},
      //                 {name:"diffuse", type:"vec3"},
      //                 {name:"specular", type:"vec3"},
      //                 {name:"smoothness", type:"float"}]
      //   }
      //   ];
    }
    // copy_onto_graphics_card (context, uniforms) {
    //   const instance = super.copy_onto_graphics_card (context, uniforms);
    //  // this.init_UBO (context, instance.program, this.ubo_binding);
    //   return instance;
    // }
    update_GPU (renderer, gpu_addresses, uniforms, model_transform, material) {
   //   material.initialize(context, this.ubo_layout);



      // FINISH:  Move lightArray bind out of demo to here instead of the below?  And will shadows use a fully separate lightArray?

      if( false )
      if (this.has_shadows)
        for (let light of uniforms.lights)
          if (!light.supports_shadow)
            throw `Simpler lights do not have compatible UBO layouts to use with shadowed shaders!`;
          else if (light.casts_shadow)
            light.bind(renderer, gpu_addresses);



      material.bind(renderer, material.get_binding_point());
      //this.ubo_binding[0].binding_point, gpu_addresses);

      renderer.context.uniform1f (gpu_addresses.animation_time, uniforms.animation_time / 1000);
      renderer.context.uniformMatrix4fv (gpu_addresses.model_transform, true, Matrix.flatten_2D_to_1D (model_transform));
    }
    static default_values () {
      return {
              color: vec4 (1.0, 1.0, 1.0, 1.0),
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

      uniform float animation_time;
      uniform mat4 model_transform;

      uniform camera
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

  //        vec4 world_position = vec4( position, 1.0 );
        vec4 world_position = world_space * vec4( position, 1.0 );
        gl_Position = projection * camera_inverse * world_position;
 //           gl_Position = camera_inverse * world_position;

        VERTEX_POS = vec3(world_position);
        VERTEX_NORMAL = mat3(inverse(transpose(world_space))) * normal;
        VERTEX_TEXCOORD = texture_coord;
      }`;
    }
    fragment_glsl_code () {         // ********* FRAGMENT SHADER *********
        return this.shared_glsl_code () + `
      uniform camera
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

      uniform lightArray
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

      uniform material
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
                            ${this.has_texture ?
                                    `, vec4 texture_color` : ``}
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

            // FINISH:  Why is diffuse multiplied in twice? Ditto specular
            vec3 light_contribution = ${this.has_texture ?
                                              `texture_color.xyz` : `vec3(1.,1.,1.)`}
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

    uniform camera
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

const Debug_Shader = defs.Debug_Shader =
class Debug_Shader extends Shader {
    update_GPU (renderer, gpu_addresses, uniforms, model_transform, material) {
      material.bind(renderer, material.get_binding_point());

      renderer.context.uniform1f (gpu_addresses.animation_time, uniforms.animation_time / 1000);
      // renderer.context.uniformMatrix4fv (gpu_addresses.model_transform, true, Matrix.flatten_2D_to_1D (model_transform));
    }
    static default_values () {
      return {
            };
    }
    shared_glsl_code () {           // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return "#version 300 es " + `
                precision mediump float;
    `;
    }

    // FINISH:  Do we still need layout index qualifiers?

    vertex_glsl_code () {          // ********* VERTEX SHADER *********
        return this.shared_glsl_code () + `
      layout(location = 0) in vec3 position; // Position is expressed in object coordinates
      layout(location = 1) in vec3 normal;
      layout(location = 2) in vec2 texture_coord;
      layout(location = 3) in mat4 instance_transform;

      out vec3 VERTEX_POS;
      out vec3 VERTEX_NORMAL;
      out vec2 VERTEX_TEXCOORD;
      out mat4 VALUE_TO_TEST;

      uniform float animation_time;

      void main() {
        vec4 world_position = vec4( position, 1.0 );
        gl_Position = world_position;

        VERTEX_POS = vec3(world_position);
        VERTEX_NORMAL = normal;
        VERTEX_TEXCOORD = texture_coord;

        VALUE_TO_TEST = instance_transform;
      }`;
    }
    fragment_glsl_code () {         // ********* FRAGMENT SHADER *********
        return this.shared_glsl_code () + `
      in vec3 VERTEX_POS;
      in vec3 VERTEX_NORMAL;
      in vec2 VERTEX_TEXCOORD;

      in mat4 VALUE_TO_TEST;

      uniform float animation_time;

      out vec4 frag_color;

      void main() {
        frag_color = vec4(0.);
        float max = 33.0;
        float digit = 10.0;

        for(int i = 0; i < 4; i++)
        for(int j = 0; j < 4; j++) {
          bool is_fragment_in_cell_xrange = VERTEX_POS.x*8. > float(j) && VERTEX_POS.x*8. < float(j+1);
          bool is_fragment_in_cell_yrange = VERTEX_POS.y*8. > float(3-i) && VERTEX_POS.y*8. < float(4-i);

          float flash_odd = mod (VALUE_TO_TEST[j][i] * animation_time/100., 2. );

          float exact_equality_test_value = 2.0;
          bool expression_to_test = VALUE_TO_TEST[j][i] == exact_equality_test_value;
          float brighten = float (expression_to_test);

          if (is_fragment_in_cell_xrange && is_fragment_in_cell_yrange)
            frag_color += vec4(VALUE_TO_TEST[j][i]/max/digit, mod(VALUE_TO_TEST[j][i]/max,digit), brighten, 1.);
        }
      }`
    }
};

const Basic_Shader = defs.Basic_Shader =
  class Basic_Shader extends Shader {
    static default_values () { return {}; }
      vertex_glsl_code () {          // ********* VERTEX SHADER *********
        return "#version 300 es " + `
          precision mediump float;
          layout(location = 0) in vec3 position;
          void main() {
            gl_Position = vec4( position, 1.0 );
          }`;
      }
      fragment_glsl_code () {         // ********* FRAGMENT SHADER *********
        return "#version 300 es " + `
          precision mediump float;
          out vec4 frag_color;
          void main() {
            frag_color = vec4(1.0, 0.0, 0.0, 1.0);
          }`;
      }
  };
/*
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
*/
