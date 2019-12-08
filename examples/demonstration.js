import {tiny, defs} from './common.js';
                                            // Pull these names into this module's scope for convenience:
const { vec3, vec4, color, Mat4, Light, Shape, Material, Shader, Texture, Scene } = tiny;

const Demonstration_Layout = defs.Demonstration_Layout =
class Demonstration_Layout extends tiny.Document_Builder
{
  constructor( div, initial_scenes, options = {} )
  {
                                                      // Populate the usual document region at the top, and fit to a fixed size:
    super( div, initial_scenes && initial_scenes[0] );
    div.style.margin = "auto";
    div.style.width = "1080px";
                                                      // The next div down will hold a canvas and/or related interactive areas.
    this.program_stuff = this.div.appendChild( document.createElement( "div" ) );

    const defaults = { show_canvas: true,  make_controls: true,
                       make_editor: false, make_code_nav: true };

                                     // The primary scene we're documenting can override this document's display options.
    if( initial_scenes && initial_scenes[0] )
      Object.assign( options, initial_scenes[0].widget_options );
    Object.assign( this, defaults, options )

    const canvas = this.program_stuff.appendChild( document.createElement( "canvas" ) );

    const rules = [ 
      `.document-builder canvas { width:1080px; height:600px; background:DimGray; margin:auto; margin-bottom:-4px }`
      ];
    if( document.styleSheets.length == 0 ) document.head.appendChild( document.createElement( "style" ) );
    for( const r of rules ) document.styleSheets[document.styleSheets.length - 1].insertRule( r, 0 )

    if( !this.show_canvas )
      canvas.style.display = "none";
                                      // Use tiny-graphics-js to draw graphics to the canvas, using the given scene objects.
    this.webgl_manager = new tiny.Webgl_Manager( canvas );
    
    if( initial_scenes )
      this.webgl_manager.scenes.push( ...initial_scenes );

    const primary_scene_constructor = initial_scenes ? initial_scenes[0].constructor : undefined;

    const additional_scenes = initial_scenes ? initial_scenes.slice(1) : [];

    if( this.make_controls )
    { this.embedded_controls_area = this.program_stuff.appendChild( document.createElement( "div" ) );
      this.embedded_controls_area.className = "controls-widget";
      this.embedded_controls = new Controls_Widget( this.embedded_controls_area, this.webgl_manager.scenes );
    }
    if( this.make_code_nav )
    { this.embedded_code_nav_area = this.program_stuff.appendChild( document.createElement( "div" ) );
      this.embedded_code_nav_area.className = "code-widget";
      this.embedded_code_nav = new Code_Widget( this.embedded_code_nav_area, primary_scene_constructor, 
                                   additional_scenes, this, {} );
    }
    if( this.make_editor )
    { this.embedded_editor_area = this.program_stuff.appendChild( document.createElement( "div" ) );
      this.embedded_editor_area.className = "editor-widget";
      this.embedded_editor = new Editor_Widget( this.embedded_editor_area, primary_scene_constructor, this );
    }
                                     // Start WebGL main loop - render() will re-queue itself for continuous calls.
    this.webgl_manager.render();
  }
}


export class Demonstration extends Scene
{ constructor( scene_id, material )
    { super();

      this.widget_options = { show_canvas: false, make_controls: false,
                              make_editor: false, make_code_nav: false, show_documentation: true };

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