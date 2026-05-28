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
    this.submit( this.shape, matvec().set_identity(), matvec([ 1,1,1 ]) );
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
