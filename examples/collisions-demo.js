import * as defs from './common.js';
import { MatVec, matvec, Texture, RenderListItem, Renderer } from './common.js';
import { Camera, LightArray, Materials } from './common.js';

// TODO: Use static function vars for temp matrices instead.

export class Rigid_Body {           // **Rigid_Body** can store and update the properties of a 3D body that incrementally
                                    // moves from its previous place due to velocities.  It conforms to the
                                    // approach outlined in the "Fix Your Timestep!" blog post by Glenn Fiedler.
  constructor( { shape, material_index, color, size } )
    { Object.assign( this,
             { shape, material_index, color, size } )
      this.center = matvec();
      this.rotation = matvec();
      this.previous = { center: matvec(), rotation: matvec() };
    }
  static helper1 = matvec([0,0,0,1]);
  static helper2 = matvec();
  situate( location_matrix, linear_velocity, angular_velocity, spin_axis = matvec().random() )
    {                               // situate(): assign the body's initial values, or overwrite them.
      this.center.loadVector( location_matrix.quickClone().multiply( Rigid_Body.helper1 ).to3() );
      this.rotation.set_identity().translate( this.center.quickClone().multiply( -1 ) ).multiply( location_matrix );
      this.previous.center.loadVector( this.center );
      this.previous.rotation.loadVector( this.rotation );
                                              // drawn_location gets replaced with an interpolated quantity:
      this.drawn_location = location_matrix;
      return Object.assign( this, { linear_velocity, angular_velocity, spin_axis } )
    }
  advance( time_amount )
    {                           // advance(): Perform an integration (the simplistic Forward Euler method) to
                                // advance all the linear and angular velocities one time-step forward.
      this.previous.center.loadVector( this.center );
      this.previous.rotation.loadVector( this.rotation );
                                                 // Apply the velocities scaled proportionally to real time (time_amount):
                                                 // Linear velocity first, then angular:
      this.center.add( this.linear_velocity.quickClone().multiply( time_amount ) );
      const s = this.spin_axis.data;
      const new_rotation = Rigid_Body.helper2.set_identity().rotate( time_amount * this.angular_velocity, s[0], s[1], s[2] );
      this.rotation.pre_multiply( new_rotation );

   //   this.rotation.pre_multiply( this.rotation.quickClone().set_identity().rotate( time_amount * this.angular_velocity, s[0], s[1], s[2] ) );
    }
  blend_rotation( alpha )
    {                        // blend_rotation(): Just naively do a linear blend of the rotations, which looks
                             // ok sometimes but otherwise produces shear matrices, a wrong result.

                                  // TODO:  Replace this function with proper quaternion blending, and perhaps
                                  // store this.rotation in quaternion form instead for compactness.
       const blended = Rigid_Body.helper2.set_identity();
       for( let i = 0; i < 16; i++ )
         blended.data[i] = this.previous.rotation.data[i] * (1-alpha) + this.rotation.data[i] * alpha;
       return blended;
    }
  blend_state( alpha )
    {                             // blend_state(): Compute the final matrix we'll draw using the previous two physical
                                  // locations the object occupied.  We'll interpolate between these two states as
                                  // described at the end of the "Fix Your Timestep!" blog post.
      Rigid_Body.helper2.loadVector( this.previous.center );
      this.drawn_location.set_identity().translate( Rigid_Body.helper2.mix( this.center, alpha ) )
                                        .multiply( this.blend_rotation( alpha ) )
                                        .scale( this.size );
    }
                                              // The following are our various functions for testing a single point,
                                              // p, against some analytically-known geometric volume formula
                                              // (within some margin of distance).
  static intersect_cube( p, margin = 0 )
    { return p.data.every( value => value >= -1 - margin && value <=  1 + margin )
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
      const T = this.inverse.clone().multiply( b.drawn_location );

      const { intersect_test, points, leeway } = collider;
                                          // For each vertex in that b, shift to the coordinate frame of
                                          // a_inv*b.  Check if in that coordinate frame it penetrates
                                          // the unit sphere at the origin.  Leave some leeway.
      return points.some( p => intersect_test( T.clone().multiply( p ), leeway ) );
    }
}

export class Simulation extends Renderer
{                                         // **Simulation** manages the stepping of simulation time.  Subclass it when making
                                          // a Component that is a physics demo.  This technique is careful to totally decouple
                                          // the simulation from the frame rate (see below).
  init()
  {
    super.init();
    this.time_accumulator = 0;
    this.time_scale = 1;
    this.t = 0;
    this.dt = 1/20;
    this.bodies = [];
    this.steps_taken = 0;
  }
  simulate( frame_time )
    {                                     // simulate(): Carefully advance time according to Glenn Fiedler's
                                          // "Fix Your Timestep" blog post.
                                          // This line gives ourselves a way to trick the simulator into thinking
                                          // that the display framerate is running fast or slow:
      frame_time *= this.time_scale;

                                          // Avoid the spiral of death; limit the amount of time we will spend
                                          // computing during this timestep if display lags:
      this.time_accumulator += Math.min( frame_time, 0.1 );
                                          // Repeatedly step the simulation until we're caught up with this frame:
      // TODO: I added the abs and Math.sign to test reversing the simulation, it looks like.  Would it work in any circumstance?
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
  render_controls()
    {                       // render_controls(): Create the buttons for interacting with simulation time.
      this.key_triggered_button( "Speed up time", [ "Shift","T" ], () => this.time_scale *= 5           );
      this.key_triggered_button( "Slow down time",        [ "t" ], () => this.time_scale /= 5           ); this.new_line();
      this.live_string( box => { box.textContent = "Time scale: "  + this.time_scale                  } ); this.new_line();
      this.live_string( box => { box.textContent = "Fixed simulation time step size: "  + this.dt     } ); this.new_line();
      this.live_string( box => { box.textContent = this.steps_taken + " timesteps were taken so far." } );
    }
  render_frame( caller )
    {                                     // display(): advance the time and state of our whole simulation.
      if( this.state.animate )
        this.simulate( this.state.animation_delta_time );
    }
  update_state( dt )      // update_state(): Your subclass of Simulation has to override this abstract function.
    { throw "Override this" }
}


export class Test_Data
{                             // **Test_Data** pre-loads some Shapes and Materials that other Scenes can borrow.
  constructor()
    {
      this.shapes = { donut  : new defs.Torus          ( 15, 15, [[0,2],[0,1]] ),
                      cone   : new defs.Closed_Cone    ( 4, 10,  [[0,2],[0,1]] ),
                      capped : new defs.Capped_Cylinder( 4, 12,  [[0,2],[0,1]] ),
                      ball   : new defs.Subdivision_Sphere( 3,   [[0,1],[0,1]] ),
                      cube   : new defs.Cube(),
  //                  prism  : new ( defs.Capped_Cylinder   .prototype.make_flat_shaded_version() )( 10, 10, [[0,2],[0,1]] ),
  //                  gem    : new ( defs.Subdivision_Sphere.prototype.make_flat_shaded_version() )( 2 ),
  //                  donut2 : new ( defs.Torus             .prototype.make_flat_shaded_version() )( 20, 20, [[0,2],[0,1]] ),
                    };

      function blender_pbr_filenames(name) {
        return ["albedo", "roughness", "metallic", "ao", "normal-ogl", "height"]
            .map(s => "assets/" + name + "-bl/" + name + "_" + s + ".png");
      }
      const materials = {
              "gold":      blender_pbr_filenames("gold-scuffed"),
              "planks":    blender_pbr_filenames("agedplanks1"),
              "dark-wood": blender_pbr_filenames("dark-wood-stain"),
              "bark":      blender_pbr_filenames("ash-tree-bark"),
              "leather":   blender_pbr_filenames("older-padded-leather"),
              "red":       blender_pbr_filenames("red-scifi-metal"),
              "scales":    blender_pbr_filenames("fancy-scaled-gold"),
              "grass":     blender_pbr_filenames("grass1"),
              "cobble":    blender_pbr_filenames("dusty-cobble"),
              "rgb":       "assets/rgb.jpg",
              "earth":     "assets/earth.gif",
              "turtle":    "assets/13103_pearlturtle_diffuse.jpg",
              "solid":      undefined
      };
      this.num_materials = Object.keys(materials).length;
      this.state = Object.create(null);
      Object.assign( this.state,
        { animate   : true,
          animation_time : 0,
          animation_delta_time: 0,
          samplers: new Map()
        } );
      this.state.materials = new Materials( materials );
      this.state.samplers.set("texture_array", this.state.materials.texture_array );
      this.state.materials.set("turtle", {
            fallback_roughness: 1,
            fallback_metallicity: .2,
            textured_roughness_amount: .5,
            textured_metallicity_amount: .5,
      });
      this.state.materials.set("gold", { textured_roughness_amount: .8 });
      this.state.shader = new defs.PBR_Shader (LightArray.NUM_LIGHTS, Materials.NUM_MATERIALS, {has_shadows: false, has_textures: true});

//      this.state.shader = new defs.Minimal_Phong_Shader (1, 1);
//      this.state.materials = new defs.Simple_Materials( { "solid": undefined } );

      this.state.lightArray =
           new defs.LightArray({ambient: .025, lights:[
             {direction_or_position: matvec([-3, -3, 1, 0]),
               color: matvec([1.0, 0.7, 0.7]), diffuse: 1.0, specular: 1.0, attenuation_factor: 0.001},
             {direction_or_position: matvec([ 0,10,30,1 ]),
               color: matvec([ 1,1,1 ]), diffuse: 1.0, specular: 1.0, attenuation_factor: 0.0001}
           ]});
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
  init() {
      super.init();
      this.data = new Test_Data();
      this.shapes = { ...this.data.shapes };
      this.shapes.square = new defs.Square();
      this.num_falling_bodies = 10000;

      this.state = this.data.state;
      this.passes = [];
      this.passes.push( Object.create( this.state ) );

      // Optionally pre-allocate persistent storage for each render pass:
      for( let shape of Object.values(this.shapes) ) {
        const item = new RenderListItem(this.passes[0], shape, 0);
        item.hint = "STREAM_DRAW";
        this.renderList.insert(item);
      }
    }
  random_color() { return matvec([ .6,.6*Math.random(),.6*Math.random() ]) }
  update_state( dt )
    {                 // update_state():  Override the base time-stepping code to say what this particular
                      // scene should do to its bodies every frame -- including applying forces.
                      // Generate additional moving bodies if there ever aren't enough:
      while( this.bodies.length < this.num_falling_bodies ) {
        const position = matvec().set_identity().translate( matvec().random(10).add( matvec([ 0,15,0 ]) ) );
        const velocity = matvec().random(2).add( matvec([ 0,-1,2 ]) ).normalize().multiply(3);
        const spin_axis = velocity.clone().cross( matvec([ 0,-1,0 ]) ).normalize();
        this.bodies.push( new Rigid_Body(
          { shape: this.data.random_shape(),
            material_index: Math.random()*9999%this.data.num_materials,
            color: this.random_color(),
            size: matvec([ 1,1+Math.random(),1 ])
          }).situate( position, velocity, Math.random(), spin_axis ) );
      }

      for( let b of this.bodies ) {
        b.linear_velocity.data[1] += dt * -9.8; // Gravity on Earth, where 1 unit in world space = 1 meter:
        if( b.center.data[1] < -8 && b.linear_velocity.data[1] < 0 ) // If about to fall through floor, reverse y velocity:
          b.linear_velocity.data[1] *= -.8;
      }
                                                      // Delete bodies that stop or stray too far away:
      this.bodies = this.bodies.filter( b => b.center.norm() < 50 && Math.abs( b.linear_velocity.data[1] ) > .05 );
    }
  render_frame() {                                 // display(): Draw everything else in the scene besides the moving bodies.
      super.render_frame();

      if( !this.controls )  {
        const camera = { camera_world: matvec().set_identity().translate(0,0,50),
                            projection: matvec().perspective(Math.PI/4, this.width/this.height, 1, 500) };
        this.state.camera = new defs.Camera( camera );
        this.controls = new defs.Movement_Controls( { state: this.state } );
        this.controls.add_mouse_controls( this.canvas );
        this.animated_children.push( this.controls );
      }

      this.renderList.traverse( (item) => item.clear(), {prune: false} );

      // Draw the ground:
      const item = new RenderListItem(this.passes[0], this.shapes.square, 0);
      item.instance_vars.push( { model_transform: matvec().set_identity().translate( 0,-10,0 )
                                    .rotate( Math.PI/2,  -1,0,0 ).scale( 50,50,1 ),
                                 color: matvec([ .5,1,.5] ), material_index: this.state.materials.name_to_index["grass"] } );
      this.renderList.insert( item );

      // Draw each shape at its current location:
      for( let b of this.bodies ) {
        const item = new RenderListItem(this.passes[0], b.shape, 0);

        item.instance_vars.push( { model_transform: b.drawn_location, color: b.color, material_index: b.material_index } );

        this.renderList.insert( item );
      }
      this.renderList.traverse( (item) => item.update_per_instance_buffer(), {prune: false} );
      this.renderList.traverse( (item) => this.draw( item ), {prune: false} );
    }
  render_explanation() {
      this.document_region.innerHTML += `<p>This demo lets random initial momentums carry bodies until they fall and bounce.  It shows a good way to do incremental movements, which are crucial for making objects look like they're moving on their own instead of following a pre-determined path.  Animated objects look more real when they have inertia and obey physical laws, instead of being driven by simple sinusoids or periodic functions.
                                     </p><p>For each moving object, we need to store a model matrix somewhere that is permanent (such as inside of our class) so we can keep consulting it every frame.  As an example, for a bowling simulation, the ball and each pin would go into an array (including 11 total matrices).  We give the model transform matrix a \"velocity\" and track it over time, which is split up into linear and angular components.  Here the angular velocity is expressed as an Euler angle-axis pair so that we can scale the angular speed how we want it.
                                     </p><p>The forward Euler method is used to advance the linear and angular velocities of each shape one time-step.  The velocities are not subject to any forces here, but just a downward acceleration.  Velocities are also constrained to not take any objects under the ground plane.
                                     </p><p>This scene extends class Simulation, which carefully manages stepping simulation time for any scenes that subclass it.  It totally decouples the whole simulation from the frame rate, following the suggestions in the blog post <a href=\"https://gafferongames.com/post/fix_your_timestep/\" target=\"blank\">\"Fix Your Timestep\"</a> by Glenn Fielder.  Buttons allow you to speed up and slow down time to show that the simulation's answers do not change.</p>`;
    }
}


export class Collision_Demo extends Simulation
{                                               // **Collision_Demo** demonstration: Detect when some flying objects
                                                // collide with one another, coloring them red.
  init()
    { super.init();
      this.data = new Test_Data();
      this.shapes = { ...this.data.shapes };
                                  // Make simpler dummy shapes for representing all other shapes during collisions:
      this.colliders = [
        { intersect_test: Rigid_Body.intersect_sphere, points: new defs.Subdivision_Sphere(1).vertices.map( v => v.position ), leeway: .5 },
        { intersect_test: Rigid_Body.intersect_sphere, points: new defs.Subdivision_Sphere(2).vertices.map( v => v.position ), leeway: .3 },
        { intersect_test: Rigid_Body.intersect_cube,   points: new defs.Cube().vertices.map( v => v.position ),                leeway: .1 }
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
  render_controls()
    { this.key_triggered_button( "Previous collider", [ "b" ], this.decrease );
      this.key_triggered_button( "Next",              [ "n" ], this.increase );
      this.new_line();
      super.render_controls();
    }
  increase() { this.collider_selection = Math.min( this.collider_selection + 1, this.colliders.length-1 ); }
  decrease() { this.collider_selection = Math.max( this.collider_selection - 1, 0 ) }
  update_state( dt, num_bodies = 40 )
    {                 // update_state():  Override the base time-stepping code to say what this particular
                      // scene should do to its bodies every frame -- including applying forces.
                                                              // Generate moving bodies:
      while( this.bodies.length < num_bodies )
        this.bodies.push( new Rigid_Body( this.data.random_shape(), undefined, vec3( 1,5,1 ) )
              .situate(         Mat4.translation( ...unsafe3( 0,0,0 ).randomized(30) )
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
  render_frame( caller )
    {                                 // display(): Draw everything else in the scene besides the moving bodies.
      super.render_frame( caller );
      if( !caller.controls )
        { this.animated_children.push( caller.controls = new defs.Movement_Controls( { uniforms: this.uniforms } ) );
          caller.controls.add_mouse_controls( caller.canvas );
          Shader.assign_camera( Mat4.translation( 0,0,-50 ), this.uniforms );    // Locate the camera here (inverted matrix).
        }
      this.uniforms.projection_transform = Mat4.perspective( Math.PI/4, caller.width/caller.height, 1, 500 );
      this.uniforms.lights = [ defs.Phong_Shader.light_source( vec4( .7,1.5,2,0 ), color( 1,1,1,1 ), 100000 ) ];

                                                               // Draw an extra bounding sphere around each drawn shape to show
                                                               // the physical shape that is really being collided with:
      const { points, leeway } = this.colliders[ this.collider_selection ];
      const size = vec3( 1 + leeway, 1 + leeway, 1 + leeway );
      for( let b of this.bodies )
        points.draw( caller, this.uniforms, b.drawn_location.times( Mat4.scale( ...size ) ), this.bright, "LINE_STRIP" );
    }
  render_explanation()
    { this.document_region.innerHTML += `<p>This demo detects when some flying objects collide with one another, coloring them red when they do.  For a simpler demo that shows physics-based movement without objects that hit one another, see the demo called Inertia_Demo.
                                     </p><p>Detecting intersections between pairs of stretched out, rotated volumes can be difficult, but is made easier by being in the right coordinate space.  The collision algorithm treats every shape like an ellipsoid roughly conforming to the drawn shape, and with the same transformation matrix applied.  Here these collision volumes are drawn in translucent purple alongside the real shape so that you can see them.
                                     </p><p>This particular collision method is extremely short to code, as you can observe in the method \"check_if_colliding\" in the class called Rigid_Body below.  It has problems, though.  Making every collision body a stretched sphere is a hack and doesn't handle the nuances of the actual shape being drawn, such as a cube's corners that stick out.  Looping through a list of discrete sphere points to see if the volumes intersect is *really* a hack (there are perfectly good analytic expressions that can test if two ellipsoids intersect without discretizing them into points, although they involve solving a high order polynomial).   On the other hand, for non-convex shapes a real collision method cannot be exact either, and is usually going to have to loop through a list of discrete tetrahedrons defining the shape anyway.
                                     </p><p>This scene extends class Simulation, which carefully manages stepping simulation time for any scenes that subclass it.  It totally decouples the whole simulation from the frame rate, following the suggestions in the blog post <a href=\"https://gafferongames.com/post/fix_your_timestep/\" target=\"blank\">\"Fix Your Timestep\"</a> by Glenn Fielder.  Buttons allow you to speed up and slow down time to show that the simulation's answers do not change.</p>`;
    }
}
