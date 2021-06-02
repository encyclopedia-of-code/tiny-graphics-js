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
      let inv_view = Mat4.inverse(this.view);
      this.position = vec3(inv_view[0][3], inv_view[1][3], inv_view[2][3]);
      UBO.Cache["Camera"].update("camera_position", this.position);
    }
  };

const Light = defs.Light =
  class Light {

    //Break it down into a Shadow_Light subclass!

    static NUM_LIGHTS = 2;
    static global_index = 0;
    static global_ambient = 0.4;
    static GLOBAL_TEXTURE_OFFSET = 16;

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
                                        {name:"attenuation_factor", type:"float"},
                                        {name:"casts_shadow", type:"bool"},
                                      ]
                         },
                         {num_instances: Light.NUM_LIGHTS * 6,
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
        let epsilon = 0.00756; //to be able to have +-y pointing light
        let light_view = Mat4.look_at(this.direction_or_position.to3(), vec3(0.0, 0.0, 0.0), vec3(0.0 + epsilon, 1.0, 0.0));;
        let light_projection = Mat4.orthographic(-10.0, 10.0, -10.0, 10.0, 0.01, 20.0);
        this.light_space_matrix[0] = light_projection.times(light_view);
      }


      this.is_initialized = false;
      this.are_textures_bound = false;
    }
    static default_values () {
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
    activate (gl, shadow_map_index = 0) {
      //always index 0 if directional light
      if (!this.casts_shadow)
        return;

        //offset through UBOs for camera matrix and distance parameters??
      this.shadow_map_shader.activate(gl, {light_space_matrix: this.light_space_matrix[shadow_map_index]}, Mat4.identity(), undefined);
      this.shadow_map[shadow_map_index].activate(gl, 0, true);
    }
    deactivate (caller, shadow_map_index = 0) {
      if (!this.casts_shadow)
        return;
      this.shadow_map[shadow_map_index].deactivate(caller, true);
    }
    bind (context, gpu_addresses) {

      // TODO:  The light can't re-bind if it gets unbound
          // update: (we would just destroy it and reuse its index rather than unbind/rebind)
      if(this.are_textures_bound)
        return;

      for (let i = 0; i < 6; i++) {
        if( !this.shadow_map[i])
          continue;
        let name = "shadow_maps[" + (this.index * 6 + i) + "]";
        let texture_index = Light.GLOBAL_TEXTURE_OFFSET + this.index * 6 + i;

        context.uniform1i (gpu_addresses[name], texture_index);
        this.shadow_map[i].activate (context, texture_index);
      }

      this.are_textures_bound = true;
    }
  };

const Material = defs.Material =
  class Material {
    constructor(name = "None", shader = undefined, data = {}, samplers = {}) {
      this.name = name;
      this.shader = shader;
      const defaults = shader.constructor.default_values();
      this.data = Object.assign({}, defaults, data);
      this.samplers = samplers;
      this.is_initialized = false;
      this.ready = true;

    }

    initialize(gl, ubo_layout) {
      if (this.ready && !this.is_initialized) {
        UBO.create(gl, this.name, ubo_layout);
        ubo_layout[0].data_layout.forEach(x => UBO.Cache[this.name].update(x.name, this.data[x.name]));
        this.is_initialized = true;
      }
    }

    bind(binding_point) {

      //Bind Material Data
      UBO.Cache[this.name].bind(binding_point);

      if ( this.samplers == {} )
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

const Material_From_File = defs.Material_From_File =
  class Material_From_File extends Material {
    constructor(name = "None", shader = undefined, filename, data = {}, samplers = {}) {
      super(name, shader);
      //this.data is shader defaults
      //this.samplers is {}
      this.arg_data = data;
      this.arg_samplers = samplers;
      this.ready = false;

      this.directory = filename.substring(0, filename.lastIndexOf('/') + 1);
      this.load_file( filename );
    }
    load_file( filename ) {
      // Request the external file and wait for it to load.
      return fetch( filename )
        .then( response =>
          { if ( response.ok )  return Promise.resolve( response.text() )
            else                return Promise.reject ( response.status )
          })
        .then( mtl_file_contents => this.parse_into_material( mtl_file_contents ) )
        .catch( error => { throw "MTL file loader:  MTL file either not found or is of unsupported format." } )
    }
    parse_into_material( data ) {
      // Read All materials, a map from material name -> material data and samplers

        var lines = data.split('\n');

        var NEWNAME_RE = /^newmtl\s/;
        var AMBIENT_RE = /^Ka\s/;
        var DIFFUSE_RE = /^Kd\s/;
        var SPECULAR_RE = /^Ks\s/;
        var SMOOTHNESS_RE = /^Ns\s/;
        var NON_TRANSPARENCY_RE = /^d\s/;
        var TRANSPARENCY_RE = /^Tr\s/;
        var ILLUM_RE = /^illum\s/;
        var MAP_DIFFUSE_RE = /^map_Kd\s/;
        var MAP_NORMAL_RE = /^map_Bump\s/;
        var MAP_SPECULAR_RE = /^map_Ks\s/;
        var WHITESPACE_RE = /\s+/;

        this.MTL = [];
        var first_material_name = undefined;
        var current_material_name = undefined;

        for (var i = 0; i < lines.length; i++) {
          var line = lines[i].trim();
          var elements = line.split(WHITESPACE_RE);
          elements.shift();

          if (NEWNAME_RE.test(line)) {
            current_material_name = elements[0];
            if ( first_material_name == undefined ) {
              first_material_name = current_material_name;
            }
            this.MTL[current_material_name] = {data: {}, samplers: {}};
          }
          else if (AMBIENT_RE.test(line)) {
            if (this.MTL[current_material_name].data.color == undefined)
              //haven't read transparency yet
              this.MTL[current_material_name].data.color = vec4 (elements[0], elements[1], elements[2], 1.0);
            else {
              //already read transparency
              this.MTL[current_material_name].data.color[0] = elements[0];
              this.MTL[current_material_name].data.color[1] = elements[1];
              this.MTL[current_material_name].data.color[2] = elements[2];
            }
          }
          else if (DIFFUSE_RE.test(line)) {
            this.MTL[current_material_name].data.diffuse = vec3 (elements[0], elements[1], elements[2]);
          }
          else if (SPECULAR_RE.test(line)) {
            this.MTL[current_material_name].data.specular = vec3 (elements[0], elements[1], elements[2]);
          }
          else if (SMOOTHNESS_RE.test(line)) {
            this.MTL[current_material_name].data.smoothness = +(elements[0]);
          }
          else if (NON_TRANSPARENCY_RE.test(line)) {
            if (this.MTL[current_material_name].data.color == undefined)
              //haven't read color yet
              this.MTL[current_material_name].data.color = vec4 (1.0, 1.0, 1.0, elements[0]);
            else {
              //already read color
              this.MTL[current_material_name].data.color[3] = elements[0];
            }
          }
          else if (TRANSPARENCY_RE.test(line)) {
            if (this.MTL[current_material_name].data.color == undefined)
              //haven't read color yet
              this.MTL[current_material_name].data.color = vec4 (1.0, 1.0, 1.0, 1.0 - elements[0]);
            else {
              //already read color
              this.MTL[current_material_name].data.color[3] = 1.0 - elements[0];
            }
          }
          else if (ILLUM_RE.test(line)) {
            //Ignore this for now
            //If Illum is 1, can disable specular
          }
          else if (MAP_DIFFUSE_RE.test(line)) {
            this.MTL[current_material_name].samplers.diffuse_texture = new tiny.Texture(this.directory + elements[0]);
          }
          else if (MAP_NORMAL_RE.test(line)) {
            this.MTL[current_material_name].samplers.normal_texture = new tiny.Texture(this.directory + elements[0]);
          }
          else if (MAP_SPECULAR_RE.test(line)) {
            this.MTL[current_material_name].samplers.specular_texture = new tiny.Texture(this.directory + elements[0]);
          }
        }

        //this.data is shader defaults
        //shader defaults <- mtl file <- argument data
        this.data = Object.assign({}, this.data, this.MTL[first_material_name].data, this.arg_data);
        //mtl file <- argument sampler
        this.samplers = Object.assign({}, this.MTL[first_material_name].samplers, this.arg_samplers);
        this.ready = true;
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
      this.lights = []
    }
    submit (object) {
      if (object instanceof Entity)
        this.entities.push(object);
    }
    shadow_map_pass (caller, lights) {
      for (let light of lights) {
        if (light.is_point_light)
        {
          for (let i = 0; i < 6; i++) {
            light.activate(caller.context, i);
            this.flush(caller, [], false, light.shadow_map_shader);
            light.deactivate(caller, i);
          }
        }
        else {
          light.activate(caller.context);
          this.flush(caller, [], false, light.shadow_map_shader);
          light.deactivate(caller);
        }
      }
    }

    //$$$$$$$$$$$$$$$$$$$$$$$$$$ PASS THE LIGHTS TO THE SHADER SO IT CAN BIND THEM
    flush (caller, lights = [], clear_entities = true, alternative_shader = undefined) {

      const shadow_pass_material = alternative_shader ?
                      new Material("shadow_pass_material", alternative_shader) :
                      undefined;

      for(let entity of this.entities){
        if( entity.transforms instanceof tiny.Matrix ) {
          if (entity.dirty && entity.shape.ready) {
            entity.shape.vertices = [{matrix: entity.transforms}];
            //Ideally use a shader with just a uniform matrix where you pass global.times(model)?
            entity.shape.fill_buffer(["matrix"], undefined, 1);
            entity.dirty = false;
          }
          entity.shape.draw(caller, {lights}, entity.global_transform, shadow_pass_material || entity.material, undefined, 1);
        }
        else {
          if (entity.dirty && entity.shape.ready) {
            entity.shape.vertices = Array(entity.transforms.length).fill(0).map( (x,i) => ({matrix: entity.transforms[i]}));
            entity.shape.fill_buffer(["matrix"], undefined, 1);
            entity.dirty = false;
          }
          entity.shape.draw(caller, {lights}, entity.global_transform, shadow_pass_material || entity.material, undefined, entity.transforms.length);
        }
      }

      if (clear_entities)
        this.entities = []
    }
  };
