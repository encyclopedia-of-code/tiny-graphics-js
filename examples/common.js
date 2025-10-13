import { vec3, vec4, Mat4, UBO_Plan, Texture } from '../tiny-graphics.js';
export * from '../tiny-graphics.js';
export * from './common-shapes.js';
export * from './common-shaders.js';
export * from './common-components.js';

export class Camera extends UBO_Plan {
    init(fields) {
      this.fields = { projection: Mat4.identity(),
                    camera_world: Mat4.identity(),
                  camera_inverse: Mat4.identity() };
     this.assign(fields);
    }
    assign(fields) {
      // If only one matrix is provided, invert it to fill in the other.
      const temp = { camera_world: fields?.camera_world || fields?.camera_inverse && Mat4.inverse(fields.camera_inverse),
                   camera_inverse: fields?.camera_inverse || fields?.camera_world && Mat4.inverse(fields.camera_world) };
      Object.assign( this.fields, fields, temp.camera_world ? temp : {} );
      this.fields.camera_position = vec3(this.fields.camera_world[0][3], this.fields.camera_world[1][3],
                                         this.fields.camera_world[2][3]);
    }
    get_binding_point () { return 0; }
    post_multiply (matrix) {
        this.assign( { camera_world: this.fields.camera_world.times(matrix) } );
    }
    pre_multiply (inverted_matrix) {
      this.assign( { camera_inverse: inverted_matrix.times(this.fields.camera_inverse) } );
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
                            direction_or_position: vec4 (0.0, 0.0, 0.0, 0.0),
                            color: vec3 (1.0, 1.0, 1.0),
                            diffuse: 1.0,
                            specular: 1.0,
                            attenuation_factor: 0.0
                          },
                          {
                            direction_or_position: vec4 (0.0, -1.0, 0.0, 1.0),
                            color: vec3 (1.0, 1.0, 1.0),
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

export class Material_From_File extends UBO_Plan {
    init(shader = undefined, filename, arg_fields = {}, arg_samplers = {}) {
      Object.assign (this, shader, filename, arg_fields, {arg_samplers: new Map(arg_samplers)} );
      this.ready = false;

      this.directory = filename.substring(0, filename.lastIndexOf('/') + 1);
      this.load_file( filename );
    }
    get_binding_point () { return 2; }
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

        //shader defaults <- mtl file <- argument data
        this.fields = Object.assign(shader.constructor.default_values(), this.MTL[first_material_name].data, this.arg_fields);
        //mtl file <- argument sampler
        this.samplers = Object.assign(this.MTL[first_material_name].samplers, this.arg_samplers);
        this.ready = true;

    }
  };
