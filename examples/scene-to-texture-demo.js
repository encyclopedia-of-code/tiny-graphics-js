import {tiny, defs} from './common.js';
                                                  // Pull these names into this module's scope for convenience:
const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } = tiny;

export class Scene_To_Texture_Demo extends Component
  {                   // **Scene_To_Texture_Demo** is a crude way of doing multi-pass rendering.
                      // We will draw a scene (containing just the left box with the striped
                      // texture) to a hidden canvas.  The hidden canvas's colors are copied
                      // to an HTML Image object, and then to one of our Textures.  Finally,
                      // we clear the buffer in the middle of display() and start over.
                      // The scene is drawn again (with a different texture) and a new box
                      // on the right side, textured with the first scene.
                      // NOTE: To use this for two-pass rendering, you simply need to write
                      // any shader that acts upon the input texture as if it were a
                      // previous rendering result.
    constructor()
      {               // Request the camera, shapes, and materials our Scene will need:
        super();
        this.shapes = { box:   new defs.Cube(),
                        box_2: new defs.Cube(),
                        axis:  new defs.Axis_Arrows()
                      }
                                                // Scale the texture coordinates:
        this.shapes.box_2.arrays.texture_coord.forEach( p => p.scale_by( 2 ) );

        this.scratchpad = document.createElement('canvas');
                                    // A hidden canvas for re-sizing the real canvas to be square:
        this.scratchpad_context = this.scratchpad.getContext('2d');
        this.scratchpad.width   = 256;
        this.scratchpad.height  = 256;                // Initial image source: Blank gif file:
        this.texture = new Texture( "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" );

        const shader = new defs.Fake_Bump_Map( 1 );
        this.materials =
          {  a: { shader, ambient: .5, texture: new Texture( "assets/rgb.jpg" ) },
             b: { shader, ambient: .5, texture: new Texture( "assets/earth.gif" ) },
             c: { shader, ambient:  1, texture: this.texture }
          }

        this.spin = 0;
        this.cube_1 = Mat4.translation( -2,0,0 );
        this.cube_2 = Mat4.translation(  2,0,0 );
      }
    make_control_panel()
      { this.key_triggered_button( "Cube rotation",  [ "c" ], () => this.spin ^= 1 );

        this.live_string( box => { box.textContent = this.spin } );  this.new_line();

        this.result_img = this.control_panel.appendChild( Object.assign( document.createElement( "img" ),
                { style:"width:200px; height:" + 200 * this.aspect_ratio + "px" } ) );
      }
    render_animation( context, shared_uniforms )
      {                                 // render_animation():  Draw both scenes, clearing the buffer in between.
        shared_uniforms.lights = [ defs.Phong_Shader.light_source( vec4( -5,5,5,1 ), color( 0,1,1,1 ), 100000 ) ];
        const t = shared_uniforms.animation_time / 1000, dt = shared_uniforms.animation_delta_time / 1000;

        Shader.assign_camera( Mat4.look_at( vec3( 0,0,5 ), vec3( 0,0,0 ), vec3( 0,1,0 ) ), shared_uniforms );
        shared_uniforms.projection_transform = Mat4.perspective( Math.PI/4, context.width/context.height, .5, 500 );

            // Update persistent matrix state:
        this.cube_1.post_multiply( Mat4.rotation( this.spin * dt * 30 / 60 * 2*Math.PI,   1,0,0 ) );
        this.cube_2.post_multiply( Mat4.rotation( this.spin * dt * 20 / 60 * 2*Math.PI,   0,1,0 ) );

                                          // Perform two rendering passes.  The first one we erase and
                                          // don't display after using to it generate our texture.
            // Draw Scene 1:
        this.shapes.box.draw( context, shared_uniforms, this.cube_1, this.materials.a );

        this.scratchpad_context.drawImage( context.canvas, 0, 0, 256, 256 );
        this.texture.image.src = this.result_img.src = this.scratchpad.toDataURL("image/png");

                                    // Don't call copy to GPU until the event loop has had a chance
                                    // to act on our SRC setting once:
        if( this.skipped_first_frame )
                                                     // Update the texture with the current scene:
            this.texture.copy_onto_graphics_card( context.context, false );
        this.skipped_first_frame = true;

                                    // Start over on a new drawing, never displaying the prior one:
        context.context.clear( context.context.COLOR_BUFFER_BIT | context.context.DEPTH_BUFFER_BIT);

            // Draw Scene 2:
        this.shapes.box  .draw( context, shared_uniforms, this.cube_1, this.materials.b );
        this.shapes.box_2.draw( context, shared_uniforms, this.cube_2, this.materials.c );
      }
  }