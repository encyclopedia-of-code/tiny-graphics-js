import {tiny, defs} from './common.js';
                                                  // Pull these names into this module's scope for convenience:
const { vec3, vec4, vec, color, Mat4, Shape, Material, Shader, Texture, Component } = tiny;

export class Obj_File_Demo extends Component
  {                           // **Obj_File_Demo** show how to load a single 3D model from an OBJ file.
                              // Detailed model files can be used in place of simpler primitive-based
                              // shapes to add complexity to a scene.  Simpler primitives in your scene
                              // can just be thought of as placeholders until you find a model file
                              // that fits well.  This demo shows the teapot model twice, with one
                              // teapot showing off the Fake_Bump_Map effect while the other has a
                              // regular texture and Phong lighting.
    init()
      {                               // Load the model file:
        this.shapes = { "teapot": new Shape_From_File( "assets/teapot.obj" ) };

                                      // Don't create any DOM elements to control this scene:
        this.widget_options = { make_controls: false };
                                                          // Non bump mapped:
        this.stars = { shader: new defs.Textured_Phong( 1 ), color: color( .5,.5,.5,1 ),
          ambient: .3, diffusivity: .5, specularity: .5, texture: new Texture( "assets/stars.png" ) };
                                                           // Bump mapped:
        this.bumps = { shader: new defs.Fake_Bump_Map(  1 ), color: color( .5,.5,.5,1 ),
          ambient: .3, diffusivity: .5, specularity: .5, texture: new Texture( "assets/stars.png" ) };
      }
    render_animation( caller )
      { const t = this.uniforms.animation_time;

        Shader.assign_camera( Mat4.translation( 0,0,-5 ), this.uniforms );    // Locate the camera here (inverted matrix).
        this.uniforms.projection_transform = Mat4.perspective( Math.PI/4, caller.width/caller.height, 1, 500 );
                                                // A spinning light to show off the bump map:
        this.uniforms.lights = [ defs.Phong_Shader.light_source(
                                   Mat4.rotation( t/300,   1,0,0 ).times( vec4( 3,2,10,1 ) ),
                                             color( 1,.7,.7,1 ), 100000 ) ];

        for( let i of [ -1, 1 ] )
        {                                       // Spin the 3D model shapes as well.
          const model_transform = Mat4.rotation( t/2000,   0,2,1 )
                          .times( Mat4.translation( 2*i, 0, 0 ) )
                          .times( Mat4.rotation( t/1500,   -1,2,0 ) )
                          .times( Mat4.rotation( -Math.PI/2,   1,0,0 ) );
          this.shapes.teapot.draw( caller, this.uniforms, model_transform, i == 1 ? this.stars : this.bumps );
        }
      }
  render_explanation()
    { this.document_region.innerHTML +=
        `<p>This demo loads an external 3D model file of a teapot.  It uses a condensed version of the "webgl-obj-loader.js"
         open source library, though this version is not guaranteed to be complete and may not handle some .OBJ files.  It is
         contained in the class "Shape_From_File".
         </p><p>One of these teapots is lit with bump mapping.  Can you tell which one?</p>`;
    }
  }
