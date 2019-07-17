import {tiny, defs} from './examples/common.js';
const { Vec, Mat, Mat4, Color, Shape, Shader, 
         Scene, Canvas_Widget, Code_Widget, Text_Widget } = tiny;           // Pull these names into this module's scope for convenience.

    // Now we have loaded everything in the files tiny-graphics.js, tiny-graphics-widgets.js, and common.js.
    // This yielded "tiny", an object wrapping the stuff in the first two files, and "defs" for wrapping all the rest.

    // ******************** Extra step only for when executing on a local machine:  
    //                      Load any more files in your directory and copy them into "defs."
    //                      (On the web, a server should instead just pack all these as well 
    //                      as common.js into one file for you, such as "dependencies.js")

const Minimal_Webgl_Demo = defs.Minimal_Webgl_Demo;
import { Axes_Viewer, Axes_Viewer_Test_Scene } 
  from "./examples/axes-viewer.js"
import { Inertia_Demo, Collision_Demo }
  from "./examples/collisions-demo.js"
import { Many_Lights_Demo }
  from "./examples/many-lights-demo.js"
import { Obj_File_Demo }
  from "./examples/obj-file-demo.js"
import { Scene_To_Texture_Demo }
  from "./examples/scene-to-texture-demo.js"
import { Surfaces_Demo }
  from "./examples/surfaces-demo.js"
import { Text_Demo }
  from "./examples/text-demo.js"
import { Transforms_Sandbox }
  from "./examples/transforms-sandbox.js"

Object.assign( defs,
                     { Axes_Viewer, Axes_Viewer_Test_Scene },
                     { Inertia_Demo, Collision_Demo },
                     { Many_Lights_Demo },
                     { Obj_File_Demo },
                     { Scene_To_Texture_Demo },
                     { Surfaces_Demo },
                     { Text_Demo },
                     { Transforms_Sandbox } );

    // ******************** End extra step

// (Can define Main_Scene's class here)

const Main_Scene = Transforms_Sandbox;
const Additional_Scenes = [];

export { Main_Scene, Additional_Scenes, Canvas_Widget, Code_Widget, Text_Widget, defs }