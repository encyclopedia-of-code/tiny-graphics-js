import * as classes from './common.js';
Object.assign( window, classes );                                // Store these classes in global scope so we can use them anywhere.
window.classes = Object.assign( {}, window.classes, classes );   // Also copy them to window.classes so we can list them all out anytime.

export class Body          // Store and update the properties of a 3D body that incrementally moves from its previous place due to velocities.
{ constructor(               shape, material, size )
    { Object.assign( this, { shape, material, size } ) }
  emplace( location_matrix, linear_velocity, angular_velocity, spin_axis = Vec.of(0,0,0).randomized(1).normalized() )
    { this.center   = location_matrix.times( Vec.of( 0,0,0,1 ) ).to3();
      this.rotation = Mat4.translation( this.center.times( -1 ) ).times( location_matrix );
      this.previous = { center: this.center.copy(), rotation: this.rotation.copy() };
      this.drawn_location = location_matrix;                                      // This gets replaced with an interpolated quantity.
      return Object.assign( this, { linear_velocity, angular_velocity, spin_axis } )
    }
  advance( time_amount )   // Perform the forward Euler method to advance the linear and angular velocities one time-step.
    { this.previous = { center: this.center.copy(), rotation: this.rotation.copy() };
                                                              // Apply the velocities scaled proportionally to real time (time_amount).
      this.center = this.center.plus( this.linear_velocity.times( time_amount ) );                        // Apply linear velocity.
      this.rotation.pre_multiply( Mat4.rotation( time_amount * this.angular_velocity, this.spin_axis ) ); // Apply angular velocity.
    }
  blend_rotation( alpha )         // We're naively just doing a linear blend of the rotations.  This looks
    {                             // ok sometimes but otherwise produces shear matrices, a wrong result.

                                  // TODO:  Replace this function with proper quaternion blending, and perhaps 
                                  // store this.rotation in quaternion form instead for compactness.
       return this.rotation.map( (x,i) => Vec.from( this.previous.rotation[i] ).mix( x, alpha ) );
    }
  blend_state( alpha )            // Compute the final matrix we'll draw using the previous two physical locations
                                  // the object occupied.  We'll interpolate between these two states as described
                                  // at the end of the "Fix Your Timestep!" article by Glenn Fiedler.
    { this.drawn_location = Mat4.translation( this.previous.center.mix( this.center, alpha ) )
                                      .times( this.blend_rotation( alpha ) )
                                      .times( Mat4.scale( this.size ) );
    }
  check_if_colliding( b, a_inv, shape )   // Collision detection function.
                                          // DISCLAIMER:  The collision method shown below is not used by anyone; it's just very quick 
                                          // to code.  Making every collision body an ellipsoid is kind of a hack, and looping 
                                          // through a list of discrete sphere points to see if the ellipsoids intersect is *really* a 
                                          // hack (there are perfectly good analytic expressions that can test if two ellipsoids 
                                          // intersect without discretizing them into points).
    { if ( this == b ) return false;      // Nothing collides with itself.
      var T = a_inv.times( b.drawn_location );                      // Convert sphere b to the frame where a is a unit sphere.
      for( let p of shape.arrays.position )                         // For each vertex in that b,
        { var Tp = T.times( p.to4(1) ).to3();                       // Shift to the coordinate frame of a_inv*b
          if( Tp.dot( Tp ) < 1.1 )                                  // Check if in that coordinate frame it penetrates the unit sphere
            return true;                                            // at the origin.  Leave .1 of leeway.     
        }
      return false;
    }
}


export class Simulation extends Scene         // Simulation manages the stepping of simulation time.  Subclass it when making
{ constructor( webgl_manager )                          // a Scene that is a physics demo.  This technique is careful to totally
    { super(   webgl_manager );                         // decouple the simulation from the frame rate.
      Object.assign( this, { time_accumulator: 0, time_scale: 1, t: 0, dt: 1/20, bodies: [], steps_taken: 0 } );            
    }
  simulate( frame_time )                              // Carefully advance time according to Glenn Fiedler's "Fix Your Timestep" blog post.
    { frame_time = this.time_scale * frame_time;                   // This line lets us create the illusion to the simulator that 
                                                                   // the display framerate is running fast or slow.
                                                                   // Avoid the spiral of death; limit the amount of time we will spend 
      this.time_accumulator += Math.min( frame_time, 0.1 );	       // computing during this timestep if display lags.
      while ( Math.abs( this.time_accumulator ) >= this.dt )       // Repeatedly step the simulation until we're caught up with this frame.
      { this.update_state( this.dt );                              // Single step of the simulation for all bodies.
        for( let b of this.bodies ) b.advance( this.dt );
          
        this.t                += Math.sign( frame_time ) * this.dt;   // Following the advice of the article, de-couple
        this.time_accumulator -= Math.sign( frame_time ) * this.dt;   // our simulation time from our frame rate.
        this.steps_taken++;
      }
      let alpha = this.time_accumulator / this.dt;                 // Store an interpolation factor for how close our frame fell in between
      for( let b of this.bodies ) b.blend_state( alpha );          // the two latest simulation time steps, so we can correctly blend the
    }                                                              // two latest states and display the result.
  make_control_panel()
    { this.key_triggered_button( "Speed up time", [ "Shift","T" ], function() { this.time_scale *= 5 } );
      this.key_triggered_button( "Slow down time",        [ "t" ], function() { this.time_scale /= 5 } );        this.new_line();
      this.live_string( box => { box.textContent = "Time scale: "  + this.time_scale                              } ); this.new_line();
      this.live_string( box => { box.textContent = "Fixed simulation time step size: "  + this.dt                 } ); this.new_line();
      this.live_string( box => { box.textContent = this.steps_taken + " timesteps were taken so far."             } );
    }
  display( context, graphics_state )
    { if( this.globals.animate ) 
        this.simulate( graphics_state.animation_delta_time );                 // Advance the time and state of our whole simulation.
      for( let b of this.bodies ) 
        b.shape.draw( context, graphics_state, b.drawn_location, b.material );   // Draw each shape at its current location.
    }
  update_state( dt ) { throw "Override this" }          // Your subclass of Simulation has to override this abstract function.
}


export class Test_Data
{ constructor( webgl_manager )
    { this.textures = { rgb   : new Texture( "assets/rgb.jpg"   ),
                        earth : new Texture( "assets/earth.gif" ),
                        grid  : new Texture( "assets/grid.png"  ),
                        stars : new Texture( "assets/stars.png" ),
                        text  : new Texture( "assets/text.png"  )
                      }
      this.shapes = { donut  : new Torus          ( 15, 15 ),
                       cone   : new Closed_Cone    ( 4, 10 ),
                       capped : new Capped_Cylinder( 4, 12 ),
                       ball   : new Subdivision_Sphere( 3 ),
                       cube   : new Cube(),
                       axis   : new Axis_Arrows(),
                       prism  : new ( Capped_Cylinder   .prototype.make_flat_shaded_version() )( 10, 10 ),
                       gem    : new ( Subdivision_Sphere.prototype.make_flat_shaded_version() )( 2 ),
                       donut  : new ( Torus             .prototype.make_flat_shaded_version() )( 20, 20 ) 
                    };
      const lights = webgl_manager.globals.graphics_state.lights;
      if( !lights || !lights.length ) webgl_manager.globals.graphics_state.lights = [ new Light( Vec.of( 7,15,20,0 ), Color.of( 1,1,1,1 ), 100000 ) ];
 
    }
  random_shape( shape_list = this.shapes )
    { const shape_names = Object.keys( shape_list );
      return shape_list[ shape_names[ ~~( shape_names.length * Math.random() ) ] ]
    }
}


export class Inertia_Demo extends Simulation    // Demonstration: Let random initial momentums carry bodies until they fall and bounce.
{ constructor(  webgl_manager )
    { super(    webgl_manager );
      if( !webgl_manager.globals.has_controls   )
        this.children.push( new Movement_Controls( webgl_manager ) );
      if( !webgl_manager.globals.has_info_table )
        this.children.push( new Global_Info_Table( webgl_manager ) );
      
      webgl_manager.globals.graphics_state.set_camera( Mat4.translation([ 0,0,-50 ]) );
      webgl_manager.globals.graphics_state.projection_transform = Mat4.perspective( Math.PI/4, webgl_manager.width/webgl_manager.height, 1, 500 );
      
      this.data = new Test_Data( webgl_manager );
      this.shapes = Object.assign( {}, this.data.shapes );
      this.shapes.square = new Square();
      this.material = new Phong_Shader( webgl_manager ).material({ ambient:.4, texture: this.data.textures.stars })
                                                       .override( Color.of( .4,.8,.4,1 ) );
    }
  random_color() { return this.material.override( Color.of( .6,.6*Math.random(),.6*Math.random(),1 ) ); }
  update_state( dt )
    { while( this.bodies.length < 150 )         // Generate moving bodies:
        this.bodies.push( new Body( this.data.random_shape(), this.random_color(), Vec.of( 1,1+Math.random(),1 ) )
              .emplace( Mat4.translation( Vec.of(0,15,0).randomized(10) ),
                        Vec.of(0,-1,0).randomized(2).normalized().times(3), Math.random() ) );
      
      for( let b of this.bodies )
      { b.linear_velocity[1] += dt * -9.8;                      // Gravity on Earth, where 1 unit in world space = 1 meter.
        if( b.center[1] < -8 && b.linear_velocity[1] < 0 )
          b.linear_velocity[1] *= -.8;                          // If about to fall through floor, reverse y velocity.
      }                                          // Delete bodies that stop or stray too far away.
      this.bodies = this.bodies.filter( b => b.center.norm() < 50 && b.linear_velocity.norm() > 2 );
    }
  display( context, graphics_state )                   // Just draw the ground.
    { super.display( context, graphics_state );
      this.shapes.square.draw( context, graphics_state, Mat4.translation([ 0,-10,0 ])
                                       .times( Mat4.rotation( Math.PI/2, Vec.of( 1,0,0 ) ) ).times( Mat4.scale([ 50,50,1 ]) ),
                               this.material.override( this.data.textures.earth ) );
    }
  show_explanation( document_element )
    { document_element.innerHTML += `<p>This demo lets random initial momentums carry bodies until they fall and bounce.  It shows a good way to do incremental movements, which are crucial for making objects look like they're moving on their own instead of following a pre-determined path.  Animated objects look more real when they have inertia and obey physical laws, instead of being driven by simple sinusoids or periodic functions.
                                     </p><p>For each moving object, we need to store a model matrix somewhere that is permanent (such as inside of our class) so we can keep consulting it every frame.  As an example, for a bowling simulation, the ball and each pin would go into an array (including 11 total matrices).  We give the model transform matrix a \"velocity\" and track it over time, which is split up into linear and angular components.  Here the angular velocity is expressed as an Euler angle-axis pair so that we can scale the angular speed how we want it.
                                     </p><p>The forward Euler method is used to advance the linear and angular velocities of each shape one time-step.  The velocities are not subject to any forces here, but just a downward acceleration.  Velocities are also constrained to not take any objects under the ground plane.
                                     </p><p>This scene extends class Simulation, which carefully manages stepping simulation time for any scenes that subclass it.  It totally decouples the whole simulation from the frame rate, following the suggestions in the blog post <a href=\"https://gafferongames.com/post/fix_your_timestep/\" target=\"blank\">\"Fix Your Timestep\"</a> by Glenn Fielder.  Buttons allow you to speed up and slow down time to show that the simulation's answers do not change.</p>`;
    }
}


export class Collision_Demo extends Simulation    // Demonstration: Detect when some flying objects
{ constructor(  webgl_manager )                   // collide with one another, coloring them red.
    { super(    webgl_manager );
      if( !webgl_manager.globals.has_controls   )
        this.children.push( new Movement_Controls( webgl_manager ) );
      if( !webgl_manager.globals.has_info_table )
        this.children.push( new Global_Info_Table( webgl_manager ) );       

      webgl_manager.globals.graphics_state.set_camera( Mat4.translation([ 0,0,-50 ]) );
      webgl_manager.globals.graphics_state.projection_transform = Mat4.perspective( Math.PI/4, webgl_manager.width/webgl_manager.height, 1, 500 );

      this.data = new Test_Data( webgl_manager );
      this.shapes = Object.assign( {}, this.data.shapes );
      this.collider = new Subdivision_Sphere(1);        // Make a simpler dummy shape for representing all other shapes during collisions.

      this.shader = new Phong_Shader();
      this.inactive_color = this.shader.material({ ambient: .2, texture: this.data.textures.rgb })
                                              .override( Color.of( .5,.5,.5,1 ) );
      this.active_color = this.inactive_color.override( { color: Color.of( .5,0,0,1 ), ambient: .5 } );
      this.transparent = this.shader.material({ ambient: .4 }).override( Color.of( 1,0,1,.1 ) );
    }
  update_state( dt, num_bodies = 40 )                                                            
    { if   ( this.bodies.length > num_bodies )  this.bodies = this.bodies.splice( 0, num_bodies );                // Max of 20 bodies
      while( this.bodies.length < num_bodies )                                        // Generate moving bodies:
        this.bodies.push( new Body( this.data.random_shape(), undefined, Vec.of( 1,5,1 ) )
              .emplace(         Mat4.translation( Vec.of( 0,0,0 ).randomized(30) )
                        .times( Mat4.rotation( Math.PI, Vec.of( 0,0,0 ).randomized(1).normalized() ) ),
                        Vec.of( 0,0,0 ).randomized(20), Math.random() ) );

                                      // Sometimes we delete some so they can re-generate as new ones:                            
      this.bodies = this.bodies.filter( b => ( Math.random() > .01 ) || b.linear_velocity.norm() > 1 );  
      
      for( let b of this.bodies )
        { var b_inv = Mat4.inverse( b.drawn_location );           // Cache this quantity to save time.

          b.linear_velocity = b.linear_velocity.minus( b.center.times( dt ) );            // Apply a small centripetal force to everything.
          b.material = this.inactive_color;       // Default color: white

          for( let c of this.bodies )                                      // *** Collision process starts here ***
                                              // Pass the two bodies and the collision shape to check_if_colliding():
            if( b.linear_velocity.norm() > 0 && b.check_if_colliding( c, b_inv, this.collider ) )
            { b.material = this.active_color;                          // If we get here, we collided, so turn red.
              b.linear_velocity  = Vec.of( 0,0,0 );                    // Zero out the velocity so they don't inter-penetrate any further.
              b.angular_velocity = 0;
            }
        }
    }
  display( context, graphics_state )           
    { super.display( context, graphics_state );                   // Draw an extra bounding sphere around each drawn shape to
      for( let b of this.bodies )                                 // show the physical shape that is really being collided with:
        this.data.shapes.ball.draw( context, graphics_state, b.drawn_location.times( Mat4.scale([ 1.1,1.1,1.1 ]) ), this.transparent );
    }
  show_explanation( document_element )
    { document_element.innerHTML += `<p>This demo detects when some flying objects collide with one another, coloring them red when they do.  For a simpler demo that shows physics-based movement without objects that hit one another, see the demo called <a href=\"https://174a.glitch.me/Inertia_Demo\" target=\"blank\">Inertia_Demo</a>.
                                     </p><p>Detecting intersections between pairs of stretched out, rotated volumes can be difficult, but is made easier by being in the right coordinate space.  See <a href=\"https://piazza.com/class_profile/get_resource/j855t03rsfv1cn/jabhqq9h76f7hx\" target=\"blank\">this .pdf document</a> for an explanation of how it works in this demo.  The collision algorithm treats every shape like an ellipsoid roughly conforming to the drawn shape, and with the same transformation matrix applied.  Here these collision volumes are drawn in translucent purple alongside the real shape so that you can see them.
                                     </p><p>This particular collision method is extremely short to code, as you can observe in the method \"check_if_colliding\" in the class called Body below.  It has problems, though.  Making every collision body a stretched sphere is a hack and doesn't handle the nuances of the actual shape being drawn, such as a cube's corners that stick out.  Looping through a list of discrete sphere points to see if the volumes intersect is *really* a hack (there are perfectly good analytic expressions that can test if two ellipsoids intersect without discretizing them into points, although they involve solving a high order polynomial).   On the other hand, for non-convex shapes a real collision method cannot be exact either, and is usually going to have to loop through a list of discrete tetrahedrons defining the shape anyway.
                                     </p><p>This scene extends class Simulation, which carefully manages stepping simulation time for any scenes that subclass it.  It totally decouples the whole simulation from the frame rate, following the suggestions in the blog post <a href=\"https://gafferongames.com/post/fix_your_timestep/\" target=\"blank\">\"Fix Your Timestep\"</a> by Glenn Fielder.  Buttons allow you to speed up and slow down time to show that the simulation's answers do not change.</p>`;
    }
}