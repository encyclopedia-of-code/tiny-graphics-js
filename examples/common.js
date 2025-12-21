import { MatVec, matvec, UBO_Plan, Texture, Renderer } from '../tiny-graphics.js';
export * from '../tiny-graphics.js';
export * from './common-shapes.js';
export * from './common-shaders.js';
export * from './common-components.js';

// WARNING:  These class names must match shader UBO variable names.

export class Camera extends UBO_Plan {
    init(fields) {
      this.fields = { projection: matvec().set_identity(),
                    camera_world: matvec().set_identity(),
                  camera_inverse: matvec().set_identity() };
     this.assign(fields);
    }
    assign(fields) {
      this.dirty = true;
      // If only one matrix is provided, invert it to fill in the other.
      const temp = { camera_world: fields?.camera_world || fields?.camera_inverse && fields.camera_inverse.clone().invert(),
                   camera_inverse: fields?.camera_inverse || fields?.camera_world && fields.camera_world.clone().invert() };
      Object.assign( this.fields, fields, temp.camera_world ? temp : {} );
      this.fields.camera_position = matvec([this.fields.camera_world.data[3], this.fields.camera_world.data[7],
                                         this.fields.camera_world.data[11]]);
    }
    get_binding_point () { return 0; }
    post_multiply (matrix) {
        this.assign( { camera_world: this.fields.camera_world.multiply(matrix) } );
    }
    pre_multiply (inverted_matrix) {
      this.assign( { camera_inverse: inverted_matrix.clone().multiply(this.fields.camera_inverse) } );
    }
  };

export class LightArray extends UBO_Plan {

    static NUM_LIGHTS = 2;
    static global_index = 0;
    static global_ambient = 0.4;

    init(fields) {
      this.fields = Object.assign(LightArray.default_values(), fields);
    }
    static default_values () {
      return {
                ambient: 0,
                lights: [
                          {
                            direction_or_position: matvec ([0.0, 0.0, 0.0, 0.0]),
                            color: matvec ([1.0, 1.0, 1.0]),
                            diffuse: 1.0,
                            specular: 1.0,
                            attenuation_factor: 0.0
                          },
                          {
                            direction_or_position: matvec ([0.0, -1.0, 0.0, 1.0]),
                            color: matvec ([1.0, 1.0, 1.0]),
                            diffuse: 1.0,
                            specular: 1.0,
                            attenuation_factor: 0.0
                          }
                        ]
              };
    }
    get_binding_point () { return 1; }
    activate (gl, gpu_addresses, is_shadow_pass, shadow_map_index = 0)     // TODO: Unused/Unimplemented anywhere?
    { }
    deactivate (caller, shadow_map_index = 0)
    { }
  };

export class Shadow_Light {
        // TODO:  Since this is going to be a UBO_Plan, which is supposed to just be a container object without GL ties, it follows that some other object should be in charge of storing the GL stuff here that a Shadow_light needs to be associated with (a Shadow_Map and a shadowed Shader).

    static NUM_LIGHTS = 2;
    static global_index = 0;
    static global_ambient = 0.4;
    static GLOBAL_TEXTURE_OFFSET = 16;

    constructor(options) {

      const defaults = Shadow_Light.default_values();
      Object.assign(this, defaults, options);

      this.supports_shadow = true;
      this.index = Shadow_Light.global_index;
      Shadow_Light.global_index++;

      this.ubo_layout = [{num_instances: 1,
                          data_layout: [{name:"ambient", type:"float"}]
                         },
                         {num_instances: Shadow_Light.NUM_LIGHTS,
                          data_layout: [{name:"direction_or_position", type:"vec4"},
                                        {name:"color", type:"vec3"},
                                        {name:"diffuse", type:"float"},
                                        {name:"specular", type:"float"},
                                        {name:"attenuation_factor", type:"float"},
                                        {name:"casts_shadow", type:"bool"},
                                      ]
                         },
                         {num_instances: Shadow_Light.NUM_LIGHTS * 6,
                          data_layout: [{name:"light_space_matrix", type:"Mat4"}]
                         },
                        ];

      this.shadow_map = [];
      this.light_space_matrix = Array(6).fill(0).map(x => Mat4.identity());
      this.is_point_light = (this.direction_or_position[3] == 1.0);

      if (this.is_point_light) {
        let directions = [ vec3(1.0, 0.0, 0.0), vec3(-1.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0), vec3(0.0, -1.0, 0.0), vec3(0.0, 0.0, 1.0), vec3(0.0, 0.0, -1.0)];
        let ups = [vec3(0.0, -1.0, 0.0), vec3(0.0, -1.0, 0.0), vec3(0.0, 0.0, 1.0), vec3(0.0, 0.0, -1.0), vec3(0.0, -1.0, 0.0), vec3(0.0, -1.0, 0.0)];

        for (let i = 0; i < 6; i++) {
          this.shadow_map[i] = new tiny.Shadow_Map(this.shadow_map_width, this.shadow_map_height);
          let light_view = Mat4.look_at(this.direction_or_position.to3(), directions[i], ups[i]);
          let light_projection = Mat4.perspective(Math.PI/2, this.shadow_map_width/this.shadow_map_height, 0.01, 20.0);
          this.light_space_matrix[i] = light_projection.times(light_view);
        }
      }
      else {
        this.shadow_map[0] = new tiny.Shadow_Map(this.shadow_map_width, this.shadow_map_height);
        let epsilon = 0.00756; //to be able to have +-y pointing light without breaking look_at()
        let light_view = Mat4.look_at(this.direction_or_position.to3(), vec3(0.0, 0.0, 0.0), vec3(0.0 + epsilon, 1.0, 0.0));;
        let light_projection = Mat4.orthographic(-10.0, 10.0, -10.0, 10.0, 0.01, 20.0);
        this.light_space_matrix[0] = light_projection.times(light_view);
      }


      this.is_initialized = false;
      this.are_textures_bound = false;
    }
    static default_values () {

      // TODO:  Each Light should not really compile its own Shader!!  Too many identical Shaders stored on GPU.

      return {
                direction_or_position: vec4 (0.0, 0.0, 0.0, 0.0),
                color: vec3 (1.0, 1.0, 1.0, 1.0),
                diffuse: 1.0,
                specular: 1.0,
                attenuation_factor: 0.0,
                casts_shadow: false,
                shadow_map_width: 1024,
                shadow_map_height: 1024,
                shadow_map_shader: new defs.Shadow_Pass_Shader(),
                shadow_map: null,
              };
    }
    initialize(caller) {                               // FINISH:  This function is very outdated; figure out what replaces it.
      if (!this.is_initialized) {
        const mappings = Shader.mapping_UBO();
        for (var i = 0; i < mappings.length; i++) {
          if (mappings[i].shader_name == "Lights") {
            if (this.index == 0) {
              //Only one UBO shared amongst all of the lights, have ID 0 cretate it
              UBO.create(caller.context, "Lights", this.ubo_layout);
              UBO.Cache["Lights"].bind(mappings[i].binding_point);
              UBO.Cache["Lights"].update("ambient", Light.global_ambient);
            }
            UBO.Cache["Lights"].update("direction_or_position", this.direction_or_position, this.index);
            UBO.Cache["Lights"].update("color", this.color, this.index);
            UBO.Cache["Lights"].update("diffuse", this.diffuse, this.index);
            UBO.Cache["Lights"].update("specular", this.specular, this.index);
            UBO.Cache["Lights"].update("attenuation_factor", this.attenuation_factor, this.index);
            UBO.Cache["Lights"].update("casts_shadow", this.casts_shadow, this.index);

            for (let i = 0; i < 6; i++) {
              UBO.Cache["Lights"].update("light_space_matrix", this.light_space_matrix[i], this.index * 6 + i);
            }

            break;
          }
        }
        this.is_initialized = true;
      }
    }
    deactivate (caller, shadow_map_index = 0) {
      if (!this.casts_shadow)
        return;
      this.shadow_map[shadow_map_index].deactivate(caller, true);
    }
    bind (gl, gpu_addresses, is_shadow_pass, shadow_map_index = 0) {
      if( !this.shadow_map[shadow_map_index])
        return;
      if (is_shadow_pass) {
          //apply shadow frustum offset through UBOs for camera matrix and distance parameters??
        this.shadow_map_shader.activate(gl, {light_space_matrix: this.light_space_matrix[shadow_map_index]}, Mat4.identity(), undefined);
        this.shadow_map[shadow_map_index].activate(gl, 0, true);
        return;
      }
      const map = this.shadow_map[i];
      map.index = this.index * 6 + shadow_map_index;
      let name = "shadow_maps[" + map.index + "]";
      map.draw_sampler_address = gpu_addresses[name];
      map.texture_unit = Shadow_Light.GLOBAL_TEXTURE_OFFSET + map.index;
      map.activate (gl, map.texture_unit, false);
    }
  };

export class Materials extends UBO_Plan {
    static NUM_MATERIALS = 128;
    static TEXTURE_LAYERS_PER_MATERIAL = 6;
    init(materials_list, fields) {
      this.materials_list = materials_list;
      this.name_to_index = Object.keys( materials_list ).reduce((acc, name, index) => (acc[name] = index, acc), {});
      const all_filenames = Object.values( materials_list ).flatMap
        ( filename => Array.isArray(filename) ? filename : [filename] );
      if( all_filenames.length === 0 )
        return;
      const urls_to_layer = all_filenames.reduce( (acc, filename, index) => (acc[filename] = index, acc), {});

      this.texture_array = new Texture({urls: all_filenames});
      this.fields = { materials: Array(Materials.NUM_MATERIALS).fill(0).map( (x,i) => {
        const filename = Object.values( materials_list )[i];
        return Object.assign( Materials.default_values(),
             { collapse_textures: +(!Array.isArray(filename)),
               starting_texture_layer: urls_to_layer[Array.isArray(filename) ? filename[0] : filename ],
               is_textured: filename ? 1 : 0
             });
        })
      };
    }
    apply_fallbacks() {
      const attributes = [ "albedo", "roughness", "metallicity", "ao", "normal", "height"];
      for( let {layer} of this.texture_array.load_failures ) {
        this.fields.materials.forEach( entry => {
          const diff = layer - entry.starting_texture_layer;
          if ( diff >= 0 && diff < Materials.TEXTURE_LAYERS_PER_MATERIAL)
            entry[ "textured_" + attributes[layer-entry.starting_texture_layer] + "_amount" ] = 0;
          }
        )
      }
      this.texture_array.load_failures = [];
    }
    fill_buffer (uniform_block_info) {
      this.apply_fallbacks();
      super.fill_buffer(uniform_block_info);
    }
    set(name, material_fields = {}) {
      Object.assign( this.fields.materials[ this.name_to_index[name] ], material_fields );
    }
    static default_values () {
      return {
                is_textured: 0,
                fallback_roughness: .5,
                fallback_metallicity: 1,
                textured_albedo_amount: 1,
                textured_roughness_amount: 1,
                textured_metallicity_amount: 1,
                textured_ao_amount: 1,
                textured_normal_amount: 1,
                textured_height_amount: 1,
                collapse_textures: 0,
            };
    }
    get_binding_point () { return 2; }
};

export class Simple_Materials extends UBO_Plan {
    static NUM_MATERIALS = 128;
    init(materials_list, fields) {
      this.materials_list = materials_list;
      this.name_to_index = Object.keys( materials_list ).reduce((acc, name, index) => (acc[name] = index, acc), {});
      this.fields = { materials: Array(Materials.NUM_MATERIALS).fill(0).map( (x,i) => Simple_Materials.default_values() ) };
    }
    set(name, material_fields = {}) {
      Object.assign( this.fields.materials[ this.name_to_index[name] ], material_fields );
    }
    static default_values () {
      return { diffusivity: 1.0,
               specularity: 1.0,
               smoothness:  1.0
            };
    }
    get_binding_point () { return 2; }
};

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
        this.props.target.update_state( this.dt );
        for( let b of this.state.bodies )
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
      for( let b of this.state.bodies ) b.blend_state( alpha );
    }
  render_controls()
    {                       // render_controls(): Create the buttons for interacting with simulation time.
      this.key_triggered_button( "Speed up time", [ "Shift","T" ], () => this.time_scale *= 5           );
      this.key_triggered_button( "Slow down time",        [ "t" ], () => this.time_scale /= 5           ); this.new_line();
      this.live_string( box => { box.textContent = "Time scale: "  + this.time_scale                  } ); this.new_line();
      this.live_string( box => { box.textContent = "Fixed simulation time step size: "  + this.dt     } ); this.new_line();
      this.live_string( box => { box.textContent = this.steps_taken + " timesteps were taken so far." } );
    }
  render_frame()
    {                                     // display(): advance the time and state of our whole simulation.
      if( this.state.animate )
        this.simulate( this.state.animation_delta_time );
    }
  update_state( dt )      // update_state(): Your subclass of Simulation has to override this abstract function.
    { throw "Override this" }
}
