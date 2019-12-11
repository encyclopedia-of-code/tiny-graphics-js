import {tiny, defs} from './common.js';
                                            // Pull these names into this module's scope for convenience:
const { vec3, vec4, color, Mat4, Light, Shape, Material, Shader, Texture, Scene } = tiny;

import { Transforms_Sandbox } from "./transforms-sandbox.js"






export class Demonstration extends Scene
{ constructor( scene_id, material )
    { super();

      this.widget_options = { show_canvas: false, make_controls: false,
                              make_editor: false, make_code_nav: false };

      this.inner_scenes = [];
      for( let i = 0; i < this.num_sections(); i++ )
        this.inner_scenes.push( new Demonstration_Section( i ) );

    }
  num_sections() { return 3 }
  show_document( document_builder )
    {
      for( let section of this.inner_scenes )
        section.document_builder = document_builder.expand_tree( section );
    }
}


export
const Demonstration_Section = defs.Demonstration_Section =
class Demonstration_Section extends Scene
{
  constructor( section_index )
    {
      super();
      this.section_index = section_index; 
    }
  show_document( document_builder )
    {
        document_builder.div.className = "documentation_treenode";

        this[ "explain_section_" + this.section_index ] ( document_builder );
    }
  explain_section_0( document_builder )
    {
      const region = document_builder.document_region;
      Demonstration_Layout.apply_style_for_text_region( region, true );

      region.appendChild( document.createElement("p") ).textContent =
        `Welcome to Demopedia.  The WebGL demo below can be edited, remixed, and saved at a new  URL.`

      region.appendChild( document.createElement("p") ).textContent =
        `Below that you'll find the starting code for a graphics assignment. Your goal is to model an insect.`;

      region.appendChild( document.createElement("p") ).textContent =
        `Try making changes to the code below.  The code comments suggest how to do so.  Once you have 
         modeled an insect, save your result to a URL you can share!`;

      region.appendChild( document.createElement("p") ).textContent =
        `First, the demo:`;

        
    }
  explain_section_1( document_builder )
    {
    }
  explain_section_2( document_builder )
    {
    }
}





const Demonstration_Layout = defs.Demonstration_Layout =
class Demonstration_Layout extends tiny.Document_Builder
{
  constructor( div, initial_scenes )
  {
                                                       // Populate the usual document region at the top, and fit to a fixed size:
    super( div, initial_scenes && initial_scenes[0] );
    div.style.margin = "auto";
    div.style.width = "1080px";

    const region_1 = div.appendChild( document.createElement( "div" ) );
    Demonstration_Layout.apply_style_for_text_region( region_1, true );

    region_1.appendChild( document.createElement("p") ).textContent = 
      `Welcome to Demopedia.  The WebGL demo below can be edited, remixed, and saved at a new  URL.`

    region_1.appendChild( document.createElement("p") ).textContent =  
      `Below that you'll find the starting code for a graphics assignment. Your goal is to model an insect.`;

    region_1.appendChild( document.createElement("p") ).textContent =
      `Try making changes to the code below.  The code comments suggest how to do so.  Once you have 
       modeled an insect, save your result to a URL you can share!`;

    region_1.appendChild( document.createElement("p") ).textContent =  
      `First, the demo:`;

    const canvas = region_1.appendChild( document.createElement( "canvas" ) );
    canvas.style = `width:1080px; height:400px; background:DimGray; margin:auto; margin-bottom:-4px`;

                                      // Use tiny-graphics-js to draw graphics to the canvas, using the given scene objects.
    this.webgl_manager = new tiny.Webgl_Manager( canvas );
    
    if( !initial_scenes )
      return;
     
    this.webgl_manager.scenes.push( ...initial_scenes );
    this.webgl_manager.set_size( [ 1080,400 ] )

    const primary_scene_constructor = initial_scenes[0].constructor;

    const additional_scenes = initial_scenes.slice(1);

    const region_2 = div.appendChild( document.createElement( "div" ) );
    Demonstration_Layout.apply_style_for_text_region( region_2 );

    region_2.appendChild( document.createElement("p") ).textContent = 
      `Next, type here to edit the code, which is drawing the above:`

    this.embedded_editor_area = region_2.appendChild( document.createElement( "div" ) );
    this.embedded_editor_area.className = "editor-widget";

    const options = { rows: 40 };
    this.embedded_editor = new tiny.Editor_Widget( this.embedded_editor_area, primary_scene_constructor, this, options );

    const region_3 = div.appendChild( document.createElement( "div" ) );
    Demonstration_Layout.apply_style_for_text_region( region_3 );

    region_3.appendChild( document.createElement("p") ).textContent = 
      `Lastly, here is a code navigator to show the whole program we are using.`
    region_3.appendChild( document.createElement("p") ).textContent =
      `The tiny-graphics.js library wraps the WebGL API for us and helps display the graphical 
       output in a document that can interact with it.`

    this.embedded_code_nav_area = region_3.appendChild( document.createElement( "div" ) );
    this.embedded_code_nav_area.className = "code-widget";

    this.embedded_code_nav = new tiny.Code_Widget( this.embedded_code_nav_area, primary_scene_constructor,
                     [], this );
                                     // Start WebGL main loop - render() will re-queue itself for continuous calls.
    this.webgl_manager.render();

  }

    // Internal helpers:
  static apply_style_for_text_region( div, is_topmost )
    { div.style["font-size"] = "29px";
      div.style["font-family"] = "Arial";
      div.style.padding = is_topmost ? "0px 25px" : "30px 25px" ;
    }
}


export class Demonstration_Old extends Scene
{ constructor( scene_id, material )
    { super();

      this.widget_options = { show_canvas: false, make_controls: false,
                              make_editor: false, make_code_nav: false };                    

    }
  show_document( document_builder )
    {
      const scene = new Transforms_Sandbox();
      scene.document_builder = Demonstration.expand_document_builder_tree( document_builder, [ scene ] );
    }
  // Internal helper function:
  static expand_document_builder_tree( containing_builder, scenes )
    { const child = new Demonstration_Layout( containing_builder.div, scenes );
      containing_builder.children.push( child );
      return child;
    }
}