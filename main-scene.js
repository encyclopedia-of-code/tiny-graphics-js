import {tiny, defs} from './common.js';
const { Vec, Mat, Mat4, Color, Shape, Shader, 
         Scene, Canvas_Widget, Code_Widget, Text_Widget } = tiny;           // Pull these names into this module's scope for convenience.

    // Now we have loaded everything in the files tiny-graphics.js, tiny-graphics-widgets.js, and common.js.
    // This yielded "tiny", an object wrapping the stuff in the first two files, and "defs" for wrapping all the rest.

    // ******************** Extra step only for when executing on a local machine:  
    //                      Load any more files in your directory and copy them into "defs."
    //                      (On the web, a server should instead just pack all these as well 
    //                      as common.js into one file for you, such as "dependencies.js")

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
import { Nesting_Test }
  from './nesting-test.js';

Object.assign( defs, 
                     { Phong_Comparison_Demo },
                     { Axes_Viewer, Axes_Viewer_Test_Scene },
                     { Inertia_Demo, Collision_Demo },
                     { Many_Lights_Demo },
                     { Obj_File_Demo },
                     { Scene_To_Texture_Demo },
                     { Text_Demo },
                     { Tutorial_Animation, Transforms_Sandbox },
                     { Nesting_Test } );


    // ******************** End extra step

// (Can define Main_Scene's class here)

const Main_Scene = Phong_Comparison_Demo;
const Additional_Scenes = [];

export { Main_Scene, Additional_Scenes, Canvas_Widget, Code_Widget, Text_Widget, defs }