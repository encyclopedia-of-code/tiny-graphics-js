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
          [this.vertices, this.indices, this.local_buffers] = [[], [], []];    // Just call it buffers instead?
        //  this.attribute_counter = 0;


  // TODO:  There should be seperate dirty flags per each GPU instance.     // ** just move .dirty to the renderer map's instance.

          this.dirty = true;
          this.ready = true; // Since models loaded from files can be not ready
          this.gpu_instances = new Map ();      // Track which GPU contexts this object has copied itself onto.  // ** delete
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
        // TODO:  How will the user know about this assumption?
        // TODO:  Test single float attribute type, and perhaps the smaller matrix sizes.
        let attribute_sizes = selection_of_attributes.map( a => this.vertices[0][a].length || 1 );
        const attribute_is_matrix = selection_of_attributes.map( a => this.vertices[0][a] instanceof Matrix );
        let squared_sizes = attribute_sizes.map( (a,i) => Math.pow(a, 1 + attribute_is_matrix[i]) );

        // When a new buffer is requested by using a group of attributes not seen before, make a buffer.
        if( !buffer_to_overwrite ) {
          // TODO:  This part assumes a vertex type of FLOAT.  May need to override.
          const stride = squared_sizes.reduce( (acc,x) => acc + x * 4, 0 );

          const offsets = [];
          let offset = 0;
          for( let index = 0; index < selection_of_attributes.length; index++ ) {
              offsets[index] = offset;
              offset += 4*squared_sizes[index];
          }
          buffer_to_overwrite = this.local_buffers.push(
            {attributes:  [ ...selection_of_attributes ],
              sizes: attribute_sizes, attribute_is_matrix, offsets, stride, divisor, hint: buffer_hint,
              vertices_length: this.vertices.length, override: false,
              data: new Float32Array (stride/4 * this.vertices.length) }) - 1;
        }
        // If a buffer already exists but we need a bigger one to hold all our data
        else if (this.local_buffers[buffer_to_overwrite].vertices_length < this.vertices.length) {
          const stride = squared_sizes.reduce( (acc,x) => acc + x * 4, 0 );
          this.local_buffers[buffer_to_overwrite].vertices_length = this.vertices.length;
          this.local_buffers[buffer_to_overwrite].override = true;
          this.local_buffers[buffer_to_overwrite].data = new Float32Array (stride/4 * this.vertices.length);
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
              if(v[attr].length != 4)
                throw "TODO: Is this ever reached?";

              for (let i=0; i < v[attr].length; i++) {
                for (let j=0; j < v[attr].length; j++) {
                  // GLSL wants column major matrices.
                  if( buffer.data[pos] != v[attr][j][i] )
                    buffer.dirty = true;
                  buffer.data[pos] = v[attr][j][i];
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

        // ** becomes renderer::update_VAO()
      copy_onto_graphics_card (context, attribute_addresses, write_to_indices = true) {
          if( !this.local_buffers.length)
            return;
          const gl = context;

          // When this Shape sees a new GPU context (in case of multiple drawing areas), copy the Shape to the GPU. If
          // it already was copied over, get a pointer to the existing instance.
          const existing_instance = this.gpu_instances.get (context);               // ** get ( shape )
          let gpu_instance = existing_instance;

          // If this Shape was never used on this GPU context before, then prepare new buffer indices for this context.
          if(!existing_instance) {
            test_rookie_mistake ();
            const defaults = { VAO: gl.createVertexArray () };
            gpu_instance = this.gpu_instances.set (context, defaults).get (context);
          }
          gl.bindVertexArray( gpu_instance.VAO );

          for( let index of this.local_buffers.keys() ) {   // ** Rename to local_buffer_infos?

            let buffer_info = this.local_buffers[index];
            // Only update the subset of buffers that have changed, from the selection provided.
            if( !buffer_info.dirty)
              continue;
            buffer_info.dirty = false;

            let existing_pointer = buffer_info.gpu_pointer;
            buffer_info.gpu_pointer = buffer_info.gpu_pointer ?? gl.createBuffer     // ** Consult renderer map instead
            gl.bindBuffer (gl.ARRAY_BUFFER, buffer_info.gpu_pointer);

            if (existing_pointer !== undefined && !buffer_info.override)
              gl.bufferSubData (gl.ARRAY_BUFFER, 0, buffer_info.data)
            else {
              gl.bufferData (gl.ARRAY_BUFFER, buffer_info.data, gl[buffer_info.hint]);

              // TODO:  Generally check the resize process for cleanliness
              buffer_info.override = false;              //  FINISH: rename override to has_resized??
            }

            for( let i of buffer_info.attributes.keys()) {

              const name = buffer_info.attributes[i];
              if( !attribute_addresses[name] )
                continue;
              const attr_index = attribute_addresses[name].index;
              if( !(attr_index >= 0 )) throw "Attribute addresses not retrieved yet";   // TODO:  Temporary

              // TODO:  Untested with types other than GL_FLOAT.
              // attribute_addresses[name].type returns the container's type instead (like FLOAT_MAT4/FLOAT_VEC3); not it.

              if( buffer_info.attribute_is_matrix[i] )
                for( let row = 0; row < buffer_info.sizes[i]; row++ ) {
                  gl.vertexAttribPointer(attr_index+row, buffer_info.sizes[i], gl.FLOAT, false, buffer_info.stride, buffer_info.offsets[i] + row * buffer_info.sizes[i] * 4);
                  gl.vertexAttribDivisor(attr_index+row, buffer_info.divisor);
                  gl.enableVertexAttribArray (attr_index+row);
                }

              else {
                if( attribute_addresses[name].size != buffer_info.sizes[i])
                  throw "Wrong primitive size provided in the VBO vs the shader attribute.";

                // TODO: Support normalization of attributes; allow the user to specify.
                // This assumes some stuff about the shader: Vertex fields are interleaved; vertex fields are
                // in the same order that they'll appear in the shader (using offset keyword).
                gl.vertexAttribPointer(attr_index, buffer_info.sizes[i], gl.FLOAT, false, buffer_info.stride, buffer_info.offsets[i]);
                gl.vertexAttribDivisor(attr_index, buffer_info.divisor);
                gl.enableVertexAttribArray (attr_index);
              }
            }
          }
          if (this.indices.length && write_to_indices) {
              if ( !existing_instance)
                  gpu_instance.index_buffer = gl.createBuffer ();     // ** This goes in a map on renderer too
              gl.bindBuffer (gl.ELEMENT_ARRAY_BUFFER, gpu_instance.index_buffer);
              if (existing_instance)
                gl.bufferSubData (gl.ELEMENT_ARRAY_BUFFER, 0, new Uint32Array (this.indices))
              else
                gl.bufferData (gl.ELEMENT_ARRAY_BUFFER, new Uint32Array (this.indices), gl["STATIC_DRAW"]);
          }

          // TODO:  Don't need the below line?
          gl.bindVertexArray(null);
          this.dirty = false;
          return gpu_instance;
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
        Shape, Shader, or Texture with "new" anywhere that's called repeatedly (such as inside render_frame()).
        You don't want simple definitions to be re-created and re-transmitted every frame.  Your scene's constructor is
        a better option; it's only called once.  Call "new" there instead, then keep the result as a class member.  If
        you somehow have a deformable shape that must really be updated every frame, then refer to the documentation of
        copy_onto_graphics_card() -- you need a special call to it rather than calling new.`;
};






const Shader = tiny.Shader =
  class Shader {
      // See description at https://github.com/encyclopedia-of-code/tiny-graphics-js/wiki/tiny-graphics.js#shader
      copy_onto_graphics_card (context, uniforms) {
          // TODO:  Calling this twice should recompile the shader in-place with updated options (untested)

          // Define what this object should store in each new WebGL Context:
          const defaults = {
              program : undefined, gpu_addresses: undefined,     // FINISH:  Should gpu_addresses be called more specifically uniforms_addresses or does it still contain more?
              vertShdr: undefined, fragShdr: undefined
          };
          const existing_instance = this.gpu_instances.get (context);
          if ( !existing_instance) test_rookie_mistake ();

          // If this Shader was never used on this GPU context before, then prepare new buffer indices for this
          // context.
          const gpu_instance = existing_instance || this.gpu_instances.set (context, defaults).get (context);

          class Attributes_Addresses {
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

          class Uniforms_Addresses {
            // Uniforms_Addresses: Helper inner class. Retrieve the GPU addresses of each uniform variable in
            // the shader based on their names.  Store these pointers for later.
              constructor (program, gl) {
                                          // TODO: Store fewer of the following on this if possible (local scope instead).
                  this.indices_to_blockname = new Map();
                  this.indices_to_offsets = new Map();
                  this.UBOs_to_block_index = new Map();
                  this.num_blocks = gl.getProgramParameter(program, gl.ACTIVE_UNIFORM_BLOCKS);
                  for (let i = 0; i < this.num_blocks; i++ ) {
                    const UBO_name = gl.getActiveUniformBlockName(program, i);
                    if (!uniforms.UBOs[UBO_name])
                      continue;
                    const UBO_size = gl.getActiveUniformBlockParameter(program, i, gl.UNIFORM_BLOCK_DATA_SIZE);
                    const UBO_index = gl.getUniformBlockIndex(program, UBO_name);
                    this.UBOs_to_block_index.set (uniforms.UBOs[UBO_name], UBO_index)

                    if (! uniforms.UBOs[UBO_name].initialized)
                      uniforms.UBOs[UBO_name].buffer_size = UBO_size;

                    const indices = gl.getActiveUniformBlockParameter(program, i, gl.UNIFORM_BLOCK_ACTIVE_UNIFORM_INDICES);
                    const offsets = gl.getActiveUniforms(program, indices, gl.UNIFORM_OFFSET);
                    for (let i = 0; i < indices.length; i++) {
                      this.indices_to_blockname.set(indices[i], UBO_name);
                      this.indices_to_offsets.set(indices[i], offsets[i]);
                    }
                  }
                  const num_uniforms = gl.getProgramParameter (program, gl.ACTIVE_UNIFORMS);

                  for (let i = 0; i < num_uniforms; ++i) {
                      const full_name = gl.getActiveUniform (program, i).name;

                      if (this.indices_to_blockname.get(i)) {
                          // Belongs to a UBO
                        const name = this.indices_to_blockname.get(i);
                        const offset = this.indices_to_offsets.get(i);

                        // TODO: Skip loop iterations instead if initialized, according to how many offsets this UBO is known to occupy?
                        // Would save a lot of GL calls when the UBO is used in the next shader.

                        if (uniforms.UBOs[name] && ! uniforms.UBOs[name].initialized)
                          uniforms.UBOs[name].element_offsets.set (full_name, offset);
                      }
                      else // Loose uniform
                          this[ full_name ] = gl.getUniformLocation (program, full_name);
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

          const gpu_addresses = new Uniforms_Addresses (program, gl);
          const attribute_addresses = new Attributes_Addresses (program, gl);

          for (let [ubo, index] of gpu_addresses.UBOs_to_block_index.entries())
            gl.uniformBlockBinding(program, index, ubo.get_binding_point());

          Object.assign (gpu_instance, {program, vertShdr, fragShdr, gpu_addresses, attribute_addresses});
          return gpu_instance;
      }
      get_attribute_addresses(renderer) {
        return this.gpu_instances.get(renderer.context).attribute_addresses;
      }
      activate (renderer, uniforms, model_transform, material) {
          // Track which GPU contexts this object has copied itself onto:
          const context = renderer.context;
          if ( !this.gpu_instances) this.gpu_instances =  new Map ();
          const gpu_instance = this.gpu_instances.get (context) || this.copy_onto_graphics_card (context, uniforms);

          // TODO:  Cache this
          context.useProgram (gpu_instance.program);

          // --- Send over all the values needed by this particular shader to the GPU: ---
          this.update_GPU (renderer, gpu_instance.gpu_addresses, uniforms, model_transform, material);

          let offset = 0;
          for (const [name, sampler] of material.samplers.entries())
            if (sampler && sampler.ready) {

              //  TODO: The following comment describes a change that doesn't exist yet.  Should it?
              // Select texture unit offset for the fragment shader Sampler2D uniform called "samplers.name":
              context.uniform1i (gpu_instance.gpu_addresses[name], offset);
              // For this draw, use the texture image from correct the GPU buffer:
              sampler.activate (context, offset);
              offset++;
            }
      }
      // Your custom Shader has to override the following functions:
      vertex_glsl_code () {}
      fragment_glsl_code () {}
      update_GPU () {}
      static default_values () {}
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

  const Shadow_Map = tiny.Shadow_Map =
  class Shadow_Map {
      constructor (width, height, min_filter = "NEAREST", mag_filter = "NEAREST") {
          Object.assign (this, {width, height, min_filter, mag_filter, ready:true});

          if ( !this.gpu_instances) this.gpu_instances = new Map ();     // Track which GPU contexts this object has
                                                                         // copied itself onto.
      }
      copy_onto_graphics_card (context) {

          const existing_instance = this.gpu_instances.get (context);
          if ( !existing_instance) test_rookie_mistake ();

          // If this Shadow_Map was never used on this GPU context before, then prepare new buffer indices for this
          // context.
          const gpu_instance = existing_instance || this.gpu_instances.set (context, {}).get (context);

          if ( !gpu_instance.fbo_pointer) gpu_instance.fbo_pointer = context.createFramebuffer ();
          if ( !gpu_instance.texture_buffer_pointer) gpu_instance.texture_buffer_pointer = context.createTexture ();

          const gl = context;
          gl.bindTexture (gl.TEXTURE_2D, gpu_instance.texture_buffer_pointer);
          gl.bindFramebuffer(gl.FRAMEBUFFER, gpu_instance.fbo_pointer);

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
          gl.framebufferTexture2D (gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, gpu_instance.texture_buffer_pointer, 0);

          gl.drawBuffers ([gl.NONE]);
          gl.readBuffer (gl.NONE);

          gl.bindFramebuffer (gl.FRAMEBUFFER, null);
          gl.bindTexture( gl.TEXTURE_2D, null);

          return gpu_instance;
      }
      activate (gl, texture_unit = 0, treat_as_fbo = false) {
          const gpu_instance = this.gpu_instances.get (gl) || this.copy_onto_graphics_card (gl);

          if( treat_as_fbo ) {
            gl.viewport (0, 0, this.width, this.height);
            gl.bindFramebuffer (gl.FRAMEBUFFER, gpu_instance.fbo_pointer);
            gl.clear (gl.DEPTH_BUFFER_BIT);
          }
          else {
            gl.activeTexture (gl[ "TEXTURE" + texture_unit ]);
            gl.uniform1i (this.draw_sampler_address, texture_unit);
          }
          gl.bindTexture (gl.TEXTURE_2D, gpu_instance.texture_buffer_pointer);
      }
      deactivate (caller, treat_as_fbo = false) {
        if (treat_as_fbo) {
          caller.context.viewport(0, 0, caller.width, caller.height);
          caller.context.bindFramebuffer (caller.context.FRAMEBUFFER, null);
        }
        caller.context.bindTexture( caller.context.TEXTURE_2D, null);
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


      // FINISH:  Should the matrices below start out null since they are intented to alias onto Camera?
      static default_uniforms () {
          return {
              UBOs                : new Map(),
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
      render_frame (context) {}                            // Called each frame for drawing.
      render_explanation () {}
      render_controls () {}     // render_controls(): Called by Controls_Widget for generating interactive UI.
  };


const Entity = tiny.Entity =
class Entity {
  constructor(shape, transforms, material) {
    this.dirty = true
    this.shape = shape;
    this.model_transform = Mat4.identity();
    this.transforms = transforms;
    this.material = material;
  }
  set_shape(shape) {
    this.shape = shape;
    this.dirty = true;
  }
  set_transforms(transforms) {
    this.transforms = transforms;
    this.dirty = true;
  }
  apply_transform(model_transform) {
    this.model_transform = model_transform;
  }
  set_material(material) {
    this.material = material;
  }
};


/*

Shape
    "vertices", indices, pre_buffers
    ready?  dirty?
    the rest is per GPU

fill_buffer
  copy the selected vertices.fields into the correct pre_buffer, interleaved.
  mark that pre_buffer dirty and/or resized.

copy_to_gpu
  if not already, make and store *one* VAO per context.
  per each pre_buffer, associate the current VAO with a gpu_side v buffer (if none already), copying data to it (if dirty).
  associate that VAO's variable pointers to the correct alignments in the buffers, and whether to reuse per instance.
  create/copy indices gpu_side if needed.



  
flush:
  make dummy material if called from shadow, ie. given a light.shadow shader 
  for (every entity)
    if instanced,
      update matrix buffer if needed
      call draw( .., num_matrices )
    if single,
      make single-length matrix buffer
      call draw( .., 1 )

draw:
    prep shader's uniforms/textures
    write buffers out to UBOs
    obtain/prepare all this:
      { webglcontext, global_transform, shape.transforms, material, shape_gpu_side, uniforms, type=TRIANGLES, instanceCount }


idea:
      
      flush:
        make dummy material if called from shadow, ie. given a light.shadow shader 
        for (every renderListItem)
          if instanced,
            update matrix buffer if needed
            call draw( .., num_matrices )
          if single,
            make single-length matrix buffer
            call draw( .., 1 )
      
      draw:
          prep shader's uniforms/textures
          write buffers out to UBOs
          obtain/prepare all this:
            { webglcontext, global_transform, shape.transforms, material, shape_gpu_side, uniforms, type=TRIANGLES, instanceCount }

Shape:
  Still ought to own indices gpu_side buffer, since that's repetitive per renderListItem
      Shape.copy_to_gpu reduces to a few ELEMENT_ARRAY_BUFFER lines.
        but that means instance & renderer depedency stays.
            I think the improvement idea here was to move ownership of indices to renderer in a map( Shape, indices ) since a map 
            would be needed anyway if instance & renderer dependencies stay. 


Needed to manage VAO:
    the shape's pre-buffer metadata
    material.shader.gpu_instances.get(renderer.context).attribute_addresses;


*/
        
const RenderListItem = tiny.RenderListItem =
class RenderListItem {

  // optionally has a next RenderListItem (and a previous, so removal works)
      // Actually, may need a next and previous per:   Next/Prev VBO, Next/Prev Material, Next/Prev Group, Next/Prev RenderListItem

  
  // has a list of matrices
  // has an Entity?  or else { webglcontext, global_transform, shape.transforms, material, shape_gpu_side, uniforms, type=TRIANGLES, instanceCount }
  // has a VAO
      // pairing the shape's vertices VBO with THIS RenderListItem's matrices VBO
      // does Shape no longer own its VAO then?

  insert ( ) {
    // traverse the linked list, either placing the new item in sequence (ideally sorted) unless
    // an exact match exists, in which case just grow that item's matrices array.


    // Sort order:  (Same VBOs except matrices (Same MATERIAL (Same GROUP (Identical) ) ) )
  }
  remove ( ) {
    
  }
}
        
const Renderer = tiny.Renderer =
class Renderer extends Component {
  init (...args) {
    this.entities = []
    this.queued_entities = []
    this.lights = []            // TODO: Needed?
    this.buffers = new Map();
    this.bound_ubos = new Map();
    this.selected_ubos = new Map();
    super.init(...args);
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
          open_list.shift ().render_frame (this);
      }
      // Now that this frame is drawn, request that render() happen again as soon as all other web page events
      // are processed:
      this.event = window.requestAnimFrame (this.frame_advance.bind (this));
  }
  submit (object) {
    if (object instanceof Entity)
      this.queued_entities.push(object);
  }
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
        light.bind(this.context, undefined, true);
        this.flush([], false, light.shadow_map_shader);
        light.deactivate(caller);
      }
    }
  }
  flush (uniforms, clear_entities = true, alternative_shader = undefined) {

    const shadow_pass_material = alternative_shader ?
                    new Material("shadow_pass_material", alternative_shader) :
                    undefined;

    for(let entity of this.queued_entities){
      if( entity.transforms instanceof tiny.Matrix ) {
        // Single matrix case
        if (entity.dirty && entity.shape.ready) {
          entity.shape.vertices = [{instance_transform: entity.transforms}];
          //Ideally use a shader with just a uniform matrix where you pass global.times(model)?
          entity.shape.fill_buffer(["instance_transform"], undefined, 1);
          if( !alternative_shader)
            entity.dirty = false;
        }
        this.draw(entity.shape, uniforms, entity.model_transform, shadow_pass_material || entity.material, undefined, 1);
      }
      else {
        if (entity.dirty && entity.shape.ready) {
          entity.shape.vertices = Array(entity.transforms.length).fill(0).map( (x,i) => ({instance_transform: entity.transforms[i]}));
          entity.shape.fill_buffer(["instance_transform"], undefined, 1);
          if( !alternative_shader)
            entity.dirty = false;
        }
        this.draw(entity.shape, uniforms, entity.model_transform, shadow_pass_material || entity.material, undefined, entity.transforms.length);
      }
    }

    if (clear_entities)
      this.queued_entities = []
  }

  execute_shaders (gl, shape, gpu_instance, type, instanceCount) {
    if (shape.indices.length) {
        gl.bindBuffer (gl.ELEMENT_ARRAY_BUFFER, gpu_instance.index_buffer);
        gl.drawElementsInstanced (gl[ type ], shape.indices.length, gl.UNSIGNED_INT, 0, instanceCount);
    } else gl.drawArraysInstanced (gl[ type ], 0, shape.num_vertices, instanceCount);
  }
  draw (shape, uniforms, model_transform, material, type = "TRIANGLES", instanceCount) {    // FINISH why is instanceCount the only thing in camelCase

      material.shader.activate (this, uniforms, model_transform, material);

      const gl = this.context;
      let gpu_instance = shape.gpu_instances.get (gl);                // ** From renderer map instead
      if( !gpu_instance || shape.dirty)
        // ** this.update_VAO instead
        gpu_instance = shape.copy_onto_graphics_card (gl, material.shader.get_attribute_addresses(this) );  // Finish: Awkward; should attribute addresses be stored as a renderer::map instead of on each shader?
      gl.bindVertexArray( gpu_instance.VAO );
      for (let binding_point of this.selected_ubos.keys()) {
        const ubo = this.selected_ubos.get(binding_point);
        const buffer_holder = this.buffers.get(ubo);

        // Send the buffer if dirty.
        if (!buffer_holder || buffer_holder.dirty)
          ubo.send_to_GPU (this);


        // FINISH:  The value passed to has() below seems incorrect; always will be false.
        // Bind the UBO if it needs it.
        if (this.bound_ubos.has(ubo) || !this.buffers.get(ubo))
          continue;
        gl.bindBufferBase (gl.UNIFORM_BUFFER, binding_point, this.buffers.get(ubo).buffer);
        this.bound_ubos.set (binding_point, ubo);
      }

      // Run the shaders to draw every triangle now:
      this.execute_shaders (gl, shape, gpu_instance, type, instanceCount);
  }
}

// TODO:  Classes UBO and Shape seem very similar at their core (each know where to put things in a local buffer, then do bufferData).  
// Could Shape/vertices be specified by JSON as well to join with UBO?  Should UBO have its gl stuff moved to a renderer::map for consistency with Shape?

const UBO = tiny.UBO =
class UBO {
  constructor (...args) {
    this.element_offsets = new Map();
    this.ready = true;        // For async loaded entries
    this.init(...args);
  }
  init (fields) { }     // Abstract -- user overrides this
  initial_values () { return {}; }        // TODO:  Unused still
  static flatten_JSON (o,p="") {          // TODO:  Convert to a while loop with stack variable, to keep debugger from tripping on this recursive function
    return Object.keys (o).map (k => o[k] === null           ||
                                    typeof o[k] !== "object" ? {[p + (p ? ".":"") + k]: o[k]}
                                                             : UBO.flatten_JSON (o[k],p + (p ? ".":"") + k))
                          .reduce ((acc,value) => Object.assign (acc,value));
                      }
  static uniform_names_from_JSON (json) {
    const table = Object.entries( UBO.flatten_JSON(json) );
    const fix_array_notation = s => s.replaceAll (/\.(\d+)(?=\.|$)/g, (match, num) => '['+num+']' );
    return new Map( table.map (r => [fix_array_notation(r[0]), r[1] ]) );
  }
  get_binding_point () {
    throw `Abstract function.  Each subclass of UBO must specify its own binding point for its corresponding GLSL program uniform block.`; }
  fill_buffer (json) {
    if (!this.buffer_size)
      throw `UBO::fill_buffer() was called too early; UBO doesn't query its size until draw time the first time.`
    if (!this.local_buffer)
      this.local_buffer = new Float32Array(this.buffer_size/4);
    const values_to_set = UBO.uniform_names_from_JSON(json);

    const entries = [...this.element_offsets];
    for( let i = 0; i < entries.length; i++ ) {
      const [key, byte_offset] = entries[i];
      for( let [in_key, in_value] of values_to_set ) {
        // Skip inputs we've already handled.  Skip non matches.  Lastly,
        // ignore any fields the shader side did not want when this UBO was used.
        if(in_value === null || !in_key.includes(key) || byte_offset === undefined)
          continue;

        // Handle assigning vecs and mats to UBO entries:
        const suffix = in_key.substr(key.length, in_key.length);
        const sub_index_1 =  parseInt(suffix[1]) || 0,
              sub_index_2 =  suffix[4] ? parseInt(suffix[4]) : undefined;

        // GLSL doesn't support 3D arrays and beyond, and aligns Mat3s like Mat4s, so assume
        // we can just jump ahead 4 floats for every row.
        const row_column_offset = sub_index_2 === undefined ? sub_index_1
                                                            : sub_index_1 + sub_index_2 * 4;
        const offset = byte_offset/4 + row_column_offset;

        // If we get a UBO element that is too big, just silently truncate the extra stuff, rather
        // than buffer overflowing into the next element.
        if(entries[i+1] ? offset >= entries[i+1][1]/4 : offset >= this.buffer_size/4)
          continue;

        this.local_buffer[offset] = in_value;
        values_to_set.set(in_key, null);                 // FINISH: change to .delete(in_key) for clarity
      }
    }
  }
  send_to_GPU (renderer) {
    if (!this.buffer_size || !this.ready)
      return;

    // FINISH:  Implement dirty flag when a UBO is changed---so it knows to re-send.
    this.fill_buffer(this.fields);
    let instance = renderer.buffers.get(this), existing = instance;
    const gl = renderer.context;
    if(! instance) {
      test_rookie_mistake ();
      instance = renderer.buffers.set(this, {dirty:true, buffer: gl.createBuffer()}).get(this);
    }
    gl.bindBuffer(gl.UNIFORM_BUFFER, instance.buffer);
    if(! existing)
      gl.bufferData (gl.UNIFORM_BUFFER, this.buffer_size, gl.DYNAMIC_DRAW);
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, this.local_buffer);

    instance.dirty = false;
    return instance;
    // gl.bindBuffer(gl.UNIFORM_BUFFER, null);      // TODO: Unneccesary?
  }
  bind (renderer, binding_point) {
    renderer.selected_ubos.set(binding_point, this);
  }
}
