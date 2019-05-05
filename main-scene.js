import {tiny, defs} from './assignment-4-resources.js';
                                                                // Pull these names into this module's scope for convenience:
const { Vec, Mat, Mat4, Color, Light, Shape, Shader, Material, Texture,
         Scene, Canvas_Widget, Code_Widget, Text_Widget } = tiny;
const { Cube, Subdivision_Sphere, Transforms_Sandbox_Base } = defs;

    // Now we have loaded everything in the files tiny-graphics.js, tiny-graphics-widgets.js, and assignment-3-resources.js.
    // This yielded "tiny", an object wrapping the stuff in the first two files, and "defs" for wrapping all the rest.

// (Can define Main_Scene's class here)

const Main_Scene = defs.Solar_System =
class Solar_System extends Scene
{        
  constructor()
    {                  // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
      super();
                                                        // At the beginning of our program, load one of each of these shape 
                                                        // definitions onto the GPU.  NOTE:  Only do this ONCE per shape it
                                                        // would be redundant to tell it again.  You should just re-use the
                                                        // one called "box" more than once in display() to draw multiple cubes.
                                                        // Don't define more than one blueprint for the same thing here.
      this.shapes = { 'box'  : new Cube(),
                      'ball' : new Subdivision_Sphere( 4 ) };
      
                                                  // *** Materials: *** Define a shader, and then define materials that use
                                                  // that shader.  Materials wrap a dictionary of "options" for the shader.
                                                  // Here we use a Phong shader and the Material stores the scalar 
                                                  // coefficients that appear in the Phong lighting formulas so that the
                                                  // appearance of particular materials can be tweaked via these numbers.
      const phong_shader   = new defs.Phong_Shader  (2);
      const texture_shader = new defs.Fake_Bump_Map(2);
      this.materials = { plastic: new Material( phong_shader, 
                                    { ambient: .2, diffusivity: 1, specularity: .5, color: Color.of( .9,.5,.9,1 ) } ),
                   plastic_stars: new Material( texture_shader,    
                                    { texture: new Texture( "assets/stars.png" ),
                                      ambient: .7, diffusivity: 1, specularity: .5, color: Color.of( .9,.5,.9,1 ) } ),
                           metal: new Material( phong_shader,
                                    { ambient: .2, diffusivity: 1, specularity:  1, color: Color.of( .9,.5,.9,1 ) } ),
                     metal_earth: new Material( texture_shader,    
                                    { texture: new Texture( "assets/earth.gif" ),
                                      ambient: .7, diffusivity: 1, specularity:  1, color: Color.of( .9,.5,.9,1 ) } ) };
    }
  make_control_panel()
    {                                 // make_control_panel(): Sets up a panel of interactive HTML elements, including
                                      // buttons with key bindings for affecting this scene, and live info readouts.
    }
  display( context, program_state )
    {                                                // display():  Called once per frame of animation.  For each shape that you want to
                                                     // appear onscreen, place a .draw() call for it inside.  Each time, pass in a
                                                     // different matrix value to control where the shape appears.
     
                           // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
      if( !context.scratchpad.controls ) 
        { this.children.push( context.scratchpad.controls = new defs.Movement_Controls() ); 

                    // Define the global camera and projection matrices, which are stored in program_state.  The camera
                    // matrix follows the usual format for transforms, but with opposite values (cameras exist as 
                    // inverted matrices).  The projection matrix follows an unusual format and determines how depth is 
                    // treated when projecting 3D points onto a plane.  The Mat4 functions perspective() and
                    // orthographic() automatically generate valid matrices for one.  The input arguments of
                    // perspective() are field of view, aspect ratio, and distances to the near plane and far plane.
          program_state.set_camera( Mat4.translation([ 0,3,-10 ]) );
          program_state.projection_transform = Mat4.perspective( Math.PI/4, context.width/context.height, 1, 100 );
        }

                                                                      // Find how much time has passed in seconds; we can use
                                                                      // time as an input when calculating new transforms:
      const t = this.t = program_state.animation_time/1000;

                                                // *** Lights: *** Values of vector or point lights.  They'll be consulted by 
                                                // the shader when coloring shapes.  See Light's class definition for inputs.
      const angle = Math.sin( t );
      const light_position = Mat4.rotation( angle, [ 1,0,0 ] ).times( Vec.of( 0,-1,1,0 ) );
      program_state.lights = [ new Light( light_position, Color.of( 1,1,1,1 ), 1000000 ) ];

                                                     // Variables that are in scope for you to use:
                                                     // this.shapes.box:   A vertex array object defining a 2x2x2 cube.
                                                     // this.shapes.ball:  A vertex array object defining a 2x2x2 spherical surface.
                                                     // this.materials.metal:    Selects a shader and draws with a shiny surface.
                                                     // this.materials.plastic:  Selects a shader and draws a more matte surface.
                                                     // this.lights:  A pre-made collection of Light objects.
                                                     // this.hover:  A boolean variable that changes when the user presses a button.
                                                     // program_state:  Information the shader needs for drawing.  Pass to draw().
                                                     // context:  Wraps the WebGL rendering context shown onscreen.  Pass to draw().                                                       


      /**********************************
      Start coding down here!!!!
      **********************************/         
                                                  // From here on down it's just some example shapes drawn for you -- freely 
                                                  // replace them with your own!  Notice the usage of the Mat4 functions 
                                                  // translation(), scale(), and rotation() to generate matrices, and the 
                                                  // function times(), which generates products of matrices.

      const blue = Color.of( 0,0,.5,1 ), yellow = Color.of( .5,.5,0,1 );

                                    // Variable model_transform will be a local matrix value that helps us position shapes.
                                    // It starts over as the identity every single frame - coordinate axes at the origin.
      let model_transform = Mat4.identity();
                                                     // Draw a hierarchy of objects that appear connected together.  The first shape
                                                     // will be the "parent" or "root" of the hierarchy.  The matrices of the 
                                                     // "child" shapes will use transformations that are calculated as relative
                                                     // values, based on the parent shape's matrix.  Moving the root node should
                                                     // therefore move the whole hierarchy.  To perform this, we'll need a temporary
                                                     // matrix variable that we incrementally adjust (by multiplying in new matrix
                                                     // terms, in between drawing shapes).  We'll draw the parent shape first and
                                                     // then incrementally adjust the matrix it used to draw child shapes.

                                                     // Position the root shape.  For this example, we'll use a box 
                                                     // shape, and place it at the coordinate origin 0,0,0:
      model_transform = model_transform.times( Mat4.translation([ 0,0,0 ]) );
                                                                                              // Draw the top box:
      this.shapes.box.draw( context, program_state, model_transform, this.materials.plastic.override( yellow ) );
      
                                                     // Tweak our coordinate system downward 2 units for the next shape.
      model_transform = model_transform.times( Mat4.translation([ 0, -2, 0 ]) );
                                                                           // Draw the ball, a child of the hierarchy root.
                                                                           // The ball will have its own children as well.
      this.shapes.ball.draw( context, program_state, model_transform, this.materials.metal_earth.override( blue ) );
                                                                      
                                                                      // Prepare to draw another box object 2 levels deep 
                                                                      // within our hierarchy.

                                                      // Spin our current coordinate frame as a function of time.  Only do
                                                      // this movement if the button on the page has not been toggled off.
      if( !this.hover )
        model_transform = model_transform.times( Mat4.rotation( t, Vec.of( 0,1,0 ) ) )

                                                      // Perform three transforms in a row.
                                                      // Rotate the coordinate frame counter-clockwise by 1 radian,
                                                      // Scale it longer on its local Y axis,
                                                      // and lastly translate down that scaled Y axis by 1.5 units.
                                                      // That translation is enough for the box and ball volume to miss
                                                      // one another (new box radius = 2, ball radius = 1, coordinate
                                                      // frame axis is currently doubled in size).
      model_transform   = model_transform.times( Mat4.rotation( 1, Vec.of( 0,0,1 ) ) )
                                         .times( Mat4.scale      ([ 1,   2, 1 ]) )
                                         .times( Mat4.translation([ 0,-1.5, 0 ]) );
                                                                                    // Draw the bottom (child) box:
      this.shapes.box.draw( context, program_state, model_transform, this.materials.plastic_stars.override( yellow ) );

                              // Note that our coordinate system stored in model_transform still has non-uniform scaling
                              // due to our scale() call.  This could have undesired effects for subsequent transforms;
                              // rotations will behave like shears.  To avoid this it may have been better to do the
                              // scale() last and then immediately unscale after the draw.  Or better yet, don't store
                              // the scaled matrix back in model_transform at all -- but instead in just a temporary
                              // expression that we pass into draw(), or store under a different name.
    }
}

const Additional_Scenes = [];

export { Main_Scene, Additional_Scenes, Canvas_Widget, Code_Widget, Text_Widget, defs }