window.Shadow_Mapping_Test = window.classes.Shadow_Mapping_Test =
class Shadow_Mapping_Test extends Scene_Component
  { constructor( webgl_manager, control_box )     // The scene begins by requesting the camera, shapes, and materials it will need.
      { super(   webgl_manager, control_box );    // First, include a secondary Scene that provides movement controls:
        if( !webgl_manager.globals.has_controls   ) 
          webgl_manager.register_scene_component( new Movement_Controls( webgl_manager, control_box.parentElement.insertCell() ) ); 

        webgl_manager.globals.graphics_state.camera_transform = Mat4.look_at( Vec.of( 0,0,5 ), Vec.of( 0,0,0 ), Vec.of( 0,1,0 ) );

        const r = webgl_manager.width/webgl_manager.height;
        webgl_manager.globals.graphics_state.projection_transform = Mat4.perspective( Math.PI/4, r, .1, 1000 );

        // TODO:  Create two cubes, including one with the default texture coordinates (from 0 to 1), and one with the modified
        //        texture coordinates as required for cube #2.  You can either do this by modifying the cube code or by modifying
        //        a cube instance's texture_coords after it is already created.
        this.shapes = { box:   new Cube(),
                        box_2: new Cube(),
                        axis:  new Axis_Arrows()
                      }
        this.shapes.box_2.arrays.texture_coord = this.shapes.box_2.arrays.texture_coord.map( p => p.times( 2 ) );


        this.webgl_manager = webgl_manager;      // Save off the Webgl_Manager object that created the scene.
        this.scratchpad = document.createElement('canvas');
        this.scratchpad_context = this.scratchpad.getContext('2d');     // A hidden canvas for re-sizing the real canvas to be square.
        this.scratchpad.width   = 256;
        this.scratchpad.height  = 256;
        this.texture = new Texture ( webgl_manager.context, "", false, false );        // Initial image source: Blank gif file
        this.texture.image.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";


        // TODO:  Create the materials required to texture both cubes with the correct images and settings.
        //        Make each Material from the correct shader.  Phong_Shader will work initially, but when 
        //        you get to requirements 6 and 7 you will need different ones.
        this.shader = new Phong_Shader();
        this.materials =
          {  a: this.shader.material({ ambient: 1, texture: new Texture( webgl_manager.context, "assets/rgb.jpg", false ) })
                                     .override( Color.of( 0,0,0,1 ) ),
             b: this.shader.material({ ambient: 1, texture: this.texture }).override( Color.of( 0,0,0,1 ) )
          }

        this.lights = [ new Light( Vec.of( -5,5,5,1 ), Color.of( 0,1,1,1 ), 100000 ) ];

        // TODO:  Create any variables that needs to be remembered from frame to frame, such as for incremental movements over time.
        this.spin = 0;
        this.cube_1 = Mat4.translation([ -2,0,0 ]);
        this.cube_2 = Mat4.translation([  2,0,0 ]);
      }
    make_control_panel()
      { // TODO:  Implement requirement #5 using a key_triggered_button that responds to the 'c' key.
        this.key_triggered_button( "Cube rotation",  [ "c" ], () => this.spin ^= 1 );

        this.live_string( box => { box.textContent = this.spin } );  this.new_line();

        this.result_img = this.control_panel.appendChild( Object.assign( document.createElement( "img" ), 
                { style:"width:200px; height:" + 200 * this.aspect_ratio + "px" } ) );
      }
    display( context, graphics_state )
      { graphics_state.lights = this.lights;        // Use the lights stored in this.lights.
        const t = graphics_state.animation_time / 1000, dt = graphics_state.animation_delta_time / 1000;

        
        this.cube_1.post_multiply( Mat4.rotation( this.spin * dt * 30 / 60 * 2*Math.PI, [ 1,0,0 ] ) );
        this.cube_2.post_multiply( Mat4.rotation( this.spin * dt * 20 / 60 * 2*Math.PI, [ 0,1,0 ] ) );

        this.shapes.box.draw( context, graphics_state, this.cube_1, this.materials.a );
        this.scratchpad_context.drawImage( this.webgl_manager.canvas, 0, 0, 256, 256 );
        this.materials.b.texture.image.src = this.result_img.src = this.scratchpad.toDataURL("image/png");
        context.clear( context.COLOR_BUFFER_BIT | context.DEPTH_BUFFER_BIT);


        // Draw the required boxes.
        this.shapes.box  .draw( context, graphics_state, this.cube_1, this.materials.a );
        this.shapes.box_2.draw( context, graphics_state, this.cube_2, this.materials.b );
      }
  }