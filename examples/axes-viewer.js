import {tiny, defs} from './common.js';
                                                  // Pull these names into this module's scope for convenience:
const { vec3, vec4, color, Mat4, Light, Shape, Material, Shader, Texture, Scene } = tiny;

export class Axes_Viewer extends Scene
{                                      // **Axes_Viewer** is a helper scene (a secondary Scene Component) for helping you 
                                       // visualize the coordinate bases that are used in your real scene.  Your scene 
                                       // can feed this object a list of bases to draw as axis arrows.  Pressing the 
                                       // buttons of this helper scene cycles through a list of each basis you have added,
                                       // drawing the selected one.  Call insert() and pass it a basis to add one to the
                                       // list.
                                       // Always reset the data structure by calling reset() before each frame in your scene.

                                          // Bases at the same level in your scene's hierarchy can be grouped together and
                                          // displayed all at once; just store them at the same index in "this.groups" by
                                          // passing the same ID number into insert().  Normally passing an ID is optional;
                                          // omitting it inserts your basis in the next empty group.  To re-use IDs easily,
                                          // obtain the next unused ID by calling next_group_id(), so you can re-use it for
                                          // all bases that you want to appear at the same level.
  constructor()
    { super();
                                              
      this.selected_basis_id = 0;             
      this.reset();
      this.shapes = { axes: new defs.Axis_Arrows() };
      const bump = new defs.Fake_Bump_Map();
      this.material = new Material( bump, { color: color( 0,0,0,1 ), ambient: 1, 
                          texture: new Texture( "assets/rgb.jpg" ) });       
    }
  insert( basis, group_id = ++this.cursor )
    {                                         // insert(): Default to putting the basis in the next empty group; otherwise 
                                              // use group number. Update the cursor if a group number was supplied.
      this.cursor = group_id;
      if( ! this.groups[ group_id ] )
        this.groups[ group_id ] = [ basis ];
      else
        this.groups[ group_id ].push( basis );
    }
  next_group_id() { return this.groups.length }
  reset()
    {                           // reset(): Call this every frame -- The beginning of every call to your scene's display().
      this.groups = [ [] ];
      this.cursor = -1;
    }
  make_control_panel()
    {                           // make_control_panel(): Create the buttons for using the viewer.
      this.key_triggered_button( "Previous group", [ "g" ], this.decrease );
      this.key_triggered_button(     "Next group", [ "h" ], this.increase ); this.new_line();
      this.live_string( box => { box.textContent = "Selected basis id: " + this.selected_basis_id } );
    }
  increase() { this.selected_basis_id = Math.min( this.selected_basis_id + 1, this.groups.length-1 ); }
  decrease() { this.selected_basis_id = Math.max( this.selected_basis_id - 1, 0 ); }   // Don't allow selection of negative IDs.
  display( context, program_state )
    {                                                 // display(): Draw the selected group of axes arrows.
      if( this.groups[ this.selected_basis_id ] )
        for( let a of this.groups[ this.selected_basis_id ] )
          this.shapes.axes.draw( context, program_state, a, this.material );
    }
}



export class Axes_Viewer_Test_Scene extends Scene
{                             // **Axes_Viewer_Test_Scene** is an example of how your scene should properly manaage 
                              // an Axes_Viewer child scene, so that it is able to help you draw all the coordinate
                              // bases in your scene's hierarchy at the correct levels.
  constructor()
    { super();
      this.children.push( this.axes_viewer = new Axes_Viewer() );
                                                                  // Scene defaults:
      this.shapes = { box: new defs.Cube() };
      const phong = new defs.Phong_Shader();
      this.material = new Material( phong, { color: color( .8,.4,.8,1 ) } );
    }
  make_control_panel()
    { this.control_panel.innerHTML += "(Substitute your own scene here)" }
  display( context, program_state )
    {                                   // display():  *********** See instructions below ***********
      program_state.lights = [ new Light( vec4( 0,0,1,0 ), color( 0,1,1,1 ), 100000 ) ];

      if( !context.scratchpad.controls ) 
        { this.children.push( context.scratchpad.controls = new defs.Movement_Controls() ); 
        
          program_state.set_camera( Mat4.translation( -1,-1,-20 ) );    // Locate the camera here (inverted matrix).
          program_state.projection_transform = Mat4.perspective( Math.PI/4, context.width/context.height, 1, 500 );
        }
      const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;

      this.shapes.box.draw( context, program_state, Mat4.scale( 10,.1,.1 ), this.material );    // Mark the global coordinate axes.
      this.shapes.box.draw( context, program_state, Mat4.scale( .1,10,.1 ), this.material );
      this.shapes.box.draw( context, program_state, Mat4.scale( .1,.1,10 ), this.material );


                                    // *********** How to use the Axes_Viewer ***********
                                    // First, reset the object:
      this.axes_viewer.reset();

                                    // Next, make your scene as usual, by incrementally modifying a transformation matrix.
                                    // In between every matrix operation you want to draw, call insert() on the object as shown.
                                    // Remember to use copy() to reference matrices by value so they don't all alias to the same one.
      let model_transform = Mat4.identity();
      this.axes_viewer.insert( model_transform.copy() );
      model_transform.post_multiply( Mat4.rotation( t,   0,1,0 ) );
      this.axes_viewer.insert( model_transform.copy() );
      model_transform.post_multiply( Mat4.translation( 5,0,0 )         );
      this.axes_viewer.insert( model_transform.copy() );
                                    // If your scene's hierarchy is about to branch (ie. arms of a human, legs of a table),
                                    // we might want to store multiple bases at the same level to draw them simultaneously.
                                    // Obtain the next group's ID number:
      const id = this.axes_viewer.next_group_id();
                                                        // We'll draw our scene's boxes as an outline so it doesn't block the axes.
      this.shapes.box.draw( context, program_state, model_transform.times( Mat4.scale( 2,2,2 ) ), this.material, "LINE_STRIP" );

      let center = model_transform.copy();
      for( let side of [ -1, 1 ] )
      { 
        model_transform = center.copy();      // Our scene returns back to this matrix twice to position the boxes.
        model_transform.post_multiply( Mat4.translation( side*2,2,0 ) );
                                              // Here there will be two different bases depending on our for loop. 
                                              // By passing in the old ID here, we accomplish saving both bases at the 
                                              // same hierarchy level so they'll be drawn together.
        this.axes_viewer.insert( model_transform.copy(), id );
        model_transform.post_multiply( Mat4.rotation( Math.sin(t),   0,0,side ) );
                                              // Count up the ID from there:
        this.axes_viewer.insert( model_transform.copy() );
        model_transform.post_multiply( Mat4.translation( side*2,2,0 ) );
        this.axes_viewer.insert( model_transform.copy() );
                                                       // Again, draw our scene's boxes as an outline so it doesn't block the axes.
        this.shapes.box.draw( context, program_state, model_transform.times( Mat4.scale( 2,2,2 ) ), this.material, "LINE_STRIP" );
      }
    }
}
