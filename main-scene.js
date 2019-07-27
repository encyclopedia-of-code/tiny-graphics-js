import {tiny, defs} from './examples/common.js';
                                                  // Pull these names into this module's scope for convenience:
const { Vector, Vector3, vec, vec3, vec4, color, Matrix, Mat4, Light, Shape, Material, Shader, Texture, Scene,
        Canvas_Widget, Code_Widget, Editor_Widget, Text_Widget } = tiny;

    // Now we have loaded everything in the files tiny-graphics.js, tiny-graphics-widgets.js, and common.js.
    // This yielded "tiny", an object wrapping the stuff in the first two files, and "defs" for wrapping all the rest.

    // ******************** Extra step only for when executing on a local machine:  
    //                      Load any more files in your directory and copy them into "defs."
    //                      (On the web, a server should instead just pack all these as well 
    //                      as common.js into one file for you, such as "dependencies.js")

const Minimal_Webgl_Demo = defs.Minimal_Webgl_Demo;
import { Axes_Viewer, Axes_Viewer_Test_Scene, Matrix_Game } 
  from "./examples/axes-viewer.js"
import { Inertia_Demo, Collision_Demo }
  from "./examples/collisions-demo.js"
import { Many_Lights_Demo }
  from "./examples/many-lights-demo.js"
import { Obj_File_Demo }
  from "./examples/obj-file-demo.js"
import { Scene_To_Texture_Demo }
  from "./examples/scene-to-texture-demo.js"
import { Parametric_Surfaces }
  from "./examples/surfaces-demo.js"
import { Text_Demo }
  from "./examples/text-demo.js"
import { Transforms_Sandbox }
  from "./examples/transforms-sandbox.js"

Object.assign( defs,
                     { Axes_Viewer, Axes_Viewer_Test_Scene, Matrix_Game },
                     { Inertia_Demo, Collision_Demo },
                     { Many_Lights_Demo },
                     { Obj_File_Demo },
                     { Scene_To_Texture_Demo },
                     { Parametric_Surfaces },
                     { Text_Demo },
                     { Transforms_Sandbox } );

    // ******************** End extra step

// (Can define Main_Scene's class here)


import { Transforms_Sandbox_Base }
  from "./examples/transforms-sandbox.js"

class Demonstration extends Scene
{ constructor( scene_id, material )
    { super();

      this.widget_options = { show_canvas: false, make_controls: false,
                              make_editor: false, make_code_nav: false, show_explanation: true };

      if( typeof( scene_id ) === "undefined" )
        { this.is_master = true;
          this.sections = [];
        }

      this.num_scenes = 1;
      
      this.scene_id = scene_id;
      this.material = material;
      
      if( this.is_master )
      {                                                // Shared resources between all WebGL contexts:
        const scene = new defs.Transforms_Sandbox();
        this.sections.push( scene );
      }
      else
        this[ "construct_scene_" + scene_id ] ();
    }
  show_explanation( document_element, webgl_manager )
    { if( this.is_master )
        {
          document_element.style.padding = 0;
          document_element.style.width = "1080px";
          document_element.style.overflowY = "hidden";

          for( let i = 0; i < this.num_scenes; i++ )
            {
              let element = document_element.appendChild( document.createElement( "p" ) );
              element.style["font-size"] = "29px";
              element.style["font-family"] = "Arial";
              element.style["padding"] = "0px 25px";

              element.appendChild( document.createElement("p") ).textContent = 
                `Welcome to Demopedia.  The WebGL demo below can be edited, remixed, and saved at a new  URL.`

              element.appendChild( document.createElement("p") ).textContent =  
                `Below that you'll find the starting code for a graphics assignment. Your goal is to model an insect.`;

              element.appendChild( document.createElement("p") ).textContent =
                `Try making changes to the code below.  The code comments suggest how to do so.  Once you have 
                 modeled an insect, save your result to a URL you can share!`;

              element.appendChild( document.createElement("p") ).textContent =  
                `First, the demo:`;

              element = document_element.appendChild( document.createElement( "div" ) );
              element.className = "canvas-widget";

              const cw = new tiny.Canvas_Widget( element, undefined,
                { make_controls: i==0, show_explanation: false, make_editor: false, make_code_nav: false } );
              cw.webgl_manager.scenes.push( this.sections[ i ] );
              cw.webgl_manager.program_state = webgl_manager.program_state;
              cw.webgl_manager.set_size( [ 1080,400 ] )


              element = document_element.appendChild( document.createElement( "p" ) );
              element.style["font-size"] = "29px";
              element.style["font-family"] = "Arial";
              element.style["padding"] = "30px 25px";
              element.textContent = 
                `Next, type here to edit the code, which is drawing the above:`

              element = document_element.appendChild( document.createElement( "div" ) );
              element.className = "editor-widget";

              const options = { rows: 40 };
              const editor = new tiny.Editor_Widget( element, defs.Transforms_Sandbox, this, options );
       

              element = document_element.appendChild( document.createElement( "div" ) );
              element.style["font-size"] = "29px";
              element.style["font-family"] = "Arial";
              element.style["padding"] = "30px 25px";
              element.appendChild( document.createElement("p") ).textContent =
                `Lastly, here is a code navigator to show the whole program we are using.`
              element.appendChild( document.createElement("p") ).textContent =
                 `The tiny-graphics.js library wraps the WebGL API for us and helps display the graphical 
                 output in a document that can interact with it.`

              element = document_element.appendChild( document.createElement( "div" ) );
              element.className = "code-widget";

              new tiny.Code_Widget( element, defs.Transforms_Sandbox,
                                 [] );
            }

         }
       else
         this[ "explain_scene_" + this.scene_id ] ( document_element );
    }
  display( context, program_state )
    { 
      program_state.projection_transform = Mat4.perspective( Math.PI/4, context.width/context.height, 1, 100 ); 
      this.r = Mat4.rotation( -.5*Math.sin( program_state.animation_time/5000 ),   1,1,1 );

      if( this.is_master )
        {                                           // *** Lights: *** Values of vector or point lights.  They'll be consulted by 
                                                    // the shader when coloring shapes.  See Light's class definition for inputs.
          const t = this.t = program_state.animation_time/1000;
          const angle = Math.sin( t );
          const light_position = Mat4.rotation( angle,   1,0,0 ).times( vec4( 0,0,1,0 ) );
          program_state.lights = [ new Light( light_position, color( 1,1,1,1 ), 1000000 ) ]; 
        }
      else
        this[ "display_scene_" + this.scene_id ] ( context, program_state );
    }
}

const Main_Scene = Matrix_Game;
const Additional_Scenes = [];

export { Main_Scene, Additional_Scenes, Canvas_Widget, Code_Widget, Editor_Widget, Text_Widget, defs }