import {tiny} from '../tiny-graphics.js';
// Pull these names into this module's scope for convenience:
const {Vector, Vector3, vec, vec3, vec4, color, Matrix, Mat4, Shape, Shader, Component} = tiny;

const defs = {};
import {defs as shapes} from './common-shapes.js';
import {defs as shaders} from './common-shaders.js';

export {tiny, defs};

const UBO = defs.UBO =
  class UBO  {
    constructor (gl, buffer_name, binding_point, buffer_size, buffer_layout) {

      this.items = [];
      this.keys = [];

      for (var i = 0; i < buffer_layout.length; i++) {
        this.items[buffer_layout[i].name] = { offset: buffer_layout[i].offset,
                                              data_length: buffer_layout[i].data_length,
                                              chunk_length: buffer_layout[i].chunk_length };
        this.keys[i] = buffer_layout[i].name;
      }

      this.gl = gl;
      this.buffer_name = buffer_name;
      this.binding_point = binding_point;

      this.buffer = gl.createBuffer ();
      gl.bindBuffer (gl.UNIFORM_BUFFER, this.buffer);
      gl.bufferData (gl.UNIFORM_BUFFER, buffer_size, gl.DYNAMIC_DRAW);
      gl.bindBuffer (gl.UNIFORM_BUFFER, null);
      gl.bindBufferBase (gl.UNIFORM_BUFFER, binding_point, this.buffer);
    }

    bind (binding_point, buffer) {
      this.gl.bindBufferBase (this.gl.UNIFORM_BUFFER, binding_point, buffer);
    }

    update (buffer_name, buffer_data) {
      if (buffer_data instanceof Matrix)
        buffer_data = Matrix.flatten_2D_to_1D(buffer_data.transposed());

      //Force the data to be Float32Array
      if (!(buffer_data instanceof Float32Array)) {
        if ( Array.isArray(buffer_data))
          buffer_data = new Float32Array(buffer_data);
        else
          buffer_data = new Float32Array([buffer_data]);
      }

      this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, this.buffer);
      this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, this.items[buffer_name].offset, buffer_data, 0, null);
      this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, null);

      return this;
    }

    static create (gl, block_name, binding_point, buffer_layout) {
      var buffer_size = UBO.calculate(buffer_layout);
      UBO.Cache[block_name] = new UBO(gl, block_name, binding_point, buffer_size, buffer_layout);
    }

    static get_size (type) { //[Alignment,Size]
      switch (type) {
        case "float":
        case "int":
        case "bool":
          return [4,4];
        case "Mat4":
          return [64,64]; //16*4
        case "Mat3":
          return [48,48]; //16*3
        case "vec2":
          return [8,8];
        case "vec3":
          return [16,12]; //Special Case
        case "vec4":
          return [16,16];
        default:
          return [0,0];
      }
    }

    static calculate(buffer_layout) {
      var chunk = 16;	//Data size in Bytes, UBO using layout std140 needs to build out the struct in chunks of 16 bytes.
			var temp_size = 0;	//Temp Size, How much of the chunk is available after removing the data size from it
			var offset = 0;	//Offset in the buffer allocation
			var size;		//Data Size of the current type

      for (var i=0; i < buffer_layout.length; i++) {
        //When dealing with arrays, Each element takes up 16 bytes regardless of type.
        if (!buffer_layout[i].length || buffer_layout[i].length == 0)
          size = UBO.get_size(buffer_layout[i].type);
        else
          size = [buffer_layout[i].length * 16, buffer_layout[i].length * 16];

        temp_size = chunk - size[0];	//How much of the chunk exists after taking the size of the data.

        //Chunk has been overdrawn when it already has some data resurved for it.
        if (temp_size < 0 && chunk < 16) {
          offset += chunk;						//Add Remaining Chunk to offset...
          if (i > 0)
            buffer_layout[i-1].chunk_length += chunk;	//So the remaining chunk can be used by the last variable
          chunk = 16;								//Reset Chunk
          if(buffer_layout[i].type == "vec3")
            chunk -= size[1];	//If Vec3 is the first var in the chunk, subtract size since size and alignment is different.
        }
        else if (temp_size < 0 && chunk == 16) {
          //Do nothing incase data length is >= to unused chunk size.
          //Do not want to change the chunk size at all when this happens.
        }
        else if (temp_size == 0) { //If evenly closes out the chunk, reset

          if(buffer_layout[i].type == "vec3" && chunk == 16)
            chunk -= size[1];	//If Vec3 is the first var in the chunk, subtract size since size and alignment is different.
          else
            chunk = 16;
        }
        else
          chunk -= size[1];	//Chunk isn't filled, just remove a piece

        //Add some data of how the chunk will exist in the buffer.
        buffer_layout[i].offset	= offset;
        buffer_layout[i].chunk_length	= size[1];
        buffer_layout[i].data_length = size[1];

        offset += size[1];
      }

      return offset;
    }

  };

UBO.Cache = [];

const Camera = defs.Camera =
  class Camera {
    constructor(eye = vec3 (0.0, 1.0, 1.5), at = vec3 (0.0, 0.0, -1.0), up = vec3 (0.0, 1.0, 0.0),  fov_y = Math.PI/4, aspect = 1080/600, near = 0.01, far = 1024) {

      this.position = eye;
      this.front = at;
      this.up = up;

      this.view = Mat4.identity();
      this.proj = Mat4.identity();

      this.ubo_layout = [{name:"cam_view", type:"Mat4"},
                         {name:"cam_projection", type:"Mat4"},
                         {name:"cam_pos", type:"vec3"},
                        ];
      this.is_initialized = false;
    }
    initialize(caller) {
      if (!this.is_initialized) {
        const mappings = Shader.mapping_UBO();
        for (var i = 0; i < mappings.length; i++) {
          if (mappings[i].buffer_name == "Camera") {
            UBO.create(caller.context, "Camera", mappings[i].binding_point, this.ubo_layout);
            UBO.bind(mappings[i].binding_point, UBO.Cache["Camera"]);
            break;
          }
        }
        this.is_initialized = true;
      }

      //this.view = Mat4.look_at(this.position, this.position.plus(this.front), this.up);
      this.view = Mat4.look_at(this.position, this.front, this.up);
      this.proj = Mat4.perspective(Math.PI/2, caller.width/caller.height, 0.01, 1024);

      UBO.Cache["Camera"].update("cam_view", this.view);
      UBO.Cache["Camera"].update("cam_projection", this.proj);
      UBO.Cache["Camera"].update("cam_pos", this.position);
    }
  };

const Light = defs.Light =
  class Light {
    constructor(direction_or_position, color, ambient, diffuse, specular, attenuation_factor) {

      this.direction_or_position = direction_or_position;
      this.color = color;
      this.ambient = ambient;
      this.diffuse = diffuse;
      this.specular = specular;
      this.attenuation_factor = attenuation_factor;

      this.ubo_layout = [{name:"light_direction_or_position", type:"vec4"},
                         {name:"light_color", type:"vec3"},
                         {name:"light_ambient", type:"float"},
                         {name:"light_diffuse", type:"float"},
                         {name:"light_specular", type:"float"},
                         {name:"light_attenuation_factor", type:"float"},
                        ];
      this.is_initialized = false;
    }
    initialize(caller) {
      if (!this.is_initialized) {
        const mappings = Shader.mapping_UBO();
        for (var i = 0; i < mappings.length; i++) {
          if (mappings[i].buffer_name == "Light") {
            UBO.create(caller.context, "Light", mappings[i].binding_point, this.ubo_layout);
            UBO.bind(mappings[i].binding_point, UBO.Cache["Light"]);
            UBO.Cache["Light"].update("light_direction_or_position", this.direction_or_position);
            UBO.Cache["Light"].update("light_color", this.color);
            UBO.Cache["Light"].update("light_ambient", this.ambient);
            UBO.Cache["Light"].update("light_diffuse", this.diffuse);
            UBO.Cache["Light"].update("light_specular", this.specular);
            UBO.Cache["Light"].update("light_attenuation_factor", this.attenuation_factor);
            break;
          }
        }
        this.is_initialized = true;
      }
    }
  };

const Material = defs.Material =
  class Material {
    constructor(name = "None", shader = undefined, color = vec4 (1.0, 1.0, 1.0, 1.0), diffuse = vec3(color[0], color[1], color[2]), specular = vec3 (1.0, 1.0, 1.0), smoothness = 32.0) {

      this.name = name;
      this.shader = shader;
      this.color = color;
      this.diffuse = diffuse;
      this.specular = specular;
      this.smoothness = smoothness;
      this.binding_point = undefined;
      this.ubo_layout = [{name:"mat_color", type:"vec4"},
                         {name:"mat_diffuse", type:"vec3"},
                         {name:"mat_specular", type:"vec3"},
                         {name:"mat_smoothness", type:"float"}
                        ];
      this.is_initialized = false;
    }

    initialize(caller) {
      if (!this.is_initialized) {
        const mappings = Shader.mapping_UBO();
        for (var i = 0; i < mappings.length; i++) {
          if (mappings[i].buffer_name == this.name) {
            this.binding_point = mappings[i].binding_point;
            UBO.create(caller.context, this.name, mappings[i].binding_point, this.ubo_layout);
            UBO.bind(this.binding_point, UBO.Cache[this.name]);
            UBO.Cache[this.name].update("mat_color", this.color);
            UBO.Cache[this.name].update("mat_diffuse", this.diffuse);
            UBO.Cache[this.name].update("mat_specular", this.specular);
            UBO.Cache[this.name].update("mat_smoothness", this.smoothness);
            break;
          }
        }
        this.is_initialized = true;
      }
    }

    activate() {
      UBO.bind(this.binding_point, UBO.Cache[this.name]);
    }

  };

const Entity = defs.Entity =
  class Entity {
    constructor(shape, transforms, material) {
      this.dirty = true
      this.shape = shape;
      this.global_transform = Mat4.identity();
      this.transforms = transforms;
      this.material = material;
    }
    set_shape(shape) {
      this.shape = shape;
      this.dirty = true;
    }
    set_transforms(transforms) {
      this.transforms = transforms;
      this.dirty = true;
    }
    apply_transform(model_transform) {
      this.global_transform = model_transform;
    }
    set_material(material) {
      this.material = material;
      this.material.activate();
    }
  };

  const Renderer = defs.Renderer =
  class Renderer {
    constructor() {
      this.entities = []
    }
    submit (entity) {
      this.entities.push(entity);
    }
    flush (caller) {
      for(let entity of this.entities){
        if( Array.isArray(entity.transforms) ) {
          if (entity.dirty) {
            entity.shape.vertices = Array(entity.transforms.length).fill(0).map( (x,i) => ({matrix: entity.transforms[i]}));
            entity.shape.fill_buffer(["matrix"], undefined, 1);
            entity.dirty = false;
          }
          entity.shape.draw(caller, undefined, entity.global_transform, entity.material, undefined, entity.transforms.length)
        }
        else {
          if (entity.dirty) {
            entity.shape.vertices = [{matrix: entity.transforms}];
            //Ideally use a shader with just a uniform matrix where you pass global.times(model)?
            entity.shape.fill_buffer(["matrix"], undefined, 1);
            entity.dirty = false;
          }
          entity.shape.draw(caller, undefined, entity.global_transform, entity.material, undefined, 1)
        }
      }
      this.entities = []
    }
  };

const Minimal_Webgl_Demo = defs.Minimal_Webgl_Demo =
  class Minimal_Webgl_Demo extends Component {
      init () {
          this.widget_options = {make_controls: false};    // This demo is too minimal to have controls
          this.time = 0.0;
          this.shapes = {triangle: new shapes.Instanced_Square_Index ()};
          this.shader = new shaders.Instanced_Shader ();
          this.fire = new Material("Fire", this.shader, vec4(1.0, 0.0, 0.0, 1.0));
          this.water = new Material("Water", this.shader, vec4(0.0, 0.0, 1.0, 1.0));
          this.renderer = new Renderer();
          this.objects = 1;
          this.size = 1;
          this.entities = [];
          for (var obj = 0; obj < this.objects; obj++)
          {
            this.entities.push(
                new Entity(new shapes.Instanced_Cube_Index (), Array(this.size).fill(0).map( (x,i) =>
                    Mat4.translation(... vec3(Math.random() * 2 - 1, Math.random() * 2 - 1, -5).times_pairwise(vec3(0, 0, 0)))), undefined)
            );
          }

          this.camera = new Camera();
          this.sun = new Light(vec4(0.0, 1.0, -2.0, 0.0), vec3(1.0, 1.0, 1.0), 1.0, 0.4, 0.6, 0.05);
      }
      render_animation (caller) {
        this.time += 1;

        this.camera.initialize(caller);
        this.sun.initialize(caller);
        this.fire.initialize(caller);
        this.water.initialize(caller);

        if (this.time < 200)
          this.entities[0].set_material(this.fire);
        else if (this.time < 400)
          this.entities[0].set_material(this.water);
        else
          this.time = 0;

        for (var obj = 0; obj < this.objects; obj++)
        {
          this.entities[obj].apply_transform(Mat4.rotation( 0/100, 0,0,1));
          this.renderer.submit(this.entities[obj]);
        }
        this.renderer.flush(caller);
      }
  };

const Movement_Controls = defs.Movement_Controls =
  class Movement_Controls extends Component {
      roll                    = 0;
      look_around_locked      = true;
      thrust                  = vec3 (0, 0, 0);
      pos                     = vec3 (0, 0, 0);
      z_axis                  = vec3 (0, 0, 0);
      radians_per_frame       = 1 / 200;
      meters_per_frame        = 20;
      speed_multiplier        = 1;
      mouse_enabled_canvases  = new Set ();
      will_take_over_uniforms = true;
      set_recipient (matrix_closure, inverse_closure) {
          this.matrix  = matrix_closure;
          this.inverse = inverse_closure;
      }
      reset () {
          this.set_recipient (() => this.uniforms.camera_transform,
                              () => this.uniforms.camera_inverse);
      }
      add_mouse_controls (canvas) {
          if (this.mouse_enabled_canvases.has (canvas))
              return;
          this.mouse_enabled_canvases.add (canvas);
          // First, measure mouse steering, for rotating the flyaround camera:
          this.mouse           = {"from_center": vec (0, 0)};
          const mouse_position = (e, rect = canvas.getBoundingClientRect ()) =>
            vec (e.clientX - (rect.left + rect.right) / 2, e.clientY - (rect.bottom + rect.top) / 2);
          // Set up mouse response.  The last one stops us from reacting if the mouse leaves the canvas:
          document.addEventListener ("mouseup", e => { this.mouse.anchor = undefined; });
          canvas.addEventListener ("mousedown", e => {
              e.preventDefault ();
              this.mouse.anchor = mouse_position (e);
          });
          canvas.addEventListener ("mousemove", e => {
              e.preventDefault ();
              this.mouse.from_center = mouse_position (e);
          });
          canvas.addEventListener ("mouseout", e => { if ( !this.mouse.anchor) this.mouse.from_center.scale_by (0); });
      }
      render_explanation (document_builder, document_element = document_builder.document_region) { }
      render_controls () {
          this.control_panel.innerHTML += "Click and drag the scene to <br> spin your viewpoint around it.<br>";
          this.key_triggered_button ("Up", [" "], () => this.thrust[ 1 ] = -1, undefined, () => this.thrust[ 1 ] = 0);
          this.key_triggered_button ("Forward", ["w"], () => this.thrust[ 2 ] = 1, undefined,
                                     () => this.thrust[ 2 ] = 0);
          this.new_line ();
          this.key_triggered_button ("Left", ["a"], () => this.thrust[ 0 ] = 1, undefined, () => this.thrust[ 0 ] = 0);
          this.key_triggered_button ("Back", ["s"], () => this.thrust[ 2 ] = -1, undefined, () => this.thrust[ 2 ] = 0);
          this.key_triggered_button ("Right", ["d"], () => this.thrust[ 0 ] = -1, undefined,
                                     () => this.thrust[ 0 ] = 0);
          this.new_line ();
          this.key_triggered_button ("Down", ["z"], () => this.thrust[ 1 ] = 1, undefined, () => this.thrust[ 1 ] = 0);

          const speed_controls        = this.control_panel.appendChild (document.createElement ("span"));
          speed_controls.style.margin = "30px";
          this.key_triggered_button ("-", ["o"], () =>
            this.speed_multiplier /= 1.2, "green", undefined, undefined, speed_controls);
          this.live_string (box => { box.textContent = "Speed: " + this.speed_multiplier.toFixed (2); },
                            speed_controls);
          this.key_triggered_button ("+", ["p"], () =>
            this.speed_multiplier *= 1.2, "green", undefined, undefined, speed_controls);
          this.new_line ();
          this.key_triggered_button ("Roll left", [","], () => this.roll = 1, undefined, () => this.roll = 0);
          this.key_triggered_button ("Roll right", ["."], () => this.roll = -1, undefined, () => this.roll = 0);
          this.new_line ();
          this.key_triggered_button ("(Un)freeze mouse look around", ["f"], () => this.look_around_locked ^= 1,
                                     "green");
          this.new_line ();
          this.live_string (
            box => box.textContent = "Position: " + this.pos[ 0 ].toFixed (2) + ", " + this.pos[ 1 ].toFixed (2)
                                     + ", " + this.pos[ 2 ].toFixed (2));
          this.new_line ();
          // The facing directions are surprisingly affected by the left hand rule:
          this.live_string (box => box.textContent = "Facing: " + ((this.z_axis[ 0 ] > 0 ? "West " : "East ")
                                                     + (this.z_axis[ 1 ] > 0 ? "Down " : "Up ") +
                                                     (this.z_axis[ 2 ] > 0 ? "North" : "South")));
          this.new_line ();
          this.key_triggered_button ("Go to world origin", ["r"], () => {
              this.matrix ().set_identity (4, 4);
              this.inverse ().set_identity (4, 4);
          }, "orange");
          this.new_line ();

          this.key_triggered_button ("Look at origin from front", ["1"], () => {
              this.inverse ().set (Mat4.look_at (vec3 (0, 0, 10), vec3 (0, 0, 0), vec3 (0, 1, 0)));
              this.matrix ().set (Mat4.inverse (this.inverse ()));
          }, "black");
          this.new_line ();
          this.key_triggered_button ("from right", ["2"], () => {
              this.inverse ().set (Mat4.look_at (vec3 (10, 0, 0), vec3 (0, 0, 0), vec3 (0, 1, 0)));
              this.matrix ().set (Mat4.inverse (this.inverse ()));
          }, "black");
          this.key_triggered_button ("from rear", ["3"], () => {
              this.inverse ().set (Mat4.look_at (vec3 (0, 0, -10), vec3 (0, 0, 0), vec3 (0, 1, 0)));
              this.matrix ().set (Mat4.inverse (this.inverse ()));
          }, "black");
          this.key_triggered_button ("from left", ["4"], () => {
              this.inverse ().set (Mat4.look_at (vec3 (-10, 0, 0), vec3 (0, 0, 0), vec3 (0, 1, 0)));
              this.matrix ().set (Mat4.inverse (this.inverse ()));
          }, "black");
          this.new_line ();
          this.key_triggered_button ("Attach to global camera", ["Shift", "R"],
                                     () => { this.will_take_over_uniforms = true; }, "blue");
          this.new_line ();
      }
      first_person_flyaround (radians_per_frame, meters_per_frame, leeway = 70) {
          // Compare mouse's location to all four corners of a dead box:
          const offsets_from_dead_box = {
              plus : [this.mouse.from_center[ 0 ] + leeway, this.mouse.from_center[ 1 ] + leeway],
              minus: [this.mouse.from_center[ 0 ] - leeway, this.mouse.from_center[ 1 ] - leeway]
          };
          // Apply a camera rotation movement, but only when the mouse is
          // past a minimum distance (leeway) from the canvas's center:
          if ( !this.look_around_locked)
            // If steering, steer according to "mouse_from_center" vector, but don't
            // start increasing until outside a leeway window from the center.
              for (let i = 0; i < 2; i++) {
                  // The &&'s in the next line might zero the vectors out:
                  let o        = offsets_from_dead_box,
                      velocity = ((o.minus[ i ] > 0 && o.minus[ i ]) || (o.plus[ i ] < 0 && o.plus[ i ])) *
                                 radians_per_frame;
                  // On X step, rotate around Y axis, and vice versa.
                  this.matrix ().post_multiply (Mat4.rotation (-velocity, i, 1 - i, 0));
                  this.inverse ().pre_multiply (Mat4.rotation (+velocity, i, 1 - i, 0));
              }
          this.matrix ().post_multiply (Mat4.rotation (-.1 * this.roll, 0, 0, 1));
          this.inverse ().pre_multiply (Mat4.rotation (+.1 * this.roll, 0, 0, 1));
          // Now apply translation movement of the camera, in the newest local coordinate frame.
          this.matrix ().post_multiply (Mat4.translation (...this.thrust.times (-meters_per_frame)));
          this.inverse ().pre_multiply (Mat4.translation (...this.thrust.times (+meters_per_frame)));
      }
      third_person_arcball (radians_per_frame) {
          // Spin the scene around a point on an axis determined by user mouse drag:
          const dragging_vector = this.mouse.from_center.minus (this.mouse.anchor);
          if (dragging_vector.norm () <= 0)
              return;
          this.matrix ().post_multiply (Mat4.translation (0, 0, -25));
          this.inverse ().pre_multiply (Mat4.translation (0, 0, +25));

          const rotation = Mat4.rotation (radians_per_frame * dragging_vector.norm (),
                                          dragging_vector[ 1 ], dragging_vector[ 0 ], 0);
          this.matrix ().post_multiply (rotation);
          this.inverse ().pre_multiply (rotation);

          this.matrix ().post_multiply (Mat4.translation (0, 0, +25));
          this.inverse ().pre_multiply (Mat4.translation (0, 0, -25));
      }
      render_animation (context) {
          const m  = this.speed_multiplier * this.meters_per_frame,
                r  = this.speed_multiplier * this.radians_per_frame,
                dt = this.uniforms.animation_delta_time / 1000;

          // TODO:  Once there is a way to test it, remove the below, because uniforms are no longer inaccessible
          // outside this function, so we could just tell this class to take over the uniforms' matrix anytime.
          if (this.will_take_over_uniforms) {
              this.reset ();
              this.will_take_over_uniforms = false;
          }
          // Move in first-person.  Scale the normal camera aiming speed by dt for smoothness:
          this.first_person_flyaround (dt * r, dt * m);
          // Also apply third-person "arcball" camera mode if a mouse drag is occurring:
          if (this.mouse.anchor)
              this.third_person_arcball (dt * r);
          // Log some values:
          this.pos    = this.inverse ().times (vec4 (0, 0, 0, 1));
          this.z_axis = this.inverse ().times (vec4 (0, 0, 1, 0));
      }
  };
