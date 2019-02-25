window.Axes_Viewer = window.classes.Axes_Viewer =
class Axes_Viewer extends Scene_Component     // A helper scene (a secondary Scene Component) for helping you visualize the
{ constructor( webgl_manager, control_box )         // coordinate bases that are used in your real scene.  Your scene can feed this
    { super(   webgl_manager, control_box );        // object a list of bases to draw as axis arrows.  Pressing the buttons of this
                                              // helper scene cycles through a list of each basis you have added, drawing
                                              // the selected one.  Call insert() and pass it a basis to add one to the list.
                                              // Always reset the data structure by calling reset() before each frame in your scene.

                                              // Bases at the same level in your scene's hierarchy can be grouped together and
                                              // displayed all at once; just store them at the same index in "this.groups" by
                                              // passing the same ID number into insert().  Normally passing an ID is optional;
                                              // omitting it inserts your basis in the next empty group.  To re-use IDs easily,
      this.selected_basis_id = 0;             // obtain the next unused ID by calling next_group_id(), so you can re-use it for
      this.reset();                           // all bases that you want to appear at the same level. 
      webgl_manager.globals.axes_viewer = this;
      this.shapes = { axes: new Axis_Arrows() };
      this.material = new Fake_Bump_Map().material({ ambient: 1,  texture: new Texture( "assets/rgb.jpg" ) })
                                         .override( Color.of( 0,0,0,1 ) );              
    }
  insert( basis, group_id = ++this.cursor )      // Default to putting the basis in the next empty group; otherwise use group number.
    { this.cursor = group_id;                    // Update the cursor if a group number was supplied.
      if( ! this.groups[ group_id ] )
        this.groups[ group_id ] = [ basis ];
      else
        this.groups[ group_id ].push( basis );
    }
  next_group_id() { return this.groups.length }
  reset()                           // Call this every frame -- The beginning of every call to your scene's display().
    { this.groups = [ [] ];
      this.cursor = -1;
    }
  make_control_panel()                                                              // Create the buttons for using the viewer:
    { this.key_triggered_button( "Previous group", [ "g" ], this.decrease );
      this.key_triggered_button(     "Next group", [ "h" ], this.increase ); this.new_line();
      this.live_string( box => { box.textContent = "Selected basis id: " + this.selected_basis_id } );
    }
  increase() { this.selected_basis_id = Math.min( this.selected_basis_id + 1, this.groups.length-1 ); }
  decrease() { this.selected_basis_id = Math.max( this.selected_basis_id - 1, 0 ); }   // Don't allow selection of negative IDs.
  display( context, graphics_state )
    { if( this.groups[ this.selected_basis_id ] )
        for( let a of this.groups[ this.selected_basis_id ] )         // Draw the selected group of axes arrows.
          this.shapes.axes.draw( context, graphics_state, a, this.material );
    }
}


window.Axes_Viewer_Test_Scene = window.classes.Axes_Viewer_Test_Scene =
class Axes_Viewer_Test_Scene extends Scene_Component
{ constructor( webgl_manager, control_box )                 // An example of how your scene should properly manaage an Axes_Viewer
    { super(   webgl_manager, control_box );                // helper scene, so that it is able to help you draw all the
                                                      // coordinate bases in your scene's hierarchy at the correct levels.
      if( !webgl_manager.globals.axes_viewer )
        webgl_manager.register_scene_component( new Axes_Viewer( webgl_manager, control_box.parentElement.insertCell() ) );      
      this.axes_viewer = webgl_manager.globals.axes_viewer;

                                                                  // Scene defaults:
      this.shapes = { box: new Cube() };
      this.material = new Phong_Shader().material().override( Color.of( .8,.4,.8,1 ) );
      this.lights = [ new Light( Vec.of( 0,0,1,0 ), Color.of( 0,1,1,1 ), 100000 ) ];

      webgl_manager.globals.graphics_state.    camera_transform = Mat4.translation([ -1,-1,-20 ]);
      webgl_manager.globals.graphics_state.projection_transform = Mat4.perspective( Math.PI/4, webgl_manager.width/webgl_manager.height, 1, 500 );                   
    }
  make_control_panel()
    { this.control_panel.innerHTML += "(Substitute your own scene here)" }
  display( context, graphics_state )
    { graphics_state.lights = this.lights;        // Use the lights stored in this.lights.
      const t = graphics_state.animation_time / 1000, dt = graphics_state.animation_delta_time / 1000;

      this.shapes.box.draw( context, graphics_state, Mat4.scale([ 10,.1,.1 ]), this.material );    // Mark the global coordinate axes.
      this.shapes.box.draw( context, graphics_state, Mat4.scale([ .1,10,.1 ]), this.material );
      this.shapes.box.draw( context, graphics_state, Mat4.scale([ .1,.1,10 ]), this.material );


                                    // *********** How to use the Axes_Viewer ***********
                                    // First, reset the object:
      this.axes_viewer.reset();

                                    // Next, make your scene as usual, by incrementally modifying a transformation matrix.
                                    // In between every matrix operation you want to draw, call insert() on the object as shown.
                                    // Remember to use copy() to reference matrices by value so they don't all alias to the same one.
      let model_transform = Mat4.identity();
      this.axes_viewer.insert( model_transform.copy() );
      model_transform.post_multiply( Mat4.rotation( t, Vec.of( 0,1,0 ) ) );
      this.axes_viewer.insert( model_transform.copy() );
      model_transform.post_multiply( Mat4.translation([ 5,0,0 ])         );
      this.axes_viewer.insert( model_transform.copy() );
                                    // If your scene's hierarchy is about to branch (ie. arms of a human, legs of a table),
                                    // we might want to store multiple bases at the same level to draw them simultaneously.
                                    // Obtain the next group's ID number:
      const id = this.axes_viewer.next_group_id();
                                                        // We'll draw our scene's boxes as an outline so it doesn't block the axes.
      this.shapes.box.draw( context, graphics_state, model_transform.times( Mat4.scale([ 2,2,2 ]) ), this.material, "LINE_STRIP" );

      let center = model_transform.copy();
      for( let side of [ -1, 1 ] )
      { 
        model_transform = center.copy();      // Our scene returns back to this matrix twice to position the boxes.
        model_transform.post_multiply( Mat4.translation([  side*2,2,0 ] ) );
                                              // By passing in an ID here, we accomplish saving both bases we might have here
                                              // (because of the for loop) at the same hierarchy level so they'll be drawn together.
        this.axes_viewer.insert( model_transform.copy(), id );
        model_transform.post_multiply( Mat4.rotation( Math.sin(t), Vec.of( 0,0,side ) ) );
        this.axes_viewer.insert( model_transform.copy() );                  // Subsequent bases will draw at the next level as usual.
        model_transform.post_multiply( Mat4.translation([ side*2,2,0 ] ) );
        this.axes_viewer.insert( model_transform.copy() );
                                                       // Again, draw our scene's boxes as an outline so it doesn't block the axes.
        this.shapes.box.draw( context, graphics_state, model_transform.times( Mat4.scale([ 2,2,2 ]) ), this.material, "LINE_STRIP" );
      }
    }
}
