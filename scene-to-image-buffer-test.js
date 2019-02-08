window.Shadow_Mapping_Test = window.classes.Shadow_Mapping_Test =
class Shadow_Mapping_Test extends Scene_Component
  { constructor( context )     // The scene begins by requesting the camera, shapes, and materials it will need.
      { super(   context );    // First, include a secondary Scene that provides movement controls:
        if( !context.globals.has_controls   ) 
          this.children.push( new Movement_Controls( context ) ); 

        context.globals.graphics_state.camera_transform = Mat4.look_at( Vec.of( 0,0,5 ), Vec.of( 0,0,0 ), Vec.of( 0,1,0 ) );

        const r = context.width/context.height;
        context.globals.graphics_state.projection_transform = Mat4.perspective( Math.PI/4, r, .1, 1000 );

        // TODO:  Create two cubes, including one with the default texture coordinates (from 0 to 1), and one with the modified
        //        texture coordinates as required for cube #2.  You can either do this by modifying the cube code or by modifying
        //        a cube instance's texture_coords after it is already created.
        const shapes = { box:   new Cube(),
                         box_2: new Cube(),
                         axis:  new Axis_Arrows()
                       }        
        shapes.box_2.texture_coords = shapes.box_2.texture_coords.map( p => p.times( 2 ) );


        this.webgl_manager = context;      // Save off the Webgl_Manager object that created the scene.
        this.scratchpad = document.createElement('canvas');
        this.scratchpad_context = this.scratchpad.getContext('2d');     // A hidden canvas for re-sizing the real canvas to be square.
        this.scratchpad.width   = 256;
        this.scratchpad.height  = 256;
        this.texture = new Texture ( context.gl, "", false, false );        // Initial image source: Blank gif file
        this.texture.image.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";


        this.submit_shapes( context, shapes );

        // TODO:  Create the materials required to texture both cubes with the correct images and settings.
        //        Make each Material from the correct shader.  Phong_Shader will work initially, but when 
        //        you get to requirements 6 and 7 you will need different ones.
        this.materials =
          {  once: context.get_instance( Texture_Rotate   ).material( Color.of( 0,0,0,1 ), 
                             { ambient: 1, texture: context.get_instance( "assets/rgb.jpg", false ) } ),
            twice: context.get_instance( Texture_Scroll_X ).material( Color.of( 0,0,0,1 ), 
                             { ambient: 1, texture: context.get_instance( "assets/grid.png" ) } )
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
    display( graphics_state )
      { graphics_state.lights = this.lights;        // Use the lights stored in this.lights.
        const t = graphics_state.animation_time / 1000, dt = graphics_state.animation_delta_time / 1000;


        this.shapes.box  .draw( graphics_state, Mat4.translation([0,2,0]), this.materials.once );
        this.scratchpad_context.drawImage( this.webgl_manager.canvas, 0, 0, 256, 256 );
        this.materials.twice.texture.image.src = this.result_img.src = this.scratchpad.toDataURL("image/png");
        this.webgl_manager.gl.clear( this.webgl_manager.gl.COLOR_BUFFER_BIT | this.webgl_manager.gl.DEPTH_BUFFER_BIT);


        // TODO:  Draw the required boxes. Also update their stored matrices.
        this.cube_1.post_multiply( Mat4.rotation( this.spin * dt * 30 / 60 * 2*Math.PI, [ 1,0,0 ] ) );
        this.cube_2.post_multiply( Mat4.rotation( this.spin * dt * 20 / 60 * 2*Math.PI, [ 0,1,0 ] ) );
        this.shapes.box  .draw( graphics_state, this.cube_1, this.materials.once );
        this.shapes.box_2.draw( graphics_state, this.cube_2, this.materials.twice );
      }
  }