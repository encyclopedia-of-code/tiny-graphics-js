import {tiny} from '../tiny-graphics.js';
import {defs as shapes} from './common-shapes.js';
import {defs as shaders} from './common-shaders.js';
import {defs as components} from './common-components.js';

const {vec3, vec4, Mat4, Shader, UBO} = tiny;

const defs = { ...shapes, ...shaders, ...components };

export {tiny, defs};

const Camera = defs.Camera =
  class Camera {
    constructor(eye = vec3 (0.0, 0.0, 0.0), at = vec3 (0.0, 0.0, -1.0), up = vec3 (0.0, 1.0, 0.0),  fov_y = Math.PI/4, aspect = 1080/600, near = 0.01, far = 1024) {

      this.position = eye;
      this.at = at;
      this.up = up;

      this.view = Mat4.look_at(this.position, this.at, this.up);

      this.ubo_layout = [{num_instances: 1,
                          data_layout:[{name:"view", type:"Mat4"},
                                       {name:"projection", type:"Mat4"},
                                       {name:"camera_position", type:"vec3"}]
                         }
                        ];
      this.is_initialized = false;
    }
    initialize(caller) {
      if (!this.is_initialized) {
        this.proj = Mat4.perspective(Math.PI/2, caller.width/caller.height, 0.01, 1024);

        const mappings = Shader.mapping_UBO();
        for (var i = 0; i < mappings.length; i++) {
          if (mappings[i].shader_name == "Camera") {
            UBO.create(caller.context, "Camera", this.ubo_layout);
            UBO.Cache["Camera"].bind(mappings[i].binding_point);
            break;
          }
        }
        this.is_initialized = true;
      }

      UBO.Cache["Camera"].update("view", this.view);
      UBO.Cache["Camera"].update("projection", this.proj);
      UBO.Cache["Camera"].update("camera_position", this.position);
    }
  };

const Light = defs.Light =
  class Light {

    static NUM_LIGHTS = 2;
    static global_index = 0;
    static global_ambient = 0.3;

    constructor(data) {

      const defaults = Light.default_values();
      Object.assign(this, defaults, data);

      this.index = Light.global_index;
      Light.global_index++;

      this.ubo_layout = [{num_instances: 1,
                          data_layout: [{name:"ambient", type:"float"}]
                         },
                         {num_instances: Light.NUM_LIGHTS,
                          data_layout: [{name:"direction_or_position", type:"vec4"},
                                        {name:"color", type:"vec3"},
                                        {name:"diffuse", type:"float"},
                                        {name:"specular", type:"float"},
                                        {name:"attenuation_factor", type:"float"}]
                         },
                        ];
      this.is_initialized = false;
    }
    static default_values () {
      return {
                direction_or_position: vec4 (0.0, 0.0, 0.0, 0.0),
                color: vec3 (1.0, 1.0, 1.0, 1.0),
                diffuse: 1.0,
                specular: 1.0,
                attenuation_factor: 0.0,
              };
    }
    initialize(caller) {
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
            break;
          }
        }
        this.is_initialized = true;
      }
    }
  };

const Material = defs.Material =
  class Material {
    constructor(name = "None", shader = undefined, data, samplers) {
      this.name = name;
      this.shader = shader;
      const defaults = shader.constructor.default_values();
      Object.assign(this, defaults, data);
      this.samplers = samplers;
      this.is_initialized = false;
    }

    initialize(gl, ubo_layout) {
      if (!this.is_initialized) {
        UBO.create(gl, this.name, ubo_layout);
        ubo_layout[0].data_layout.forEach(x => UBO.Cache[this.name].update(x.name, this[x.name]));
        this.is_initialized = true;
      }
    }

    bind(binding_point) {
      //Bind Material Data
      UBO.Cache[this.name].bind(binding_point);

      if ( this.samplers == undefined )
        return;

      //Bind Material Samplers
      const gl = UBO.Cache[this.name].gl;
      var offset = 0;
      for (const [name, sampler] of Object.entries(this.samplers)) {
        if (sampler && sampler.ready) {
          // Select texture unit offset for the fragment shader Sampler2D uniform called "samplers.name":
          gl.uniform1i (this.shader.gpu_instances.get(gl).gpu_addresses.name, offset);
          // For this draw, use the texture image from correct the GPU buffer:
          sampler.activate (gl, offset);
          offset++;
        }
      }

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
          if (entity.dirty && entity.shape.ready) {
            entity.shape.vertices = Array(entity.transforms.length).fill(0).map( (x,i) => ({matrix: entity.transforms[i]}));
            entity.shape.fill_buffer(["matrix"], undefined, 1);
            entity.dirty = false;
          }
          entity.shape.draw(caller, undefined, entity.global_transform, entity.material, undefined, entity.transforms.length)
        }
        else {
          if (entity.dirty && entity.shape.ready) {
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
