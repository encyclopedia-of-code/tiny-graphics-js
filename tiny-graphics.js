// tiny-graphics.js - A file that shows how to organize a complete graphics program, refactoring common WebGL steps.
// By Garett.

import * as math from './tiny-graphics-math.js';
import { Vector3, vec3, color, Matrix, Mat4 } from './tiny-graphics-math.js';
import * as widgets from './tiny-graphics-gui.js';
export * from './tiny-graphics-math.js';
export * from './tiny-graphics-gui.js';
export { math, widgets };

export class Shape {
      // See description at https://github.com/encyclopedia-of-code/tiny-graphics-js/wiki/tiny-graphics.js#shape
      constructor (...args) {
          [this.vertices, this.indices] = [[], []];
          this.waiting = false; // Since models loaded from files can be not ready
          this.init(...args);
          this.indices_version = 0;

          if(! this.VBO_plans)
            // If no VBO layout is specified, assume all vertex fields should be in just one, interleaved.
            this.VBO_plans = [{attributes: [...Object.keys(this.vertices[0])] }];
          for( let vbo_plan of this.VBO_plans )
            Shape.build_VBO_plan (this.vertices, vbo_plan);
      }
      static build_VBO_plan( entries, destination, buffer_hint = "STATIC_DRAW", divisor = 0 ) {
        if (!entries[0]) return;

        // WARNING: Changing VBO layout after creation is unsupported and will break rendering!

        // --- Step 1: Attribute Metadata ---
        // Preview the first entry to see what our VBO data source is like.
        // Each VBO entry is either a matrix or a dictionary (of vertex fields).
        const attributes = destination.attributes;
        const first = entries[0];
        const is_matrix_array = first instanceof Matrix;

        const attributes_meta = attributes.map(attr => {
              const first_value = is_matrix_array ? first : first[attr];
              const is_matrix = first_value instanceof Matrix;
              const size = is_matrix ? 4 : (first_value.length || 1);
              const full_size = is_matrix ? 16 : size;
              return { attr, is_matrix, size, full_size };
            });

        // --- Step 2: Stride and Offsets ---
        let accumulator = 0;
        const offsets = [];
        attributes_meta.forEach(meta => {
          offsets.push(accumulator);
          accumulator += 4 * meta.full_size;
        });
        const stride = accumulator;

        // --- Step 3: Allocate (or Re-allocate) Buffer If Needed ---
        const vertex_count = entries.length;
        if (!destination.vertex_count || destination.vertex_count < vertex_count) {
          Object.assign(destination, {
            sizes: attributes_meta.map(m => m.size),
            attribute_is_matrix: attributes_meta.map(m => m.is_matrix),
            offsets, stride, divisor, buffer_hint, vertex_count,
            has_resized: true,
            version: (destination.version || 0) + 1,
            data: new Float32Array((stride / 4) * vertex_count)
          });
        }

        // --- Step 4: Buffer Filling ---
        let pos = 0, next_version = destination.version + 1;
        function set_element(value) {
          if (Math.abs(destination.data[pos] - value) > 1e-5) {
            destination.version = next_version;
            destination.data[pos] = value;
          }
          pos++;
        }

        for (const v of entries)
          attributes_meta.forEach( meta => {
            const value = is_matrix_array ? v : v[meta.attr];
            if (meta.is_matrix)
              // Write as column-major for GLSL.
              for (let i = 0; i < 4; i++)
                for (let j = 0; j < 4; j++)
                  set_element(value[j][i]);
            else if (meta.size > 1)
              for (let i = 0; i < meta.size; i++)
                set_element(value[i]);
            else
              set_element(value);
          });
        return destination;
      }

      // NOTE: All the below functions make a further assumption: that your vertex buffer includes fields called
      // "position" and "normal" stored at each point, instead of just any arbitrary fields.

      static insert_transformed_copy_into (recipient, args, points_transform = Mat4.identity ()) {
          // Append one of these shapes onto recipient's vertex list. Transform points/normals as desired when inserting.
          // For transforming normals, the math requires the inverse transpose matrix.
          const dummy_instance = new this (...args);
          recipient.indices.push (...dummy_instance.indices.map (i => i + recipient.vertices.length));
          for (let v of dummy_instance.vertices) {
            const inverse_transpose = Mat4.inverse( points_transform.transposed() );
            const position = points_transform .times (v.position.to4(1)).to3();
            const normal   = inverse_transpose.times (v.normal  .to4(1)).to3();
            recipient.vertices.push( Object.assign( { ...v, position, normal } ) );
          }
      }
      subdivide(count) {
          const starting_length = this.indices.length;
          for (let i = 0; i < starting_length; i += 3) {
              const a = this.indices[i], b = this.indices[i+1], c = this.indices[i+2];
              this.subdivide_triangle(a, b, c, count);
          }
      }
      subdivide_triangle(a, b, c, count) {
          const v = this.vertices;
          const stack = [[a, b, c, count]];
          while (stack.length > 0) {
              const [a, b, c, count] = stack.pop();

              // Base case of recursion: The finest level of detail we want.
              if (count <= 0) {
                  this.indices.push(a, b, c);
                  continue;
              }
              // Add vertices along the three edges at midpoints.
              const ab_pos = v[a].position.mix(v[b].position, 0.5);
              const ac_pos = v[a].position.mix(v[c].position, 0.5);
              const bc_pos = v[b].position.mix(v[c].position, 0.5);
              const ab = v.push({ position: ab_pos }) - 1;
              const ac = v.push({ position: ac_pos }) - 1;
              const bc = v.push({ position: bc_pos }) - 1;

              // Recurse on four smaller triangles.
              stack.push([a, ab, ac,  count - 1]);
              stack.push([ab, b, bc,  count - 1]);
              stack.push([ac, bc, c,  count - 1]);
              stack.push([ab, bc, ac, count - 1]);
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
    if ( test_rookie_mistake.counter++ > 200)
        throw `Error: You are sending a lot of object definitions to the GPU, probably by mistake!  Many are likely
        duplicates, which you don't want since sending each one is very slow.  TO FIX THIS: Avoid ever declaring a
        Shape, Shader, UBO, or Texture with "new" anywhere that's called repeatedly (such as inside render_frame()).
        You don't want simple definitions to be re-created and re-transmitted every frame.  Your scene's constructor is
        a better option; it's only called once.  Call "new" there instead, then keep the result as a class member.  If
        you somehow have a deformable shape that must really be updated every frame, then refer to the documentation of
        copy_onto_graphics_card() -- you need a special call to it rather than calling new.`;
};






export class Shader {
    // See description at https://github.com/encyclopedia-of-code/tiny-graphics-js/wiki/tiny-graphics.js#shader
    copy_onto_graphics_card (renderer, given_info = new Map()) {
      // TODO:  Calling this twice should recompile the shader in-place with updated options (untested)
      // TODO:  The given_info argument may be supplied with another uniform_addresses.get(shader).uniform_block_info
      // to skip some repeat gl initialization calls.

      const gl       = renderer.context;
      const existing = renderer.shaders.get (this);
      const instance  = existing ?? { program: gl.createProgram(),
                                      vertex_shader: gl.createShader (gl.VERTEX_SHADER),
                                      fragment_shader: gl.createShader (gl.FRAGMENT_SHADER) };
      renderer.shaders.set (this, instance);
      if (!existing) test_rookie_mistake();
      else {
        gl.detachShader (existing.program, existing.vertex_shader);
        gl.detachShader (existing.program, existing.fragment_shader);
      }
      const {program, vertex_shader, fragment_shader} = instance;

      class Attribute_Addresses {
        // Attributes_Addresses: Helper inner class. Retrieve the GPU addresses of each attribute.
          constructor (program, gl) {
                // Assume per-vertex attributes will each be a set of 1 to 4 floats:
                const type_to_size_mapping = {0x1406: 1, 0x8B50: 2, 0x8B51: 3, 0x8B52: 4};
                const numAttribs = gl.getProgramParameter (program, gl.ACTIVE_ATTRIBUTES);
                // https://github.com/greggman/twgl.js/blob/master/dist/twgl-full.js for another example:
                for (let i = 0; i < numAttribs; i++) {
                    const attribInfo = gl.getActiveAttrib (program, i);
                    if (!attribInfo)
                      break;
                    // Pointers to all shader attribute variables:
                    this[ attribInfo.name ] = {
                        index     : gl.getAttribLocation (program, attribInfo.name),
                        size      : type_to_size_mapping[ attribInfo.type ],
                        type      : attribInfo.type,
                        normalized: false
                    };
                }
              }
          }

      class Uniform_Addresses {
        // Uniform_Addresses: Helper inner class. Retrieve the GPU addresses of each uniform variable in
        // the shader based on their names.  Store these pointers for later.
          constructor (program) {
              const indices_to_blockname = new Map();
              const indices_to_offsets = new Map();
              this.uniform_block_info = new Map();  // block_name -> { buffer_size, element_offsets}
              const num_blocks = gl.getProgramParameter(program, gl.ACTIVE_UNIFORM_BLOCKS);
              for (let i = 0; i < num_blocks; i++ ) {
                const UBO_name = gl.getActiveUniformBlockName(program, i);
                const UBO_size = gl.getActiveUniformBlockParameter(program, i, gl.UNIFORM_BLOCK_DATA_SIZE);
                const UBO_index = gl.getUniformBlockIndex(program, UBO_name);
                gl.uniformBlockBinding(program, UBO_index, UBO_index);   // By convention, force block indices to match binding points.

                if( !given_info.get(UBO_name) )
                  this.uniform_block_info.set(UBO_name,
                        { buffer_size: UBO_size, element_offsets: new Map(), next_offsets: new Map() });

                const indices = gl.getActiveUniformBlockParameter(program, i, gl.UNIFORM_BLOCK_ACTIVE_UNIFORM_INDICES);
                const offsets = gl.getActiveUniforms(program, indices, gl.UNIFORM_OFFSET);
                for (let i = 0; i < indices.length; i++) {
                  indices_to_blockname.set(indices[i], UBO_name);
                  indices_to_offsets.set(indices[i], offsets[i]);
                }
              }

              const num_uniforms = gl.getProgramParameter (program, gl.ACTIVE_UNIFORMS);
              let previous_offset;
              for (let i = 0; i < num_uniforms; ++i) {
                  if (indices_to_blockname.get(i)) {  // Belongs to a UBO
                    const name = indices_to_blockname.get(i);
                    if( given_info.get(name) )
                      continue;
                    const full_name = gl.getActiveUniform (program, i).name;
                    const dot_path = full_name.replace(/\[(\d+)\]/g, '.$1'); // 'lights[0].color' => 'lights.0.color'
                    const offset = indices_to_offsets.get(i);
                    this.uniform_block_info.get(name).element_offsets.set(dot_path, offset);
                    if( previous_offset !== undefined )
                      this.uniform_block_info.get(name).next_offsets.set(previous_offset, offset);
                    previous_offset = offset;
                  }
                  else {  // Loose uniform
                      const full_name = gl.getActiveUniform (program, i).name;
                      this[ full_name ] = gl.getUniformLocation (program, full_name);
                  }
              }
          }
      }

      gl.shaderSource (vertex_shader, this.vertex_glsl_code ());
      gl.compileShader (vertex_shader);
      if ( !gl.getShaderParameter (vertex_shader, gl.COMPILE_STATUS))
          throw "Vertex shader compile error: " + gl.getShaderInfoLog (vertex_shader);

      gl.shaderSource (fragment_shader, this.fragment_glsl_code ());
      gl.compileShader (fragment_shader);
      if ( !gl.getShaderParameter (fragment_shader, gl.COMPILE_STATUS))
          throw "Fragment shader compile error: " + gl.getShaderInfoLog (fragment_shader);

      gl.attachShader (program, vertex_shader);
      gl.attachShader (program, fragment_shader);
      gl.linkProgram (program);
      if ( !gl.getProgramParameter (program, gl.LINK_STATUS))
          throw "Shader linker error: " + gl.getProgramInfoLog (program);

      renderer.uniform_addresses.set(this, new Uniform_Addresses (program, gl));
      renderer.attribute_addresses.set(this, new Attribute_Addresses (program, gl));

      Object.assign (instance, {program, vertex_shader, fragment_shader});
      return instance;
    }
    activate (renderer, group_transform, material) {    // FINISH: Move to renderer?
      // copy_to_GPU if needed
      // useProgram if needed
      // send loose uniforms with polymorphism (this.update_GPU)
      // bind samplers and set texture offset
        const instance = renderer.shaders.get(this) || this.copy_onto_graphics_card (renderer);

        const previous_program = renderer.gpu_versions.get("Program");
        renderer.gpu_versions.set("Program", instance.program);
        if(previous_program != instance.program )
          renderer.context.useProgram (instance.program);

        // TODO: Confirm that there are cases where update_GPU can't be batched to once-per-frame.
        this.update_GPU (renderer, group_transform, material);

        let offset = 0;
        for (const [name, sampler] of material.samplers.entries())
          if (sampler && sampler.ready) {

            const current_sampler2D_index = renderer.uniform_addresses[name];
            const previous_texture_offset = renderer.gpu_versions.get("Texture offset_"+current_sampler2D_index);
            renderer.gpu_versions.set("Texture offset_"+current_sampler2D_index, offset);
            if(previous_texture_offset != offset )
              renderer.context.uniform1i (current_sampler2D_index, offset);
            // For this draw, use the texture image from correct the GPU buffer:
            sampler.activate (renderer, offset);
            offset++;
          }
    }
    // Your custom Shader has to override the following functions:
    vertex_glsl_code () {}
    fragment_glsl_code () {}
    update_GPU () {}
    static default_values () {}
};


export class Texture {
  // See description at https://github.com/encyclopedia-of-code/tiny-graphics-js/wiki/tiny-graphics.js#texture
  constructor (filename, min_filter = "LINEAR_MIPMAP_LINEAR") {
      Object.assign (this, {filename, min_filter});

      // Create a new HTML Image object:
      this.image             = new Image ();
      this.image.onload      = () => this.ready = true;
      this.image.crossOrigin = "Anonymous";           // Avoid a browser warning.
      this.image.src         = filename;
  }
  copy_onto_graphics_card (renderer, need_initial_settings = true) {
      const gl = renderer.context;
      const existing = renderer.textures.get (this);
      const texture_buffer  = existing ?? gl.createTexture();
      renderer.textures.set (this, texture_buffer);
      if (!existing) test_rookie_mistake();

      gl.bindTexture (gl.TEXTURE_2D, texture_buffer);

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
      return texture_buffer;
  }
  activate (renderer, texture_unit = 0) {
      if ( !this.ready)
          return;          // Terminate draw requests until the image file is actually loaded over the network.
      const gl = renderer.context;
      const texture_buffer = renderer.textures.get (this) || this.copy_onto_graphics_card (renderer);
      const previous_texture_unit = renderer.gpu_versions.get("Texture unit");
      const field_ID = gl[ "TEXTURE" + texture_unit ];
      renderer.gpu_versions.set("Texture unit", field_ID);
      const previous_buffer = renderer.gpu_versions.get("Texture buffer pointer");
      renderer.gpu_versions.set("Texture buffer pointer", texture_buffer);
      if(previous_texture_unit != field_ID || previous_buffer != texture_buffer) {
        gl.activeTexture (field_ID);
        gl.bindTexture (gl.TEXTURE_2D, texture_buffer);
      }
  }
};

export class Shadow_Map {
      constructor (width, height, min_filter = "NEAREST", mag_filter = "NEAREST") {
          Object.assign (this, {width, height, min_filter, mag_filter, ready:true});
      }
      copy_onto_graphics_card (renderer) {
          const gl = renderer.context;
          const existing = renderer.shadow_maps.get (this);
          const instance  = existing ?? {fbo_pointer: gl.createFramebuffer(), texture_buffer: gl.createTexture()};
          renderer.shadow_maps.set (this, instance);
          if (!existing) test_rookie_mistake();

          gl.bindTexture (gl.TEXTURE_2D, instance.texture_buffer);
          gl.bindFramebuffer(gl.FRAMEBUFFER, instance.fbo_pointer);

          gl.pixelStorei (gl.UNPACK_FLIP_Y_WEBGL, true);

          gl.texStorage2D(
            gl.TEXTURE_2D,      // target
            1,                  // mip levels
            gl.DEPTH_COMPONENT16, // internal format
            this.width, this.height
          );
          // gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT16, this.width, this.height, 0,
          //   gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);

          // Always use bi-linear sampling when zoomed out.
          gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl[ this.mag_filter ]);
          // Apply user-defined sampling method when zoomed in.
          gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl[ this.min_filter ]);
          gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl[ "CLAMP_TO_EDGE" ]);
          gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl[ "CLAMP_TO_EDGE" ]);
          //onto the fbo
          gl.framebufferTexture2D (gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, instance.texture_buffer, 0);

          gl.drawBuffers ([gl.NONE]);
          gl.readBuffer (gl.NONE);

          gl.bindFramebuffer (gl.FRAMEBUFFER, null);
          gl.bindTexture( gl.TEXTURE_2D, null);

          return instance;
      }
      activate (renderer, texture_unit = 0, treat_as_fbo = false) {
          const gl = renderer.context;
          const instance = renderer.shadow_maps.get(this) || this.copy_onto_graphics_card (renderer);

          // TODO: The below gl calls are done without checking cached values.
          // The FBO parts seemingly couldn't be cached, but the rest could, as in Texture.
          // If bindTexture(null) below is needed, then not that.

          if( treat_as_fbo ) {
            gl.viewport (0, 0, this.width, this.height);
            gl.bindFramebuffer (gl.FRAMEBUFFER, instance.fbo_pointer);
            gl.clear (gl.DEPTH_BUFFER_BIT);
          }
          else {
            gl.activeTexture (gl[ "TEXTURE" + texture_unit ]);
            gl.uniform1i (this.draw_sampler_address, texture_unit);
          }
          gl.bindTexture (gl.TEXTURE_2D, instance.texture_buffer);
      }
      deactivate (renderer, treat_as_fbo = false) {
        const gl = renderer.context;
        if (treat_as_fbo) {
          gl.viewport(0, 0, renderer.width, renderer.height);
          gl.bindFramebuffer (gl.FRAMEBUFFER, null);
        }
        gl.bindTexture( gl.TEXTURE_2D, null);
      }
  };

export class Component {
      // See description at https://github.com/encyclopedia-of-code/tiny-graphics-js/wiki/tiny-graphics.js#component
      constructor (props = {}) {
          const rules = [
              `.documentation_treenode { }`,
              `.documentation { width:1060px; padding:0 10px; overflow:auto; background:white;
                                    box-shadow:10px 10px 90px 0 inset LightGray }`
          ];
          Component.initialize_CSS (Component, rules);

          this.props = props;
          this.state = Object.create(this.props);      // Shadow all properties given by the parent, so that parent is read-only.
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
          this.key_controls       = new widgets.Keyboard_Manager (document, callback_behavior);
          // Finally, run the user's code for setting up their scene:
          this.init ();
      }
      static types_used_before = new Set ();
      static initialize_CSS (classType, rules) {
          if (Component.types_used_before.has (classType))
              return;

          if (document.styleSheets.length === 0) document.head.appendChild (document.createElement ("style"));
          for (const r of rules) document.styleSheets[ document.styleSheets.length - 1 ].insertRule (r, 0);
          Component.types_used_before.add (classType);
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
      init () { }     // Abstract -- user overrides this
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
          // FINISH:  The above two lines would crash for Components that are not Renderers.

          if (overridden_options.make_controls) {
              this.embedded_controls_area           = this.program_stuff.appendChild (document.createElement ("div"));
              this.embedded_controls_area.className = "controls-widget";
              this.embedded_controls                = new widgets.Controls_Widget (this);
          }
          if (overridden_options.make_code_nav) {
              this.embedded_code_nav_area           = this.program_stuff.appendChild (document.createElement ("div"));
              this.embedded_code_nav_area.className = "code-widget";
              this.embedded_code_nav                = new widgets.Code_Widget (this);
          }
          if (overridden_options.make_editor) {
              this.embedded_editor_area           = this.program_stuff.appendChild (document.createElement ("div"));
              this.embedded_editor_area.className = "editor-widget";
              this.embedded_editor                = new widgets.Editor_Widget (this);
          }
      }
      render_frame (context) {}                            // Called each frame for drawing.
      render_explanation () {}
      render_controls () {}     // render_controls(): Called by Controls_Widget for generating interactive UI.
  };

class Linked_List {
  constructor() {
    this.head = this.tail = null;
    this.size = 0;
  }
  insertAfter(refNode, newNode) {
    newNode.previous = refNode;
    newNode.next = refNode.next;
    if (refNode.next) refNode.next.previous = newNode;
    else this.tail = newNode;
    refNode.next = newNode;
    this.size++;
  }
  remove(node) {
    if (node.previous) node.previous.next = node.next;
    else this.head = node.next;
    if (node.next) node.next.previous = node.previous;
    else this.tail = node.previous;
    node.next = node.previous = null;
    this.size--;
  }
}

class Sorted_RenderList {
  constructor() {
    this.linked_list = new Linked_List();
    this.material_map = new Map(); // Nested map, 3 deep.  Sort by 3 levels: Material, shape, group ID.
  }
  get (material, shape, group_ID) {
    return this.material_map.get(material)?.get(shape)?.get(group_ID);
  }

  insert (item) {
    const {material, shape, group_ID} = item;
    // Begin by assuming the very first item in our dictionaries is the best one to cluster with, then narrow it down.
    let best_candidate = this.material_map.values().next().value?.values().next().value?.values().next().value;

    let shape_map = this.material_map.get(material);
    if (shape_map) best_candidate = shape_map.values().next().value?.values().next().value || best_candidate;
    else shape_map = this.material_map.set(material, new Map()).get(material);

    let group_map = shape_map.get(shape);
    if (group_map) best_candidate = group_map.values().next().value || best_candidate;
    else group_map = shape_map.set(shape, new Map()).get(shape);

    let exact_match = group_map.get(group_ID);
    if (exact_match) {
      // A fully matching linked list node exists; merge matrices into it.
      exact_match.instance_count = exact_match.model_transforms.push(...item.model_transforms);
      return;
    }
    group_map.set(group_ID, item);

    if (best_candidate)
      // A partial match exists; insert next to it to grow the cluster.
      this.linked_list.insertAfter(best_candidate, item);
    else {
      // The whole list was empty.
      this.linked_list.head = this.linked_list.tail = item;
      item.previous = item.next = null;
      this.linked_list.size = 1;
    }
  }

  remove (item) {
    const {material, shape, group_ID} = item;
    let shape_map = this.material_map.get(material);
    if (!shape_map) return false;
    let group_map = shape_map.get(shape);
    if (!group_map) return false;
    let node = group_map.get(group_ID);
    if (!node) return false;

    // Remove from linked list, then from maps:
    this.linked_list.remove(node);
    group_map.delete(group_ID);
    if (group_map.size === 0) shape_map.delete(shape);
    if (shape_map.size === 0) this.material_map.delete(material);
    return true;
  }

  clear_group (item) {
    const {material, shape, group_ID} = item;
    const node = this.get(material, shape, group_ID);
    if (!node) return false;
    node.model_transforms = [];
    node.instance_count = 0;
    return true;
  }

  traverse(callback, options) {
    let current = this.linked_list.head;
    while (current) {
      let next = current.next; // Save next in case we remove current

      // Prune empty entries we encounter, from both the linked list and dictionary.
      // remove() also handles pruning empty maps up the chain.
      if (options.prune && current.model_transforms.length === 0)
        this.remove(current.material, current.shape, current.group_ID);
      else
        callback(current);
      current = next;
    }
  }
}

export class RenderListItem {
  constructor (material, shape, group_ID) {
      // To draw, just need all this for Renderer:
    this.shape = shape;
    this.material = material;
    this.group_ID = group_ID;
    this.model_transforms = [];
    this.matrix_VBO_plan = {attributes: ["model_transform"] };
    this.group_transform = Mat4.identity();
    this.hint = "STATIC_DRAW";
    this.type = "TRIANGLES";
    this.instance_count = 0;
  }
  update_matrices(buffer_hint = "STATIC_DRAW") {
    if (!this.model_transforms.length)     // The user may specify no matrices for the single instance case.
      this.model_transforms.push( Mat4.identity() );
    this.instance_count = this.model_transforms.length;
    Shape.build_VBO_plan (this.model_transforms, this.matrix_VBO_plan, buffer_hint, 1)
  }
}

export class Renderer extends Component {
  init () {
    this.renderList = new Sorted_RenderList();
    this.max_fps = 60;
    this.prev_frame_number = -1;
    this.is_running = true;

    // All the below maps belonging to this Renderer describe associations that exist only for this Renderer's context.
    this.UBOs = new Map(); // UBO_Plan -> <gl ubo ref>
    this.VAOs = new Map(); // RenderListItem -> <gl vao ref>
    this.VBOs = new Map(); // VBO_plan -> <gl vao ref>
    this.gpu_versions = new Map(); // VBO_plan, UBO_plan, <gl ebo ref> -> version number existing on GPU
        // Other values: Bound_UBO_#, Program, VAO, Active_EBO -> Their respective objects
    this.index_buffers = new Map();  // Shape -> <gl ebo ref>
    this.shaders = new Map();  // Shader -> { program, vertex_shader, fragment_shader }
    this.attribute_addresses = new Map();  // Shader -> Attribute_Addresses
    this.uniform_addresses = new Map();  // Shader -> Uniform_Addresses
    this.textures = new Map();  // Texture -> texture buffer
    this.shadow_maps = new Map();  // Shadow_Map -> texture buffer

    this.state = { animate   : true,
              animation_time : 0,
         animation_delta_time: 0,
                selected_UBOs: new Map()   // binding point integer -> UBO_plan
    };
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
        || function (callback) { w.setTimeout (callback, 1000 / this.max_fps); }) (window);
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
      this.first_frame_time ??= time;
      let frame_delay = 1000/this.max_fps;
      let current_frame_number = Math.floor((time - this.first_frame_time) / frame_delay);
      if (current_frame_number > this.prev_frame_number) {
        this.prev_frame_number = current_frame_number;
        if ( !this.props.dont_tick) {
            this.state.animation_delta_time = time - ( this.prev_time || 0 );
            if (this.state.animate) this.state.animation_time += this.state.animation_delta_time;
            this.prev_time = time;
        }
        // Clear the canvas's pixels and z-buffer.
        if (this.context)
            this.context.clear (this.context.COLOR_BUFFER_BIT | this.context.DEPTH_BUFFER_BIT);

        // Traverse all Scenes and their children, recursively. Call render_frame to draw each registered animation.
        const open_list = [this];
        while (open_list.length) {
            open_list.push (...open_list[ 0 ].animated_children);
            open_list.shift ().render_frame ();
        }
      }
      // Now that this frame is drawn, request that render() happen again as soon as all other web page events
      // are processed:
      this.event = window.requestAnimFrame (this.frame_advance.bind (this));
  }
  /*
  shadow_map_pass (uniforms) {
    for (let light of uniforms.UBOs.lightArray.fields.lights) {
      if (!light.casts_shadow)
        continue;
      if (light.is_point_light)
      {
        for (let i = 0; i < 6; i++) {
          light.activate(this.context, undefined, i);
          this.flush([], false, light.shadow_map_shader);
          light.deactivate(this, i);
        }
      }
      else {
        light.bind(this.context, undefined, true);         // FINISH:  One says activate, the other says bind.
        this.flush([], false, light.shadow_map_shader);
        light.deactivate(caller);
      }
    }

    // make dummy material if called from shadow, ie. given a light.shadow shader
    const shadow_pass_material = alternative_shader ?
                    new Material("shadow_pass_material", alternative_shader) :
                    undefined;
  */
  update_VAO(renderListItem, attribute_addresses) {
    const gl = this.context;
    const existing_VAO = this.VAOs.get (renderListItem);
    const VAO  = existing_VAO ?? gl.createVertexArray();
    this.VAOs.set (renderListItem, VAO);
  //  if (!existing_VAO) test_rookie_mistake();   // FINISH

    const previous_VAO = this.gpu_versions.get("VAO");
    this.gpu_versions.set("VAO", VAO);
    if(previous_VAO != VAO )
      gl.bindVertexArray( VAO );

    const shape = renderListItem.shape;
    if (shape.indices.length) {
        const existing_EBO = this.index_buffers.get (shape);
        const EBO = existing_EBO ?? gl.createBuffer();
        this.index_buffers.set(shape, EBO);

        const previous_EBO = this.gpu_versions.get("Active_EBO");
        this.gpu_versions.set("Active_EBO", EBO);
        if( !existing_VAO || previous_EBO != EBO )
          gl.bindBuffer (gl.ELEMENT_ARRAY_BUFFER, EBO);

        if( ! (this.gpu_versions.get(EBO) >= shape.indices_version) ) {
          this.gpu_versions.set(EBO, shape.indices_version);

          if (existing_EBO)
            gl.bufferSubData (gl.ELEMENT_ARRAY_BUFFER, 0, new Uint32Array (shape.indices))
          else
            gl.bufferData (gl.ELEMENT_ARRAY_BUFFER, new Uint32Array (shape.indices), gl["STATIC_DRAW"]);
        }
    }

         // VBO_plan is { attributes, data, offsets, sizes, stride, buffer_hint, vertex_count, has_resized, version, divisor }
    for( let VBO_plan of [ ...renderListItem.shape.VBO_plans, renderListItem.matrix_VBO_plan ] ) {

      if( VBO_plan.version < 0 )
        throw "This VBO is blank somehow; build_VBO_plans() was never called for it.";

      if( existing_VAO && this.gpu_versions.get(VBO_plan) >= VBO_plan.version  )
        continue;

      const existing = this.VBOs.get( VBO_plan );
      const vbo = existing ?? gl.createBuffer();
      this.VBOs.set( VBO_plan, vbo );
      gl.bindBuffer (gl.ARRAY_BUFFER, vbo);

      if( !existing || !existing_VAO)      // Enter the section to set a VBO's attributes only once; VBO layout changes aren't supported.
        for( let [i,name] of VBO_plan.attributes.entries()) {
          const name = VBO_plan.attributes[i];
          if( !attribute_addresses[name] )
            continue;
          const attr_index = attribute_addresses[name].index;
          if( !(attr_index >= 0 )) throw "Attribute addresses not retrieved yet";   // TODO:  Temporary

          // TODO:  Untested with numeric types other than GL_FLOAT.
          // attribute_addresses[name].type returns the container's type instead (like FLOAT_MAT4/FLOAT_VEC3); not it.

          if( VBO_plan.attribute_is_matrix[i] )
            for( let row = 0; row < VBO_plan.sizes[i]; row++ ) {
              gl.vertexAttribPointer(attr_index+row, VBO_plan.sizes[i], gl.FLOAT, false, VBO_plan.stride, VBO_plan.offsets[i] + row * VBO_plan.sizes[i] * 4);
              gl.vertexAttribDivisor(attr_index+row, VBO_plan.divisor);
              gl.enableVertexAttribArray (attr_index+row);
            }

          else {
            if( attribute_addresses[name].size != VBO_plan.sizes[i])
              throw "Wrong primitive size provided in the VBO vs the shader attribute.";

            // Assumptions about the shader: Vertex fields are interleaved, in the same order they'll appear in the shader (using offset keyword).
            // TODO: Support normalization of attributes; allow the user to specify.
            gl.vertexAttribPointer(attr_index, VBO_plan.sizes[i], gl.FLOAT, false, VBO_plan.stride, VBO_plan.offsets[i]);
            gl.vertexAttribDivisor(attr_index, VBO_plan.divisor);
            gl.enableVertexAttribArray (attr_index);
          }
        }

      if( this.gpu_versions.get(VBO_plan) >= VBO_plan.version  )
        continue;

      this.gpu_versions.set(VBO_plan, VBO_plan.version);

      if (existing && !VBO_plan.has_resized)
        gl.bufferSubData (gl.ARRAY_BUFFER, 0, VBO_plan.data)
      else
        gl.bufferData (gl.ARRAY_BUFFER, VBO_plan.data, gl[VBO_plan.buffer_hint]);
      VBO_plan.has_resized = false;
    }
  }
  draw (renderListItem, overridden_material) {
    const material = overridden_material ?? renderListItem.material;
    material.shader.activate (this, renderListItem.group_transform, material);

    const gl = this.context;
    this.update_VAO( renderListItem, this.attribute_addresses.get( material.shader ) );

    for (let [binding_point, ubo_plan] of this.state.selected_UBOs.entries()) {
      const existing = this.UBOs.get(ubo_plan);
      const ubo = existing ?? gl.createBuffer();
      this.UBOs.set(ubo_plan, ubo);

      const ID = "Bound_UBO_" + binding_point;
      const previous_bound_ubo = this.gpu_versions.get(ID);
      this.gpu_versions.set(ID, ubo);
      if(previous_bound_ubo != ubo )
        gl.bindBufferBase (gl.UNIFORM_BUFFER, binding_point, ubo);

      ubo_plan.fill_buffer(this.uniform_addresses.get(material.shader).uniform_block_info.get( ubo_plan.constructor.name ));
      if( !ubo_plan.local_buffer || this.gpu_versions.get(ubo_plan) >= ubo_plan.version )
        continue;
      this.gpu_versions.set(ubo_plan, ubo_plan.version);

      gl.bindBuffer(gl.UNIFORM_BUFFER, ubo);
      if(! existing) {
        test_rookie_mistake ();
        gl.bufferData (gl.UNIFORM_BUFFER, ubo_plan.local_buffer.length * 4, gl.DYNAMIC_DRAW);
      }
      gl.bufferSubData(gl.UNIFORM_BUFFER, 0, ubo_plan.local_buffer);
    }

    // Run the shaders to draw every triangle now:
    this.execute_shaders (gl, renderListItem.shape, renderListItem.type, renderListItem.instance_count);
  }
  execute_shaders (gl, shape, type, instance_count) {
    if (shape.indices.length)
       gl.drawElementsInstanced (gl[ type ], shape.indices.length, gl.UNSIGNED_INT, 0, instance_count);
    else
       gl.drawArraysInstanced (gl[ type ], 0, shape.vertices.length, instance_count);
  }
}

export class UBO_Plan {
  constructor (...args) {
    this.element_offsets = new Map();
    this.ready = true;        // For async loaded entries
    this.version = -1;
    this.type = Float32Array;   // User must override this manually before fill_buffer if they want a int/uint based UBO.
    this.init(...args);
  }
  init (fields) { }     // Abstract -- user overrides this
  get_binding_point () {
    throw `Abstract function.  Each subclass of UBO_Plan must specify its own binding point for its corresponding GLSL program uniform block.`; }
  traverse_fields() {
    const out = {};
    const stack = [{ value: this.fields, path: [] }];

    while (stack.length) {
      const { value, path } = stack.pop();

      if ( typeof value === 'number' || value instanceof this.type || value instanceof Matrix ) {
        out[path.join('.')] = value;  // We found a leaf node.  Finalize the path array into a string.
        continue;
      }
      else if (Array.isArray(value)) {
        for (let i = 0; i < value.length; ++i)
          stack.push({ value: value[i], path: path.concat(i) });
      } else if (typeof value === 'object' && value !== null) {
        for (const key of Object.keys(value))
          stack.push({ value: value[key], path: path.concat(key) });
      }
    }
    return out;
  }
  set_element(offset, value) {
    if( offset >= this.buffer_boundary )
      throw "A UBO field was too big for its GLSL variable."
    if (Math.abs(this.local_buffer[offset] - value) > 1e-5) {
      this.version = this.next_version;
      this.local_buffer[offset] = value;
    }
  }
  fill_buffer (uniform_block_info) {
    if (!uniform_block_info.buffer_size)
      throw `Can't call UBO_Plan::fill_buffer() before uniform block info for ${this.constructor.name} is queried at draw time.`
    if (!this.ready)
      return;     // Don't make a buffer out of this.fields until any async requests to fill in this.fields are done.
    if (!this.local_buffer)
      this.local_buffer = new this.type( uniform_block_info.buffer_size/4 );
    this.next_version = this.version+1;

    for (const [dot_path, value] of Object.entries( this.traverse_fields() )) {
      const offset = uniform_block_info.element_offsets.get( dot_path );
      if (offset === undefined) continue;  // Skip entries of this.fields that don't exist in the GLSL UBO

      this.buffer_boundary = uniform_block_info.next_offsets.get( offset )/4 || uniform_block_info.buffer_size/4;

      if (value instanceof Matrix)
        // Turn any matrices column major for GLSL.
        value.forEach ((r, i) => r.forEach ((x, j) => this.set_element( offset/4 + 4*i+j,  value[j][i]) ));
      else if (value instanceof this.type)
        for (let i=0; i<value.length; i++) this.set_element( offset/4 + i,  value[i]);
      else
        this.set_element(offset/4, value);
    }
  }
}
