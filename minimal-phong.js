import {tiny, defs} from './common.js';
const { Vec, Mat, Mat4, Color, Light, Material,
        Shape, Shader, Scene, Texture } = tiny;           // Pull these names into this module's scope for convenience.

export class Basic_Phong extends Shader 
{ shared_glsl_code()            // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
    { return ` precision mediump float;
        uniform float ambient, diffusivity, specularity, smoothness;
        uniform vec4 lightPosition, lightColor, shapeColor;
        varying vec3 N, E;                    // Specifier "varying" means a variable's final value will be passed from the vertex shader 
        varying vec3 L, H;                    // on to the next phase (fragment shader), then interpolated per-fragment, weighted by the 
                                              // pixel fragment's proximity to each of the 3 vertices (barycentric interpolation).
        vec3 phong_model_light( vec3 N )
          { float diffuse  =      max( dot(N, normalize( L ) ), 0.0 );
            float specular = pow( max( dot(N, normalize( H ) ), 0.0 ), smoothness );

            return shapeColor.xyz * diffusivity * diffuse + lightColor.xyz * specularity * specular;
          } ` ;
    }
  vertex_glsl_code()           // ********* VERTEX SHADER *********
    { return this.shared_glsl_code() + `
        attribute vec3 position, normal;                            // Position is expressed in object coordinates.
        
        uniform mat4 camera_transform, camera_model_transform, projection_camera_model_transform;
        uniform mat3 inverse_transpose_modelview;

        void main()
          { gl_Position = projection_camera_model_transform * vec4( position, 1.0 );           // The vertex's final resting place (in NDCS).
            N = normalize( inverse_transpose_modelview * normal );                             // The final normal vector in screen space.

                                                    // The rest of this shader calculates some quantities that the Fragment shader will need:
            vec3 view_space_pos = ( camera_model_transform * vec4( position, 1.0 ) ).xyz;
            E = normalize( -view_space_pos );

            // Light positions use homogeneous coords.  Use w = 0 for a directional light source -- a vector instead of a point.
            L = normalize( ( camera_transform * lightPosition ).xyz - lightPosition.w * view_space_pos );
            H = normalize( L + E );
          } ` ;
    }
  fragment_glsl_code()        // ********* FRAGMENT SHADER ********* 
    {   // A fragment is a pixel that's overlapped by the current triangle.  Fragments affect the final image or get discarded due to depth.                                 
      return this.shared_glsl_code() + `
        void main()
          { gl_FragColor = vec4( shapeColor.xyz * ambient, shapeColor.w );   // Compute an initial (ambient) color:
            gl_FragColor.xyz += phong_model_light( normalize( N ) );                      // Compute the final color with contributions from lights.
          } ` ;
    }
    // Define how to synchronize our JavaScript's variables to the GPU's:
  update_GPU( context, gpu_addresses, g_state, model_transform, material )
    { const gpu = gpu_addresses, gl = context;

      const defaults = { color: Color.of( 0,0,0,1 ), ambient: 0, diffusivity: 1, specularity: 1, smoothness: 40 };
      material = Object.assign( {}, defaults, material );

      this.update_matrices( gl, gpu, g_state, model_transform );  // First, send the matrices to the GPU.

      gl.uniform4fv( gpu.shapeColor,     material.color       );    // Send the desired shape-wide material qualities 
      gl.uniform1f ( gpu.ambient,        material.ambient     );    // to the graphics card, where they will tweak the
      gl.uniform1f ( gpu.diffusivity,    material.diffusivity );    // Phong lighting formula.
      gl.uniform1f ( gpu.specularity,    material.specularity );
      gl.uniform1f ( gpu.smoothness,     material.smoothness  );

      if( !g_state.lights.length ) return;      // Omitting lights will show only the material color, scaled by the ambient term.
      gl.uniform4fv( gpu.lightPosition,       g_state.lights[0].position );
      gl.uniform4fv( gpu.lightColor,          g_state.lights[0].color );
    }
  update_matrices( gl, gpu, g_state, model_transform )                                    // Helper function for sending matrices to GPU.
    {                                                   // (PCM will mean Projection * Camera * Model)
      let [ P, C, M ]    = [ g_state.projection_transform, g_state.camera_inverse, model_transform ],
            CM     =      C.times(  M ),
            PCM    =      P.times( CM ),
            inv_CM = Mat4.inverse( CM ).sub_block([0,0], [3,3]);
                                                                  // Send the current matrices to the shader.  Go ahead and pre-compute
                                                                  // the products we'll need of the of the three special matrices and just
                                                                  // cache and send those.  They will be the same throughout this draw
                                                                  // call, and thus across each instance of the vertex shader.
                                                                  // Transpose them since the GPU expects matrices as column-major arrays.                                  
      gl.uniformMatrix4fv( gpu.camera_transform,                  false, Mat.flatten_2D_to_1D(     C .transposed() ) );
      gl.uniformMatrix4fv( gpu.camera_model_transform,            false, Mat.flatten_2D_to_1D(     CM.transposed() ) );
      gl.uniformMatrix4fv( gpu.projection_camera_model_transform, false, Mat.flatten_2D_to_1D(    PCM.transposed() ) );
      gl.uniformMatrix3fv( gpu.inverse_transpose_modelview,       false, Mat.flatten_2D_to_1D( inv_CM              ) );       
    }
}





export class Basic_Phong_Compute_H_E_L_Outside extends Shader      // Simplified; light and eye vectors as emerge from the center of the object.
{ shared_glsl_code()            // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
    { return ` precision mediump float;
        uniform float ambient, diffusivity, specularity, smoothness;
        uniform vec4 lightColor, shapeColor;
        uniform vec3 L, H, squared_scale;
        varying vec3 N;                    // Specifier "varying" means a variable's final value will be passed from the vertex shader 
                                           // on to the next phase (fragment shader), then interpolated per-fragment, weighted by the 
                                           // pixel fragment's proximity to each of the 3 vertices (barycentric interpolation).
        vec3 phong_model_light( vec3 N )
          { float diffuse  =      max( dot(N, normalize( L ) ), 0.0 );
            float specular = pow( max( dot(N, normalize( H ) ), 0.0 ), smoothness );

            return shapeColor.xyz * diffusivity * diffuse + lightColor.xyz * specularity * specular;
          } ` ;
    }
  vertex_glsl_code()           // ********* VERTEX SHADER *********
    { return this.shared_glsl_code() + `
        attribute vec3 position, normal;                            // Position is expressed in object coordinates.
        
        uniform mat3 model_transform;
        uniform mat4 projection_camera_model_transform;

        void main()
          { gl_Position = projection_camera_model_transform * vec4( position, 1.0 );           // The vertex's final resting place (in NDCS).
            N = normalize( model_transform * normal / squared_scale );                         // The final normal vector in screen space.
          } ` ;
    }
  fragment_glsl_code()        // ********* FRAGMENT SHADER ********* 
    {   // A fragment is a pixel that's overlapped by the current triangle.  Fragments affect the final image or get discarded due to depth.                                 
      return this.shared_glsl_code() + `
        void main()
          { gl_FragColor = vec4( shapeColor.xyz * ambient, shapeColor.w );   // Compute an initial (ambient) color:
            gl_FragColor.xyz += phong_model_light( normalize( N ) );         // Compute the final color with contributions from lights.
          } ` ;
    }

    // Define how to synchronize our JavaScript's variables to the GPU's.  This is where the shader recieves ALL of its inputs.  Every
    // value the GPU wants is divided into two categories:  Values that belong to individual object being drawn (which we call "Material")
    // and values belonging to the whole scene or program (which we call the "Graphics State").  Send both a material and a graphics state
    // to the shaders to fully initialize them.
  update_GPU( context, gpu_addresses, g_state, model_transform, material )
    { const gpu = gpu_addresses, gl = context;

      const defaults = { color: Color.of( 0,0,0,1 ), ambient: 0, diffusivity: 1, specularity: 1, smoothness: 40 };
      material = Object.assign( {}, defaults, material );
                                                                  // Send the current matrices to the shader.  Go ahead and pre-compute
                                                                  // the products we'll need of the of the three special matrices and just
                                                                  // cache and send those.  They will be the same throughout this draw
                                                                  // call, and thus across each instance of the vertex shader.
                                                                  // Transpose them since the GPU expects matrices as column-major arrays.
      const PCM = g_state.projection_transform.times( g_state.camera_inverse ).times( model_transform );
      gl.uniformMatrix3fv( gpu.                  model_transform, false, Mat.flatten_2D_to_1D( model_transform.sub_block([0,0], [3,3]).transposed() ) );
      gl.uniformMatrix4fv( gpu.projection_camera_model_transform, false, Mat.flatten_2D_to_1D(             PCM.transposed() ) );

      const squared_scale = model_transform.reduce( (acc,r) => { return acc.plus( Vec.from(r).mult_pairs(r) ) }, Vec.of( 0,0,0,0 ) ).to3();
      gl.uniform3fv( gpu.squared_scale, squared_scale );          // Use the squared scale trick from "Eric's blog" instead of inverse transpose.


      gl.uniform4fv( gpu.shapeColor,     material.color       );    // Send the desired shape-wide material qualities 
      gl.uniform1f ( gpu.ambient,        material.ambient     );    // to the graphics card, where they will tweak the
      gl.uniform1f ( gpu.diffusivity,    material.diffusivity );    // Phong lighting formula.
      gl.uniform1f ( gpu.specularity,    material.specularity );
      gl.uniform1f ( gpu.smoothness,     material.smoothness  );


      const O = Vec.of( 0,0,0,1 ), center = model_transform.times( O );

      const E = g_state.camera_transform.times( O ).minus( center ).to3().normalized();

      if( !g_state.lights.length ) return;      // Omitting lights will show only the material color, scaled by the ambient term.
      gl.uniform4fv( gpu.lightColor,          g_state.lights[0].color );
      
      const P = g_state.lights[0].position;  // Light position "P" uses homogeneous coords.
      let L = P[3] ? P.minus( center ) : P;  // Use w = 0 for a directional light source -- a vector instead of a point.
          L = L.to3().normalized();

      const H = L.plus( E ).normalized();

      gl.uniform3fv( gpu.L, L );
      gl.uniform3fv( gpu.H, H );
    }
}


export class Basic_Phong_Compute_H_E_Outside extends Shader      // Simplified; light and eye vectors as emerge from the center of the object.
{ shared_glsl_code()            // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
    { return ` precision mediump float;
        uniform float ambient, diffusivity, specularity, smoothness;
        uniform vec4 lightColor, shapeColor, light_position_or_vector;
        uniform vec3 H, squared_scale;
        varying vec3 N, L;           // Specifier "varying" means a variable's final value will be passed from the vertex shader 
                                     // on to the next phase (fragment shader), then interpolated per-fragment, weighted by the 
                                     // pixel fragment's proximity to each of the 3 vertices (barycentric interpolation).
        vec3 phong_model_light( vec3 N )
          { float diffuse  =      max( dot( N, normalize( L ) ), 0.0 );
            float specular = pow( max( dot( N, normalize( H ) ), 0.0 ), smoothness );

            return shapeColor.xyz * diffusivity * diffuse + lightColor.xyz * specularity * specular;
          } ` ;
    }
  vertex_glsl_code()           // ********* VERTEX SHADER *********
    { return this.shared_glsl_code() + `
        attribute vec3 position, normal;                            // Position is expressed in object coordinates.
        
        uniform mat3 model_transform;
        uniform mat4 projection_camera_model_transform;

        void main()
          { gl_Position = projection_camera_model_transform * vec4( position, 1.0 );           // The vertex's final resting place (in NDCS).
            N = normalize( model_transform * normal / squared_scale);                         // The final normal vector in screen space.

            // Light positions use homogeneous coords.  Use w = 0 for a directional light source -- a vector instead of a point.
            L = normalize( light_position_or_vector.xyz - light_position_or_vector.w * position );
          } ` ;
    }
  fragment_glsl_code()        // ********* FRAGMENT SHADER ********* 
    {   // A fragment is a pixel that's overlapped by the current triangle.  Fragments affect the final image or get discarded due to depth.                                 
      return this.shared_glsl_code() + `
        void main()
          { gl_FragColor = vec4( shapeColor.xyz * ambient, shapeColor.w );   // Compute an initial (ambient) color:
            gl_FragColor.xyz += phong_model_light( normalize( N ) );         // Compute the final color with contributions from lights.
          } ` ;
    }

    // Define how to synchronize our JavaScript's variables to the GPU's.  This is where the shader recieves ALL of its inputs.  Every
    // value the GPU wants is divided into two categories:  Values that belong to individual object being drawn (which we call "Material")
    // and values belonging to the whole scene or program (which we call the "Graphics State").  Send both a material and a graphics state
    // to the shaders to fully initialize them.
  update_GPU( context, gpu_addresses, g_state, model_transform, material )
    { const gpu = gpu_addresses, gl = context;

      const defaults = { color: Color.of( 0,0,0,1 ), ambient: 0, diffusivity: 1, specularity: 1, smoothness: 40 };
      material = Object.assign( {}, defaults, material );
                                                                  // Send the current matrices to the shader.  Go ahead and pre-compute
                                                                  // the products we'll need of the of the three special matrices and just
                                                                  // cache and send those.  They will be the same throughout this draw
                                                                  // call, and thus across each instance of the vertex shader.
                                                                  // Transpose them since the GPU expects matrices as column-major arrays.
      const PCM = g_state.projection_transform.times( g_state.camera_inverse ).times( model_transform );
      gl.uniformMatrix3fv( gpu.                  model_transform, false, Mat.flatten_2D_to_1D( model_transform.sub_block([0,0], [3,3]).transposed() ) );
      gl.uniformMatrix4fv( gpu.projection_camera_model_transform, false, Mat.flatten_2D_to_1D(             PCM.transposed() ) );

      const squared_scale = model_transform.reduce( (acc,r) => { return acc.plus( Vec.from(r).mult_pairs(r) ) }, Vec.of( 0,0,0,0 ) ).to3();
      gl.uniform3fv( gpu.squared_scale, squared_scale );          // Use the squared scale trick from Eric's blog instead of inverse transpose.


      gl.uniform4fv( gpu.shapeColor,     material.color       );    // Send the desired shape-wide material qualities 
      gl.uniform1f ( gpu.ambient,        material.ambient     );    // to the graphics card, where they will tweak the
      gl.uniform1f ( gpu.diffusivity,    material.diffusivity );    // Phong lighting formula.
      gl.uniform1f ( gpu.specularity,    material.specularity );
      gl.uniform1f ( gpu.smoothness,     material.smoothness  );


      const O = Vec.of( 0,0,0,1 ), model_center =          model_transform.times( O ),
                                  camera_center = g_state.camera_transform.times( O );

      if( !g_state.lights.length ) return;      // Omitting lights will show only the material color, scaled by the ambient term.
      gl.uniform4fv( gpu.lightColor,          g_state.lights[0].color );
      
      const light_position_or_vector = g_state.lights[0].position;  // Light position "P" uses homogeneous coords.
      gl.uniform4fv( gpu.light_position_or_vector, light_position_or_vector );

      // Approximate Blinn's value of "H" by making an estimate of L and E, using model_center
      
      const E = camera_center.minus( model_center ).to3().normalized();
      const P = light_position_or_vector;
      let L = P[3] ? P.minus( model_center ) : P;  // Use w = 0 for a directional light source -- a vector instead of a point.
          L = L.to3().normalized();

      const H = L.plus( E ).normalized();
      gl.uniform3fv( gpu.H, H );
    }
}


export class Basic_Phong_Optimized extends Shader
{                                  // **Phong_Shader** is a subclass of Shader, which stores and maanges a GPU program.  
                                   // Graphic cards prior to year 2000 had shaders like this one hard-coded into them
                                   // instead of customizable shaders.  "Phong" Shading is a process of determining 
                                   // brightness of pixels via vector math.  It compares the normal vector at that 
                                   // pixel to the vectors toward the camera and light sources.

  shared_glsl_code()           // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
    { return ` precision mediump float;
        uniform float ambient, diffusivity, specularity, smoothness;
        uniform vec4 lightColor, shapeColor, light_position_or_vector;
        uniform vec3 squared_scale, camera_center;

                              // Specifier "varying" means a variable's final value will be passed from the vertex shader
                              // on to the next phase (fragment shader), then interpolated per-fragment, weighted by the
                              // pixel fragment's proximity to each of the 3 vertices (barycentric interpolation).
        varying vec3 N, L, H;
                                                                                    
        vec3 phong_model_light( vec3 N )
          { float diffuse  =      max( dot( N, normalize( L ) ), 0.0 );
            float specular = pow( max( dot( N, normalize( H ) ), 0.0 ), smoothness );

            return shapeColor.xyz * diffusivity * diffuse + lightColor.xyz * specularity * specular;
          } ` ;
    }
  vertex_glsl_code()           // ********* VERTEX SHADER *********
    { return this.shared_glsl_code() + `
        attribute vec3 position, normal;                            // Position is expressed in object coordinates.
        
        uniform mat4 model_transform;
        uniform mat4 projection_camera_model_transform;

        void main()
          {                                                                   // The vertex's final resting place (in NDCS):
            gl_Position = projection_camera_model_transform * vec4( position, 1.0 );
                                                                              // The final normal vector in screen space.
            N = normalize( mat3( model_transform ) * normal / squared_scale);
            
            vec3 vertex_worldspace = ( model_transform * vec4( position, 1.0 ) ).xyz;
            vec3 E = normalize( camera_center - vertex_worldspace );

                                                              // Light positions use homogeneous coords.  Use w = 0 for a
                                                              // directional light source -- a vector instead of a point:
            L = normalize( light_position_or_vector.xyz - light_position_or_vector.w * vertex_worldspace );
            H = normalize( L + E );
          } ` ;
    }
  fragment_glsl_code()         // ********* FRAGMENT SHADER ********* 
    {                          // A fragment is a pixel that's overlapped by the current triangle.
                               // Fragments affect the final image or get discarded due to depth.                                 
      return this.shared_glsl_code() + `
        void main()
          {                                                          // Compute an initial (ambient) color:
            gl_FragColor = vec4( shapeColor.xyz * ambient, shapeColor.w );
                                                                     // Compute the final color with contributions from lights:
            gl_FragColor.xyz += phong_model_light( normalize( N ) );
          } ` ;
    }
  update_GPU( context, gpu_addresses, g_state, model_transform, material )
    {             // update_GPU(): Define how to synchronize our JavaScript's variables to the GPU's.  This is where the shader 
                  // recieves ALL of its inputs.  Every value the GPU wants is divided into two categories:  Values that belong
                  // to individual objects being drawn (which we call "Material") and values belonging to the whole scene or 
                  // program (which we call the "Program_State").  Send both a material and a program state to the shaders 
                  // within this function, one data field at a time, to fully initialize the shader for a draw.                  
      const gpu = gpu_addresses, gl = context;

      const defaults = { color: Color.of( 0,0,0,1 ), ambient: 0, diffusivity: 1, specularity: 1, smoothness: 40 };
      material = Object.assign( {}, defaults, material );
                                                      // Send the current matrices to the shader.  Go ahead and pre-compute
                                                      // the products we'll need of the of the three special matrices and just
                                                      // cache and send those.  They will be the same throughout this draw
                                                      // call, and thus across each instance of the vertex shader.
                                                      // Transpose them since the GPU expects matrices as column-major arrays.
      const PCM = g_state.projection_transform.times( g_state.camera_inverse ).times( model_transform );
      gl.uniformMatrix4fv( gpu.                  model_transform, false, Mat.flatten_2D_to_1D( model_transform.transposed() ) );
      gl.uniformMatrix4fv( gpu.projection_camera_model_transform, false, Mat.flatten_2D_to_1D(             PCM.transposed() ) );

                                         // Use the squared scale trick from "Eric's blog" instead of inverse transpose matrix:
      const squared_scale = model_transform.reduce( 
                                         (acc,r) => { return acc.plus( Vec.from(r).mult_pairs(r) ) }, Vec.of( 0,0,0,0 ) ).to3();                                            
      gl.uniform3fv( gpu.squared_scale, squared_scale );

                                                              // Send the desired shape-wide material qualities to the graphics
                                                              // card, where they will tweak the Phong lighting formula.
      gl.uniform4fv( gpu.shapeColor,     material.color       );
      gl.uniform1f ( gpu.ambient,        material.ambient     );
      gl.uniform1f ( gpu.diffusivity,    material.diffusivity );
      gl.uniform1f ( gpu.specularity,    material.specularity );
      gl.uniform1f ( gpu.smoothness,     material.smoothness  );

      const O = Vec.of( 0,0,0,1 ), camera_center = g_state.camera_transform.times( O ).to3();
      gl.uniform3fv( gpu.camera_center, camera_center );
                                             // Omitting lights will show only the material color, scaled by the ambient term:
      if( !g_state.lights.length )
        return;
      gl.uniform4fv( gpu.lightColor, g_state.lights[0].color );
                                                                  // Light position uses homogeneous coords:
      const light_position_or_vector = g_state.lights[0].position;
      gl.uniform4fv( gpu.light_position_or_vector, light_position_or_vector );
    }
}


export class Basic_Phong_Complete extends Shader
{                                  // **Phong_Shader** is a subclass of Shader, which stores and maanges a GPU program.  
                                   // Graphic cards prior to year 2000 had shaders like this one hard-coded into them
                                   // instead of customizable shaders.  "Phong-Blinn" Shading here is a process of 
                                   // determining brightness of pixels via vector math.  It compares the normal vector
                                   // at that pixel with the vectors toward the camera and light sources.

  
  constructor( num_lights )
    { super(); 
      this.num_lights = num_lights;
    }

  shared_glsl_code()           // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
    { return ` precision mediump float;
        const int N_LIGHTS = ` + this.num_lights + `;
        uniform float ambient, diffusivity, specularity, smoothness;
        uniform vec4 light_positions_or_vectors[N_LIGHTS], light_colors[N_LIGHTS];
        uniform float light_attenuation_factors[N_LIGHTS];
        uniform vec4 shape_color;
        uniform vec3 squared_scale, camera_center;

                              // Specifier "varying" means a variable's final value will be passed from the vertex shader
                              // on to the next phase (fragment shader), then interpolated per-fragment, weighted by the
                              // pixel fragment's proximity to each of the 3 vertices (barycentric interpolation).
        varying vec3 N, vertex_worldspace;
                                             // ***** PHONG SHADING HAPPENS HERE: *****                                       
        vec3 phong_model_lights( vec3 N )
          {                                        // phong_model_lights():  Add up the lights' contributions.
            vec3 E = normalize( camera_center - vertex_worldspace );
            vec3 result = vec3( 0.0 );
            for(int i = 0; i < N_LIGHTS; i++)
              {
                            // Lights store homogeneous coords - either a position or vector.  If w is 0, the 
                            // light will appear directional (uniform direction from all points), and we 
                            // simply obtain a vector towards the light by directly using the stored value.
                            // Otherwise if w is 1 it will appear as a point light -- compute the vector to 
                            // the point light's location from the current surface point.  In either case, 
                            // fade (attenuate) the light as the vector needed to reach it gets longer.  
                vec3 surface_to_light_vector = light_positions_or_vectors[i].xyz - 
                                               light_positions_or_vectors[i].w * vertex_worldspace;                                             
                float distance_to_light = length( surface_to_light_vector );

                vec3 L = normalize( surface_to_light_vector );
                vec3 H = normalize( L + E );
                                                  // Compute the diffuse and specular components from the Phong
                                                  // Reflection Model, using Blinn's "halfway vector" method:
                float diffuse  =      max( dot( N, L ), 0.0 );
                float specular = pow( max( dot( N, H ), 0.0 ), smoothness );
                float attenuation = 1.0 / (1.0 + light_attenuation_factors[i] * distance_to_light * distance_to_light );
                
                
                vec3 light_contribution = shape_color.xyz * diffusivity * diffuse +
                                      light_colors[i].xyz * specularity * specular;

                result += attenuation * light_contribution;
              }
            return result;
          } ` ;
    }
  vertex_glsl_code()           // ********* VERTEX SHADER *********
    { return this.shared_glsl_code() + `
        attribute vec3 position, normal;                            // Position is expressed in object coordinates.
        
        uniform mat4 model_transform;
        uniform mat4 projection_camera_model_transform;

        void main()
          {                                                                   // The vertex's final resting place (in NDCS):
            gl_Position = projection_camera_model_transform * vec4( position, 1.0 );
                                                                              // The final normal vector in screen space.
            N = normalize( mat3( model_transform ) * normal / squared_scale);
            
            vertex_worldspace = ( model_transform * vec4( position, 1.0 ) ).xyz;
          } ` ;
    }
  fragment_glsl_code()         // ********* FRAGMENT SHADER ********* 
    {                          // A fragment is a pixel that's overlapped by the current triangle.
                               // Fragments affect the final image or get discarded due to depth.                                 
      return this.shared_glsl_code() + `
        void main()
          {                                                           // Compute an initial (ambient) color:
            gl_FragColor = vec4( shape_color.xyz * ambient, shape_color.w );
                                                                     // Compute the final color with contributions from lights:
            gl_FragColor.xyz += phong_model_lights( normalize( N ) );
          } ` ;
    }
  send_material( gl, gpu, material )
    {                                       // send_material(): Send the desired shape-wide material qualities to the
                                            // graphics card, where they will tweak the Phong lighting formula.
      const defaults = { color: Color.of( 0,0,0,1 ), ambient: 0, diffusivity: 1, specularity: 1, smoothness: 40 };
      material = Object.assign( {}, defaults, material );
                                      
      gl.uniform4fv( gpu.shape_color,    material.color       );
      gl.uniform1f ( gpu.ambient,        material.ambient     );
      gl.uniform1f ( gpu.diffusivity,    material.diffusivity );
      gl.uniform1f ( gpu.specularity,    material.specularity );
      gl.uniform1f ( gpu.smoothness,     material.smoothness  );
    }
  send_gpu_state( gl, gpu, gpu_state, model_transform )
    {                                       // send_gpu_state():  Send the state of our whole drawing context to the GPU.
      const O = Vec.of( 0,0,0,1 ), camera_center = gpu_state.camera_transform.times( O ).to3();
      gl.uniform3fv( gpu.camera_center, camera_center );
                                         // Use the squared scale trick from "Eric's blog" instead of inverse transpose matrix:
      const squared_scale = model_transform.reduce( 
                                         (acc,r) => { return acc.plus( Vec.from(r).mult_pairs(r) ) }, Vec.of( 0,0,0,0 ) ).to3();                                            
      gl.uniform3fv( gpu.squared_scale, squared_scale );     
                                                      // Send the current matrices to the shader.  Go ahead and pre-compute
                                                      // the products we'll need of the of the three special matrices and just
                                                      // cache and send those.  They will be the same throughout this draw
                                                      // call, and thus across each instance of the vertex shader.
                                                      // Transpose them since the GPU expects matrices as column-major arrays.
      const PCM = gpu_state.projection_transform.times( gpu_state.camera_inverse ).times( model_transform );
      gl.uniformMatrix4fv( gpu.                  model_transform, false, Mat.flatten_2D_to_1D( model_transform.transposed() ) );
      gl.uniformMatrix4fv( gpu.projection_camera_model_transform, false, Mat.flatten_2D_to_1D(             PCM.transposed() ) );

                                             // Omitting lights will show only the material color, scaled by the ambient term:
      if( !gpu_state.lights.length )
        return;

      const light_positions_flattened = [], light_colors_flattened = [];
      for( var i = 0; i < 4 * gpu_state.lights.length; i++ )
        { light_positions_flattened                  .push( gpu_state.lights[ Math.floor(i/4) ].position[i%4] );
          light_colors_flattened                     .push( gpu_state.lights[ Math.floor(i/4) ].color[i%4] );
        }      
      gl.uniform4fv( gpu.light_positions_or_vectors, light_positions_flattened );
      gl.uniform4fv( gpu.light_colors,               light_colors_flattened );
      gl.uniform1fv( gpu.light_attenuation_factors, gpu_state.lights.map( l => l.attenuation ) );
    }
  update_GPU( context, gpu_addresses, gpu_state, model_transform, material )
    {             // update_GPU(): Define how to synchronize our JavaScript's variables to the GPU's.  This is where the shader 
                  // recieves ALL of its inputs.  Every value the GPU wants is divided into two categories:  Values that belong
                  // to individual objects being drawn (which we call "Material") and values belonging to the whole scene or 
                  // program (which we call the "Program_State").  Send both a material and a program state to the shaders 
                  // within this function, one data field at a time, to fully initialize the shader for a draw.                  
      
      this.send_material ( context, gpu_addresses, material        );
      this.send_gpu_state( context, gpu_addresses, gpu_state, model_transform );
    }
}


export class Textured_Phong extends Basic_Phong_Complete
{                       // **Textured_Phong** is a Phong Shader extended to addditionally decal a
                        // texture image over the drawn shape, lined up according to the texture
                        // coordinates that are stored at each shape vertex.
  vertex_glsl_code()           // ********* VERTEX SHADER *********
    { return this.shared_glsl_code() + `
        varying vec2 f_tex_coord;
        attribute vec3 position, normal;                            // Position is expressed in object coordinates.
        attribute vec2 texture_coord;
        
        uniform mat4 model_transform;
        uniform mat4 projection_camera_model_transform;

        void main()
          {                                                                   // The vertex's final resting place (in NDCS):
            gl_Position = projection_camera_model_transform * vec4( position, 1.0 );
                                                                              // The final normal vector in screen space.
            N = normalize( mat3( model_transform ) * normal / squared_scale);
            
            vertex_worldspace = ( model_transform * vec4( position, 1.0 ) ).xyz;
                                              // Turn the per-vertex texture coordinate into an interpolated variable.
            f_tex_coord = texture_coord;
          } ` ;
    }
  fragment_glsl_code()         // ********* FRAGMENT SHADER ********* 
    {                          // A fragment is a pixel that's overlapped by the current triangle.
                               // Fragments affect the final image or get discarded due to depth.                                
      return this.shared_glsl_code() + `
        varying vec2 f_tex_coord;
        uniform sampler2D texture;

        void main()
          {                                                          // Sample the texture image in the correct place:
            vec4 tex_color = texture2D( texture, f_tex_coord );
            if( tex_color.w < .01 ) discard;
                                                                     // Compute an initial (ambient) color:
            gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w ); 
                                                                     // Compute the final color with contributions from lights:
            gl_FragColor.xyz += phong_model_lights( normalize( N ) );
          } ` ;
    }
  update_GPU( context, gpu_addresses, gpu_state, model_transform, material )
    {             // update_GPU(): Add a little more to the base class's version of this method.                
      super.update_GPU( context, gpu_addresses, gpu_state, model_transform, material );
                                               
      if( material.texture && material.texture.ready )
      {                         // Select texture unit 0 for the fragment shader Sampler2D uniform called "texture":
        context.uniform1i( gpu_addresses.texture, 0);
                                  // For this draw, use the texture image from correct the GPU buffer:
        material.texture.activate( context );
      }
    }
}


export class Phong_Shader_1 extends Basic_Phong_Compute_H_E_L_Outside { }
export class Phong_Shader_2 extends Basic_Phong_Compute_H_E_Outside   { }
export class Phong_Shader_3 extends Basic_Phong_Optimized             { }



export class Phong_Comparison_Demo extends Scene
{ constructor()
    { super();
      this.shapes = { ball : new defs.Subdivision_Sphere(3) }

      this.children.push( new defs.Program_State_Viewer() );

      this.index = 0;
      this.shaders = [ new Textured_Phong(1), new Basic_Phong_Complete(1), new defs.Phong_Shader(), new Basic_Phong(), 
                       new Basic_Phong_Optimized(), 
                       new Basic_Phong_Compute_H_E_Outside(), new Basic_Phong_Compute_H_E_L_Outside() ];

      this.materials = this.shaders.map( s => new Material( s, { ambient:.2, smoothness:10, color: Color.of( 1,1,0,1 ), texture: new Texture( "assets/rgb.jpg" ) } ) );
    }
  display( context, program_state )                                                      // Do this every frame.
    { if( !this.has_placed_camera ) 
        { this.has_placed_camera = true;
          program_state.set_camera( Mat4.translation([ 0,0,-15 ]) );    // Locate the camera here (inverted matrix).
          program_state.projection_transform = Mat4.perspective( Math.PI/4, context.width/context.height, 1, 50 );
        }
      const light_pos = Mat4.rotation( program_state.animation_time/1340, Vec.of( 0,1,0 ) ).times( Vec.of( 0,4,15,1 ) );

      if( program_state.animation_time > 3000 )
      { this.shaders[0].num_lights = 5;        
        this.shaders[0].copy_onto_graphics_card(context.context);
      }

      program_state.lights = [ new Light( light_pos, Color.of( 0,1,1,1 ), 10000 ),
                               new Light( Vec.of( 3,-4,5,1 ), Color.of( 1,1,1,1 ), 10000 ),
                               new Light( Vec.of( -3,4,5,1 ), Color.of( 1,0,1,1 ), 10000 ),
                               new Light( Vec.of( 3,4,-5,1 ), Color.of( 1,1,0,1 ), 10000 ),
                               new Light( Vec.of( 0, Math.random(), 2, 1 ), Color.of( 1,1,1,1), 100000 ) ];

      const material = this.materials[ this.index ];

      const model_transform = Mat4.scale( Vec.of( 10 + 10*Math.sin( program_state.animation_time/2000 ),2,2 ) );
      this.shapes.ball.draw( context, program_state, model_transform, material.override({ specularity:1 }) );
    }
 make_control_panel()                 // Draw buttons, setup their actions and keyboard shortcuts, and monitor live variables.
    { this.key_triggered_button( "Next",   [ "n" ], () => this.index = Math.min( this.index+1, this.shaders.length-1 ) ); 
      this.key_triggered_button( "Prev",   [ "b" ], () => this.index = Math.max( this.index-1, 0                     ) );

      this.live_string( box => { box.textContent = this.shaders[ this.index ].constructor.name } );
    }
}