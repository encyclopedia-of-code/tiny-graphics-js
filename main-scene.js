import {tiny, defs} from './assignment-3-resources.js';
const { Vec, Mat, Mat4, Color, Shape, Shader, 
         Scene, Canvas_Widget, Code_Widget, Text_Widget } = tiny;           // Pull these names into this module's scope for convenience.
const { Cube, Subdivision_Sphere, Transforms_Sandbox_Base } = defs;

    // Now we have loaded everything in the files tiny-graphics.js, tiny-graphics-widgets.js, and common.js.
    // This yielded "tiny", an object wrapping the stuff in the first two files, and "defs" for wrapping all the rest.

// (Can define Main_Scene's class here)

const Main_Scene = defs.Transforms_Sandbox =
class Transforms_Sandbox extends Transforms_Sandbox_Base       // This subclass of some other Scene overrides the display() function.  By only
  { display( context, program_state )                           // exposing that one function, which draws everything, this creates a very small code
      {                                                          // sandbox for editing a simple scene, and for experimenting with matrix transforms.
        let model_transform = Mat4.identity();      // Variable model_transform will be a temporary matrix that helps us draw most shapes.
                                                    // It starts over as the identity every single frame - coordinate axes at the origin.
        program_state.lights = this.lights;        // Use the lights stored in this.lights.

        if( !context.scratchpad.controls ) 
          { this.children.push( context.scratchpad.controls = new defs.Movement_Controls() ); 

                      // Define the global camera and projection matrices, which are stored in a scratchpad for globals.  The projection is special 
                      // because it determines how depth is treated when projecting 3D points onto a plane.  The function perspective() makes one.
                      // Its input arguments are field of view, aspect ratio, and distances to the near plane and far plane.
            program_state.set_camera( Mat4.translation([ 0,0,-30 ]) );    // Locate the camera here (inverted matrix).
            program_state.projection_transform = Mat4.perspective( Math.PI/4, context.width/context.height, .1, 1000 );
          }
        /**********************************
        Start coding down here!!!!
        **********************************/         // From here on down it's just some example shapes drawn for you -- freely replace them
                                                    // with your own!  Notice the usage of the functions translation(), scale(), and rotation()
                                                    // to generate matrices, and the functions times(), which generates products of matrices.

        const blue = Color.of( 0,0,1,1 ), yellow = Color.of( 1,1,0,1 );
        model_transform = model_transform.times( Mat4.translation([ 0, 3, 20 ]) );
        this.shapes.box.draw( context, program_state, model_transform, this.materials.plastic.override( yellow ) );   // Draw the top box.

        const t = this.t = program_state.animation_time/1000;     // Find how much time has passed in seconds, and use that to place shapes.

        model_transform = model_transform.times( Mat4.translation([ 0, -2, 0 ]) );  // Tweak our coordinate system downward for the next shape.
        this.shapes.ball.draw( context, program_state, model_transform, this.materials.plastic.override( blue ) );    // Draw the ball.

        if( !this.hover )     // The first line below won't execute if the button on the page has been toggled:
          model_transform = model_transform.times( Mat4.rotation( t, Vec.of( 0,1,0 ) ) )  // Spin our coordinate frame as a function of time.
        model_transform   = model_transform.times( Mat4.rotation( 1, Vec.of( 0,0,1 ) ) )  // Rotate another axis by a constant value.
                                           .times( Mat4.scale      ([ 1,   2, 1 ]) )      // Stretch the coordinate frame.
                                           .times( Mat4.translation([ 0,-1.5, 0 ]) );     // Translate down enough for the two volumes to miss.
        this.shapes.box.draw( context, program_state, model_transform, this.materials.plastic.override( yellow ) );   // Draw the bottom box.
      }
  }


const Additional_Scenes = [];

export { Main_Scene, Additional_Scenes, Canvas_Widget, Code_Widget, Text_Widget, defs }