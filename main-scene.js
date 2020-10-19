import {tiny, defs} from './examples/common.js';
                                                  // Pull these names into this module's scope for convenience:
const { Vector, Vector3, vec, vec3, vec4, color, Matrix, Mat4, Shape, Material, Shader, Texture, Scene,
        Default_Layout, Code_Widget, Editor_Widget, Text_Widget } = tiny;

    // Now we have loaded everything in the files tiny-graphics.js, tiny-graphics-widgets.js, and common.js.
    // This yielded "tiny", an object wrapping the stuff in the first two files, and "defs" for wrapping all the rest.

    // ******************** Extra step only for when executing on a local machine:
    //                      Load any more files in your directory and copy them into "defs."
    //                      (On the web, a server should instead just pack all these as well
    //                      as common.js into one file for you, such as "dependencies.js")

const Minimal_Webgl_Demo = defs.Minimal_Webgl_Demo;
import { Axes_Viewer, Axes_Viewer_Test_Scene, Matrix_Game }
  from "./examples/axes-viewer.js"
import { Demonstration }
  from "./examples/demonstration.js"
import { Inertia_Demo, Collision_Demo }
  from "./examples/collisions-demo.js"
import { Many_Lights_Demo }
  from "./examples/many-lights-demo.js"
import { Obj_File_Demo }
  from "./examples/obj-file-demo.js"
import { Scene_To_Texture_Demo }
  from "./examples/scene-to-texture-demo.js"
import { Parametric_Surfaces }
 from "./examples/parametric-surfaces.js"
import { Text_Demo }
  from "./examples/text-demo.js"
import { Transforms_Sandbox_Base, Transforms_Sandbox }
  from "./examples/transforms-sandbox.js"


Object.assign( defs,
                     { Minimal_Webgl_Demo },
                     { Axes_Viewer, Axes_Viewer_Test_Scene, Matrix_Game },
                     { Demonstration },
                     { Inertia_Demo, Collision_Demo },
                     { Many_Lights_Demo },
                     { Obj_File_Demo },
                     { Scene_To_Texture_Demo },
                     { Parametric_Surfaces },
                     { Text_Demo },
                     { Transforms_Sandbox_Base, Transforms_Sandbox }
             );

    // ******************** End extra step

// (Can define main_scene's class here)


const main_scene = Parametric_Surfaces;
const additional_scenes = [];

export { main_scene, additional_scenes, Default_Layout, Code_Widget, Editor_Widget, Text_Widget, defs }
