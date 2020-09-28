import {tiny, defs} from './common.js';
                                                  // Pull these names into this module's scope for convenience:
const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } = tiny;

import { Transforms_Sandbox } from "./transforms-sandbox.js"


export class Demonstration extends Component
{
  render_layout( div, options = {} )
    {
      this.div = div;
      div.className = "documentation_treenode";
                                                        // Fit the existing document content to a fixed size:
      div.style.margin = "auto";
      div.style.width = "1080px";

      const rules = [
        `.documentation-big { width:1030px; padding:0 25px; font-size: 29px; font-family: Arial`,
        `.documentation-big-top { padding: 30px 25px }`
        ];
      Component.initialize_CSS( Demonstration, rules );

      const region_1 = div.appendChild( document.createElement( "div" ) );
      region_1.classList.add( "documentation", "documentation-big", "documentation-big-top" );

      region_1.appendChild( document.createElement("p") ).textContent =
        `Welcome to Demopedia.  The WebGL demo below can be edited, remixed, and saved at a new  URL.`

      region_1.appendChild( document.createElement("p") ).textContent =
        `Below that you'll find the starting code for a graphics assignment. Your goal is to model an insect.`;

      region_1.appendChild( document.createElement("p") ).textContent =
        `Try making changes to the code below.  The code comments suggest how to do so.  Once you have
         modeled an insect, save your result to a URL you can share!`;

      region_1.appendChild( document.createElement("p") ).textContent =
        `First, the demo:`;

            // TODO:  One use case may have required canvas to be styled as a rule instead of as an element.  Keep an eye out.
      const canvas = div.appendChild( document.createElement( "canvas" ) );
      canvas.style = `width:1080px; height:600px; background:DimGray; margin:auto; margin-bottom:-4px`;

                                        // Use tiny-graphics-js to draw graphics to the canvas, using the given scene objects.
      this.webgl_manager = new tiny.Webgl_Manager( canvas );

      this.webgl_manager.component = new Transforms_Sandbox();
      this.webgl_manager.set_size( [ 1080,400 ] )

                                       // Start WebGL main loop - render() will re-queue itself for continuous calls.
      this.webgl_manager.event = window.requestAnimFrame( this.webgl_manager.render.bind( this.webgl_manager ) );


      const region_2 = div.appendChild( document.createElement( "div" ) );
      region_2.classList.add( "documentation", "documentation-big" );

      region_2.appendChild( document.createElement("p") ).textContent =
        `Next, type here to edit the code, which is drawing the above:`

      this.embedded_editor_area = div.appendChild( document.createElement( "div" ) );
      this.embedded_editor_area.className = "editor-widget";

      this.embedded_editor = new tiny.Editor_Widget( this, { rows: 40 } );

      const region_3 = div.appendChild( document.createElement( "div" ) );
      region_3.classList.add( "documentation", "documentation-big" );

      region_3.appendChild( document.createElement("p") ).textContent =
        `Lastly, here is a code navigator to show the whole program we are using.`
      region_3.appendChild( document.createElement("p") ).textContent =
        `The tiny-graphics.js library wraps the WebGL API for us and helps display the graphical
         output in a document that can interact with it.`

      this.embedded_code_nav_area = div.appendChild( document.createElement( "div" ) );
      this.embedded_code_nav_area.className = "code-widget";

      this.embedded_code_nav = new tiny.Code_Widget( this );
    }
}