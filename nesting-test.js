import {tiny, defs} from './common.js';
const { Vec, Mat, Mat4, Color, Light, 
        Shape, Shader, Scene, Texture } = tiny;           // Pull these names into this module's scope for convenience.
const { Triangle, Square, Tetrahedron, Windmill, Cube, Subdivision_Sphere } = defs;

const Minimal_Webgl_Demo = defs.Minimal_Webgl_Demo;
import { Phong_Comparison_Demo }
  from "./minimal-phong.js"
import { Axes_Viewer, Axes_Viewer_Test_Scene } 
  from "./axes-viewer.js"
import { Inertia_Demo, Collision_Demo }
  from "./collisions-demo.js"
import { Many_Lights_Demo }
  from "./many-lights-demo.js"
import { Obj_File_Demo }
  from "./obj-file-demo.js"
import { Scene_To_Texture_Demo }
  from "./scene-to-texture-demo.js"
import { Text_Demo }
  from "./text-demo.js"  
import { Tutorial_Animation, Transforms_Sandbox }
  from './transforms-sandbox.js';
  
export class Nesting_Test extends Tutorial_Animation
  { constructor()
      { super();
        
        this.test_scene = new Scene_To_Texture_Demo();
      }
    show_explanation( document_element, webgl_manager )
      { document_element.style.padding = 0;
        document_element.style.width = "1080px";
        document_element.style.overflowY = "hidden";

        const cw = new tiny.Canvas_Widget( document_element, undefined, [] );
        cw.webgl_manager.scenes.push( this.test_scene );
        cw.webgl_manager.program_state = webgl_manager.program_state;

        document_element.appendChild( document.createTextNode("adfafaf") );
      }
  }