import * as classes from './common.js';
Object.assign( window, classes );                                // Store these classes in global scope so we can use them anywhere.
window.classes = Object.assign( {}, window.classes, classes );   // Also copy them to window.classes so we can list them all out anytime.

export class Basic_Phong extends Shader 
{ material( options )                      // Phong Materials expect you to pass in options like the following:
    { const defaults = { color: Color.of( 0,0,0,1 ), ambient: 0, diffusivity: 1, specularity: 1, smoothness: 40 };
      return new class Material extends Overridable
        { constructor()                         
            { super();
              Object.assign( this, defaults, options );
            }
        }().replace({ shader: this })
    }
  shared_glsl_code()            // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
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
        void main()
          { gl_FragColor = vec4( shapeColor.xyz * ambient, shapeColor.w );   // Compute an initial (ambient) color:
            gl_FragColor.xyz += phong_model_light( normalize( N ) );                      // Compute the final color with contributions from lights.
          } ` ;
    }
    // Define how to synchronize our JavaScript's variables to the GPU's:
  update_GPU( context, gpu_addresses, g_state, model_transform, material )
    { const gpu = gpu_addresses, gl = context;
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
{ material( options )                      // Phong Materials expect you to pass in options like the following:
    { const defaults = { color: Color.of( 0,0,0,1 ), ambient: 0, diffusivity: 1, specularity: 1, smoothness: 40 };
      return new class Material extends Overridable
        { constructor()                         
            { super();
              Object.assign( this, defaults, options );
            }
        }().replace({ shader: this })
    }
  shared_glsl_code()            // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
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
{ material( options )                      // Phong Materials expect you to pass in options like the following:
    { const defaults = { color: Color.of( 0,0,0,1 ), ambient: 0, diffusivity: 1, specularity: 1, smoothness: 40 };
      return new class Material extends Overridable
        { constructor()                         
            { super();
              Object.assign( this, defaults, options );
            }
        }().replace({ shader: this })
    }
  shared_glsl_code()            // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
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
    { return `
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
      return ` 
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
{ material( options )                                  // Phong Materials expect you to pass in options like the following:
    { const defaults = { color: Color.of( 0,0,0,1 ), ambient: 0, diffusivity: 1, specularity: 1, smoothness: 40 };
      return new class Material extends Overridable
        { constructor()                         
            { super();
              Object.assign( this, defaults, options );
            }
        }().replace({ shader: this })
    }
  shared_glsl_code()            // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
    { return ` precision mediump float;
        uniform float ambient, diffusivity, specularity, smoothness;
        uniform vec4 lightColor, shapeColor, light_position_or_vector;
        uniform vec3 squared_scale, camera_center;
        varying vec3 N, L, H;           // Specifier "varying" means a variable's final value will be passed from the vertex shader 
                                        // on to the next phase (fragment shader), then interpolated per-fragment, weighted by the 
                                        // pixel fragment's proximity to each of the 3 vertices (barycentric interpolation).                                            
        vec3 phong_model_light( vec3 N )
          { float diffuse  =      max( dot( N, normalize( L ) ), 0.0 );
            float specular = pow( max( dot( N, normalize( H ) ), 0.0 ), smoothness );

            return shapeColor.xyz * diffusivity * diffuse + lightColor.xyz * specularity * specular;
          } ` ;
    }
  vertex_glsl_code()           // ********* VERTEX SHADER *********
    { return `
        attribute vec3 position, normal;                            // Position is expressed in object coordinates.
        
        uniform mat4 model_transform;
        uniform mat4 projection_camera_model_transform;

        void main()
          { gl_Position = projection_camera_model_transform * vec4( position, 1.0 );           // The vertex's final resting place (in NDCS).
            N = normalize( mat3( model_transform ) * normal / squared_scale);                         // The final normal vector in screen space.
            
            vec3 vertex_worldspace = ( model_transform * vec4( position, 1.0 ) ).xyz;
            vec3 E = normalize( camera_center - vertex_worldspace );

            // Light positions use homogeneous coords.  Use w = 0 for a directional light source -- a vector instead of a point.
            L = normalize( light_position_or_vector.xyz - light_position_or_vector.w * vertex_worldspace );
            H = normalize( L + E );
          } ` ;
    }
  fragment_glsl_code()        // ********* FRAGMENT SHADER ********* 
    {   // A fragment is a pixel that's overlapped by the current triangle.  Fragments affect the final image or get discarded due to depth.                                 
      return `
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
                                                                  // Send the current matrices to the shader.  Go ahead and pre-compute
                                                                  // the products we'll need of the of the three special matrices and just
                                                                  // cache and send those.  They will be the same throughout this draw
                                                                  // call, and thus across each instance of the vertex shader.
                                                                  // Transpose them since the GPU expects matrices as column-major arrays.
      const PCM = g_state.projection_transform.times( g_state.camera_inverse ).times( model_transform );
      gl.uniformMatrix4fv( gpu.                  model_transform, false, Mat.flatten_2D_to_1D( model_transform.transposed() ) );
      gl.uniformMatrix4fv( gpu.projection_camera_model_transform, false, Mat.flatten_2D_to_1D(             PCM.transposed() ) );

      const squared_scale = model_transform.reduce( (acc,r) => { return acc.plus( Vec.from(r).mult_pairs(r) ) }, Vec.of( 0,0,0,0 ) ).to3();
      gl.uniform3fv( gpu.squared_scale, squared_scale );          // Use the squared scale trick from Eric's blog instead of inverse transpose.


      gl.uniform4fv( gpu.shapeColor,     material.color       );    // Send the desired shape-wide material qualities 
      gl.uniform1f ( gpu.ambient,        material.ambient     );    // to the graphics card, where they will tweak the
      gl.uniform1f ( gpu.diffusivity,    material.diffusivity );    // Phong lighting formula.
      gl.uniform1f ( gpu.specularity,    material.specularity );
      gl.uniform1f ( gpu.smoothness,     material.smoothness  );

      const O = Vec.of( 0,0,0,1 ), camera_center = g_state.camera_transform.times( O ).to3();
      gl.uniform3fv( gpu.camera_center, camera_center );

      if( !g_state.lights.length ) return;      // Omitting lights will show only the material color, scaled by the ambient term.
      gl.uniform4fv( gpu.lightColor,          g_state.lights[0].color );
      
      const light_position_or_vector = g_state.lights[0].position;  // Light position uses homogeneous coords.
      gl.uniform4fv( gpu.light_position_or_vector, light_position_or_vector );
    }
}

export class Phong_Shader_1 extends Basic_Phong_Compute_H_E_L_Outside { }
export class Phong_Shader_2 extends Basic_Phong_Compute_H_E_Outside   { }
export class Phong_Shader_3 extends Basic_Phong_Optimized             { }



export class Phong_Comparison_Demo extends Scene
{ constructor( webgl_manager )
    { super( webgl_manager );
      this.shapes = { ball : new Subdivision_Sphere(3) }

      webgl_manager.globals.graphics_state.set_camera( Mat4.translation([ 0,0,-15 ]) );
      webgl_manager.globals.graphics_state.projection_transform = Mat4.perspective( Math.PI/4, webgl_manager.width/webgl_manager.height, 1, 50 );  

      this.index = 0;
      this.shaders = [ new Phong_Shader(), new Basic_Phong(), new Basic_Phong_Optimized(), 
                       new Basic_Phong_Compute_H_E_Outside(), new Basic_Phong_Compute_H_E_L_Outside() ];

      this.materials = this.shaders.map( s => s.material({ ambient:.2, smoothness:10 }).override( Color.of( 1,1,0,1 ) ) );
    }
  display( context, graphics_state )                                                      // Do this every frame.
    { const light_pos = Mat4.rotation( graphics_state.animation_time/1340, Vec.of( 0,1,0 ) ).times( Vec.of( 0,4,15,1 ) );

      graphics_state.lights = [ new Light( light_pos, Color.of( 0,1,1,1 ), 10000 ) ];

      const material = this.materials[ this.index ];

      const model_transform = Mat4.scale( Vec.of( 10 + 10*Math.sin( graphics_state.animation_time/2000 ),2,2 ) );
      this.shapes.ball.draw( context, graphics_state, model_transform, material.override({ specularity:1 }) );
    }
 make_control_panel()                 // Draw buttons, setup their actions and keyboard shortcuts, and monitor live variables.
    { this.key_triggered_button( "Next",   [ "n" ], () => this.index = Math.min( this.index+1, this.shaders.length-1 ) ); 
      this.key_triggered_button( "Prev",   [ "b" ], () => this.index = Math.max( this.index-1, 0                     ) );

      this.live_string( box => { box.textContent = this.shaders[ this.index ].constructor.name } );
    }
}