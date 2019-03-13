// This file defines a lot of panels that can be placed on websites to create interactive graphics programs that use tiny-graphics.js.

export class Canvas_Widget                    // Canvas_Widget embeds a WebGL demo onto a website, along with various panels of controls.
{ constructor( element, scenes, show_controls = true )   // One panel exists per each scene that's used in the canvas.  You can use up
    { this.create( element, scenes, show_controls )      // to 16 Canvas_Widgets; browsers support up to 16 WebGL contexts per page.    

      const rules = [ ".canvas-widget { width: 1080px; background: DimGray }",
                      ".canvas-widget canvas { width: 1080px; height: 600px; margin-bottom:-3px }" ];
                      
      if( document.styleSheets.length == 0 ) document.head.appendChild( document.createElement( "style" ) );
      for( const r of rules ) document.styleSheets[document.styleSheets.length - 1].insertRule( r, 0 )
    }
  create( element, scenes, show_controls )
    { this.patch_ios_bug();
      try  { this.populate_canvas( element, scenes, show_controls );
           } catch( error )
           { document.querySelector( "#" + element ).innerHTML = "<H1>Error loading the demo.</H1>" + error }
    }
  patch_ios_bug()                               // Correct a flaw in Webkit (iPhone devices; safari mobile) that 
    { try{ Vec.of( 1,2,3 ).times(2) }           // breaks TypedArray.from() and TypedArray.of() in subclasses.
      catch 
      { Vec.of   = function( ...arr ) { return new Vec( Array.from( ...arr ) ) }
        Vec.from = function(    arr ) { return new Vec( Array.from(    arr ) ) }
      }
    }
  populate_canvas( element, scenes, show_controls )   // Assign a Webgl_Manager to the WebGL canvas.
    { if( !scenes.every( x => window[ x ] ) )         // Make sure each scene class really exists.
        throw "(Featured class not found)";
      const canvas = document.querySelector( "#" + element ).appendChild( document.createElement( "canvas" ) );

      this.webgl_manager = new Webgl_Manager( canvas, Color.of( 0,0,0,1 ) );  // Second parameter sets background color.

      for( let scene_class_name of scenes )                  // Register the initially requested scenes to the render loop. 
        this.webgl_manager.scenes.push( new window[ scene_class_name ]( this.webgl_manager ) );


      this.embedded_controls = document.querySelector( "#" + element ).appendChild( document.createElement( "div" ) );
      this.embedded_controls.className = "controls-widget";
      if( show_controls ) new Controls_Widget( this.webgl_manager.scenes, this.embedded_controls );
                           
      this.webgl_manager.render();   // Start WebGL initialization.  Note that render() will re-queue itself for more calls.
    }
}


export class Controls_Widget                  // One of these widgets can draw one panel of controls per scene.
{ constructor( scenes, element )
    { if( typeof( element ) === "String" ) element = document.querySelector( "#" + element );

      const rules = [ ".controls-widget * { font-family: monospace }",
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
      const row = table.insertRow( 0 );

      this.panels = [];

      const open_list = [ ...scenes ];
      while( open_list.length )                       // Traverse all scenes and their children, recursively
      { open_list.push( ...open_list[0].children );
        const scene = open_list.shift();

        const control_box = row.insertCell();
        this.panels.push( control_box );

        control_box.appendChild( Object.assign( document.createElement("div"), { 
                                      textContent: scene.constructor.name, className: "control-title" } ) )   // Draw label bar.
                                              
        const control_panel = control_box.appendChild( document.createElement( "div" ) );
        control_panel.className = "control-div";
        scene.control_panel = control_panel;
        scene.make_control_panel();           // Draw each registered animation.
      }

      this.render();
    }
  render( time=0 )
    { for( let panel of this.panels )
        for( let live_string of panel.querySelectorAll(".live_string") ) live_string.onload( live_string );

      // TODO: Check for updates to each scene's desired_controls_position, including if the 
      // scene just appeared in the tree, in which case call make_control_panel().

      this.event = window.requestAnimFrame( this.render.bind( this ) );   // TODO: Cap this so that it can't be called faster than a human can read
    }
}

  
export class Code_Manager                     // Break up a string containing code (any es6 JavaScript).  The parser expression
{                                             // is from https://github.com/lydell/js-tokens which states the following limitation:
  constructor( code )                         // "If the end of a statement looks like a regex literal (even if it isn’t), it will 
    { const es6_tokens_parser = RegExp( [     // be treated as one."  (This can miscolor lines of code containing divisions and comments).
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


export class Code_Widget                      // One of these panels draws a code navigator with inline links to the entire source code.
{ constructor( element, selected_class )
    { let rules = [ ".code-widget .code-panel { background:white; overflow:auto; font-family:monospace; width:1060px; padding:10px; padding-bottom:40px; max-height: 500px; \
                                                  border-radius:12px; box-shadow: 20px 20px 90px 0px powderblue inset, 5px 5px 30px 0px blue inset }",
                ".code-widget .code-display { min-width:1800px; padding:10px; white-space:pre-wrap; background:transparent }",
                ".code-widget table { display:block; overflow-x:auto; width:1080px; border-radius:25px; border-collapse:collapse; border: 2px solid black }",
                ".code-widget table.class-list td { border-width:thin; background: #EEEEEE; padding:12px; font-family:monospace; border: 1px solid black }"
                 ];

      if( document.styleSheets.length == 0 ) document.head.appendChild( document.createElement( "style" ) );
      for( const r of rules ) document.styleSheets[document.styleSheets.length - 1].insertRule( r, 0 )
      
      if( !window[ selected_class ] ) throw "Class " + selected_class + " not found.";
      selected_class = window[ selected_class ];
      element = document.querySelector( "#" + element );
      
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
      main_scene_link.addEventListener( 'click', () => this.display_code( selected_class ) );
      main_scene_link.textContent = selected_class.name;

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
                             <td><b>dependencies.js</b><br>(Different for every demo)</td>";
    
      const fourth_row = class_list.insertRow( -1 );

      for( let list of [ tiny_graphics, classes ] )
      { const cell = fourth_row.appendChild( document.createElement( "td" ) );
        const class_names = Object.keys( list ).filter( x => x != selected_class.name );     // List all class names except the main one,
        cell.style = "white-space:normal"                                                    // which we'll display separately.
        for( let name of class_names )
        { const class_link = cell.appendChild( document.createElement( "a" ) );
          class_link.style["margin-right"] = "80px"
          class_link.href = "javascript:void(0);"
          class_link.addEventListener( 'click', () => this.display_code( window[name] ) );
          class_link.textContent = name;
          cell.appendChild( document.createTextNode(" ") );
        }
      }
      this.display_code( selected_class );
    }
  display_code( class_to_display )                                                           // Pass undefined to choose index.html source.
    { this.selected_class = class_to_display;
      if( class_to_display ) this.format_code( class_to_display.toString() );
      else fetch( document.location.href )
                .then(   response => response.text() )
                .then( pageSource => this.format_code( pageSource ) );
    }
  format_code( code_string )
    { this.code_display.innerHTML = "";
      const color_map = { string: "chocolate", comment: "green", regex: "blue", number: "magenta", 
                            name: "black", punctuator: "red", whitespace: "black" };

      for( let t of new Code_Manager( code_string ).tokens )
        if( t.type == "name" && [ ...Object.keys( tiny_graphics ), ...Object.keys( classes ) ].includes( t.value ) )
          { const link = this.code_display.appendChild( document.createElement( 'a' ) );
            link.href = "javascript:void(0);"
            link.addEventListener( 'click', () => this.display_code( window[ t.value ] ) );
            link.textContent = t.value;
          }
        else
          { const span = this.code_display.appendChild( document.createElement( 'span' ) );
            span.style.color = color_map[t.type];
            span.textContent = t.value;
          }
    }
}
