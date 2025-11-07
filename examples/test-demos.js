import * as tiny from '../tiny-graphics.js';
import * as defs from './common.js';
import { MatVec, matvec, RenderListItem, Renderer } from './common.js';

export class Minimal_Demo extends Renderer {
  init () {
    super.init();
    this.shape = new defs.Cube();
    this.state.shader = new Basic_Shader();
    this.passes = [ Object.create( this.state ) ];
    this.item = new defs.RenderListItem(this.passes[0], this.shape, 0);
    this.renderList.insert( this.item );
    this.renderList.traverse( (item) => item.update_per_instance_buffer(), {prune: false} );
  }
  render_frame () {
    this.renderList.traverse( (item) => this.draw( item ), {prune: true} );
  }
}

export class Minimal_Shape extends tiny.Shape {
      // A truly minimal triangle, with three vertices each holding a 3D position and a color.
      init () {
          this.vertices[0] = { position: matvec([0, 0, 0]), color: matvec([1, 0, 0, 1]) };
          this.vertices[1] = { position: matvec([1, 0, 0]), color: matvec([0, 1, 0, 1]) };
          this.vertices[2] = { position: matvec([0, 1, 0]), color: matvec([0, 0, 1, 1]) };
      }
  };

export class Basic_Shader extends tiny.Shader {
    static default_values () { return {}; }
      vertex_glsl_code () {          // ********* VERTEX SHADER *********
        return "#version 300 es " + `
          precision mediump float;
          layout(location = 0) in vec3 position;
          void main() {
            gl_Position = vec4( position, 1.0 );
          }`;
      }
      fragment_glsl_code () {         // ********* FRAGMENT SHADER *********
        return "#version 300 es " + `
          precision mediump float;
          out vec4 frag_color;
          void main() {
            frag_color = vec4(1.0, 0.0, 0.0, 1.0);
          }`;
      }
  };


export class Minimal_Shading_Demo extends Renderer {
  init () {
    super.init();
    this.shape = new defs.Cube();
    //this.state.shader = new defs.PBR_Shader (1, 1, {has_shadows: false, has_textures: true});
    this.state.shader = new defs.Minimal_Phong_Shader (1, 1);
    this.state.materials = new defs.Simple_Materials( { "solid": undefined } );

    this.state.lightArray = new defs.LightArray({ambient: .025, lights:[
           {direction_or_position: matvec([0, 10, 0, 0]),
             color: matvec([1.0, 0.7, 0.7]), diffuse: 1.0, specular: 1.0, attenuation_factor: 0.0001},
         ]});

    this.passes = [ Object.create( this.state ) ];
    this.item = new defs.RenderListItem(this.passes[0], this.shape, 0);
    this.renderList.insert( this.item );
    this.renderList.traverse( (item) => item.update_per_instance_buffer(), {prune: false} );
  }
  render_frame () {
    if( !this.controls )  {
      const camera = { camera_inverse: matvec().look_at( matvec([0.0, 5.0, 20.0]), matvec([0,0,0]), matvec([0,1,0]) ),
                          projection: matvec().perspective(Math.PI/2, this.width/this.height, 0.01, 500) };
      this.state.camera = new defs.Camera( camera );
      this.controls = new defs.Movement_Controls( { state: this.state } );
      this.controls.add_mouse_controls( this.canvas );
      this.animated_children.push( this.controls );
    }
    this.renderList.traverse( (item) => this.draw( item ), {prune: true} );
  }
}

export class Debug_Shader extends tiny.Shader {
    update_GPU (renderer, uniforms, matrix, material) {
      const gpu_addresses = renderer.uniform_addresses.get(this);

      renderer.state.selected_UBOs.set(material.get_binding_point(), material);

      renderer.context.uniform1f (gpu_addresses.animation_time, uniforms.animation_time / 1000);
    }
    static default_values () {
      return {
            };
    }
    shared_glsl_code () {           // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return "#version 300 es " + `
                precision mediump float;
    `;
    }

    // FINISH:  Do we still need layout index qualifiers?

    vertex_glsl_code () {          // ********* VERTEX SHADER *********
        return this.shared_glsl_code () + `
      layout(location = 0) in vec3 position; // Position is expressed in object coordinates
      layout(location = 1) in vec3 normal;
      layout(location = 2) in vec2 texture_coord;
      layout(location = 3) in mat4 model_transform;

      out vec3 VERTEX_POS;
      out vec3 VERTEX_NORMAL;
      out vec2 VERTEX_TEXCOORD;
      out mat4 VALUE_TO_TEST;

      uniform float animation_time;

      void main() {
        vec4 world_position = vec4( position, 1.0 );
        gl_Position = world_position;

        VERTEX_POS = vec3(world_position);
        VERTEX_NORMAL = normal;
        VERTEX_TEXCOORD = texture_coord;

        VALUE_TO_TEST = model_transform;
      }`;
    }
    fragment_glsl_code () {         // ********* FRAGMENT SHADER *********
        return this.shared_glsl_code () + `
      in vec3 VERTEX_POS;
      in vec3 VERTEX_NORMAL;
      in vec2 VERTEX_TEXCOORD;

      in mat4 VALUE_TO_TEST;

      uniform float animation_time;

      out vec4 frag_color;

      void main() {
        frag_color = vec4(0.);
        float max = 33.0;
        float digit = 10.0;

        for(int i = 0; i < 4; i++)
        for(int j = 0; j < 4; j++) {
          bool is_fragment_in_cell_xrange = VERTEX_POS.x*8. > float(j) && VERTEX_POS.x*8. < float(j+1);
          bool is_fragment_in_cell_yrange = VERTEX_POS.y*8. > float(3-i) && VERTEX_POS.y*8. < float(4-i);

          float flash_odd = mod (VALUE_TO_TEST[j][i] * animation_time/100., 2. );

          float exact_equality_test_value = 22.0;
          bool expression_to_test = VALUE_TO_TEST[j][i] == exact_equality_test_value;
          float brighten = float (expression_to_test);

          if (is_fragment_in_cell_xrange && is_fragment_in_cell_yrange)
            frag_color += vec4(VALUE_TO_TEST[j][i]/max/digit, mod(VALUE_TO_TEST[j][i]/max,digit), brighten, 1.);
        }
      }`
    }
};
