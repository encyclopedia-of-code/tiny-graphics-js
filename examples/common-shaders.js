import {tiny} from '../tiny-graphics.js';
// Pull these names into this module's scope for convenience:
const {Vector, Vector3, vec, vec3, vec4, color, Matrix, Mat4, Shape, Shader, Component} = tiny;

const defs = {};

export {tiny, defs};

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
          return `precision mediump float;
                  varying vec4 VERTEX_COLOR;
      `;
      }
      vertex_glsl_code () {          // ********* VERTEX SHADER *********
          return this.shared_glsl_code () + `
        attribute vec4 color;
        attribute vec3 position;                            // Position is expressed in object coordinates.
        uniform mat4 projection_camera_model_transform;

        void main() { 
          gl_Position = projection_camera_model_transform * vec4( position, 1.0 );      // Move vertex to final space.
          VERTEX_COLOR = color;                                 // Use the hard-coded color of the vertex.
        }`;
      }
      fragment_glsl_code () {         // ********* FRAGMENT SHADER *********
          return this.shared_glsl_code () + `
        void main() {                                                   
          gl_FragColor = VERTEX_COLOR;    // Directly use per-vertex colors for interpolation.
        }`;
      }
  };


const Funny_Shader = defs.Funny_Shader =
  class Funny_Shader extends Shader {
      update_GPU (context, gpu_addresses, uniforms, model_transform, material) {
          const [P, C, M] = [uniforms.projection_transform, uniforms.camera_inverse, model_transform],
                PCM       = P.times (C).times (M);
          context.uniformMatrix4fv (gpu_addresses.projection_camera_model_transform, false,
                                    Matrix.flatten_2D_to_1D (PCM.transposed ()));
          context.uniform1f (gpu_addresses.animation_time, uniforms.animation_time / 1000);
      }
      shared_glsl_code () {
          return `precision mediump float;
                  varying vec2 f_tex_coord;
      `;
      }
      vertex_glsl_code () {
          return this.shared_glsl_code () + `
        attribute vec3 position;                            // Position is expressed in object coordinates.
        attribute vec2 texture_coord;
        uniform mat4 projection_camera_model_transform;

        void main() {
          gl_Position = projection_camera_model_transform * vec4( position, 1.0 );  // Move vertex to final space
          f_tex_coord = texture_coord;                 // Supply the original texture coords for interpolation.
        }`;
      }
      fragment_glsl_code () {
          return this.shared_glsl_code () + `
        uniform float animation_time;
        void main() { 
          float a = animation_time, u = f_tex_coord.x, v = f_tex_coord.y;
          
          // To color in all pixels, use an arbitrary math function based only on time and UV texture coordinates.
          gl_FragColor = vec4(                                    
            2.0 * u * sin(17.0 * u ) + 3.0 * v * sin(11.0 * v ) + 1.0 * sin(13.0 * a),
            3.0 * u * sin(18.0 * u ) + 4.0 * v * sin(12.0 * v ) + 2.0 * sin(14.0 * a),
            4.0 * u * sin(19.0 * u ) + 5.0 * v * sin(13.0 * v ) + 3.0 * sin(15.0 * a),
            5.0 * u * sin(20.0 * u ) + 6.0 * v * sin(14.0 * v ) + 4.0 * sin(16.0 * a));
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
          return ` 
        precision mediump float;
        const int N_LIGHTS = ` + this.num_lights + `;
        uniform float ambient, diffusivity, specularity, smoothness;
        uniform vec4 light_positions_or_vectors[N_LIGHTS], light_colors[N_LIGHTS];
        uniform float light_attenuation_factors[N_LIGHTS];
        uniform vec4 shape_color;
        uniform vec3 squared_scale, camera_center;

        varying vec3 N, vertex_worldspace;
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
        attribute vec3 position, normal;                            // Position is expressed in object coordinates.

        uniform mat4 model_transform;
        uniform mat4 projection_camera_model_transform;

        void main() {                                                                
            gl_Position = projection_camera_model_transform * vec4( position, 1.0 );     // Move vertex to final space.
                                            // The final normal vector in screen space.
            N = normalize( mat3( model_transform ) * normal / squared_scale);

            vertex_worldspace = ( model_transform * vec4( position, 1.0 ) ).xyz;
          } `;
      }
      fragment_glsl_code () {          // ********* FRAGMENT SHADER *********
          return this.shared_glsl_code () + `
        void main() {                          
                                           // Compute an initial (ambient) color:
            gl_FragColor = vec4( shape_color.xyz * ambient, shape_color.w );
                                           // Compute the final color with contributions from lights:
            gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
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
