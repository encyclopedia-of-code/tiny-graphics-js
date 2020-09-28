import {tiny, defs} from './common.js';

                                                  // Pull these names into this module's scope for convenience:
const { vec3, unsafe3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } = tiny;

export
const Body = defs.Body =
class Body
{                                   // **Body** can store and update the properties of a 3D body that incrementally
                                    // moves from its previous place due to velocities.  It conforms to the
                                    // approach outlined in the "Fix Your Timestep!" blog post by Glenn Fiedler.
  constructor( shape, material, size )
    { Object.assign( this,
             { shape, material, size } )
    }
  emplace( location_matrix, linear_velocity, angular_velocity, spin_axis = vec3( 0,0,0 ).randomized(1).normalized() )
    {                               // emplace(): assign the body's initial values, or overwrite them.
      this.center   = location_matrix.times( vec4( 0,0,0,1 ) ).to3();
      this.rotation = Mat4.translation( ...this.center.times( -1 ) ).times( location_matrix );
      this.previous = { center: this.center.copy(), rotation: this.rotation.copy() };
                                              // drawn_location gets replaced with an interpolated quantity:
      this.drawn_location = location_matrix;
      this.temp_matrix = Mat4.identity();
      return Object.assign( this, { linear_velocity, angular_velocity, spin_axis } )
    }
  advance( time_amount )
    {                           // advance(): Perform an integration (the simplistic Forward Euler method) to
                                // advance all the linear and angular velocities one time-step forward.
      this.previous = { center: this.center.copy(), rotation: this.rotation.copy() };
                                                 // Apply the velocities scaled proportionally to real time (time_amount):
                                                 // Linear velocity first, then angular:
      this.center = this.center.plus( this.linear_velocity.times( time_amount ) );
      this.rotation.pre_multiply( Mat4.rotation( time_amount * this.angular_velocity, ...this.spin_axis ) );
    }
  blend_rotation( alpha )
    {                        // blend_rotation(): Just naively do a linear blend of the rotations, which looks
                             // ok sometimes but otherwise produces shear matrices, a wrong result.

                                  // TODO:  Replace this function with proper quaternion blending, and perhaps
                                  // store this.rotation in quaternion form instead for compactness.
       return this.rotation.map( (x,i) => vec4( ...this.previous.rotation[i] ).mix( x, alpha ) );
    }
  blend_state( alpha )
    {                             // blend_state(): Compute the final matrix we'll draw using the previous two physical
                                  // locations the object occupied.  We'll interpolate between these two states as
                                  // described at the end of the "Fix Your Timestep!" blog post.
      this.drawn_location = Mat4.translation( ...this.previous.center.mix( this.center, alpha ) )
                                      .times( this.blend_rotation( alpha ) )
                                      .times( Mat4.scale( ...this.size ) );
    }
                                              // The following are our various functions for testing a single point,
                                              // p, against some analytically-known geometric volume formula
                                              // (within some margin of distance).
  static intersect_cube( p, margin = 0 )
    { return p.every( value => value >= -1 - margin && value <=  1 + margin )
    }
  static intersect_sphere( p, margin = 0 )
    { return p.dot( p ) < 1 + margin;
    }
  check_if_colliding( b, collider )
    {                                     // check_if_colliding(): Collision detection function.
                                          // DISCLAIMER:  The collision method shown below is not used by anyone; it's just very quick
                                          // to code.  Making every collision body an ellipsoid is kind of a hack, and looping
                                          // through a list of discrete sphere points to see if the ellipsoids intersect is *really* a
                                          // hack (there are perfectly good analytic expressions that can test if two ellipsoids
                                          // intersect without discretizing them into points).
      if ( this == b )
        return false;                     // Nothing collides with itself.
                                          // Convert sphere b to the frame where a is a unit sphere:
      const T = this.inverse.times( b.drawn_location, this.temp_matrix );

      const { intersect_test, points, leeway } = collider;
                                          // For each vertex in that b, shift to the coordinate frame of
                                          // a_inv*b.  Check if in that coordinate frame it penetrates
                                          // the unit sphere at the origin.  Leave some leeway.
      return points.arrays.position.some( p =>
        intersect_test( T.times( p.to4(1) ).to3(), leeway ) );
    }
}


export
const Simulation = defs.Simulation =
class Simulation extends Component
{                                         // **Simulation** manages the stepping of simulation time.  Subclass it when making
                                          // a Component that is a physics demo.  This technique is careful to totally decouple
                                          // the simulation from the frame rate (see below).
  constructor()
    { super();
      Object.assign( this, { time_accumulator: 0, time_scale: 1, t: 0, dt: 1/20, bodies: [], steps_taken: 0 } );
    }
  simulate( frame_time )
    {                                     // simulate(): Carefully advance time according to Glenn Fiedler's
                                          // "Fix Your Timestep" blog post.
                                          // This line gives ourselves a way to trick the simulator into thinking
                                          // that the display framerate is running fast or slow:
      frame_time = this.time_scale * frame_time;

                                          // Avoid the spiral of death; limit the amount of time we will spend
                                          // computing during this timestep if display lags:
      this.time_accumulator += Math.min( frame_time, 0.1 );
                                          // Repeatedly step the simulation until we're caught up with this frame:
      while ( Math.abs( this.time_accumulator ) >= this.dt )
      {                                                       // Single step of the simulation for all bodies:
        this.update_state( this.dt );
        for( let b of this.bodies )
          b.advance( this.dt );
                                          // Following the advice of the article, de-couple
                                          // our simulation time from our frame rate:
        this.t                += Math.sign( frame_time ) * this.dt;
        this.time_accumulator -= Math.sign( frame_time ) * this.dt;
        this.steps_taken++;
      }
                                            // Store an interpolation factor for how close our frame fell in between
                                            // the two latest simulation time steps, so we can correctly blend the
                                            // two latest states and display the result.
      let alpha = this.time_accumulator / this.dt;
      for( let b of this.bodies ) b.blend_state( alpha );
    }
  make_control_panel()
    {                       // make_control_panel(): Create the buttons for interacting with simulation time.
      this.key_triggered_button( "Speed up time", [ "Shift","T" ], () => this.time_scale *= 5           );
      this.key_triggered_button( "Slow down time",        [ "t" ], () => this.time_scale /= 5           ); this.new_line();
      this.live_string( box => { box.textContent = "Time scale: "  + this.time_scale                  } ); this.new_line();
      this.live_string( box => { box.textContent = "Fixed simulation time step size: "  + this.dt     } ); this.new_line();
      this.live_string( box => { box.textContent = this.steps_taken + " timesteps were taken so far." } );
    }
  render_animation( context, shared_uniforms )
    {                                     // display(): advance the time and state of our whole simulation.
      if( shared_uniforms.animate )
        this.simulate( shared_uniforms.animation_delta_time );
                                          // Draw each shape at its current location:
      for( let b of this.bodies )
        b.shape.draw( context, shared_uniforms, b.drawn_location, b.material );
    }
  update_state( dt )      // update_state(): Your subclass of Simulation has to override this abstract function.
    { throw "Override this" }
}


export
const Test_Data = defs.Test_Data =
class Test_Data
{                             // **Test_Data** pre-loads some Shapes and Textures that other Scenes can borrow.
  constructor()
    { this.textures = { rgb   : new Texture( "assets/rgb.jpg" ),
                        earth : new Texture( "assets/earth.gif" ),
                        grid  : new Texture( "assets/grid.png" ),
                        stars : new Texture( "assets/stars.png" ),
                        text  : new Texture( "assets/text.png" ),
                      }
      this.shapes = { donut  : new defs.Torus          ( 15, 15, [[0,2],[0,1]] ),
                      cone   : new defs.Closed_Cone    ( 4, 10,  [[0,2],[0,1]] ),
                      capped : new defs.Capped_Cylinder( 4, 12,  [[0,2],[0,1]] ),
                      ball   : new defs.Subdivision_Sphere( 3,   [[0,1],[0,1]] ),
                      cube   : new defs.Cube(),
                      prism  : new ( defs.Capped_Cylinder   .prototype.make_flat_shaded_version() )( 10, 10, [[0,2],[0,1]] ),
                      gem    : new ( defs.Subdivision_Sphere.prototype.make_flat_shaded_version() )( 2 ),
                      donut2 : new ( defs.Torus             .prototype.make_flat_shaded_version() )( 20, 20, [[0,2],[0,1]] ),
                    };
    }
  random_shape( shape_list = this.shapes )
    {                                       // random_shape():  Extract a random shape from this.shapes.
      const shape_names = Object.keys( shape_list );
      return shape_list[ shape_names[ ~~( shape_names.length * Math.random() ) ] ]
    }
}


export class Inertia_Demo extends Simulation
{                                           // ** Inertia_Demo** demonstration: This scene lets random initial momentums
                                            // carry several bodies until they fall due to gravity and bounce.
  constructor()
    { super();
      this.data = new Test_Data();
      this.shapes = { ...this.data.shapes };
      this.shapes.square = new defs.Square();
      const shader = new defs.Fake_Bump_Map( 1 );
      this.material = { shader, color: color( .4,.8,.4,1 ), ambient:.4, texture: this.data.textures.stars }
    }
  random_color() { return { ...this.material, color: color( .6,.6*Math.random(),.6*Math.random(),1 ) } }
  update_state( dt )
    {                 // update_state():  Override the base time-stepping code to say what this particular
                      // scene should do to its bodies every frame -- including applying forces.
                      // Generate additional moving bodies if there ever aren't enough:
      while( this.bodies.length < 150 )
        this.bodies.push( new Body( this.data.random_shape(), this.random_color(), vec3( 1,1+Math.random(),1 ) )
              .emplace( Mat4.translation( ...vec3( 0,15,0 ).randomized(10) ),
                        vec3( 0,-1,0 ).randomized(2).normalized().times(3), Math.random() ) );

      for( let b of this.bodies )
      {                                         // Gravity on Earth, where 1 unit in world space = 1 meter:
        b.linear_velocity[1] += dt * -9.8;
                                                // If about to fall through floor, reverse y velocity:
        if( b.center[1] < -8 && b.linear_velocity[1] < 0 )
          b.linear_velocity[1] *= -.8;
      }
                                                      // Delete bodies that stop or stray too far away:
      this.bodies = this.bodies.filter( b => b.center.norm() < 50 && b.linear_velocity.norm() > 2 );
    }
  render_animation( context, shared_uniforms )
    {                                 // display(): Draw everything else in the scene besides the moving bodies.
      super.render_animation( context, shared_uniforms );

      if( !context.scratchpad.controls )
        { this.animated_children.push( context.scratchpad.controls = new defs.Movement_Controls() );
          this.animated_children.push( new defs.Shared_Uniforms_Viewer() );
          Shader.assign_camera( Mat4.translation( 0,0,-50 ), shared_uniforms );    // Locate the camera here (inverted matrix).
        }
      shared_uniforms.projection_transform = Mat4.perspective( Math.PI/4, context.width/context.height, 1, 500 );
      shared_uniforms.lights = [ defs.Phong_Shader.light_source( vec4( 0,-5,-10,1 ), color( 1,1,1,1 ), 100000 ) ];
                                                                                              // Draw the ground:
      this.shapes.square.draw( context, shared_uniforms, Mat4.translation( 0,-10,0 )
                                       .times( Mat4.rotation( Math.PI/2,   1,0,0 ) ).times( Mat4.scale( 50,50,1 ) ),
                               { ...this.material, texture: this.data.textures.earth } );
    }
  render_documentation()
    { this.document_region.innerHTML += `<p>This demo lets random initial momentums carry bodies until they fall and bounce.  It shows a good way to do incremental movements, which are crucial for making objects look like they're moving on their own instead of following a pre-determined path.  Animated objects look more real when they have inertia and obey physical laws, instead of being driven by simple sinusoids or periodic functions.
                                     </p><p>For each moving object, we need to store a model matrix somewhere that is permanent (such as inside of our class) so we can keep consulting it every frame.  As an example, for a bowling simulation, the ball and each pin would go into an array (including 11 total matrices).  We give the model transform matrix a \"velocity\" and track it over time, which is split up into linear and angular components.  Here the angular velocity is expressed as an Euler angle-axis pair so that we can scale the angular speed how we want it.
                                     </p><p>The forward Euler method is used to advance the linear and angular velocities of each shape one time-step.  The velocities are not subject to any forces here, but just a downward acceleration.  Velocities are also constrained to not take any objects under the ground plane.
                                     </p><p>This scene extends class Simulation, which carefully manages stepping simulation time for any scenes that subclass it.  It totally decouples the whole simulation from the frame rate, following the suggestions in the blog post <a href=\"https://gafferongames.com/post/fix_your_timestep/\" target=\"blank\">\"Fix Your Timestep\"</a> by Glenn Fielder.  Buttons allow you to speed up and slow down time to show that the simulation's answers do not change.</p>`;
    }
}


export class Collision_Demo extends Simulation
{                                               // **Collision_Demo** demonstration: Detect when some flying objects
                                                // collide with one another, coloring them red.
  constructor()
    { super();
      this.data = new Test_Data();
      this.shapes = { ...this.data.shapes };
                                  // Make simpler dummy shapes for representing all other shapes during collisions:
      this.colliders = [
        { intersect_test: Body.intersect_sphere, points: new defs.Subdivision_Sphere(1), leeway: .5 },
        { intersect_test: Body.intersect_sphere, points: new defs.Subdivision_Sphere(2), leeway: .3 },
        { intersect_test: Body.intersect_cube,   points: new defs.Cube(),                leeway: .1 }
                       ];
      this.collider_selection = 0;
                                                          // Materials:
      const phong = new defs.Phong_Shader ( 1 );
      const bump  = new defs.Fake_Bump_Map( 1 )
      this.inactive_color = { shader: bump, color: color( .5,.5,.5,1 ), ambient: .2,
                                           texture: this.data.textures.rgb };
      this.active_color = { ...this.inactive_color, color: color( .5,0,0,1 ), ambient: .5 };
      this.bright = { shader: phong, color: color( 0,1,0,.5 ), ambient: 1 };
    }
  make_control_panel()
    { this.key_triggered_button( "Previous collider", [ "b" ], this.decrease );
      this.key_triggered_button( "Next",              [ "n" ], this.increase );
      this.new_line();
      super.make_control_panel();
    }
  increase() { this.collider_selection = Math.min( this.collider_selection + 1, this.colliders.length-1 ); }
  decrease() { this.collider_selection = Math.max( this.collider_selection - 1, 0 ) }
  update_state( dt, num_bodies = 40 )
    {                 // update_state():  Override the base time-stepping code to say what this particular
                      // scene should do to its bodies every frame -- including applying forces.
                                                              // Generate moving bodies:
      while( this.bodies.length < num_bodies )
        this.bodies.push( new Body( this.data.random_shape(), undefined, vec3( 1,5,1 ) )
              .emplace(         Mat4.translation( ...unsafe3( 0,0,0 ).randomized(30) )
                        .times( Mat4.rotation( Math.PI, ...unsafe3( 0,0,0 ).randomized(1).normalized() ) ),
                        unsafe3( 0,0,0 ).randomized(20), Math.random() ) );
                                      // Sometimes we delete some so they can re-generate as new ones:
      this.bodies = this.bodies.filter( b => ( Math.random() > .01 ) || b.linear_velocity.norm() > 1 );

      const collider = this.colliders[ this.collider_selection ];
                                                    // Loop through all bodies (call each "a"):
      for( let a of this.bodies )
        {                                                 // Cache the inverse of matrix of body "a" to save time.
          a.inverse = Mat4.inverse( a.drawn_location );

          a.linear_velocity = a.linear_velocity.minus( a.center.times( dt ) );            // Apply a small centripetal force to everything.
          a.material = this.inactive_color;       // Default color: white

          if( a.linear_velocity.norm() == 0 )
            continue;
                                                      // *** Collision process is here ***
                                                      // Loop through all bodies again (call each "b"):
          for( let b of this.bodies )
          {                               // Pass the two bodies and the collision shape to check_if_colliding():
            if( !a.check_if_colliding( b, collider ) )
              continue;
                                          // If we get here, we collided, so turn red and zero out the
                                          // velocity so they don't inter-penetrate any further.
            a.material = this.active_color;
            a.linear_velocity  = vec3( 0,0,0 );
            a.angular_velocity = 0;
          }
        }
    }
  render_animation( context, shared_uniforms )
    {                                 // display(): Draw everything else in the scene besides the moving bodies.
      super.render_animation( context, shared_uniforms );
      if( !context.scratchpad.controls )
        { this.animated_children.push( context.scratchpad.controls = new defs.Movement_Controls() );
          this.animated_children.push( new defs.Shared_Uniforms_Viewer() );
          Shader.assign_camera( Mat4.translation( 0,0,-50 ), shared_uniforms );    // Locate the camera here (inverted matrix).
        }
      shared_uniforms.projection_transform = Mat4.perspective( Math.PI/4, context.width/context.height, 1, 500 );
      shared_uniforms.lights = [ defs.Phong_Shader.light_source( vec4( .7,1.5,2,0 ), color( 1,1,1,1 ), 100000 ) ];

                                                               // Draw an extra bounding sphere around each drawn shape to show
                                                               // the physical shape that is really being collided with:
      const { points, leeway } = this.colliders[ this.collider_selection ];
      const size = vec3( 1 + leeway, 1 + leeway, 1 + leeway );
      for( let b of this.bodies )
        points.draw( context, shared_uniforms, b.drawn_location.times( Mat4.scale( ...size ) ), this.bright, "LINE_STRIP" );
    }
  render_documentation()
    { this.document_region.innerHTML += `<p>This demo detects when some flying objects collide with one another, coloring them red when they do.  For a simpler demo that shows physics-based movement without objects that hit one another, see the demo called Inertia_Demo.
                                     </p><p>Detecting intersections between pairs of stretched out, rotated volumes can be difficult, but is made easier by being in the right coordinate space.  The collision algorithm treats every shape like an ellipsoid roughly conforming to the drawn shape, and with the same transformation matrix applied.  Here these collision volumes are drawn in translucent purple alongside the real shape so that you can see them.
                                     </p><p>This particular collision method is extremely short to code, as you can observe in the method \"check_if_colliding\" in the class called Body below.  It has problems, though.  Making every collision body a stretched sphere is a hack and doesn't handle the nuances of the actual shape being drawn, such as a cube's corners that stick out.  Looping through a list of discrete sphere points to see if the volumes intersect is *really* a hack (there are perfectly good analytic expressions that can test if two ellipsoids intersect without discretizing them into points, although they involve solving a high order polynomial).   On the other hand, for non-convex shapes a real collision method cannot be exact either, and is usually going to have to loop through a list of discrete tetrahedrons defining the shape anyway.
                                     </p><p>This scene extends class Simulation, which carefully manages stepping simulation time for any scenes that subclass it.  It totally decouples the whole simulation from the frame rate, following the suggestions in the blog post <a href=\"https://gafferongames.com/post/fix_your_timestep/\" target=\"blank\">\"Fix Your Timestep\"</a> by Glenn Fielder.  Buttons allow you to speed up and slow down time to show that the simulation's answers do not change.</p>`;
    }
}