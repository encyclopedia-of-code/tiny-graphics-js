// tiny-graphics.js - A file that shows how to organize a complete graphics program, refactoring common WebGL steps.
// By Garett.

// To organize the exported class definitions, declare each class both in local scope (const) as well as storing them in
// this JS object:
import {math}    from './tiny-graphics-math.js';
import {widgets} from './tiny-graphics-gui.js';

export const tiny = {...math, ...widgets, math, widgets };

// Pull these names into this module's scope for convenience:
const {Vector3, vec3, color, Matrix, Mat4, Keyboard_Manager} = tiny;

const Shape = tiny.Shape =
  class Shape {
      // See description at https://github.com/encyclopedia-of-code/tiny-graphics-js/wiki/tiny-graphics.js#shape
      constructor () {
          [this.vertices, this.indices, this.local_buffers] = [[], [], []];
          this.attribute_counter = 0;
          this.dirty = true;
          this.ready = true; //Since 3d models can be not ready
          this.gpu_instances = new Map ();      // Track which GPU contexts this object has copied itself onto.
      }
      fill_buffer( selection_of_attributes, buffer_hint = "STATIC_DRAW", divisor = 0 ) {
        if( !this.vertices[0] )
          return;

        this.dirty = true;
        // Check if this is a new call, a repeat call, or an invalid call.
        let buffer_to_overwrite = null;
        for( let index of this.local_buffers.keys() ) {
          const buffer_info = this.local_buffers[index];
          if( buffer_info.attributes[0] != selection_of_attributes[0] )
            continue;
          if( !buffer_info.attributes.every( (x,i) => x == selection_of_attributes[i] ) )
            throw "A call to fill_buffer() has been made that did not match the grouping of attributes used in previous calls.";
          buffer_to_overwrite = index;
        }

        // Visit first vertex to note how big the type of each fields/attribute is.  Assume all others will match.
        // TODO:  Allow mat2/mat3/mat4 attribute types as well.  Test single float attribute type.
        let attribute_sizes = selection_of_attributes.map( a => this.vertices[0][a].length || 1 );
        const attribute_is_matrix = selection_of_attributes.map( a => this.vertices[0][a] instanceof Matrix );
        let squared_sizes = attribute_sizes.map( (a,i) => Math.pow(a, 1 + attribute_is_matrix[i]) );

        // When a new buffer is requested by using a group of attributes not seen before, make a buffer.
        if( !buffer_to_overwrite ) {
          // TODO:  This part assumes a vertex type of FLOAT.  May need to override.
          const stride = squared_sizes.reduce( (acc,x) => acc + x * 4, 0 )

          const offsets = [];
          let offset = 0;
          for( let index = 0; index < selection_of_attributes.length; index++ ) {
              offsets[index] = offset;
              offset += 4*squared_sizes[index];
          }
          buffer_to_overwrite = this.local_buffers.push(
            {attributes:  [ ...selection_of_attributes ],
              sizes: attribute_sizes, attribute_is_matrix, offsets, stride, divisor, hint: buffer_hint,
              data: new Float32Array (stride/4 * this.vertices.length) }) - 1;
        }

        const buffer = this.local_buffers[buffer_to_overwrite];

        // Fill in the selected buffer locally with the user's updated values from each vertex field.
        let pos = 0;
        for (let v of this.vertices)
          for (let a of selection_of_attributes.keys()){

            const attr = selection_of_attributes[a];

            if(attribute_sizes[a] == 1) {
              if( buffer.data[pos] != v[attr] )
                buffer.dirty = true;
              buffer.data[pos] = v[attr];
              pos++;
            }
            else if( attribute_is_matrix[a] ) {
              for (let i=0; i < v[attr].length; i++) {
                for (let j=0; j < v[attr].length; j++) {
                  if( buffer.data[pos] != v[attr][i][j] )
                    buffer.dirty = true;
                  buffer.data[pos] = v[attr][i][j];
                  pos++;
                }
              }
            }
            else
              for (let i=0; i < attribute_sizes[a]; i++) {
                if( buffer.data[pos] != v[attr][i] )
                  buffer.dirty = true;
                buffer.data[pos] = v[attr][i];
                pos++;
              }
          }
      }
      copy_onto_graphics_card (context, write_to_indices = true) {
          if( !this.local_buffers.length)
            return;
          const gl = context;

          // When this Shape sees a new GPU context (in case of multiple drawing areas), copy the Shape to the GPU. If
          // it already was copied over, get a pointer to the existing instance.
          const existing_instance = this.gpu_instances.get (context);

          // If this Shape was never used on this GPU context before, then prepare new buffer indices for this context.
          let gpu_instance = existing_instance;
          if(!existing_instance) {
            test_rookie_mistake ();
            const defaults = { VAO: gl.createVertexArray () };
            gpu_instance = this.gpu_instances.set (context, defaults).get (context);
          }
          gl.bindVertexArray( gpu_instance.VAO );

          for( let index of this.local_buffers.keys() ) {

            let buffer_info = this.local_buffers[index];
            // Only update the subset of buffers that have changed, from the selection provided.
            if( !buffer_info.dirty)
              continue;
            buffer_info.dirty = false;

            let existing_pointer = buffer_info.gpu_pointer;
            buffer_info.gpu_pointer = buffer_info.gpu_pointer ?? gl.createBuffer();
            gl.bindBuffer (gl.ARRAY_BUFFER, buffer_info.gpu_pointer);

            if (existing_pointer !== undefined)
              gl.bufferSubData (gl.ARRAY_BUFFER, 0, buffer_info.data)
            else
              gl.bufferData (gl.ARRAY_BUFFER, buffer_info.data, gl[buffer_info.hint]);

            for( let i of buffer_info.attributes.keys()) {

              if( buffer_info.attribute_is_matrix[i] )
                for( let row = 0; row < buffer_info.sizes[i]; row++ ) {
                  gl.vertexAttribPointer(this.attribute_counter, buffer_info.sizes[i], gl.FLOAT, false, buffer_info.stride, buffer_info.offsets[i] + row * buffer_info.sizes[i] * 4);
                  gl.vertexAttribDivisor(this.attribute_counter, buffer_info.divisor);
                  gl.enableVertexAttribArray (this.attribute_counter);
                  this.attribute_counter++;
                }
              else {

                // TODO: Support normalization of attributes; allow the user to specify.
                // This assumes some stuff about the shader: Vertex fields are interleaved; vertex fields are
                // in the same order that they'll appear in the shader (using offset keyword).
                gl.vertexAttribPointer(this.attribute_counter, buffer_info.sizes[i], gl.FLOAT, false, buffer_info.stride, buffer_info.offsets[i]);
                gl.vertexAttribDivisor(this.attribute_counter, buffer_info.divisor);
                gl.enableVertexAttribArray (this.attribute_counter);
                this.attribute_counter++;
              }
            }
          }
          if (this.indices.length && write_to_indices) {
              if ( !existing_instance)
                  gpu_instance.index_buffer = gl.createBuffer ();
              gl.bindBuffer (gl.ELEMENT_ARRAY_BUFFER, gpu_instance.index_buffer);
              if (existing_instance)
                gl.bufferSubData (gl.ELEMENT_ARRAY_BUFFER, 0, new Uint32Array (this.indices))
              else
                gl.bufferData (gl.ELEMENT_ARRAY_BUFFER, new Uint32Array (this.indices), gl["STATIC_DRAW"]);
          }
          gl.bindVertexArray(null);
          this.dirty = false;
          return gpu_instance;
      }
      execute_shaders (gl, gpu_instance, type, instances) {
          if (this.indices.length) {
              gl.bindBuffer (gl.ELEMENT_ARRAY_BUFFER, gpu_instance.index_buffer);
              gl.drawElementsInstanced (gl[ type ], this.indices.length, gl.UNSIGNED_INT, 0, instances);
          } else gl.drawArraysInstanced (gl[ type ], 0, this.num_vertices, instances);
      }
      draw (webgl_manager, uniforms, model_transform, material, type = "TRIANGLES", instances) {
          let gpu_instance = this.gpu_instances.get (webgl_manager.context);
          if( !gpu_instance || this.dirty)
            gpu_instance = this.copy_onto_graphics_card (webgl_manager.context);
          webgl_manager.context.bindVertexArray( gpu_instance.VAO );
          material.shader.activate (webgl_manager.context, uniforms, model_transform, material);
          // Run the shaders to draw every triangle now:
          this.execute_shaders (webgl_manager.context, gpu_instance, type, instances);
      }

      // NOTE: All the below functions make a further assumption: that your vertex buffer includes fields called
      // "position" and "normal" stored at each point, instead of just any arbitrary fields.

      static insert_transformed_copy_into (recipient, args, points_transform = Mat4.identity ()) {
          // Here if you try to bypass making a temporary shape and instead directly insert new data into the
          // recipient, you'll run into trouble when the recursion tree stops at different depths.
          const temp_shape = new this (...args);
          recipient.indices.push (...temp_shape.indices.map (i => i + recipient.arrays.position.length));
          // Copy each array from temp_shape into the recipient shape:
          for (let a in temp_shape.arrays) {
              // Apply points_transform to all points added during this call:
              if (a === "position" || a === "tangents")
                  recipient.arrays[ a ].push (
                    ...temp_shape.arrays[ a ].map (p => points_transform.times (p.to4 (1)).to3 ()));
              // Do the same for normals, but use the inverse transpose matrix as math requires:
              else if (a === "normal")
                  recipient.arrays[ a ].push (...temp_shape.arrays[ a ].map (n =>
                                                                               Mat4.inverse (
                                                                                 points_transform.transposed ())
                                                                                   .times (n.to4 (1)).to3 ()));
              // All other arrays get copied in unmodified:
              else recipient.arrays[ a ].push (...temp_shape.arrays[ a ]);
          }
      }
      make_flat_shaded_version () {
          return class extends this.constructor {
              constructor (...args) {
                  super (...args);
                  this.duplicate_the_shared_vertices ();
                  this.flat_shade ();
              }
          };
      }
      duplicate_the_shared_vertices () {
          const arrays = {};
          for (let arr in this.arrays) arrays[ arr ] = [];
          for (let index of this.indices)
              for (let arr in this.arrays)
                  arrays[ arr ].push (this.arrays[ arr ][ index ]);      // Make re-arranged versions of each data
                                                                         // field, with
          Object.assign (this.arrays, arrays);                       // copied values every time an index was formerly
                                                                     // re-used.
          this.indices = this.indices.map ((x, i) => i);    // Without shared vertices, we can use sequential
                                                            // numbering.
      }
      flat_shade () {
          // First, iterate through the index or position triples:
          for (let counter = 0; counter < (this.indices ? this.indices.length : this.arrays.position.length);
               counter += 3) {
              const indices      = this.indices.length ?
                                   [this.indices[ counter ], this.indices[ counter + 1 ], this.indices[ counter + 2 ]]
                                                       : [counter, counter + 1, counter + 2];
              const [p1, p2, p3] = indices.map (i => this.arrays.position[ i ]);
              // Cross the two edge vectors of this triangle together to get its normal:
              const n1           = p1.minus (p2).cross (p3.minus (p1)).normalized ();
              // Flip the normal if adding it to the triangle brings it closer to the origin:
              if (n1.times (.1).plus (p1).norm () < p1.norm ()) n1.scale_by (-1);
              // Propagate this normal to the 3 vertices:
              for (let i of indices) this.arrays.normal[ i ] = Vector3.from (n1);
          }
      }
      normalize_positions (keep_aspect_ratios = true) {
          let p_arr              = this.vertices.map(item => item.position);
          const average_position = p_arr.reduce ((acc, p) => acc.plus (p.times (1 / p_arr.length)), vec3 (0, 0, 0));
          p_arr                  = p_arr.map (p => p.minus (average_position));           // Center the point cloud on
                                                                                          // the origin.
          const average_lengths = p_arr.reduce ((acc, p) =>
                                                  acc.plus (p.map (x => Math.abs (x)).times (1 / p_arr.length)),
                                                vec3 (0, 0, 0));
          let final_positions = [];
          if (keep_aspect_ratios)                            // Divide each axis by its average distance from the origin.
              final_positions = p_arr.map (p => p.map ((x, i) => x / average_lengths[ i ]));
          else
              final_positions = p_arr.map (p => p.times (1 / average_lengths.norm ()));

          for (var i = 0; i < final_positions.length; i++)
            this.vertices[i].position = final_positions[i];
      }
  };

const test_rookie_mistake = function () {
    test_rookie_mistake.counter |= 0;
    if (test_rookie_mistake.counter++ > 200)
        throw `Error: You are sending a lot of object definitions to the GPU, probably by mistake!  Many are likely
        duplicates, which you don't want since sending each one is very slow.  TO FIX THIS: Avoid ever declaring a
        Shape, Shader, or Texture with "new" anywhere that's called repeatedly (such as inside render_animation()).
        You don't want simple definitions to be re-created and re-transmitted every frame.  Your scene's constructor is
        a better option; it's only called once.  Call "new" there instead, then keep the result as a class member.  If
        you somehow have a deformable shape that must really be updated every frame, then refer to the documentation of
        copy_onto_graphics_card() -- you need a special call to it rather than calling new.`;
};


const Shader = tiny.Shader =
  class Shader {
      // See description at https://github.com/encyclopedia-of-code/tiny-graphics-js/wiki/tiny-graphics.js#shader
      copy_onto_graphics_card (context) {
          // Define what this object should store in each new WebGL Context:
          const defaults = {
              program : undefined, gpu_addresses: undefined,
              vertShdr: undefined, fragShdr: undefined
          };

          const existing_instance = this.gpu_instances.get (context);
          if ( !existing_instance) test_rookie_mistake ();

          // If this Shader was never used on this GPU context before, then prepare new buffer indices for this
          // context.
          const gpu_instance = existing_instance || this.gpu_instances.set (context, defaults).get (context);

          class Graphics_Addresses {            // Helper inner class
              constructor (program, gl) {
                  const num_uniforms = gl.getProgramParameter (program, gl.ACTIVE_UNIFORMS);
                  // Retrieve the GPU addresses of each uniform variable in the shader based on their names.  Store
                  // these pointers for later.
                  for (let i = 0; i < num_uniforms; ++i) {
                      let u     = gl.getActiveUniform (program, i).name.split ('[')[ 0 ];
                      this[ u ] = gl.getUniformLocation (program, u);
                  }
              }
          }

          const gl       = context;
          const program  = gpu_instance.program || context.createProgram ();
          const vertShdr = gpu_instance.vertShdr || gl.createShader (gl.VERTEX_SHADER);
          const fragShdr = gpu_instance.fragShdr || gl.createShader (gl.FRAGMENT_SHADER);

          if (gpu_instance.vertShdr) gl.detachShader (program, vertShdr);
          if (gpu_instance.fragShdr) gl.detachShader (program, fragShdr);

          gl.shaderSource (vertShdr, this.vertex_glsl_code ());
          gl.compileShader (vertShdr);
          if ( !gl.getShaderParameter (vertShdr, gl.COMPILE_STATUS))
              throw "Vertex shader compile error: " + gl.getShaderInfoLog (vertShdr);

          gl.shaderSource (fragShdr, this.fragment_glsl_code ());
          gl.compileShader (fragShdr);
          if ( !gl.getShaderParameter (fragShdr, gl.COMPILE_STATUS))
              throw "Fragment shader compile error: " + gl.getShaderInfoLog (fragShdr);

          gl.attachShader (program, vertShdr);
          gl.attachShader (program, fragShdr);
          gl.linkProgram (program);
          if ( !gl.getProgramParameter (program, gl.LINK_STATUS))
              throw "Shader linker error: " + gl.getProgramInfoLog (program);

          //Init UBO for the Camera and Lights
          this.init_UBO(gl, program, Shader.mapping_UBO());

          Object.assign (gpu_instance,
                         {program, vertShdr, fragShdr, gpu_addresses: new Graphics_Addresses (program, gl)});
          return gpu_instance;
      }
      activate (context, uniforms, model_transform, material) {
          // Track which GPU contexts this object has copied itself onto:
          if ( !this.gpu_instances) this.gpu_instances =  new Map ();
          const gpu_instance = this.gpu_instances.get (context) || this.copy_onto_graphics_card (context);

          // TODO:  Cache this
          context.useProgram (gpu_instance.program);

          // TODO:  Use UBO instead:
          // --- Send over all the values needed by this particular shader to the GPU: ---
          this.update_GPU (context, gpu_instance.gpu_addresses, uniforms, model_transform, material);
      }

      init_UBO (gl, program, ubo_binding) {
        var ubo_index = 0;
        for (var i = 0; i < ubo_binding.length; i++) {
          ubo_index = gl.getUniformBlockIndex(program, ubo_binding[i].shader_name);
          gl.uniformBlockBinding(program, ubo_index, ubo_binding[i].binding_point);
        }
      }

      bind_UBO (gl, program, shader_name, binding_point) {
        var ubo_index = gl.getUniformBlockIndex(program, shader_name);
        gl.uniformBlockBinding(program, ubo_index, binding_point);
      }

      // Your custom Shader has to override the following functions:
      vertex_glsl_code () {}
      fragment_glsl_code () {}
      update_GPU () {}
      static default_values () {}
      static mapping_UBO () {
        return [
          {shader_name: "Camera", binding_point: 0},
          {shader_name: "Lights", binding_point: 1},
        ];
      }
      static assign_camera (camera_inverse, uniforms) {
          Object.assign (uniforms, {camera_inverse, camera_transform: Mat4.inverse (camera_inverse)});
      }
  };


const Texture = tiny.Texture =
  class Texture {
      // See description at https://github.com/encyclopedia-of-code/tiny-graphics-js/wiki/tiny-graphics.js#texture
      constructor (filename, min_filter = "LINEAR_MIPMAP_LINEAR") {
          Object.assign (this, {filename, min_filter});

          if ( !this.gpu_instances) this.gpu_instances = new Map ();     // Track which GPU contexts this object has
                                                                         // copied itself onto.

          // Create a new HTML Image object:
          this.image             = new Image ();
          this.image.onload      = () => this.ready = true;
          this.image.crossOrigin = "Anonymous";           // Avoid a browser warning.
          this.image.src         = filename;
      }
      copy_onto_graphics_card (context, need_initial_settings = true) {
          // Define what this object should store in each new WebGL Context:
          const defaults = {texture_buffer_pointer: undefined};

          const existing_instance = this.gpu_instances.get (context);
          if ( !existing_instance) test_rookie_mistake ();

          // If this Texture was never used on this GPU context before, then prepare new buffer indices for this
          // context.
          const gpu_instance = existing_instance || this.gpu_instances.set (context, defaults).get (context);

          if ( !gpu_instance.texture_buffer_pointer) gpu_instance.texture_buffer_pointer = context.createTexture ();

          const gl = context;
          gl.bindTexture (gl.TEXTURE_2D, gpu_instance.texture_buffer_pointer);

          if (need_initial_settings) {
              gl.pixelStorei (gl.UNPACK_FLIP_Y_WEBGL, true);
              // Always use bi-linear sampling when zoomed out.
              gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
              // Apply user-defined sampling method when zoomed in.
              gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl[ this.min_filter ]);
          }
          gl.texImage2D (gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.image);
          if (this.min_filter === "LINEAR_MIPMAP_LINEAR")
            // For tri-linear sampling (the default), generate the necessary "mips" of the texture and store them
            // on the GPU.
              gl.generateMipmap (gl.TEXTURE_2D);
          return gpu_instance;
      }
      activate (context, texture_unit = 0) {
          if ( !this.ready)
              return;          // Terminate draw requests until the image file is actually loaded over the network.
          const gpu_instance = this.gpu_instances.get (context) || this.copy_onto_graphics_card (context);
          context.activeTexture (context[ "TEXTURE" + texture_unit ]);
          context.bindTexture (context.TEXTURE_2D, gpu_instance.texture_buffer_pointer);
      }
  };


const Component = tiny.Component =
  class Component {
      // See description at https://github.com/encyclopedia-of-code/tiny-graphics-js/wiki/tiny-graphics.js#component
      constructor (props = {}) {
          const rules = [
              `.documentation_treenode { }`,
              `.documentation { width:1060px; padding:0 10px; overflow:auto; background:white;
                                    box-shadow:10px 10px 90px 0 inset LightGray }`
          ];
          Component.initialize_CSS (Component, rules);

          this.props = props;
          if (this.props.uniforms) this.uniforms = this.props.uniforms;
          else this.uniforms = Component.default_uniforms ();

          this.animated_children  = [];
          this.document_children  = [];
          // Set up how we'll handle key presses for the scene's control panel:
          const callback_behavior = (callback, event) => {
              callback (event);
              // Fire the callback and cancel any default browser shortcut that is an exact match:
              event.preventDefault ();
              // Don't bubble the event to parent nodes; let child elements be targeted in isolation.
              event.stopPropagation ();
          };
          this.key_controls       = new Keyboard_Manager (document, callback_behavior);
          // Finally, run the user's code for setting up their scene:
          this.init ();
      }
      static types_used_before = new Set ();
      static default_uniforms () {
          return {
              camera_inverse      : Mat4.identity (),
              camera_transform    : Mat4.identity (),
              projection_transform: Mat4.identity (),
              animate             : true,
              animation_time      : 0,
              animation_delta_time: 0
          };
      }
      static initialize_CSS (classType, rules) {
          if (Component.types_used_before.has (classType))
              return;

          if (document.styleSheets.length === 0) document.head.appendChild (document.createElement ("style"));
          for (const r of rules) document.styleSheets[ document.styleSheets.length - 1 ].insertRule (r, 0);
          Component.types_used_before.add (classType);
      }
      make_context (canvas, background_color = color (0, 0, 0, 1), dimensions) {
          this.canvas              = canvas;
          this.context = canvas.getContext("webgl2");
          if ( !this.context) throw "Canvas failed to make a WebGL context.";
          const gl = this.context;

          this.set_canvas_size (dimensions);
          // Tell the GPU which color to clear the canvas with each frame.
          gl.clearColor.apply (gl, background_color);
          gl.enable (gl.DEPTH_TEST);                            // Enable Z-Buffering test.
          // Specify an interpolation method for blending "transparent" triangles over the existing pixels:
          gl.enable (gl.BLEND);
          gl.blendFunc (gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          // Store a single red pixel, as a placeholder image to prevent a console warning:
          gl.bindTexture (gl.TEXTURE_2D, gl.createTexture ());
          gl.texImage2D (gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                         new Uint8Array ([255, 0, 0, 255]));

          // Find the correct browser's version of requestAnimationFrame() needed for queue-ing up re-display events:
          window.requestAnimFrame = (w =>
            w.requestAnimationFrame || w.webkitRequestAnimationFrame
            || w.mozRequestAnimationFrame || w.oRequestAnimationFrame || w.msRequestAnimationFrame
            || function (callback) { w.setTimeout (callback, 1000 / 60); }) (window);
      }
      set_canvas_size (dimensions = [1080, 600]) {
          // We must change size in CSS, wait for style re-flow, and then change size again within canvas attributes.
          // Both steps are needed; attributes on a canvas have a special effect on buffers, separate from their style.
          const [width, height]         = dimensions;
          this.canvas.style[ "width" ]  = width + "px";
          this.canvas.style[ "height" ] = height + "px";
          Object.assign (this, {width, height});
          Object.assign (this.canvas, {width, height});
          // Build the canvas's matrix for converting -1 to 1 ranged coords (NCDS) into its own pixel coords:
          this.context.viewport (0, 0, width, height);
      }
      frame_advance (time = 0) {
          if ( !this.props.dont_tick) {
              this.uniforms.animation_delta_time = time - this.prev_time | 0;
              if (this.uniforms.animate) this.uniforms.animation_time += this.uniforms.animation_delta_time;
              this.prev_time = time;
          }

          const gl = this.context;
          if (gl)
              gl.clear (gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);        // Clear the canvas's pixels and z-buffer.

          const open_list = [this];
          while (open_list.length)                           // Traverse all Scenes and their children, recursively.
          {
              open_list.push (...open_list[ 0 ].animated_children);
              // Call display() to draw each registered animation:
              open_list.shift ().render_animation (this);
          }
          // Now that this frame is drawn, request that render() happen again as soon as all other web page events
          // are processed:
          this.event = window.requestAnimFrame (this.frame_advance.bind (this));
      }
      new_line (parent = this.control_panel) { parent.appendChild (document.createElement ("br")); }
      live_string (callback, parent = this.control_panel) {
          parent.appendChild (
            Object.assign (document.createElement ("div"), {className: "live_string", onload: callback}));
      }
      key_triggered_button (description, shortcut_combination, callback,
                            color                    = '#' + Math.random ().toString (9).slice (-6),
                            release_event, recipient = this,
                            parent                   = this.control_panel) {
          const button         = parent.appendChild (document.createElement ("button"));
          button.default_color = button.style.backgroundColor = color;
          const press          = () => {
                    Object.assign (button.style, {
                        'background-color'         : 'red',
                        'z-index': "1", 'transform': "scale(2)"
                    });
                    callback.call (recipient);
                },
                release        = () => {
                    Object.assign (button.style, {
                        'background-color'         : button.default_color,
                        'z-index': "0", 'transform': "scale(1)"
                    });
                    if ( !release_event) return;
                    release_event.call (recipient);
                };
          const key_name       = shortcut_combination.join ('+').split (" ").join ("Space");
          button.textContent   = "(" + key_name + ") " + description;
          button.addEventListener ("mousedown", press);
          button.addEventListener ("mouseup", release);
          button.addEventListener ("touchstart", press, {passive: true});
          button.addEventListener ("touchend", release, {passive: true});
          if ( !shortcut_combination) return;
          this.key_controls.add (shortcut_combination, press, release);
      }
      render_layout (div, options = {}) {
          this.div         = div;
          div.className    = "documentation_treenode";
          // Fit the existing document content to a fixed size:
          div.style.margin = "auto";
          div.style.width  = "1080px";

          this.document_region           = div.appendChild (document.createElement ("div"));
          this.document_region.className = "documentation";
          this.render_explanation ();
          // The next div down will hold a canvas and/or related interactive areas.
          this.program_stuff = div.appendChild (document.createElement ("div"));

          const defaults = {
              show_canvas: true, make_controls: true,
              make_editor: false, make_code_nav: true
          };

          const overridden_options = Object.assign (defaults, this.widget_options, options);

          // TODO:  One use case may have required canvas to be styled as a rule instead of as an element.  Keep an
          // eye out.
          const canvas = this.program_stuff.appendChild (document.createElement ("canvas"));
          canvas.style = `width:1080px; height:600px; background:DimGray; margin:auto; margin-bottom:-4px`;

          if ( !overridden_options.show_canvas)
              canvas.style.display = "none";
          // Use tiny-graphics-js to draw graphics to the canvas, using the given scene objects.
          this.make_context (canvas);
          // Start WebGL main loop - render() will re-queue itself for continuous calls.
          this.event = window.requestAnimFrame (this.frame_advance.bind (this));

          if (overridden_options.make_controls) {
              this.embedded_controls_area           = this.program_stuff.appendChild (document.createElement ("div"));
              this.embedded_controls_area.className = "controls-widget";
              this.embedded_controls                = new tiny.Controls_Widget (this);
          }
          if (overridden_options.make_code_nav) {
              this.embedded_code_nav_area           = this.program_stuff.appendChild (document.createElement ("div"));
              this.embedded_code_nav_area.className = "code-widget";
              this.embedded_code_nav                = new tiny.Code_Widget (this);
          }
          if (overridden_options.make_editor) {
              this.embedded_editor_area           = this.program_stuff.appendChild (document.createElement ("div"));
              this.embedded_editor_area.className = "editor-widget";
              this.embedded_editor                = new tiny.Editor_Widget (this);
          }
      }

      init () {}
      render_animation (context) {}                            // Called each frame for drawing.
      render_explanation () {}
      render_controls () {}     // render_controls(): Called by Controls_Widget for generating interactive UI.
  };



const UBO = tiny.UBO =
class UBO  {
  constructor (gl, buffer_name, buffer_size, buffer_layout) {

    this.items = {};

    for (var i = 0; i < buffer_layout.length; i++) {
      for ( var j = 0; j < buffer_layout[i].data_layout.length; j++) {
        this.items[buffer_layout[i].data_layout[j].name] = { //offset of the whole data_layout in the whole ubo buffer
                                                             data_layout_offset: buffer_layout[i].data_offset,
                                                             //length of the data_layout
                                                             data_layout_length: buffer_layout[i].data_length,
                                                             //offset of the item within the data_layout
                                                             offset: buffer_layout[i].data_layout[j].offset,
                                                             data_length: buffer_layout[i].data_layout[j].data_length,
                                                             chunk_length: buffer_layout[i].data_layout[j].chunk_length,
                                                            };
      }
    }

    this.gl = gl;
    this.buffer_name = buffer_name;

    this.buffer = gl.createBuffer ();
    gl.bindBuffer (gl.UNIFORM_BUFFER, this.buffer);
    gl.bufferData (gl.UNIFORM_BUFFER, buffer_size, gl.DYNAMIC_DRAW);
    gl.bindBuffer (gl.UNIFORM_BUFFER, null);
  }

  bind (binding_point) {
    this.binding_point = binding_point;
    this.gl.bindBufferBase (this.gl.UNIFORM_BUFFER, binding_point, this.buffer);
  }

  update (buffer_name, buffer_data, num_instance = 0) {
    if (buffer_data instanceof Matrix)
      buffer_data = Matrix.flatten_2D_to_1D(buffer_data.transposed());

    //Force the data to be Float32Array
    if (!(buffer_data instanceof Float32Array)) {
      if ( Array.isArray(buffer_data))
        buffer_data = new Float32Array(buffer_data);
      else
        buffer_data = new Float32Array([buffer_data]);
    }

    var ref = this.items[buffer_name];
    var buffer_offset = ref.data_layout_offset + ref.data_layout_length * num_instance + ref.offset;

    this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, this.buffer);
    this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, buffer_offset, buffer_data, 0, null);
    this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, null);

    return this;
  }

  static create (gl, block_name, buffer_layout) {

    var buffer_size = 0;

    for ( var i = 0; i < buffer_layout.length; i++ ) {
      var data_size = UBO.calculate(buffer_layout[i].data_layout); //size occupied by a single instance, 16b aligned
      buffer_layout[i].data_length = data_size;
      buffer_size += data_size * buffer_layout[i].num_instances;

      if (i > 0)
        buffer_layout[i].data_offset = buffer_layout[i-1].data_offset + buffer_layout[i-1].num_instances * buffer_layout[i-1].data_length;
      else
        buffer_layout[i].data_offset = 0;

    }
    UBO.Cache[block_name] = new UBO(gl, block_name, buffer_size, buffer_layout);
  }

  static get_size (type) { //[Alignment,Size]
    switch (type) {
      case "float":
      case "int":
      case "bool":
        return [4,4];
      case "Mat4":
        return [64,64]; //16*4
      case "Mat3":
        return [48,48]; //16*3
      case "vec2":
        return [8,8];
      case "vec3":
        return [16,12]; //Special Case
      case "vec4":
        return [16,16];
      default:
        return [0,0];
    }
  }

  static calculate(buffer_layout) {
    var chunk = 16;	//Data size in Bytes, UBO using layout std140 needs to build out the struct in chunks of 16 bytes.
    var temp_size = 0;	//Temp Size, How much of the chunk is available after removing the data size from it
    var offset = 0;	//Offset in the buffer allocation
    var size;		//Data Size of the current type

    for (var i=0; i < buffer_layout.length; i++) {
      //When dealing with arrays, Each element takes up 16 bytes regardless of type.
      if (!buffer_layout[i].length || buffer_layout[i].length == 0)
        size = UBO.get_size(buffer_layout[i].type);
      else
        size = [buffer_layout[i].length * 16, buffer_layout[i].length * 16];

      temp_size = chunk - size[0];	//How much of the chunk exists after taking the size of the data.

      //Chunk has been overdrawn when it already has some data resurved for it.
      if (temp_size < 0 && chunk < 16) {
        offset += chunk;						//Add Remaining Chunk to offset...
        if (i > 0)
          buffer_layout[i-1].chunk_length += chunk;	//So the remaining chunk can be used by the last variable
        chunk = 16;								//Reset Chunk
        if(buffer_layout[i].type == "vec3")
          chunk -= size[1];	//If Vec3 is the first var in the chunk, subtract size since size and alignment is different.
      }
      else if (temp_size < 0 && chunk == 16) {
        //Do nothing incase data length is >= to unused chunk size.
        //Do not want to change the chunk size at all when this happens.
      }
      else if (temp_size == 0) { //If evenly closes out the chunk, reset

        if(buffer_layout[i].type == "vec3" && chunk == 16)
          chunk -= size[1];	//If Vec3 is the first var in the chunk, subtract size since size and alignment is different.
        else
          chunk = 16;
      }
      else
        chunk -= size[1];	//Chunk isn't filled, just remove a piece

      //Add some data of how the chunk will exist in the buffer.
      buffer_layout[i].offset	= offset;
      buffer_layout[i].chunk_length	= size[1];
      buffer_layout[i].data_length = size[1];

      offset += size[1];
    }

    //Check if the final offset is divisiable by 16, if not add remaining chunk space to last element.
    if (offset % 16 != 0) {
      buffer_layout[buffer_layout.length-1].chunk_length += 16 - offset % 16;
      offset += 16 - offset % 16;
    }

    return offset;
  }

};

UBO.Cache = []; //To be on the gl object!!!
