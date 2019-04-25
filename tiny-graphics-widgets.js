// This file defines a lot of panels that can be placed on websites to create interactive graphics programs that use tiny-graphics.js.

import {tiny} from './tiny-graphics.js';
const { Vec, Mat, Mat4, Color, Shape, Shader, Scene } = tiny;           // Pull these names into this module's scope for convenience.

export const widgets = {};

const Canvas_Widget = widgets.Canvas_Widget =
class Canvas_Widget
{                           // **Canvas_Widget** embeds a WebGL demo onto a website in place of the given placeholder document
                            // element.  It creates a WebGL canvas and loads onto it any initial Scene objects in the 
                            // arguments.  Optionally spawns a Text_Widget and Controls_Widget for showing more information
                            // or interactive UI buttons, divided into one panel per each loaded Scene.  You can use up to
                            // 16 Canvas_Widgets; browsers support up to 16 WebGL contexts per page.
  constructor( element, initial_scenes, options )   
    { this.element = element;
      Object.assign( this, { show_controls: true, show_explanation: true }, options )
      const rules = [ ".canvas-widget { width: 1080px; background: DimGray; margin:auto }",
                      ".canvas-widget canvas { width: 1080px; height: 600px; margin-bottom:-3px }" ];
                      
      if( document.styleSheets.length == 0 ) document.head.appendChild( document.createElement( "style" ) );
      for( const r of rules ) document.styleSheets[document.styleSheets.length - 1].insertRule( r, 0 )

      this.embedded_explanation_area = this.element.appendChild( document.createElement( "div" ) );
      this.embedded_explanation_area.className = "text-widget";
      
      const canvas = this.element.appendChild( document.createElement( "canvas" ) );

      this.patch_ios_bug();
      this.webgl_manager = new tiny.Webgl_Manager( canvas, Color.of( 0,0,0,1 ) );  // Second parameter sets background color.

      this.embedded_controls_area = this.element.appendChild( document.createElement( "div" ) );
      this.embedded_controls_area.className = "controls-widget";

      if( initial_scenes )
        this.webgl_manager.scenes.push( ...initial_scenes );

      this.embedded_controls = new Controls_Widget( this.embedded_controls_area,    this.webgl_manager.scenes );
      this.embedded_explanation  = new Text_Widget( this.embedded_explanation_area, this.webgl_manager.scenes, this.webgl_manager );

                                       // Start WebGL initialization.  Note that render() will re-queue itself for continuous calls.
      this.webgl_manager.render();
    }
  patch_ios_bug()
    {                                           // patch_ios_bug():  Correct a flaw in Webkit (iPhone devices; safari mobile) that
                                                // breaks TypedArray.from() and TypedArray.of() in subclasses.  Bug report:
                                                // https://bugs.webkit.org/show_bug.cgi?id=181011
      try{ Vec.of( 1,2,3 ).times(2) }
      catch 
      { Vec.of   = function( ...arr ) { return new Vec( Array.from( ...arr ) ) }
        Vec.from = function(    arr ) { return new Vec( Array.from(    arr ) ) }
      }
    }
}


const Controls_Widget = widgets.Controls_Widget =
class Controls_Widget
{                                               // **Controls_Widget** adds an array of panels to the document, one per loaded
                                                // Scene object, each providing interactive elements such as buttons with key 
                                                // bindings, live readouts of Scene data members, etc.
  constructor( element, scenes )
    { const rules = [ ".controls-widget * { font-family: monospace }",
                      ".controls-widget div { background: white }",
                      ".controls-widget table { border-collapse: collapse; display:block; overflow-x: auto; }",
                      ".controls-widget table.control-box { width: 1080px; border:0; margin:0; max-height:380px; transition:.5s; overflow-y:scroll; background:DimGray }",
                      ".controls-widget table.control-box:hover { max-height:500px }",
                      ".controls-widget table.control-box td { overflow:hidden; border:0; background:DimGray; border-radius:30px }",
                      ".controls-widget table.control-box td .control-div { background: #EEEEEE; height:338px; padding: 5px 5px 5px 30px; box-shadow: 25px 0px 60px -15px inset }",
                      ".controls-widget table.control-box td * { background:transparent }",
                      ".controls-widget table.control-box .control-div td { border-radius:unset }",
                      ".controls-widget table.control-box .control-title { padding:7px 40px; color:white; background:DarkSlateGray; box-shadow: 25px 0px 70px -15px inset black }",
                      ".controls-widget *.live_string { display:inline-block; background:unset }",
                      ".dropdown { display:inline-block }",
                      ".dropdown-content { display:inline-block; transition:.2s; transform: scaleY(0); overflow:hidden; position: absolute; \
                                            z-index: 1; background:#E8F6FF; padding: 16px; margin-left:30px; min-width: 100px; \
                                            box-shadow: 5px 10px 16px 0px rgba(0,0,0,0.2) inset; border-radius:10px }",
                      ".dropdown-content a { color: black; padding: 4px 4px; display: block }",
                      ".dropdown a:hover { background: #f1f1f1 }",
                      ".controls-widget button { background: #4C9F50; color: white; padding: 6px; border-radius:9px; \
                                                box-shadow: 4px 6px 16px 0px rgba(0,0,0,0.3); transition: background .3s, transform .3s }",
                      ".controls-widget button:hover, button:focus { transform: scale(1.3); color:gold }",
                      ".link { text-decoration:underline; cursor: pointer }",
                      ".show { transform: scaleY(1); height:200px; overflow:auto }",
                      ".hide { transform: scaleY(0); height:0px; overflow:hidden  }" ];
                      
      const style = document.head.appendChild( document.createElement( "style" ) );
      for( const r of rules ) document.styleSheets[document.styleSheets.length - 1].insertRule( r, 0 )

      const table = element.appendChild( document.createElement( "table" ) );
      table.className = "control-box";
      this.row = table.insertRow( 0 );

      this.panels = [];
      this.scenes = scenes;

      this.render();
    }
  make_panels( time )
    { this.timestamp = time;
      this.row.innerHTML = "";
                                                        // Traverse all scenes and their children, recursively:
      const open_list = [ ...this.scenes ];
      while( open_list.length )                       
      { open_list.push( ...open_list[0].children );
        const scene = open_list.shift();

        const control_box = this.row.insertCell();
        this.panels.push( control_box );
                                                                                        // Draw top label bar:
        control_box.appendChild( Object.assign( document.createElement("div"), { 
                                      textContent: scene.constructor.name, className: "control-title" } ) )

        const control_panel = control_box.appendChild( document.createElement( "div" ) );
        control_panel.className = "control-div";
        scene.control_panel = control_panel;
        scene.timestamp = time;
                                                        // Draw each registered animation:
        scene.make_control_panel();                     
      }
    }
  render( time = 0 )
    {                                                   // Traverse all scenes and their children, recursively:
      const open_list = [ ...this.scenes ];
      while( open_list.length )                       
      { open_list.push( ...open_list[0].children );
        const scene = open_list.shift();
                                        // Check to see if we need to re-create the panels due to any scene being new.
        if( !scene.timestamp || scene.timestamp > this.timestamp )        
        { this.make_panels( time );
          break;
        }

        // TODO: Check for updates to each scene's desired_controls_position, including if the 
        // scene just appeared in the tree, in which case call make_control_panel().
      }

      for( let panel of this.panels )
        for( let live_string of panel.querySelectorAll(".live_string") ) live_string.onload( live_string );
                                          // TODO: Cap this so that it can't be called faster than a human can read?
      this.event = window.requestAnimFrame( this.render.bind( this ) );
    }
}


const Code_Manager = widgets.Code_Manager =
class Code_Manager                     
{                                  // **Code_Manager** breaks up a string containing code (any ES6 JavaScript).  The RegEx being used
                                   // to parse is from https://github.com/lydell/js-tokens which states the following limitation:
                                   // "If the end of a statement looks like a regex literal (even if it isn’t), it will be treated
                                   // as one."  (This can miscolor lines of code containing divisions and comments).
  constructor( code )
    { const es6_tokens_parser = RegExp( [
        /((['"])(?:(?!\2|\\).|\\(?:\r\n|[\s\S]))*(\2)?|`(?:[^`\\$]|\\[\s\S]|\$(?!\{)|\$\{(?:[^{}]|\{[^}]*\}?)*\}?)*(`)?)/,    // Any string.
        /(\/\/.*)|(\/\*(?:[^*]|\*(?!\/))*(\*\/)?)/,                                                                           // Any comment (2 forms).  And next, any regex:
        /(\/(?!\*)(?:\[(?:(?![\]\\]).|\\.)*\]|(?![\/\]\\]).|\\.)+\/(?:(?!\s*(?:\b|[\u0080-\uFFFF$\\'"~({]|[+\-!](?!=)|\.?\d))|[gmiyu]{1,5}\b(?![\u0080-\uFFFF$\\]|\s*(?:[+\-*%&|^<>!=?({]|\/(?![\/*])))))/,
        /(0[xX][\da-fA-F]+|0[oO][0-7]+|0[bB][01]+|(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?)/,                                     // Any number.
        /((?!\d)(?:(?!\s)[$\w\u0080-\uFFFF]|\\u[\da-fA-F]{4}|\\u\{[\da-fA-F]+\})+)/,                                          // Any name.
        /(--|\+\+|&&|\|\||=>|\.{3}|(?:[+\-\/%&|^]|\*{1,2}|<{1,2}|>{1,3}|!=?|={1,2})=?|[?~.,:;[\](){}])/,                      // Any punctuator.
        /(\s+)|(^$|[\s\S])/                                                                                                   // Any whitespace. Lastly, blank/invalid.
          ].map( r => r.source ).join('|'), 'g' );

      this.tokens = [];    this.no_comments = [];    let single_token = null;
      while( ( single_token = es6_tokens_parser.exec( code ) ) !== null )
        { let token = { type: "invalid", value: single_token[0] }
               if ( single_token[  1 ] ) token.type = "string" , token.closed = !!( single_token[3] || single_token[4] )
          else if ( single_token[  5 ] ) token.type = "comment"
          else if ( single_token[  6 ] ) token.type = "comment", token.closed = !!single_token[7]
          else if ( single_token[  8 ] ) token.type = "regex"
          else if ( single_token[  9 ] ) token.type = "number"
          else if ( single_token[ 10 ] ) token.type = "name"
          else if ( single_token[ 11 ] ) token.type = "punctuator"
          else if ( single_token[ 12 ] ) token.type = "whitespace"        
          this.tokens.push( token )
          if( token.type != "whitespace" && token.type != "comment" ) this.no_comments.push( token.value );
        }  
    }
}


const Code_Widget = widgets.Code_Widget =
class Code_Widget
{                                         // **Code_Widget** draws a code navigator panel with inline links to the entire program source code.
  constructor( element, main_scene, additional_scenes, definitions )
    { const rules = [ ".code-widget .code-panel { margin:auto; background:white; overflow:auto; font-family:monospace; width:1060px; padding:10px; padding-bottom:40px; max-height: 500px; \
                                                      border-radius:12px; box-shadow: 20px 20px 90px 0px powderblue inset, 5px 5px 30px 0px blue inset }",
                    ".code-widget .code-display { min-width:1800px; padding:10px; white-space:pre-wrap; background:transparent }",
                    ".code-widget table { display:block; margin:auto; overflow-x:auto; width:1080px; border-radius:25px; border-collapse:collapse; border: 2px solid black }",
                    ".code-widget table.class-list td { border-width:thin; background: #EEEEEE; padding:12px; font-family:monospace; border: 1px solid black }"
                     ];

      if( document.styleSheets.length == 0 ) document.head.appendChild( document.createElement( "style" ) );
      for( const r of rules ) document.styleSheets[document.styleSheets.length - 1].insertRule( r, 0 )
      
      this.definitions = definitions;
      const code_panel = element.appendChild( document.createElement( "div" ) );
      code_panel.className = "code-panel";
      const text        = code_panel.appendChild( document.createElement( "p" ) );
      text.textContent  = "Below is the code for the demo that's running.  Click links to see definitions!";
      this.code_display = code_panel.appendChild( document.createElement( "div" ) );
      this.code_display.className = "code-display";

      const class_list = element.appendChild( document.createElement( "table" ) );
      class_list.className = "class-list";   
      const top_cell = class_list.insertRow( -1 ).insertCell( -1 );
      top_cell.colSpan = 2;
      top_cell.appendChild( document.createTextNode("Click below to navigate through all classes that are defined.") );
      const content = top_cell.appendChild( document.createElement( "p" ) );
      content.style = "text-align:center; margin:0; font-weight:bold";
      content.innerHTML = "main-scene.js<br>Main Scene: ";
      const main_scene_link = content.appendChild( document.createElement( "a" ) );
      main_scene_link.href = "javascript:void(0);"
      main_scene_link.addEventListener( 'click', () => this.display_code( main_scene ) );
      main_scene_link.textContent = main_scene.name;

      const second_cell = class_list.insertRow( -1 ).insertCell( -1 );
      second_cell.colSpan = 2;
      second_cell.style = "text-align:center; font-weight:bold";
      const index_src_link = second_cell.appendChild( document.createElement( "a" ) );
      index_src_link.href = "javascript:void(0);"
      index_src_link.addEventListener( 'click', () => this.display_code() );
      index_src_link.textContent = "This page's complete HTML source";

      const third_row = class_list.insertRow( -1 );
      third_row.style = "text-align:center";
      third_row.innerHTML = "<td><b>tiny-graphics.js</b><br>(Always the same)</td> \
                             <td><b>All other class definitions from dependencies:</td>";
                                                                            // Default textbox contents:
      this.display_code( main_scene );
      const fourth_row = class_list.insertRow( -1 );
                                                                            // Generate the navigator table of links:
      for( let list of [ tiny, definitions ] )
      { const cell = fourth_row.appendChild( document.createElement( "td" ) );
                                              // List all class names except the main one, which we'll display separately:
        const class_names = Object.keys( list ).filter( x => x != main_scene.name );
        cell.style = "white-space:normal"
        for( let name of class_names )
        { const class_link = cell.appendChild( document.createElement( "a" ) );
          class_link.style["margin-right"] = "80px"
          class_link.href = "javascript:void(0);"
          class_link.addEventListener( 'click', () => this.display_code( tiny[name] || definitions[name] ) );
          class_link.textContent = name;
          cell.appendChild( document.createTextNode(" ") );
        }
      }
    }
  display_code( class_to_display )
    {                                           // display_code():  Populate the code textbox.
                                                // Pass undefined to choose index.html source.
      this.selected_class = class_to_display;
      if( class_to_display ) this.format_code( class_to_display.toString() );
      else fetch( document.location.href )
                .then(   response => response.text() )
                .then( pageSource => this.format_code( pageSource ) );
    }
  format_code( code_string )
    {                                           // (Internal helper function)
      this.code_display.innerHTML = "";
      const color_map = { string: "chocolate", comment: "green", regex: "blue", number: "magenta", 
                            name: "black", punctuator: "red", whitespace: "black" };

      for( let t of new Code_Manager( code_string ).tokens )
        if( t.type == "name" && [ ...Object.keys( tiny ), ...Object.keys( this.definitions ) ].includes( t.value ) )
          { const link = this.code_display.appendChild( document.createElement( 'a' ) );
            link.href = "javascript:void(0);"
            link.addEventListener( 'click', () => this.display_code( tiny[t.value] || this.definitions[t.value] ) );
            link.textContent = t.value;
          }
        else
          { const span = this.code_display.appendChild( document.createElement( 'span' ) );
            span.style.color = color_map[t.type];
            span.textContent = t.value;
          }
    }
}

const Text_Widget = widgets.Text_Widget =
class Text_Widget
{                                                // **Text_Widget** generates HTML documentation and fills a panel with it.  This
                                                 // documentation is extracted from whichever Scene object gets loaded first.
  constructor( element, scenes, webgl_manager ) 
    { const rules = [ ".text-widget { background: white; width:1060px;\
                        padding:0 10px; overflow:auto; transition:1s; overflow-y:scroll; box-shadow: 10px 10px 90px 0 inset Gray}" ];
      if( document.styleSheets.length == 0 ) document.head.appendChild( document.createElement( "style" ) );
      for( const r of rules ) document.styleSheets[document.styleSheets.length - 1].insertRule( r, 0 )

      Object.assign( this, { element, scenes, webgl_manager } );
      this.render();
    }
  render( time = 0 )
    { if( this.scenes[0] )
        this.scenes[0].show_explanation( this.element, this.webgl_manager )
      else
        this.event = window.requestAnimFrame( this.render.bind( this ) )
    }
}