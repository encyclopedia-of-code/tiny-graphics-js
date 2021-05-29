import {defs} from './examples/common.js';

// Now everything is loaded from tiny-graphics.js and its helper files. An object "tiny" wraps its contents, along
// with "defs" for wrapping some additional utilities included in common.js.

// ******************** Before selecting which demo we want to display, we have to load its code. If this page is hosted
// on the internet, the demo's class can be injected right here by the server.
//
// In this case, it's not, so you'll instead Load demos from files in your directory and copy them into "defs."

const Minimal_Webgl_Demo = defs.Minimal_Webgl_Demo;
import {Axes_Viewer, Axes_Viewer_Test_Scene, Matrix_Game}
                    from "./examples/axes-viewer.js";
import {Demonstration}
                    from "./examples/demonstration.js";
import {Fish_Demo}
                    from "./examples/fish-demo.js";
import {Inertia_Demo, Collision_Demo}
                    from "./examples/collisions-demo.js";
import {Instanced_Cubes_Demo}
                    from "./examples/instancing-demos.js";
import {Many_Lights_Demo}
                    from "./examples/many-lights-demo.js";
import {Obj_File_Demo}
                    from "./examples/obj-file-demo.js";
import {Parametric_Surfaces}
                    from "./examples/parametric-surfaces.js";
import {Particle_Demo}
                    from "./examples/particle-demo.js";
import {Scene_To_Texture_Demo}
                    from "./examples/scene-to-texture-demo.js";
import {Shadows_Demo}
                    from "./examples/shadows-demo.js";
import {Text_Demo}
                    from "./examples/text-demo.js";
import {Transforms_Sandbox_Base, Transforms_Sandbox}
                    from "./examples/transforms-sandbox.js";

Object.assign (defs,
               {Minimal_Webgl_Demo},
               {Axes_Viewer, Axes_Viewer_Test_Scene, Matrix_Game},
               {Demonstration},
               {Fish_Demo},
               {Inertia_Demo, Collision_Demo},
               {Instanced_Cubes_Demo},
               {Many_Lights_Demo},
               {Obj_File_Demo},
               {Parametric_Surfaces},
               {Particle_Demo},
               {Scene_To_Texture_Demo},
               {Shadows_Demo},
               {Text_Demo},
               {Transforms_Sandbox_Base, Transforms_Sandbox}
);

// ******************** SELECT THE DEMO TO DISPLAY:

const main_scene        = Fish_Demo;
const additional_scenes = [];

export {main_scene, additional_scenes, defs};
