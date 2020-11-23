import {tiny} from './tiny-graphics.js';

export const widgets = {};


const Controls_Widget = widgets.Controls_Widget =
  class Controls_Widget {
      // See description at:
      // https://github.com/encyclopedia-of-code/tiny-graphics-js/wiki/tiny-graphics-gui.js#controls_widget
      constructor (component, options = {}) {
          const rules = [".controls-widget * { font-family: monospace }",
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
                         ".hide { transform: scaleY(0); height:0px; overflow:hidden  }"];

          tiny.Component.initialize_CSS (Controls_Widget, rules);

          const table     = component.embedded_controls_area.appendChild (document.createElement ("table"));
          table.className = "control-box";
          this.row        = table.insertRow (0);
          if (options.hide_controls) component.embedded_controls_area.style.display = "none";

          this.panels    = [];
          this.component = component;

          this.render ();
      }
      make_panels (time) {
          this.timestamp     = time;
          this.row.innerHTML = "";
          // Traverse all scenes and their children, recursively:
          const open_list    = [this.component];
          while (open_list.length) {
              open_list.push (...open_list[ 0 ].animated_children);
              const scene = open_list.shift ();

              const control_box = this.row.insertCell ();
              this.panels.push (control_box);
              // Draw top label bar:
              control_box.appendChild (Object.assign (document.createElement ("div"), {
                  textContent: scene.constructor.name, className: "control-title"
              }));

              const control_panel     = control_box.appendChild (document.createElement ("div"));
              control_panel.className = "control-div";
              scene.control_panel     = control_panel;
              scene.timestamp         = time;
              // Draw each registered animation:
              scene.render_controls ();
          }
      }
      render (time = 0) {
          // Check to see if we need to re-create the panels due to any scene being new.
          // Traverse all scenes and their children, recursively:
          const open_list = [this.component];
          while (open_list.length) {
              open_list.push (...open_list[ 0 ].animated_children);
              const scene = open_list.shift ();
              if ( !scene.timestamp || scene.timestamp > this.timestamp) {
                  // One needed an update, so break out of this check and update them all.
                  this.make_panels (time);
                  break;
              }

              // TODO: Check for updates to each scene's desired_controls_position, including if the
              // scene just appeared in the tree, in which case call render_controls().
          }

          for (let panel of this.panels)
              for (let live_string of panel.querySelectorAll (".live_string")) live_string.onload (live_string);
          // TODO: Cap this so that it can't be called faster than a human can read?
          this.event = window.requestAnimFrame (this.render.bind (this));
      }
  };


const Keyboard_Manager = widgets.Keyboard_Manager =
  class Keyboard_Manager {
      // See description at:
      // https://github.com/encyclopedia-of-code/tiny-graphics-js/wiki/tiny-graphics-gui.js#keyboard_manager
      constructor (target = document, callback_behavior = (callback, event) => callback (event)) {
          this.saved_controls        = {};
          this.actively_pressed_keys = new Set ();
          this.callback_behavior     = callback_behavior;
          target.addEventListener ("keydown", this.key_down_handler.bind (this));
          target.addEventListener ("keyup", this.key_up_handler.bind (this));
          // Deal with stuck keys during focus change:
          window.addEventListener ("focus", () => this.actively_pressed_keys.clear ());
      }
      key_down_handler (event) {
          if (["INPUT", "TEXTAREA"].includes (event.target.tagName)) return;    // Don't interfere with typing.
          this.actively_pressed_keys.add (event.key);                              // Track the pressed key.
          for (let saved of Object.values (this.saved_controls)) {         // Re-check all the keydown handlers.
              if (saved.shortcut_combination.every (s => this.actively_pressed_keys.has (s))
                  && event.ctrlKey === saved.shortcut_combination.includes ("Control")
                  && event.shiftKey === saved.shortcut_combination.includes ("Shift")
                  && event.altKey === saved.shortcut_combination.includes ("Alt")
                  && event.metaKey === saved.shortcut_combination.includes ("Meta"))  // Modifiers must exactly match.
                  this.callback_behavior (saved.callback, event);       // The keys match, so fire the callback.
          }
      }
      key_up_handler (event) {
          const lower_symbols = "qwertyuiopasdfghjklzxcvbnm1234567890-=[]\\;',./",
                upper_symbols = "QWERTYUIOPASDFGHJKLZXCVBNM!@#$%^&*()_+{}|:\"<>?";

          const lifted_key_symbols = [event.key, upper_symbols[ lower_symbols.indexOf (event.key) ],
                                      lower_symbols[ upper_symbols.indexOf (event.key) ]];
          // Call keyup for any shortcuts
          for (let saved of Object.values (this.saved_controls))                          // that depended on the released
              if (lifted_key_symbols.some (s => saved.shortcut_combination.includes (s)))  // key or its shift-key counterparts.
                  this.callback_behavior (saved.keyup_callback, event);                  // The keys match, so fire the
                                                                                         // callback.
          lifted_key_symbols.forEach (k => this.actively_pressed_keys.delete (k));
      }
      add (shortcut_combination, callback = () => {}, keyup_callback = () => {}) {
          this.saved_controls[ shortcut_combination.join ('+') ] = {shortcut_combination, callback, keyup_callback};
      }
  };


const Code_Manager = widgets.Code_Manager =
  class Code_Manager {
      // See description at:
      // https://github.com/encyclopedia-of-code/tiny-graphics-js/wiki/tiny-graphics-gui.js#code_manager
      constructor (code) {
          const es6_tokens_parser = RegExp ([
                                                /((['"])(?:(?!\2|\\).|\\(?:\r\n|[\s\S]))*(\2)?|`(?:[^`\\$]|\\[\s\S]|\$(?!{)|\${(?:[^{}]|{[^}]*}?)*}?)*(`)?)/,    // Any string.
                                                /(\/\/.*)|(\/\*(?:[^*]|\*(?!\/))*(\*\/)?)/,                                                                           // Any comment (2 forms).  And next, any regex:
                                                /(\/(?!\*)(?:\[(?:(?![\]\\]).|\\.)*]|(?![\/\]\\]).|\\.)+\/(?:(?!\s*(?:\b|[\u0080-\uFFFF$\\'"~({]|[+\-!](?!=)|\.?\d))|[gmiyu]{1,5}\b(?![\u0080-\uFFFF$\\]|\s*(?:[+\-*%&|^<>!=?({]|\/(?![\/*])))))/,
                                                /(0[xX][\da-fA-F]+|0[oO][0-7]+|0[bB][01]+|(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?)/,                                     // Any number.
                                                /((?!\d)(?:(?!\s)[$\w\u0080-\uFFFF]|\\u[\da-fA-F]{4}|\\u{[\da-fA-F]+})+)/,                                          // Any name.
                                                /(--|\+\+|&&|\|\||=>|\.{3}|(?:[+\-\/%&|^]|\*{1,2}|<{1,2}|>{1,3}|!=?|={1,2})=?|[?~.,:;[\](){}])/,                      // Any punctuator.
                                                /(\s+)|(^$|[\s\S])/                                                                                                   // Any whitespace. Lastly, blank/invalid.
                                            ].map (r => r.source).join ('|'), 'g');

          this.tokens      = [];
          this.no_comments = [];
          let single_token = null;
          while ((single_token = es6_tokens_parser.exec (code)) !== null) {
              let token = {type: "invalid", value: single_token[ 0 ]};
              if (single_token[ 1 ]) token.type = "string" , token.closed = !!(single_token[ 3 ] || single_token[ 4 ]);
              else if (single_token[ 5 ]) token.type = "comment";
              else if (single_token[ 6 ]) token.type = "comment", token.closed = !!single_token[ 7 ];
              else if (single_token[ 8 ]) token.type = "regex";
              else if (single_token[ 9 ]) token.type = "number";
              else if (single_token[ 10 ]) token.type = "name";
              else if (single_token[ 11 ]) token.type = "punctuator";
              else if (single_token[ 12 ]) token.type = "whitespace";
              this.tokens.push (token);
              if (token.type !== "whitespace" && token.type !== "comment") this.no_comments.push (token.value);
          }
      }
  };


const Code_Widget = widgets.Code_Widget =
  class Code_Widget {
      // See description at:
      // https://github.com/encyclopedia-of-code/tiny-graphics-js/wiki/tiny-graphics-gui.js#code_widget
      constructor (component, options = {}) {
          const rules = [".code-widget .code-panel { margin:auto; background:white; overflow:auto; font-family:monospace; width:1060px; padding:10px; padding-bottom:40px; max-height: 500px; \
                                                      border-radius:12px; box-shadow: 20px 20px 90px 0px powderblue inset, 5px 5px 30px 0px blue inset }",
                         ".code-widget .code-display { min-width:1200px; padding:10px; white-space:pre-wrap; background:transparent }",
                         ".code-widget div.class-list { overflow-x:auto; width:1080px; border-radius:25px; margin:" +
                         " 10px; box-sizing: border-box; background: #EEEEEE; font-family:monospace; padding:18px }",
                         ".code-widget div.class-list .heading { display:inline-block; font-weight:bold }"
          ];

          tiny.Component.initialize_CSS (Code_Widget, rules);

          this.component = component;

          import( './main-scene.js' )
            .then (module => {

                const code_in_focus = options.code_in_focus || component.constructor;
                this.build_reader (component.embedded_code_nav_area, code_in_focus, module.defs);
                if ( !options.hide_navigator)
                    this.build_navigator (component.embedded_code_nav_area, code_in_focus);
            });
      }
      build_reader (element, main_scene, definitions) {     // (Internal helper function)
          this.definitions            = definitions;
          const code_panel            = element.appendChild (document.createElement ("div"));
          code_panel.className        = "code-panel";
          this.code_display           = code_panel.appendChild (document.createElement ("div"));
          this.code_display.className = "code-display";
          // Default textbox contents:
          this.display_code (main_scene);
      }
      build_navigator (element, main_scene) {       // (Internal helper function)
          const div     = element.appendChild (document.createElement ("div"));
          div.className = "class-list";

          const make_link = (definition) => {
              const link = div.appendChild (document.createElement ("a"));
              link.href  = "javascript:void(0);";
              link.addEventListener ('click', () => this.display_code (definition));
              link.textContent  = definition ? definition.name : "index.html";
              link.style.margin = "0 20px";
          };

          const heading = div.appendChild (document.createElement ("div"));
          heading.className = "heading";
          heading.appendChild (document.createTextNode ("Navigate through source code:"));
          div.appendChild (document.createElement ("br"));
          div.appendChild (document.createTextNode ("This page's complete HTML source: "));
          make_link ();

          div.appendChild (document.createElement ("br"));
          div.appendChild (document.createTextNode ("Return to main/active source code: "));
          make_link (main_scene);

          div.appendChild (document.createElement ("br"));
          div.appendChild (document.createTextNode ("Explore the core tiny-graphics library: "));
          make_link (tiny.Shape);
          make_link (tiny.Shader);
          make_link (tiny.Texture);
          make_link (tiny.Component);

          div.appendChild (document.createElement ("br"));
          const heading_2 = div.appendChild (document.createElement ("div"));
          heading_2.className = "heading";
          heading_2.appendChild (document.createTextNode ("Other loaded source code:"));
          div.appendChild (document.createElement ("br"));
          div.appendChild (document.createTextNode ("GUI helper definitions "));

          const input1    = div.appendChild (document.createElement ("select"));
          input1.onchange = () => this.display_code (tiny.widgets[ input1.value ]);
          for (let definition of Object.keys (tiny.widgets)) {
              const option = input1.appendChild (document.createElement ("option"));
              option.value = option.innerText = definition;
          }

          div.appendChild (document.createElement ("br"));
          div.appendChild (document.createTextNode ("Math helper definitions "));

          const input2    = div.appendChild (document.createElement ("select"));
          input2.onchange = () => this.display_code (tiny.math[ input2.value ]);
          for (let definition of Object.keys (tiny.math)) {
              const option = input2.appendChild (document.createElement ("option"));
              option.value = option.innerText = definition;
          }
      }
      display_code (code_in_focus) {
          if (this.component.embedded_editor)
              this.component.embedded_editor.select_class (code_in_focus);
          if (code_in_focus) this.format_code (code_in_focus.toString ());
          else fetch (document.location.href)
            .then (response => response.text ())
            .then (pageSource => this.format_code (pageSource));
      }
      format_code (code_string) {                                         // (Internal helper function)
          this.code_display.innerHTML = "";
          const color_map             = {
              string: "chocolate", comment: "green", regex: "blue", number: "magenta",
              name  : "black", punctuator: "red", whitespace: "black"
          };

          for (let t of new Code_Manager (code_string).tokens)
              if (t.type == "name" && [...Object.keys (tiny), ...Object.keys (this.definitions)].includes (t.value)) {
                  const link = this.code_display.appendChild (document.createElement ('a'));
                  link.href  = "javascript:void(0);";
                  link.addEventListener ('click',
                                         () => this.display_code (tiny[ t.value ] || this.definitions[ t.value ]));
                  link.textContent = t.value;
              } else {
                  const url_regex    = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
                  const index_of_url = t.value.search (url_regex);

                  const span       = this.code_display.appendChild (document.createElement ('span'));
                  span.style.color = color_map[ t.type ];
                  span.textContent = index_of_url === -1 ? t.value : t.value.slice (0, index_of_url);

                  if (index_of_url !== -1) {
                      const end_of_url = index_of_url + t.value.match (url_regex)[ 0 ].length;

                      const url   = t.value.slice (index_of_url, end_of_url);
                      const link  = this.code_display.appendChild (document.createElement ('a'));
                      link.target = "_blank";
                      link.rel    = "noopener";
                      link.href   = link.textContent = url;

                      const span       = this.code_display.appendChild (document.createElement ('span'));
                      span.style.color = color_map[ t.type ];
                      span.textContent = t.value.slice (end_of_url, t.value.length);
                  }

              }
      }
  };


const Editor_Widget = widgets.Editor_Widget =
  class Editor_Widget {
      // See description at:
      // https://github.com/encyclopedia-of-code/tiny-graphics-js/wiki/tiny-graphics-gui.js#editor_widget
      constructor (component, options = {}) {
          let rules = [".editor-widget { margin:auto; background:white; overflow:auto; font-family:monospace; width:1060px; padding:10px; \
                                      border-radius:12px; box-shadow: 20px 20px 90px 0px powderblue inset, 5px 5px 30px 0px blue inset }",
                       ".editor-widget button { background: #4C9F50; color: white; padding: 6px; border-radius:9px; margin-right:5px; \
                                                box-shadow: 4px 6px 16px 0px rgba(0,0,0,0.3); transition: background .3s, transform .3s }",
                       ".editor-widget input { margin-right:5px }",
                       ".editor-widget textarea { white-space:pre; width:1040px; margin-bottom:30px }",
                       ".editor-widget button:hover, button:focus { transform: scale(1.3); color:gold }"
          ];

          tiny.Component.initialize_CSS (Editor_Widget, rules);

          this.component = component;
          this.options   = options;

          const form = this.form = component.embedded_editor_area.appendChild (document.createElement ("form"));
          // Don't refresh the page on submit:
          form.addEventListener ('submit', event => {
              event.preventDefault ();
              this.submit_demo ();
          }, false);

          const explanation     = form.appendChild (document.createElement ("p"));
          explanation.innerHTML = `<i><b>What can I put here?</b></i>  A JavaScript class, with any valid JavaScript inside.  Your code can use classes from this demo,
                               <br>or from ANY demo on Demopedia --  the dependencies will automatically be pulled in to run your demo!<br>`;

          const run_button       = this.run_button = form.appendChild (document.createElement ("button"));
          run_button.type        = "button";
          run_button.style       = "background:maroon";
          run_button.textContent = "Run with Changes";

          const submit       = this.submit = form.appendChild (document.createElement ("button"));
          submit.type        = "submit";
          submit.textContent = "Save as New Webpage";

          const author_box       = this.author_box = form.appendChild (document.createElement ("input"));
          author_box.name        = "author";
          author_box.type        = "text";
          author_box.placeholder = "Author name";

          const password_box       = this.password_box = form.appendChild (document.createElement ("input"));
          password_box.name        = "password";
          password_box.type        = "text";
          password_box.placeholder = "Password";
          password_box.style       = "display:none";

          const overwrite_panel     = this.overwrite_panel = form.appendChild (document.createElement ("span"));
          overwrite_panel.style     = "display:none";
          overwrite_panel.innerHTML =
            "<label>Overwrite?<input type='checkbox' name='overwrite' autocomplete='off'></label>";

          const submit_result = this.submit_result = form.appendChild (document.createElement ("div"));
          submit_result.style = "margin: 10px 0";

          const new_demo_code = this.new_demo_code = form.appendChild (document.createElement ("textarea"));
          new_demo_code.name  = "new_demo_code";
          new_demo_code.rows  = this.options.rows || 25;
          new_demo_code.cols  = 140;
          const code_in_focus = options.code_in_focus || component.constructor;
          this.select_class (code_in_focus);
      }
      select_class (class_definition) { this.new_demo_code.value = class_definition.toString (); }
      fetch_handler (url, body) {
          return fetch (url,
                        {
                            body: body, method: body === undefined ? 'GET' : 'POST',
                            headers           : {'content-type': 'application/json'}
                        }).then (response => {
              if (response.ok) return Promise.resolve (response.json ());
              else return Promise.reject (response.status);
          });
      }
      submit_demo () {
          const form_fields = Array.from (this.form.elements).reduce ((accum, elem) => {
              if (elem.value && !(['checkbox', 'radio'].includes (elem.type) && !elem.checked))
                  accum[ elem.name ] = elem.value;
              return accum;
          }, {});

          this.submit_result.innerHTML = "";
          return this.fetch_handler ("/submit-demo?Unapproved", JSON.stringify (form_fields))
                     .then (response => {
                         if (response.show_password) this.password_box.style.display = "inline";
                         if (response.show_overwrite) this.overwrite_panel.style.display = "inline";
                         this.submit_result.innerHTML += response.message + "<br>";
                     })
                     .catch (
                       error => { this.submit_result.innerHTML += "Error " + error + " when trying to upload.<br>"; });
      }
  };
