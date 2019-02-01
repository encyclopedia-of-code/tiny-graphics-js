window.Basic_Phong = window.classes.Basic_Phong =
class Basic_Phong extends Shader 
{ material( color = Color.of( 0,0,0,1 ), properties )     // Define an internal class "Material" that stores the standard settings found in Phong lighting.
    { return Object.assign( { shader: this, color, ambient: 0, diffusivity: 1, specularity: 1, smoothness: 40 }, properties ) }
  shared_glsl_code()            // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
    { return ` precision mediump float;
        uniform float ambient, diffusivity, specularity, smoothness;
        uniform vec4 lightPosition, lightColor, shapeColor;
        varying vec3 N, E;                    // Specifier "varying" means a variable's final value will be passed from the vertex shader 
        varying vec3 L, H;                    // on to the next phase (fragment shader), then interpolated per-fragment, weighted by the 
                                              // pixel fragment's proximity to each of the 3 vertices (barycentric interpolation). ` ;
    }
  vertex_glsl_code()           // ********* VERTEX SHADER *********
    { return `
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
      return ` 
        vec3 phong_model_light( vec3 N )
          { float diffuse  =      max( dot(N, L), 0.0 );
            float specular = pow( max( dot(N, H), 0.0 ), smoothness );

            return shapeColor.xyz * diffusivity * diffuse + lightColor.xyz * specularity * specular;
          }
        void main()
          { gl_FragColor = vec4( shapeColor.xyz * ambient, shapeColor.w );   // Compute an initial (ambient) color:
            gl_FragColor.xyz += phong_model_light( N );                      // Compute the final color with contributions from lights.
          } ` ;
    }
    // Define how to synchronize our JavaScript's variables to the GPU's:
  update_GPU( g_state, model_transform, material, gpu = this.g_addrs, gl = this.gl )
    {                              // First, send the matrices to the GPU, additionally cache-ing some products of them we know we'll need:
      this.update_matrices( g_state, model_transform, gpu, gl );

      gl.uniform4fv( gpu.shapeColor_loc,     material.color       );    // Send the desired shape-wide material qualities 
      gl.uniform1f ( gpu.ambient_loc,        material.ambient     );    // to the graphics card, where they will tweak the
      gl.uniform1f ( gpu.diffusivity_loc,    material.diffusivity );    // Phong lighting formula.
      gl.uniform1f ( gpu.specularity_loc,    material.specularity );
      gl.uniform1f ( gpu.smoothness_loc,     material.smoothness  );

      if( !g_state.lights.length ) return;      // Omitting lights will show only the material color scaled by the ambient coeff.
      gl.uniform4fv( gpu.lightPosition_loc,       g_state.lights[0].position );
      gl.uniform4fv( gpu.lightColor_loc,          g_state.lights[0].color );
    }
  update_matrices( g_state, model_transform, gpu, gl )                                    // Helper function for sending matrices to GPU.
    {                                                   // (PCM will mean Projection * Camera * Model)
      let [ P, C, M ]    = [ g_state.projection_transform, g_state.camera_transform, model_transform ],
            CM     =      C.times(  M ),
            PCM    =      P.times( CM ),
            inv_CM = Mat4.inverse( CM ).sub_block([0,0], [3,3]);
                                                                  // Send the current matrices to the shader.  Go ahead and pre-compute
                                                                  // the products we'll need of the of the three special matrices and just
                                                                  // cache and send those.  They will be the same throughout this draw
                                                                  // call, and thus across each instance of the vertex shader.
                                                                  // Transpose them since the GPU expects matrices as column-major arrays.                                  
      gl.uniformMatrix4fv( gpu.camera_transform_loc,                  false, Mat.flatten_2D_to_1D(     C .transposed() ) );
      gl.uniformMatrix4fv( gpu.camera_model_transform_loc,            false, Mat.flatten_2D_to_1D(     CM.transposed() ) );
      gl.uniformMatrix4fv( gpu.projection_camera_model_transform_loc, false, Mat.flatten_2D_to_1D(    PCM.transposed() ) );
      gl.uniformMatrix3fv( gpu.inverse_transpose_modelview_loc,       false, Mat.flatten_2D_to_1D( inv_CM              ) );       
    }
}





window.Basic_Phong_Minimal = window.classes.Basic_Phong_Minimal =
class Basic_Phong_Minimal extends Shader      // Simplified; light and eye vectors as emerge from the center of the object.
{ material( color = Color.of( 0,0,0,1 ), properties )     // Define an internal class "Material" that stores the standard settings found in Phong lighting.
    { return Object.assign( { shader: this, color, ambient: 0, diffusivity: 1, specularity: 1, smoothness: 40 }, properties ) }
  shared_glsl_code()            // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
    { return ` precision mediump float;
        uniform float ambient, diffusivity, specularity, smoothness;
        uniform vec4 lightColor, shapeColor;
        uniform vec3 L, H, squared_scale;
        varying vec3 N;                    // Specifier "varying" means a variable's final value will be passed from the vertex shader 
                                           // on to the next phase (fragment shader), then interpolated per-fragment, weighted by the 
                                           // pixel fragment's proximity to each of the 3 vertices (barycentric interpolation). ` ;
    }
  vertex_glsl_code()           // ********* VERTEX SHADER *********
    { return `
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
      return ` 
        vec3 phong_model_light( vec3 N )
          { 
            return N;
          }
        void main()
          { gl_FragColor = vec4( shapeColor.xyz * ambient, shapeColor.w );   // Compute an initial (ambient) color:
            gl_FragColor.xyz += phong_model_light( N );                      // Compute the final color with contributions from lights.
          } ` ;
    }
    // Define how to synchronize our JavaScript's variables to the GPU's.  This is where the shader recieves ALL of its inputs.  Every
    // value the GPU wants is divided into two categories:  Values that belong to individual object being drawn (which we call "Material")
    // and values belonging to the whole scene or program (which we call the "Graphics State").  Send both a material and a graphics state
    // to the shaders to fully initialize them.
  update_GPU( g_state, model_transform, material, gpu = this.g_addrs, gl = this.gl )
    {                              // First, send the matrices to the GPU, additionally cache-ing some products of them we know we'll need:
      const PCM = g_state.projection_transform.times( g_state.camera_transform ).times( model_transform );
      gl.uniformMatrix3fv( gpu.                  model_transform_loc, false, Mat.flatten_2D_to_1D( model_transform.sub_block([0,0], [3,3]).transposed() ) );
      gl.uniformMatrix4fv( gpu.projection_camera_model_transform_loc, false, Mat.flatten_2D_to_1D(             PCM.transposed() ) );

      const squared_scale = model_transform.reduce( (acc,r) => { return acc.plus( Vec.from(r).mult_pairs(r) ) }, Vec.of( 0,0,0,0 ) ).to3();
      gl.uniform3fv( gpu.squared_scale_loc, squared_scale );


      gl.uniform4fv( gpu.shapeColor_loc,     material.color       );    // Send the desired shape-wide material qualities 
      gl.uniform1f ( gpu.ambient_loc,        material.ambient     );    // to the graphics card, where they will tweak the
      gl.uniform1f ( gpu.diffusivity_loc,    material.diffusivity );    // Phong lighting formula.
      gl.uniform1f ( gpu.specularity_loc,    material.specularity );
      gl.uniform1f ( gpu.smoothness_loc,     material.smoothness  );


      const O = Vec.of( 0,0,0,1 ), center = model_transform.times( O );
   //   const E = Mat4.inverse( 

      if( !g_state.lights.length ) return;      // Omitting lights will show only the material color, scaled by the ambient term.
      gl.uniform4fv( gpu.lightColor_loc,          g_state.lights[0].color );
      
      const P = g_state.lights[0].position;  // Light position "P" uses homogeneous coords.
      let L = P[3] ? P.minus( center ) : P;  // Use w = 0 for a directional light source -- a vector instead of a point.
          L = L.to3().normalized();
      gl.uniform4fv( gpu.L_loc, L );
    }
}



window.Minimal_Phong = window.classes.Minimal_Phong =
class Minimal_Phong extends Scene_Component
{ constructor( context, control_panel )
    { super( context, control_panel );
      this.submit_shapes( context, { ball : new Subdivision_Sphere(3) } );         // Send a Triangle's vertices to the GPU's buffers.

      this.lights = [ new Light( Vec.of( 3,4,5,1 ), Color.of( 0,1,1,1 ), 10000 ) ];

      context.globals.graphics_state.    camera_transform = Mat4.translation([ 0,0,-15 ]);
      context.globals.graphics_state.projection_transform = Mat4.perspective( Math.PI/4, context.width/context.height, 1, 50 );  

      this.shader = context.get_instance( Basic_Phong_Minimal ).material( Color.of( 1,1,0,1 ), { ambient:.2 } );
    }
  display( graphics_state )                                                      // Do this every frame.
    { graphics_state.lights = this.lights;
      this.shapes.ball.draw( graphics_state, Mat4.scale([ graphics_state.animation_time/1000,3,4 ]), this.shader ); // Draw the triangle.    
    }
 make_control_panel()                 // Draw buttons, setup their actions and keyboard shortcuts, and monitor live variables.
    { this.control_panel.innerHTML += "(This one has no controls)";
    }
}