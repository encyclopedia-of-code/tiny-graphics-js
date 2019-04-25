import {tiny, defs} from './common.js';

                                                  // Pull these names into this module's scope for convenience:
const { Vec, Mat, Mat4, Color, Light, Shape, Material, Shader, Scene } = tiny;
const { Triangle, Square, Tetrahedron, Windmill, Cube, Subdivision_Sphere } = defs;

export class Transforms_Sandbox_Base extends Scene
{                                          // **Transforms_Sandbox_Base** is a Scene that can be added to any display canvas.
                                           // This particular scene is broken up into two pieces for easier understanding.
                                           // The piece here is the base class, which sets up the machinery to draw a simple 
                                           // scene demonstrating a few concepts.  A subclass of it, Transforms_Sandbox,
                                           // exposes only the display() method, which actually places and draws the shapes,
                                           // isolating that code so it can be experimented with on its own.
  constructor()
    {                  // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
      super();
      this.hover = this.swarm = false;
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
      this.shader = new defs.Phong_Shader_Reduced();
      this.materials = { plastic: new Material( this.shader, 
                                    { ambient: .2, diffusivity: 1, specularity: .5, color: Color.of( .9,.5,.9,1 ) } ),
                           metal: new Material( this.shader, 
                                    { ambient: .2, diffusivity: 1, specularity:  1, color: Color.of( .9,.5,.9,1 ) } ) };
    }
  make_control_panel()
    {                                 // make_control_panel(): Sets up a panel of interactive HTML elements, including
                                      // buttons with key bindings for affecting this scene, and live info readouts.
      this.control_panel.innerHTML += "Dragonfly rotation angle: <br>";
                                                // The next line adds a live text readout of a data member of our Scene.
      this.live_string( box => { box.textContent = ( this.hover ? 0 : ( this.t % (2*Math.PI)).toFixed(2) ) + " radians" } ); 
      this.new_line();
                                                // Add buttons so the user can actively toggle data members of our Scene:
      this.key_triggered_button( "Hover dragonfly in place", [ "h" ], function() { this.hover ^= 1; } );
      this.new_line();
      this.key_triggered_button( "Swarm mode", [ "m" ], function() { this.swarm ^= 1; } );
    }
  display( context, program_state )
    {                                                // display():  Called once per frame of animation.  We'll isolate out
                                                     // the code that actually draws things into Transforms_Sandbox, a
                                                     // subclass of this Scene.  Here, the base class's display only does
                                                     // some initial setup.
     
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

                                                // *** Lights: *** Values of vector or point lights.  They'll be consulted by 
                                                // the shader when coloring shapes.  See Light's class definition for inputs.
      const t = this.t = program_state.animation_time/1000;
      const angle = Math.sin( t );
      const light_position = Mat4.rotation( angle, [ 1,0,0 ] ).times( Vec.of( 0,-1,1,0 ) );
      program_state.lights = [ new Light( light_position, Color.of( 1,1,1,1 ), 1000000 ) ];
    }
}


export class Tutorial_Animation extends Scene    // This Scene can be added to a display canvas.  This particular one
  {                                                 // sets up the machinery to draw a simple scene demonstrating a few concepts.
                                                    // Scroll down to the display() method at the bottom to see where the shapes are drawn.
    constructor()             // The scene begins by requesting the camera, shapes, and materials it will need.
      { super();              // First, include a couple other helpful components, including one that moves you around:
          
        this.shapes = { 'triangle'        : new Triangle(),                // At the beginning of our program, load one of each of these shape 
                        'strip'           : new Square(),                  // definitions onto the GPU.  NOTE:  Only do this ONCE per shape
                        'bad_tetrahedron' : new Tetrahedron( false ),      // design.  Once you've told the GPU what the design of a cube is,
                        'tetrahedron'     : new Tetrahedron( true ),       // it would be redundant to tell it again.  You should just re-use
                        'windmill'        : new Windmill( 10 ),            // the one called "box" more than once in display() to draw
                        'box'             : new Cube(),                    // multiple cubes.  Don't define more than one blueprint for the
                        'ball'            : new Subdivision_Sphere( 4 ) }; // same thing here.

        [ this.hover, this.t ] = [ false, 0 ];    // Define a couple of data members called "hover" and "t".

        // *** Materials: *** Define more data members here, returned from the material() function of our shader.  Material objects contain
        //                    shader configurations.  They are used to light and color each shape.  Declare new materials as temps when
        //                    needed; they're just cheap wrappers for some numbers.  1st parameter:  Color (4 floats in RGBA format).
        this.shader = new defs.Phong_Shader();
        this.materials = {};
        this.materials.clay    = this.shader.material({ ambient: .4, diffusivity: .4 }).override( Color.of( .9,.5,.9,1 ) );
        this.materials.plastic = this.materials.clay.override({ specularity: .6 });
        this.materials.stars   = this.materials.plastic.override({ texture: new Texture( "assets/stars.png" ) });
        this.materials.glass   = this.materials.clay.override( Color.of( .5,.5, 1,.2 ) );
        this.materials.fire    = new defs.Funny_Shader().material();

        // *** Lights: *** Values of vector or point lights.  They'll be consulted by the shader when coloring shapes.  Two different lights 
        //                 *per shape* are supported by in the example shader; more requires changing a number in it or other tricks.
        //                 Arguments to construct a Light(): Light source position or vector (homogeneous coordinates), color, and intensity.
        this.lights = [ new Light( Vec.of(  30,  30,  34, 1 ), Color.of( 0, .4, 0, 1 ), 100000 ),
                        new Light( Vec.of( -10, -20, -14, 0 ), Color.of( 1, 1, .3, 1 ), 100    ) ];
      }
    make_control_panel()               // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
      { this.control_panel.innerHTML += "Creature rotation angle: <br>";    // This line adds stationary text.  The next line adds live text.
        this.live_string( box => { box.textContent = ( this.hover ? 0 : ( this.t % (2*Math.PI)).toFixed(2) ) + " radians" } ); this.new_line();
        this.key_triggered_button( "Hover in place", [ "h" ], function() { this.hover ^= 1; } );    // Add a button for controlling the scene.
      }
    show_explanation( document_element )          // Write the demo's description (a big long string) onto the web document.
      { document_element.innerHTML += `<p>If you've written a computer program before but not in JavaScript, rest assured that it is mostly the same as other languages.  <a href=https://piazza.com/class_profile/get_resource/j855t03rsfv1cn/j9k7wljazkdsb target='_blank'>This .pdf document</a> lists down the similarities and differences between C++ and JavaScript that you might encounter here.  Google "es6" instead of "JavaScript" when learning to avoid missing newer capabilities.  Generally, you'll want to get comfortable with imperative, object oriented, and functional programming styles to use this library.   
      </p><p>This first article is meant to show how best to organize a 3D graphics program in JavaScript using WebGL -- a \"hello world\" example, or more accurately, \"hello triangle\". A lot of \"boilerplate\" code is required just to get a single 3D triangle to draw on a web canvas, and it's not at all obvious how to organize that code so that you can be flexible later, when you'll probably want to dynamically switch out pieces of your program whenever you want - whether they be other shader programs, vertex arrays (shapes), textures (images), or entire scenes. You might even want those things to happen whenever the user of your program presses a button.    
      </p><p>This \"hello triangle\" example is organized to do all that while keeping its source code tiny. A ~500 line library file called tiny-graphics.js sets up all the flexibility mentioned above, and it's shared by all pages on this encyclopedia.  That file can always be accessed <a href=/tiny-graphics.js>here</a>.  A file called dependencies.js contains all the code required by the particular article you're viewing on the encyclopedia of code. Every article you navigate to on the encyclopedia will provide you with a minimal copy of dependencies.js, containing only the code that your current article needs.    
      </p><p>If you have never written a graphics program before, you'll need to know what a transformation matrix is in 3D graphics. Check out <a href=https://piazza.com/class_profile/get_resource/j855t03rsfv1cn/j9k7wl8ijmks0 target='_blank'>this other .pdf document</a> explaining those, including the three special matrices (rotation, translation, and scale) that you'll see over and over in graphics programs like this one. Finally, scroll down to the source code at the bottom to see how these functions are used to generate special matrices that draw the shapes in the right places in the 3D world.    
      </p><p>The scene shown here demonstrates a lot of concepts at once using very little code.  These include drawing your first triangle, storing trivial shapes, storing lights and materials and shader programs, flat vs. smooth shading, and matrix transformations.   You can see all the parts of the scene being drawn by the code written in the "display" function; these parts are all independent from one another, so feel free delete whichever sections you want from there and the other shapes will remain.  Save your changes to produce your own page.  For pretty demonstrations of more advanced topics, such as <a href=/Surfaces_Demo>Surface Patch shapes</a>, <a href=/Inertia_Demo>Inertia</a>, <a href=/Collision_Demo>Collision Detection</a>, and <a href=/Ray_Tracer>Ray Tracing</a>, use the blue bar at the top of this page to visit the next articles.  To see how a minimal but functional game works, check out <a href=/Billiards>Billiards</a>.  To train yourself to get matrix order right when placing shapes, play the <a href=/Bases_Game>Bases Game</a>.</p>
     `}
    draw_arm( context, program_state, model_transform )                   // An example of how to break up the work of drawing into other functions.
      { const arm = model_transform.times( Mat4.translation([ 0,0,3+1 ]) );
        this.shapes.ball.draw( context, program_state, arm, this.materials.plastic.override( Color.of( 0,0,1,.7 ) ) );
      }
    display( context, program_state )
      { let model_transform = Mat4.identity();      // This will be a temporary matrix that helps us draw most shapes.
                                                    // It starts over as the identity every single frame - coordinate axes at the origin.
        program_state.lights = this.lights;        // Override program_state with the default lights of this class. 

        if( !context.scratchpad.controls ) 
        { this.children.push( context.scratchpad.controls = new defs.Movement_Controls() ); 
        
                    // Define the global camera and projection matrices, which are stored in a scratchpad for globals.  The projection is special 
                    // because it determines how depth is treated when projecting 3D points onto a plane.  The function perspective() makes one.
                    // Its input arguments are field of view, aspect ratio, and distances to the near plane and far plane.
          program_state.set_camera( Mat4.translation([ 0,0,-30 ]) );    // Locate the camera here (inverted matrix).
          program_state.projection_transform = Mat4.perspective( Math.PI/4, context.width/context.height, .1, 1000 );
        }

        const yellow = Color.of( 1,1,0,1 ), gray = Color.of( .5,.5,.5,1 ), green = Color.of( 0,.5,0,1 );  
       /**********************************
        Start coding down here!!!!
        **********************************/         // From here on down it's just some example shapes drawn for you -- freely replace them 
                                                    // with your own!  Notice the usage of the functions translation(), scale(), and rotation()
                                                    // to generate matrices, and the functions times(), which generates products of matrices.

        model_transform = model_transform.times( Mat4.translation([ 0, 5, 0 ]) );
        this.shapes.triangle.draw( context, program_state, model_transform, this.materials.stars );   // Draw the top triangle.

        model_transform = model_transform.times( Mat4.translation([ 0, -2, 0 ]) );  // Tweak our coordinate system downward for the next shape.
        this.shapes.strip.draw( context, program_state, model_transform, this.materials.plastic.override( gray )  );      // Draw the square.
                                                                // Find how much time has passed in seconds. Use that as input to build
        const t = this.t = program_state.animation_time/1000;  // and store a couple rotation matrices that vary over time.
        const tilt_spin   = Mat4.rotation( 12*t, Vec.of(          .1,          .8,             .1 ) ),
              funny_orbit = Mat4.rotation(  2*t, Vec.of( Math.cos(t), Math.sin(t), .7*Math.cos(t) ) );

                // All the shapes in a scene can share influence of the same pair of lights.  Alternatively, here's what happens when you
                // use different lights on part of a scene.  All the shapes below this line of code will use these moving lights instead.
        program_state.lights = [ new Light( tilt_spin.times( Vec.of(  30,  30,  34, 1 ) ), Color.of( 0, .4, 0, 1 ), 100000               ),
                                  new Light( tilt_spin.times( Vec.of( -10, -20, -14, 0 ) ), Color.of( 1, 1, .3, 1 ), 100*Math.cos( t/10 ) ) ];

                          // The post_multiply() function is like times(), but be careful with it; it modifies the originally stored matrix in
                          // place rather than generating a new matrix, which could throw off your attempts to maintain a history of matrices. 
        model_transform.post_multiply( Mat4.translation([ 0, -2, 0 ]) );
                                        // In the constructor, we requested two tetrahedron shapes, one with flat shading and one with smooth.
        this.shapes.tetrahedron.draw( context, program_state, model_transform.times( funny_orbit ), this.materials.plastic );      // Show the flat tetrahedron.

        model_transform.post_multiply( Mat4.translation([ 0, -2, 0 ]) );
        this.shapes.bad_tetrahedron.draw( context, program_state, model_transform.times( funny_orbit ),   // Show the smooth tetrahedron.  It's worse.
                                            this.materials.plastic.override( Color.of( .5,.5,.5,1 ) ) );

                    // Draw three of the "windmill" shape.  The first one spins over time.  The second demonstrates a custom shader, because
                    // the material "fire" above was built from a different shader class than the others.  The third shows off transparency.
        model_transform.post_multiply( Mat4.translation([ 0, -2, 0 ]) );
        this.shapes.windmill       .draw( context, program_state, model_transform.times( tilt_spin ), this.materials.plastic );
        model_transform.post_multiply( Mat4.translation([ 0, -2, 0 ]) );
        this.shapes.windmill       .draw( context, program_state, model_transform,                    this.materials.fire    );
        model_transform.post_multiply( Mat4.translation([ 0, -2, 0 ]) );
        this.shapes.windmill       .draw( context, program_state, model_transform,                    this.materials.glass   );

                                   // Now to demonstrate some more useful (but harder to build) shapes:  A Cube and a Subdivision_Sphere.
                                   // If you look in those two classes they're a bit less trivial than the previous shapes.
        model_transform.post_multiply( Mat4.translation([ 0, -2, 0 ]) );                                         // Draw the ground plane:
        this.shapes.box.draw( context, program_state, model_transform.times( Mat4.scale([ 15,.1,15 ]) ), this.materials.plastic.override( green ) );

        model_transform = model_transform.times( Mat4.translation( Vec.of( 10,10,0 ) ) );                        // Move up off the ground.
                                                                     // Spin the coordinate system if the hover button hasn't been pressed:
        if( !this.hover ) model_transform = model_transform.times( Mat4.rotation( -this.t, Vec.of( 0,1,0 ) ) );
                                                                                              // Begin drawing a "creature" with two arms.   
        this.shapes.ball.draw( context, program_state, model_transform, this.materials.plastic.override( Color.of( .8,.8,.8,1 ) ) );
                                        // Placing shapes that barely touch each other requires knowing and adding half the length of each.
        model_transform = model_transform.times( Mat4.translation( Vec.of( 0,-( 1 + .2 ),0 ) ) );   
        this.shapes.box.draw( context, program_state, model_transform.times( Mat4.scale([ 3,.2,3 ]) ), this.materials.plastic.override( yellow ) );
                        // Each loop iteration, the following will draw the same thing on a different side due to a reflection:
        for( let side of [-1,1] )                                                     // For each of the two values -1 and 1, reflect the
        { let flipped = model_transform.times( Mat4.scale([ 1,1,side ]) );            // coordinate system (or not) depending on the value.
          this.draw_arm( context, program_state, flipped );                                   // Example of how to call your own function, passing
        }                                                                             // in your matrix.
      }
  }


export class Transforms_Sandbox extends Transforms_Sandbox_Base
{                                                    // **Transforms_Sandbox** is a Scene object that can be added to any display canvas.
                                                     // This particular scene is broken up into two pieces for easier understanding.
                                                     // See the other piece, Transforms_Sandbox_Base, if you need to see the setup code.
                                                     // The piece here exposes only the display() method, which actually places and draws 
                                                     // the shapes.  We isolate that code so it can be experimented with on its own.
                                                     // This gives you a very small code sandbox for editing a simple scene, and for
                                                     // experimenting with matrix transformations.
  display( context, program_state )
    {                                                // display():  Called once per frame of animation.  For each shape that you want to
                                                     // appear onscreen, place a .draw() call for it inside.  Each time, pass in a
                                                     // different matrix value to control where the shape appears.

                                                     // Variables that are in scope for you to use:
                                                     // this.shapes.box:   A vertex array object defining a 2x2x2 cube.
                                                     // this.shapes.ball:  A vertex array object defining a 2x2x2 spherical surface.
                                                     // this.materials.metal:    Selects a shader and draws with a shiny surface.
                                                     // this.materials.plastic:  Selects a shader and draws a more matte surface.
                                                     // this.lights:  A pre-made collection of Light objects.
                                                     // this.hover:  A boolean variable that changes when the user presses a button.
                                                     // program_state:  Information the shader needs for drawing.  Pass to draw().
                                                     // context:  Wraps the WebGL rendering context shown onscreen.  Pass to draw().                                                       

                                                // Call the setup code that we left inside the base class:
      super.display( context, program_state );

      /**********************************
      Start coding down here!!!!
      **********************************/         
                                                  // From here on down it's just some example shapes drawn for you -- freely 
                                                  // replace them with your own!  Notice the usage of the Mat4 functions 
                                                  // translation(), scale(), and rotation() to generate matrices, and the 
                                                  // function times(), which generates products of matrices.

      const blue = Color.of( 0,0,1,1 ), yellow = Color.of( 1,1,0,1 );

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
      this.shapes.ball.draw( context, program_state, model_transform, this.materials.metal.override( blue ) );
                                                                      
                                                                      // Prepare to draw another box object 2 levels deep 
                                                                      // within our hierarchy.
                                                                      // Find how much time has passed in seconds; we can use
                                                                      // time as an input when calculating new transforms:
      const t = this.t = program_state.animation_time/1000;

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
      this.shapes.box.draw( context, program_state, model_transform, this.materials.plastic.override( yellow ) );

                              // Note that our coordinate system stored in model_transform still has non-uniform scaling
                              // due to our scale() call.  This could have undesired effects for subsequent transforms;
                              // rotations will behave like shears.  To avoid this it may have been better to do the
                              // scale() last and then immediately unscale after the draw.  Or better yet, don't store
                              // the scaled matrix back in model_transform at all -- but instead in just a temporary
                              // expression that we pass into draw(), or store under a different name.
    }
}