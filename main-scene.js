import * as tiny from './tiny-graphics.js';

const { Vec, Mat, Mat4, Color, Shape, Shader, Overridable,
         Scene, Canvas_Widget, Code_Widget } = tiny;           // Pull these names into this module's scope for convenience.

const defs = {};

    // Now we have loaded everything in the file tiny-graphics.js. This yielded "tiny", an object wrapping its stuff.

class Minimal_Shape extends tiny.Vertex_Buffer    // The simplest possible Shape – one triangle.  It has 3 vertices, each
{ constructor()                                     // containing two values: a 3D position and a color.
    { super( "position", "color" );
      this.arrays.position = [ Vec.of(0,0,0), Vec.of(1,0,0), Vec.of(0,1,0) ];   // Describe the where the points of a triangle are in space.
      this.arrays.color    = [ Color.of(1,0,0,1), Color.of(0,1,0,1), Color.of(0,0,1,1) ];   // Besides a position, vertices also have a color.      
    }
}


class Basic_Shader extends Shader      // Subclasses of Shader each store and manage a complete GPU program.  This Shader is 
{                                             // the simplest example of one.  It samples pixels from colors that are directly assigned 
                                              // to the vertices.
  material() { return new class Material extends Overridable {}().replace({ shader: this }) }      // Materials here are minimal, without any settings.
  update_GPU( context, gpu_addresses, graphics_state, model_transform, material )    // Define how to synchronize our JavaScript's variables to the GPU's:
      { const [ P, C, M ] = [ graphics_state.projection_transform, graphics_state.camera_inverse, model_transform ],
                      PCM = P.times( C ).times( M );
        context.uniformMatrix4fv( gpu_addresses.projection_camera_model_transform, false, Mat.flatten_2D_to_1D( PCM.transposed() ) );
      }
  shared_glsl_code()            // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
    { return `precision mediump float;
              varying vec4 VERTEX_COLOR;
      `;
    }
  vertex_glsl_code()           // ********* VERTEX SHADER *********
    { return `
        attribute vec4 color;
        attribute vec3 position;                            // Position is expressed in object coordinates.
        uniform mat4 projection_camera_model_transform;

        void main()
        { gl_Position = projection_camera_model_transform * vec4( position, 1.0 );      // The vertex's final resting place (in NDCS).
          VERTEX_COLOR = color;                                                         // Use the hard-coded color of the vertex.
        }`;
    }
  fragment_glsl_code()           // ********* FRAGMENT SHADER *********
    { return `
        void main()
        { gl_FragColor = VERTEX_COLOR;                              // The interpolation gets done directly on the per-vertex colors.
        }`;
    }
}

class Minimal_Webgl_Demo extends Scene
{ constructor( webgl_manager, control_panel )
    { super( webgl_manager, control_panel );
      this.shapes = { triangle : new Minimal_Shape() };         // Send a Triangle's vertices to the GPU's buffers.
      this.shader = new Basic_Shader();
    }
  display( context, graphics_state )                                                      // Do this every frame.
    { this.shapes.triangle.draw( context, graphics_state, Mat4.identity(), this.shader.material() );  // Draw the triangle.
    }
 make_control_panel()                 // Draw buttons, setup their actions and keyboard shortcuts, and monitor live variables.
    { this.control_panel.innerHTML += "(This one has no controls)";
    }
}

const Main_Scene = Minimal_Webgl_Demo;
const Additional_Scenes = [];

export { Main_Scene, Additional_Scenes, Canvas_Widget, Code_Widget, defs }