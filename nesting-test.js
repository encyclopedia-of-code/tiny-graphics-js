import {tiny, defs} from './common.js';
const { Vec, Mat, Mat4, Color, Light, 
        Shape, Shader, Scene, Texture } = tiny;           // Pull these names into this module's scope for convenience.
const { Triangle, Square, Tetrahedron, Windmill, Cube, Subdivision_Sphere } = defs;

export class Nesting_Test extends Scene    // This Scene can be added to a display canvas.  This particular one
  {                                                 // sets up the machinery to draw a simple scene demonstrating a few concepts.
                                                    // Scroll down to the display() method at the bottom to see where the shapes are drawn.
    constructor( webgl_manager )             // The scene begins by requesting the camera, shapes, and materials it will need.
      { super( webgl_manager );              // First, include a couple other helpful components, including one that moves you around:
        if( !webgl_manager.globals.has_controls   ) 
          this.children.push( new defs.Movement_Controls( webgl_manager ) ); 


        this.test_scene = new defs.Tutorial_Animation( webgl_manager )

          
                // Define the global camera and projection matrices, which are stored in a scratchpad for globals.  The projection is special 
                // because it determines how depth is treated when projecting 3D points onto a plane.  The function perspective() makes one.
                // Its input arguments are field of view, aspect ratio, and distances to the near plane and far plane.
        webgl_manager.globals.graphics_state.set_camera( Mat4.translation([ 0,0,-30 ]) );    // Locate the camera here (inverted matrix).
        webgl_manager.globals.graphics_state.projection_transform = Mat4.perspective( Math.PI/4, webgl_manager.width/webgl_manager.height, .1, 1000 );

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
      { 
        new Canvas_Widget( document_element, this.test_scene );
      }
    draw_arm( context, graphics_state, model_transform )                   // An example of how to break up the work of drawing into other functions.
      { const arm = model_transform.times( Mat4.translation([ 0,0,3+1 ]) );
        this.shapes.ball.draw( context, graphics_state, arm, this.materials.plastic.override( Color.of( 0,0,1,.7 ) ) );
      }
    display( context, graphics_state )
      { let model_transform = Mat4.identity();      // This will be a temporary matrix that helps us draw most shapes.
                                                    // It starts over as the identity every single frame - coordinate axes at the origin.
        graphics_state.lights = this.lights;        // Override graphics_state with the default lights of this class. 

        const yellow = Color.of( 1,1,0,1 ), gray = Color.of( .5,.5,.5,1 ), green = Color.of( 0,.5,0,1 );  
       /**********************************
        Start coding down here!!!!
        **********************************/         // From here on down it's just some example shapes drawn for you -- freely replace them 
                                                    // with your own!  Notice the usage of the functions translation(), scale(), and rotation()
                                                    // to generate matrices, and the functions times(), which generates products of matrices.

        model_transform = model_transform.times( Mat4.translation([ 0, 5, 0 ]) );
        this.shapes.triangle.draw( context, graphics_state, model_transform, this.materials.stars );   // Draw the top triangle.

        model_transform = model_transform.times( Mat4.translation([ 0, -2, 0 ]) );  // Tweak our coordinate system downward for the next shape.
        this.shapes.strip.draw( context, graphics_state, model_transform, this.materials.plastic.override( gray )  );      // Draw the square.
                                                                // Find how much time has passed in seconds. Use that as input to build
        const t = this.t = graphics_state.animation_time/1000;  // and store a couple rotation matrices that vary over time.
        const tilt_spin   = Mat4.rotation( 12*t, Vec.of(          .1,          .8,             .1 ) ),
              funny_orbit = Mat4.rotation(  2*t, Vec.of( Math.cos(t), Math.sin(t), .7*Math.cos(t) ) );

                // All the shapes in a scene can share influence of the same pair of lights.  Alternatively, here's what happens when you
                // use different lights on part of a scene.  All the shapes below this line of code will use these moving lights instead.
        graphics_state.lights = [ new Light( tilt_spin.times( Vec.of(  30,  30,  34, 1 ) ), Color.of( 0, .4, 0, 1 ), 100000               ),
                                  new Light( tilt_spin.times( Vec.of( -10, -20, -14, 0 ) ), Color.of( 1, 1, .3, 1 ), 100*Math.cos( t/10 ) ) ];

                          // The post_multiply() function is like times(), but be careful with it; it modifies the originally stored matrix in
                          // place rather than generating a new matrix, which could throw off your attempts to maintain a history of matrices. 
        model_transform.post_multiply( Mat4.translation([ 0, -2, 0 ]) );
                                        // In the constructor, we requested two tetrahedron shapes, one with flat shading and one with smooth.
        this.shapes.tetrahedron.draw( context, graphics_state, model_transform.times( funny_orbit ), this.materials.plastic );      // Show the flat tetrahedron.

        model_transform.post_multiply( Mat4.translation([ 0, -2, 0 ]) );
        this.shapes.bad_tetrahedron.draw( context, graphics_state, model_transform.times( funny_orbit ),   // Show the smooth tetrahedron.  It's worse.
                                            this.materials.plastic.override( Color.of( .5,.5,.5,1 ) ) );

                    // Draw three of the "windmill" shape.  The first one spins over time.  The second demonstrates a custom shader, because
                    // the material "fire" above was built from a different shader class than the others.  The third shows off transparency.
        model_transform.post_multiply( Mat4.translation([ 0, -2, 0 ]) );
        this.shapes.windmill       .draw( context, graphics_state, model_transform.times( tilt_spin ), this.materials.plastic );
        model_transform.post_multiply( Mat4.translation([ 0, -2, 0 ]) );
        this.shapes.windmill       .draw( context, graphics_state, model_transform,                    this.materials.fire    );
        model_transform.post_multiply( Mat4.translation([ 0, -2, 0 ]) );
        this.shapes.windmill       .draw( context, graphics_state, model_transform,                    this.materials.glass   );

                                   // Now to demonstrate some more useful (but harder to build) shapes:  A Cube and a Subdivision_Sphere.
                                   // If you look in those two classes they're a bit less trivial than the previous shapes.
        model_transform.post_multiply( Mat4.translation([ 0, -2, 0 ]) );                                         // Draw the ground plane:
        this.shapes.box.draw( context, graphics_state, model_transform.times( Mat4.scale([ 15,.1,15 ]) ), this.materials.plastic.override( green ) );

        model_transform = model_transform.times( Mat4.translation( Vec.of( 10,10,0 ) ) );                        // Move up off the ground.
                                                                     // Spin the coordinate system if the hover button hasn't been pressed:
        if( !this.hover ) model_transform = model_transform.times( Mat4.rotation( -this.t, Vec.of( 0,1,0 ) ) );
                                                                                              // Begin drawing a "creature" with two arms.   
        this.shapes.ball.draw( context, graphics_state, model_transform, this.materials.plastic.override( Color.of( .8,.8,.8,1 ) ) );
                                        // Placing shapes that barely touch each other requires knowing and adding half the length of each.
        model_transform = model_transform.times( Mat4.translation( Vec.of( 0,-( 1 + .2 ),0 ) ) );   
        this.shapes.box.draw( context, graphics_state, model_transform.times( Mat4.scale([ 3,.2,3 ]) ), this.materials.plastic.override( yellow ) );
                        // Each loop iteration, the following will draw the same thing on a different side due to a reflection:
        for( let side of [-1,1] )                                                     // For each of the two values -1 and 1, reflect the
        { let flipped = model_transform.times( Mat4.scale([ 1,1,side ]) );            // coordinate system (or not) depending on the value.
          this.draw_arm( context, graphics_state, flipped );                                   // Example of how to call your own function, passing
        }                                                                             // in your matrix.
      }
  }