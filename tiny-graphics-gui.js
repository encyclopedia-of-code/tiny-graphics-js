// This file defines a lot of panels that can be placed on websites to create interactive graphics programs that use tiny-graphics.js.

import {tiny} from './tiny-graphics.js';

export const widgets = {};


const Controls_Widget = widgets.Controls_Widget =
class Controls_Widget
{                                               // **Controls_Widget** adds an array of panels to the document, one per loaded
                                                // Scene object, each providing interactive elements such as buttons with key
                                                // bindings, live readouts of Scene data members, etc.
  constructor( component )
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

      tiny.Component.initialize_CSS( Controls_Widget, rules );

      const table = component.embedded_controls_area.appendChild( document.createElement( "table" ) );
      table.className = "control-box";
      this.row = table.insertRow( 0 );

      this.panels = [];
      this.component = component;

      this.render();
    }
  make_panels( time )
    { this.timestamp = time;
      this.row.innerHTML = "";
                                                        // Traverse all scenes and their children, recursively:
      const open_list = [ this.component ];
      while( open_list.length )
      { open_list.push( ...open_list[0].animated_children );
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
      const open_list = [ this.component ];
      while( open_list.length )
      { open_list.push( ...open_list[0].animated_children );
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


const Keyboard_Manager = widgets.Keyboard_Manager =
class Keyboard_Manager
{                        // **Keyboard_Manager** maintains a running list of which keys are depressed.  You can map combinations of
                         // shortcut keys to trigger callbacks you provide by calling add().  See add()'s arguments.  The shortcut
                         // list is indexed by strings, conveniently showing each bound shortcut combination.
  constructor( target = document, callback_behavior = ( callback, event ) => callback( event ) )
    {                    // The constructor  optionally takes "target", which is the desired DOM element for keys to be pressed
                         // inside of, and "callback_behavior", which will be called for every key action to allow extra behavior
                         // on each event -- giving an opportunity to customize their bubbling, preventDefault, and more.  It
                         // defaults to no additional behavior besides the callback itself on each assigned key action.
      this.saved_controls = {};
      this.actively_pressed_keys = new Set();
      this.callback_behavior = callback_behavior;
      target.addEventListener( "keydown",     this.key_down_handler.bind( this ) );
      target.addEventListener( "keyup",       this.  key_up_handler.bind( this ) );
      window.addEventListener( "focus", () => this.actively_pressed_keys.clear() );  // Deal with stuck keys during focus change.
    }
  key_down_handler( event )
    { if( [ "INPUT", "TEXTAREA" ].includes( event.target.tagName ) ) return;    // Don't interfere with typing.
      this.actively_pressed_keys.add( event.key );                              // Track the pressed key.
      for( let saved of Object.values( this.saved_controls ) )                  // Re-check all the keydown handlers.
      { if( saved.shortcut_combination.every( s => this.actively_pressed_keys.has( s ) )
          && event. ctrlKey   == saved.shortcut_combination.includes( "Control" )
          && event.shiftKey   == saved.shortcut_combination.includes( "Shift" )
          && event.  altKey   == saved.shortcut_combination.includes( "Alt" )
          && event. metaKey   == saved.shortcut_combination.includes( "Meta" ) )  // Modifiers must exactly match.
            this.callback_behavior( saved.callback, event );                      // The keys match, so fire the callback.
      }
    }
  key_up_handler( event )
    { const lower_symbols = "qwertyuiopasdfghjklzxcvbnm1234567890-=[]\\;',./",
            upper_symbols = "QWERTYUIOPASDFGHJKLZXCVBNM!@#$%^&*()_+{}|:\"<>?";

      const lifted_key_symbols = [ event.key, upper_symbols[ lower_symbols.indexOf( event.key ) ],
                                              lower_symbols[ upper_symbols.indexOf( event.key ) ] ];
                                                                                        // Call keyup for any shortcuts
      for( let saved of Object.values( this.saved_controls ) )                          // that depended on the released
        if( lifted_key_symbols.some( s => saved.shortcut_combination.includes( s ) ) )  // key or its shift-key counterparts.
          this.callback_behavior( saved.keyup_callback, event );                  // The keys match, so fire the callback.
      lifted_key_symbols.forEach( k => this.actively_pressed_keys.delete( k ) );
    }
  add( shortcut_combination, callback = () => {}, keyup_callback = () => {} )
    {                                 // add(): Creates a keyboard operation.  The argument shortcut_combination wants an
                                      // array of strings that follow standard KeyboardEvent key names. Both the keyup
                                      // and keydown callbacks for any key combo are optional.
      this.saved_controls[ shortcut_combination.join('+') ] = { shortcut_combination, callback, keyup_callback };
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
  constructor( component, options = {} )
    { const rules = [ ".code-widget .code-panel { margin:auto; background:white; overflow:auto; font-family:monospace; width:1060px; padding:10px; padding-bottom:40px; max-height: 500px; \
                                                      border-radius:12px; box-shadow: 20px 20px 90px 0px powderblue inset, 5px 5px 30px 0px blue inset }",
                      ".code-widget .code-display { min-width:1000px; padding:10px; white-space:pre-wrap; background:transparent }",
                      ".code-widget table { display:block; margin:auto; overflow-x:auto; width:1080px; border-radius:25px; border-collapse:collapse; border: 2px solid black; box-sizing: border-box }",
                      ".code-widget table.class-list td { border-width:thin; background: #EEEEEE; padding:12px; font-family:monospace; border: 1px solid black }"
                     ];

      tiny.Component.initialize_CSS( Code_Widget, rules );

      this.component = component;

      import( './main-scene.js' )
        .then( module => {

          this.build_reader(      component.embedded_code_nav_area, component.constructor, module.defs );
          if( !options.hide_navigator )
            this.build_navigator( component.embedded_code_nav_area, component.constructor,
                                  component.animated_children, module.defs );
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
      if( this.component.embedded_editor )
        this.component.embedded_editor.select_class( class_to_display );
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
{ constructor( component, options = {} )
    { let rules = [ ".editor-widget { margin:auto; background:white; overflow:auto; font-family:monospace; width:1060px; padding:10px; \
                                      border-radius:12px; box-shadow: 20px 20px 90px 0px powderblue inset, 5px 5px 30px 0px blue inset }",
                    ".editor-widget button { background: #4C9F50; color: white; padding: 6px; border-radius:9px; margin-right:5px; \
                                             box-shadow: 4px 6px 16px 0px rgba(0,0,0,0.3); transition: background .3s, transform .3s }",
                    ".editor-widget input { margin-right:5px }",
                    ".editor-widget textarea { white-space:pre; width:1040px; margin-bottom:30px }",
                    ".editor-widget button:hover, button:focus { transform: scale(1.3); color:gold }"
                  ];

      tiny.Component.initialize_CSS( Editor_Widget, rules );

      this.associated_webgl_manager = component.webgl_manager;
      this.options = options;

      const form = this.form = component.embedded_editor_area.appendChild( document.createElement( "form" ) );
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
      this.select_class( component.constructor );
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
