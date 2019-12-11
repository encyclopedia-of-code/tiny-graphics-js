// This file defines a lot of panels that can be placed on websites to create interactive graphics programs that use tiny-graphics.js.

import {tiny} from './tiny-graphics.js';

export const widgets = {};

const Document_Builder = widgets.Document_Builder =
class Document_Builder
{
  constructor( div, object_to_be_documented )
  {
    const rules = [ 
      `.documentation_treenode { }`,
      `.documentation { width:1060px; padding:0 10px; overflow:auto; background:white;
                                  box-shadow:10px 10px 90px 0 inset LightGray }`
      ];
    if( document.styleSheets.length == 0 ) document.head.appendChild( document.createElement( "style" ) );
    for( const r of rules ) document.styleSheets[document.styleSheets.length - 1].insertRule( r, 0 )

    this.children = [];
    this.div = div;
    this.div.className = "documentation_treenode";

    this.document_region = div.appendChild( document.createElement( "div" ) );    
    this.document_region.className = "documentation";

    object_to_be_documented.show_document( this );
  }
}


const Default_Layout = widgets.Default_Layout =
class Default_Layout extends Document_Builder
{
  constructor( div, initial_scenes, options = {} )
  {
                                                      // Populate the usual document region at the top, and fit to a fixed size:
    super( div, initial_scenes && initial_scenes[0] );
    div.style.margin = "auto";
    div.style.width = "1080px";
                                                      // The next div down will hold a canvas and/or related interactive areas.
    this.program_stuff = div.appendChild( document.createElement( "div" ) );

    const defaults = { show_canvas: true,  make_controls: true,
                       make_editor: false, make_code_nav: true };

                                     // The primary scene we're documenting can override this document's display options.
    if( initial_scenes && initial_scenes[0] )
      Object.assign( options, initial_scenes[0].widget_options );
    Object.assign( this, defaults, options )
    
          // TODO:  One use case may have required canvas to be styled as a rule instead of as an element.  Keep an eye out.
    const canvas = this.program_stuff.appendChild( document.createElement( "canvas" ) );
    canvas.style = `width:1080px; height:600px; background:DimGray; margin:auto; margin-bottom:-4px`;

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
                                   additional_scenes, this );
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
    {                       // Check to see if we need to re-create the panels due to any scene being new.                      
                            // Traverse all scenes and their children, recursively:
      const open_list = [ ...this.scenes ];
      while( open_list.length )                       
      { open_list.push( ...open_list[0].children );
        const scene = open_list.shift();
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
  constructor( element, main_scene, additional_scenes, caller, options = {} )
    { const rules = [ ".code-widget .code-panel { margin:auto; background:white; overflow:auto; font-family:monospace; width:1060px; padding:10px; padding-bottom:40px; max-height: 500px; \
                                                      border-radius:12px; box-shadow: 20px 20px 90px 0px powderblue inset, 5px 5px 30px 0px blue inset }",
                    ".code-widget .code-display { min-width:1000px; padding:10px; white-space:pre-wrap; background:transparent }",
                    ".code-widget table { display:block; margin:auto; overflow-x:auto; width:1080px; border-radius:25px; border-collapse:collapse; border: 2px solid black; box-sizing: border-box }",
                    ".code-widget table.class-list td { border-width:thin; background: #EEEEEE; padding:12px; font-family:monospace; border: 1px solid black }"
                     ];

      if( document.styleSheets.length == 0 ) document.head.appendChild( document.createElement( "style" ) );
      for( const r of rules ) document.styleSheets[document.styleSheets.length - 1].insertRule( r, 0 )

      this.caller = caller;

      if( !main_scene )
        return;

      import( './main-scene.js' )
        .then( module => { 
        
          this.build_reader(      element, main_scene, module.defs );
          if( !options.hide_navigator )
            this.build_navigator( element, main_scene, additional_scenes, module.defs );
        } )
    }
  build_reader( element, main_scene, definitions )
    {                                           // (Internal helper function)      
      this.definitions = definitions;
      const code_panel = element.appendChild( document.createElement( "div" ) );
      code_panel.className = "code-panel";
      this.code_display = code_panel.appendChild( document.createElement( "div" ) );
      this.code_display.className = "code-display";
                                                                            // Default textbox contents:
      this.display_code( main_scene );
    }
  build_navigator( element, main_scene, additional_scenes, definitions )
    {                                           // (Internal helper function)

                                                // TODO:  List out the additional_scenes somewhere.
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
      if( this.caller.embedded_editor ) 
        this.caller.embedded_editor.select_class( class_to_display );
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


const Editor_Widget = widgets.Editor_Widget =
class Editor_Widget
{ constructor( element, initially_selected_class, webgl_manager, options = {} )
    { let rules = [ ".editor-widget { margin:auto; background:white; overflow:auto; font-family:monospace; width:1060px; padding:10px; \
                                      border-radius:12px; box-shadow: 20px 20px 90px 0px powderblue inset, 5px 5px 30px 0px blue inset }",
                    ".editor-widget button { background: #4C9F50; color: white; padding: 6px; border-radius:9px; margin-right:5px; \
                                             box-shadow: 4px 6px 16px 0px rgba(0,0,0,0.3); transition: background .3s, transform .3s }",
                    ".editor-widget input { margin-right:5px }",
                    ".editor-widget textarea { white-space:pre; width:1040px; margin-bottom:30px }",
                    ".editor-widget button:hover, button:focus { transform: scale(1.3); color:gold }"
                  ];

      for( const r of rules ) document.styleSheets[0].insertRule( r, 1 );

      this.associated_webgl_manager = webgl_manager;
      this.options = options;

      const form = this.form = element.appendChild( document.createElement( "form" ) );
                                                          // Don't refresh the page on submit:
      form.addEventListener( 'submit', event => 
        { event.preventDefault(); this.submit_demo() }, false );    

      const explanation = form.appendChild( document.createElement( "p" ) );
      explanation.innerHTML = `<i><b>What can I put here?</b></i>  A JavaScript class, with any valid JavaScript inside.  Your code can use classes from this demo,
                               <br>or from ANY demo on Demopedia --  the dependencies will automatically be pulled in to run your demo!<br>`;
      
      const run_button = this.run_button = form.appendChild( document.createElement( "button" ) );
      run_button.type             = "button";
      run_button.style            = "background:maroon";
      run_button.textContent      = "Run with Changes";

      const submit = this.submit = form.appendChild( document.createElement( "button" ) );
      submit.type                 = "submit";
      submit.textContent          = "Save as New Webpage";

      const author_box = this.author_box = form.appendChild( document.createElement( "input" ) );
      author_box.name             = "author";
      author_box.type             = "text";
      author_box.placeholder      = "Author name";
      
      const password_box = this.password_box = form.appendChild( document.createElement( "input" ) );
      password_box.name           = "password";
      password_box.type           = "text";
      password_box.placeholder    = "Password";
      password_box.style          = "display:none";

      const overwrite_panel = this.overwrite_panel = form.appendChild( document.createElement( "span" ) );
      overwrite_panel.style       = "display:none";
      overwrite_panel.innerHTML   = "<label>Overwrite?<input type='checkbox' name='overwrite' autocomplete='off'></label>";

      const submit_result = this.submit_result = form.appendChild( document.createElement( "div" ) );
      submit_result.style         = "margin: 10px 0";

      const new_demo_code = this.new_demo_code = form.appendChild( document.createElement( "textarea" ) );
      new_demo_code.name    = "new_demo_code";
      new_demo_code.rows    = this.options.rows || 25;
      new_demo_code.cols    = 140;
      if( initially_selected_class )
        this.select_class( initially_selected_class );
    }
  select_class( class_definition )
    { this.new_demo_code.value = class_definition.toString(); }
  fetch_handler( url, body )          // A general utility function for sending / receiving JSON, with error handling.
    { return fetch( url,
      { body: body, method: body === undefined ? 'GET' : 'POST', 
        headers: { 'content-type': 'application/json'  } 
      }).then( response =>
      { if ( response.ok )  return Promise.resolve( response.json() )
        else                return Promise.reject ( response.status )
      })
    }
  submit_demo()
    { const form_fields = Array.from( this.form.elements ).reduce( ( accum, elem ) => 
        { if( elem.value && !( ['checkbox', 'radio'].includes( elem.type ) && !elem.checked ) )
            accum[ elem.name ] = elem.value; 
          return accum;
        }, {} );
      
      this.submit_result.innerHTML = "";
      return this.fetch_handler( "/submit-demo?Unapproved", JSON.stringify( form_fields ) )
        .then ( response => { if( response.show_password  ) this.password_box.style.display = "inline";
                              if( response.show_overwrite ) this.overwrite_panel.style.display = "inline";
                              this.submit_result.innerHTML += response.message + "<br>"; } )
        .catch(    error => { this.submit_result.innerHTML += "Error " + error + " when trying to upload.<br>" } )
    }
}


const Active_Textbook = widgets.Active_Textbook =
class Active_Textbook extends tiny.Scene
{                               // **Active_Textbook** is a special Scene whose documentation, when printed out by a Document_Builder,
                                // expands out into several sections -- each potentially drawing their own variation of the Scene or
                                // of any Scene.  Text and interactive areas can alternate as needed by the author. State of the 
                                // document is managed in a shared object at the top level, which continuously updates the sections' 
                                // contents via their display() functions.  Override the indicated functions with useful behavior.
  constructor( content )
    { super();

      this.widget_options = { show_canvas: false };
                
      this.inner_documentation_sections = [];
                            
                            // Instance child objects for each section.       
      for( let i = 0; i < this.num_sections(); i++ )
        this.inner_documentation_sections.push( new content( i ) );

                            // Make a new uniforms holder for all child graphics contexts to share.
      this.shared_uniforms_of_children = new tiny.Shared_Uniforms();
      this.initialize_shared_state();
    }
  show_document( document_builder )
    {
      Active_Textbook.apply_style_for_outer_shell_region( document_builder.div );

      for( let section of this.inner_documentation_sections )
      {
        section.document_builder = Active_Textbook.expand_document_builder_tree( document_builder, section );

                            // Disseminate our one shared_uniforms.
        section.webgl_manager.shared_uniforms = this.shared_uniforms_of_children;
      }

      const final_text = document_builder.div.appendChild( document.createElement( "div" ) );
      final_text.className = "documentation";
      final_text.innerHTML = `<p>That's all the examples.  Below are interactive controls, and then the code that generates this whole multi-part tutorial is printed:</p>`;
    }

      // Override the following as needed:
  num_sections() { return 0 }
  initialize_shared_state() { }  
  update_shared_state( context )
    {
          // Use the provided context to tick shared_uniforms_of_children.animation_time only once per frame.
      context.shared_uniforms = this.shared_uniforms_of_children;
      return this.shared_uniforms_of_children;
    }
    
    // Internal helpers:
  static apply_style_for_outer_shell_region( div )
    { div.style.padding = 0;
      div.style.width = "1080px";
      div.style.overflowY = "hidden";
    }
  static expand_document_builder_tree( containing_builder, new_section )
    { const child = new tiny.Document_Builder( containing_builder.div, new_section );
      containing_builder.children.push( child );
      return child;
    }
}