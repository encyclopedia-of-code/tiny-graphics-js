// tiny-graphics.js - A file that shows how to organize a complete graphics program.  It wraps common WebGL commands and math.
// The file tiny-graphics-widgets.js additionally wraps web page interactions.  By Garett.

                           // This file will consist of a number of class definitions that we will
                           // export.  To organize the exports, we will both declare each class in
                           // local scope (const) as well as store them in this JS object:
export const tiny = {};

import {math} from '../tiny-graphics-math.js';
Object.assign( tiny, math );

import {widgets} from '../tiny-graphics-gui.js';
Object.assign( tiny, widgets );

                                                  // Pull these names into this module's scope for convenience:
const { Vector3, vec3, color, Matrix, Mat4, Keyboard_Manager } = tiny;


const Shape = tiny.Shape =
class Shape
{                       // **Vertex_Buffer** organizes data related to one 3D shape and copies it into GPU memory.  That data
                        // is broken down per vertex in the shape.  To use, make a subclass of it that overrides the
                        // constructor and fills in the "arrays" property.  Within "arrays", you can make several fields that
                        // you can look up in a vertex; for each field, a whole array will be made here of that data type and
                        // it will be indexed per vertex.  Along with those lists is an additional array "indices" describing
                        // how vertices are connected to each other into shape primitives.  Primitives could includes
                        // triangles, expressed as triples of vertex indices.
  constructor( ...array_names )
    {                             // This superclass constructor expects a list of names of arrays that you plan for.
      [this.arrays, this.indices] = [ {}, [] ];
      this.gpu_instances = new Map();            // Track which GPU contexts this object has copied itself onto.
                                  // Initialize a blank array member of the Shape with each of the names provided:
      for( let name of array_names ) this.arrays[ name ] = [];
    }
  copy_onto_graphics_card( context, selection_of_arrays = Object.keys( this.arrays ), write_to_indices = true )
    {           // copy_onto_graphics_card():  Called automatically as needed to load this vertex array set onto
                // one of your GPU contexts for its first time.  Send the completed vertex and index lists to
                // their own buffers within any of your existing graphics card contexts.  Optional arguments
                // allow calling this again to overwrite the GPU buffers related to this shape's arrays, or
                // subsets of them as needed (if only some fields of your shape have changed).

                // Define what this object should store in each new WebGL Context:
      const defaults = { webGL_buffer_pointers: {} };
                                // Our object might need to register to multiple GPU contexts in the case of
                                // multiple drawing areas.  If this is a new GPU context for this object,
                                // copy the object to the GPU.  Otherwise, this object already has been
                                // copied over, so get a pointer to the existing instance.

      const existing_instance = this.gpu_instances.get( context );
      if( !existing_instance ) test_rookie_mistake();

          // If this Shape was never used on this GPU context before, then prepare new buffer indices for this context.
      const gpu_instance = existing_instance || this.gpu_instances.set( context, defaults ).get( context );

      const gl = context;

      const write = existing_instance ? ( target, data ) => gl.bufferSubData( target, 0, data )
                                      : ( target, data ) => gl.bufferData( target, data, gl.STATIC_DRAW );

      for( let name of selection_of_arrays )
        { if( !existing_instance )
            gpu_instance.webGL_buffer_pointers[ name ] = gl.createBuffer();
          gl.bindBuffer( gl.ARRAY_BUFFER, gpu_instance.webGL_buffer_pointers[ name ] );
          write( gl.ARRAY_BUFFER, Matrix.flatten_2D_to_1D( this.arrays[ name ] ) );
        }
      if( this.indices.length && write_to_indices )
        { if( !existing_instance )
            gpu_instance.index_buffer = gl.createBuffer();
          gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, gpu_instance.index_buffer );
          write( gl.ELEMENT_ARRAY_BUFFER, new Uint32Array( this.indices ) );
        }
      return gpu_instance;
    }
  execute_shaders( gl, gpu_instance, type )     // execute_shaders(): Draws this shape's entire vertex buffer.
    {       // Draw shapes using indices if they exist.  Otherwise, assume the vertices are arranged as triples.
      if( this.indices.length )
      { gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, gpu_instance.index_buffer );
        gl.drawElements( gl[type], this.indices.length, gl.UNSIGNED_INT, 0 )
      }
      else  gl.drawArrays( gl[type], 0, Object.values( this.arrays )[0].length );
    }
  draw( webgl_manager, shared_uniforms, model_transform, material, type = "TRIANGLES" )
    {                                       // draw():  To appear onscreen, a shape of any variety goes through this function,
                                            // which executes the shader programs.  The shaders draw the right shape due to
                                            // pre-selecting the correct buffer region in the GPU that holds that shape's data.
      const gpu_instance = this.gpu_instances.get( webgl_manager.context ) || this.copy_onto_graphics_card( webgl_manager.context );
      material.shader.activate( webgl_manager.context, gpu_instance.webGL_buffer_pointers, shared_uniforms, model_transform, material );
                                                              // Run the shaders to draw every triangle now:
      this.execute_shaders( webgl_manager.context, gpu_instance, type );
    }

    // All the below functions further assume that your vertex buffer includes fields called "position" and "normal"
    // stored at each point, instead of just any arbitrary fields.  Each vertex will have a 3D position and a
    // 3D normal vector as available fields within "arrays" (both of type Vector3).

    // Warning:  Your arrays must be full!  The below functions will FAIL if you leave so much as a single element
    // of your arrays empty.  Likewise, if your "indices" references any elements that aren't filled in, your shape
    // won't draw on the GPU.

  static insert_transformed_copy_into( recipient, args, points_transform = Mat4.identity() )
    {               // insert_transformed_copy_into():  For building compound shapes.  A copy of this shape is made
                    // and inserted into any recipient shape you pass in.  Compound shapes help reduce draw calls
                    // and speed up performance.  One shape joins the other at a custom transform offset, adjusting
                    // positions and normals appropriately.

                      // Here if you try to bypass making a temporary shape and instead directly insert new data into
                      // the recipient, you'll run into trouble when the recursion tree stops at different depths.
      const temp_shape = new this( ...args );
      recipient.indices.push( ...temp_shape.indices.map( i => i + recipient.arrays.position.length ) );
                                              // Copy each array from temp_shape into the recipient shape:
      for( let a in temp_shape.arrays )
      {                                 // Apply points_transform to all points added during this call:
        if( a == "position" || a == "tangents" )
          recipient.arrays[a].push( ...temp_shape.arrays[a].map( p => points_transform.times( p.to4(1) ).to3() ) );
                                        // Do the same for normals, but use the inverse transpose matrix as math requires:
        else if( a == "normal" )
          recipient.arrays[a].push( ...temp_shape.arrays[a].map( n =>
                                         Mat4.inverse( points_transform.transposed() ).times( n.to4(1) ).to3() ) );
                                        // All other arrays get copied in unmodified:
        else recipient.arrays[a].push( ...temp_shape.arrays[a] );
      }
    }
  make_flat_shaded_version()
    {                                     // make_flat_shaded_version(): Auto-generate a new class that re-uses any
                                          // Shape's points, but with new normals -- generated from flat shading.
                                          // A way to compute normals from scratch for shapes that have none.
      return class extends this.constructor
      { constructor( ...args )
          { super( ...args );  this.duplicate_the_shared_vertices();  this.flat_shade(); }
      }
    }
  duplicate_the_shared_vertices()
    {                   // duplicate_the_shared_vertices(): Eliminate inter-triangle sharing of vertices for any data we want to abruptly vary as we
                        // cross over a triangle edge (such as texture images).
                        // Modify an indexed shape to remove any edges where the same vertices are indexed by both
                        // the adjacent triangles.  Unless co-planar, the two would fight over assigning different normal
                        // vectors to the shared vertices.
      const arrays = {};
      for( let arr in this.arrays ) arrays[ arr ] = [];
      for( let index of this.indices )
        for( let arr in this.arrays )
          arrays[ arr ].push( this.arrays[ arr ][ index ] );      // Make re-arranged versions of each data field, with
      Object.assign( this.arrays, arrays );                       // copied values every time an index was formerly re-used.
      this.indices = this.indices.map( (x,i) => i );    // Without shared vertices, we can use sequential numbering.
    }
  flat_shade()
    {                    // (Internal helper function)
                         // Automatically assign the correct normals to each triangular element to achieve flat shading.
                         // Affect all recently added triangles (those past "offset" in the list).  Assumes that no
                         // vertices are shared across seams.   First, iterate through the index or position triples:
      for( let counter = 0; counter < (this.indices ? this.indices.length : this.arrays.position.length); counter += 3 )
      { const indices = this.indices.length ? [ this.indices[ counter ], this.indices[ counter + 1 ], this.indices[ counter + 2 ] ]
                                            : [ counter, counter + 1, counter + 2 ];
        const [ p1, p2, p3 ] = indices.map( i => this.arrays.position[ i ] );
                                        // Cross the two edge vectors of this triangle together to get its normal:
        const n1 = p1.minus(p2).cross( p3.minus(p1) ).normalized();
                                        // Flip the normal if adding it to the triangle brings it closer to the origin:
        if( n1.times(.1).plus(p1).norm() < p1.norm() ) n1.scale_by(-1);
                                        // Propagate this normal to the 3 vertices:
        for( let i of indices ) this.arrays.normal[ i ] = Vector3.from( n1 );
      }
    }
  normalize_positions( keep_aspect_ratios = true )
    { let p_arr = this.arrays.position;
      const average_position = p_arr.reduce( (acc,p) => acc.plus( p.times( 1/p_arr.length ) ), vec3( 0,0,0 ) );
      p_arr = p_arr.map( p => p.minus( average_position ) );           // Center the point cloud on the origin.
      const average_lengths  = p_arr.reduce( (acc,p) =>
                                         acc.plus( p.map( x => Math.abs(x) ).times( 1/p_arr.length ) ), vec3( 0,0,0 ) );
      if( keep_aspect_ratios )                            // Divide each axis by its average distance from the origin.
        this.arrays.position = p_arr.map( p => p.map( (x,i) => x/average_lengths[i] ) );
      else
        this.arrays.position = p_arr.map( p => p.times( 1/average_lengths.norm() ) );
    }
}


const test_rookie_mistake = function()
{
  test_rookie_mistake.counter |= 0;
  if( test_rookie_mistake.counter++ > 200  )
    throw `Error: You are sending a lot of object definitions to the GPU, probably by mistake!  Many of them are likely duplicates, which you
           don't want since sending each one is very slow.  To avoid this, avoid ever declaring a Shape, Shader, or Texture (or subclass of
           these) with "new" from within your render_animation() function, thus causing the definition to be re-created and re-transmitted every frame.
           Instead, call these from within your scene's constructor and keep the result as a class member, or otherwise make sure it only happens
           once.  In the off chance that you have a somehow deformable shape that must really be updated every frame, then at least use the special
           arguments of copy_onto_graphics_card to select which buffers get overwritten every frame to only the necessary ones.`;
}


const Shader = tiny.Shader =
class Shader
{                           // **Shader** loads a GLSL shader program onto your graphics card, starting from a JavaScript string.
                            // To use it, make subclasses of Shader that define these strings of GLSL code.  The base class will
                            // command the GPU to recieve, compile, and run these programs.  In WebGL 1, the shader runs once per
                            // every shape that is drawn onscreen.

                            // Extend the class and fill in the abstract functions, some of which define GLSL strings, and others
                            // (update_GPU) which define the extra custom JavaScript code needed to populate your particular shader
                            // program with all the data values it is expecting, such as matrices.  The shader pulls these values
                            // from two places in your JavaScript:  A Material object, for values pertaining to the current shape
                            // only, and a Shared_Uniforms object, for values pertaining to your entire Scene or program.
  copy_onto_graphics_card( context )
    {                                     // copy_onto_graphics_card():  Called automatically as needed to load the
                                          // shader program onto one of your GPU contexts for its first time.

                // Define what this object should store in each new WebGL Context:
      const defaults = {  program: undefined, gpu_addresses: undefined,
                         vertShdr: undefined,      fragShdr: undefined };

      const existing_instance = this.gpu_instances.get( context );
      if( !existing_instance ) test_rookie_mistake();

          // If this Shader was never used on this GPU context before, then prepare new buffer indices for this context.
      const gpu_instance = existing_instance || this.gpu_instances.set( context, defaults ).get( context );

      class Graphics_Addresses
      {                           // **Graphics_Addresses** is used internally in Shaders for organizing communication with the GPU.
                                  // Once we've compiled the Shader, we can query some things about the compiled program, such as
                                  // the memory addresses it will use for uniform variables, and the types and indices of its per-
                                  // vertex attributes.  We'll need those for building vertex buffers.
        constructor( program, gl )
        {
          const num_uniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
          for (let i = 0; i < num_uniforms; ++i)
            {                 // Retrieve the GPU addresses of each uniform variable in the shader
                              // based on their names, and store these pointers for later.
              let u = gl.getActiveUniform(program, i).name.split('[')[0];
              this[ u ] = gl.getUniformLocation( program, u );
            }

          this.shader_attributes = {};
                                                            // Assume per-vertex attributes will each be a set of 1 to 4 floats:
          const type_to_size_mapping = { 0x1406: 1, 0x8B50: 2, 0x8B51: 3, 0x8B52: 4 };
          const numAttribs = gl.getProgramParameter( program, gl.ACTIVE_ATTRIBUTES );
          for ( let i = 0; i < numAttribs; i++ )
          {                              // https://github.com/greggman/twgl.js/blob/master/dist/twgl-full.js for another example:
            const attribInfo = gl.getActiveAttrib( program, i );
                                                            // Pointers to all shader attribute variables:
            this.shader_attributes[ attribInfo.name ] = { index: gl.getAttribLocation( program, attribInfo.name ),
                                                          size: type_to_size_mapping[ attribInfo.type ],
                                                          enabled: true, type: gl.FLOAT,
                                                          normalized: false, stride: 0, pointer: 0 };
          }
        }
      }

      const gl = context;
      const program  = gpu_instance.program  || context.createProgram();
      const vertShdr = gpu_instance.vertShdr || gl.createShader( gl.VERTEX_SHADER );
      const fragShdr = gpu_instance.fragShdr || gl.createShader( gl.FRAGMENT_SHADER );

      if( gpu_instance.vertShdr ) gl.detachShader( program, vertShdr );
      if( gpu_instance.fragShdr ) gl.detachShader( program, fragShdr );

      gl.shaderSource( vertShdr, this.vertex_glsl_code() );
      gl.compileShader( vertShdr );
      if( !gl.getShaderParameter(vertShdr, gl.COMPILE_STATUS) )
        throw "Vertex shader compile error: "   + gl.getShaderInfoLog( vertShdr );

      gl.shaderSource( fragShdr, this.fragment_glsl_code() );
      gl.compileShader( fragShdr );
      if( !gl.getShaderParameter(fragShdr, gl.COMPILE_STATUS) )
        throw "Fragment shader compile error: " + gl.getShaderInfoLog( fragShdr );

      gl.attachShader( program, vertShdr );
      gl.attachShader( program, fragShdr );
      gl.linkProgram(  program );
      if( !gl.getProgramParameter( program, gl.LINK_STATUS) )
        throw "Shader linker error: "           + gl.getProgramInfoLog( this.program );

      Object.assign( gpu_instance, { program, vertShdr, fragShdr, gpu_addresses: new Graphics_Addresses( program, gl ) } );
      return gpu_instance;
    }
  activate( context, buffer_pointers, shared_uniforms, model_transform, material )
    {                                     // activate(): Selects this Shader in GPU memory so the next shape draws using it.
      if( !this.gpu_instances ) this.gpu_instances = new Map();     // Track which GPU contexts this object has copied itself onto.
      const gpu_instance = this.gpu_instances.get( context ) || this.copy_onto_graphics_card( context );

      context.useProgram( gpu_instance.program );

          // --- Send over all the values needed by this particular shader to the GPU: ---
      this.update_GPU( context, gpu_instance.gpu_addresses, shared_uniforms, model_transform, material );

          // --- Turn on all the correct attributes and make sure they're pointing to the correct ranges in GPU memory. ---
      for( let [ attr_name, attribute ] of Object.entries( gpu_instance.gpu_addresses.shader_attributes ) )
      { if( !attribute.enabled )
          { if( attribute.index >= 0 ) context.disableVertexAttribArray( attribute.index );
            continue;
          }
        context.enableVertexAttribArray( attribute.index );
        context.bindBuffer( context.ARRAY_BUFFER, buffer_pointers[ attr_name ] );    // Activate the correct buffer.
        context.vertexAttribPointer( attribute.index, attribute.size,   attribute.type,            // Populate each attribute
                                attribute.normalized, attribute.stride, attribute.pointer );       // from the active buffer.
      }
    }                           // Your custom Shader has to override the following functions:
  vertex_glsl_code(){}
  fragment_glsl_code(){}
  static default_uniforms()
  {
      return { camera_inverse: Mat4.identity(), camera_transform: Mat4.identity(), projection_transform: Mat4.identity(),
               animate: true, animation_time: 0, animation_delta_time: 0 };
  }
  static assign_camera( camera_inverse, uniforms_object )
    {                           // Camera matrices and their inverses should be cached together, in sync, since
                                // both are frequently needed, and to limit slow calls to inverse().
      Object.assign( uniforms_object, { camera_inverse, camera_transform: Mat4.inverse( camera_inverse ) } );
    }
  update_GPU(){}

        // *** How those four functions work (and how GPU shader programs work in general):

                             // vertex_glsl_code() and fragment_glsl_code() should each return strings that contain
                             // code for a custom vertex shader and fragment shader, respectively.

                             // The "Vertex Shader" is code that is sent to the graphics card at runtime, where on each
                             // run it gets compiled and linked there.  Thereafter, all of your calls to draw shapes will
                             // launch the vertex shader program, which runs every line of its code upon every vertex
                             // stored in your buffer simultaneously (each instruction executes on every array index at
                             // once).  Any GLSL "attribute" variables will appear to refer to some data field of just
                             // one vertex, but really they affect all the stored vertices at once in parallel.

                             // The purpose of this vertex shader program is to calculate the final resting place of
                             // vertices in screen coordinates.  Each vertex starts out in local object coordinates
                             // and then undergoes a matrix transform to land somewhere onscreen, or else misses the
                             // drawing area and is clipped (cancelled).  One this has program has executed on your whole
                             // set of vertices, groups of them (three if using triangles) are connected together into
                             // primitives, and the set of pixels your primitive overlaps onscreen is determined.  This
                             // launches an instance of the "Fragment Shader", starting the next phase of GPU drawing.

                             // The "Fragment Shader" is more code that gets sent to the graphics card at runtime.  The
                             // fragment shader runs after the vertex shader on a set of pixels (again, executing in
                             // parallel on all pixels at once that were overlapped by a primitive).  This of course can
                             // only happen once the final onscreen position of a primitive is known, which the vertex
                             // shader found.

                             // The fragment shader fills in (shades) every pixel (fragment) overlapping where the triangle
                             // landed.  It retrieves different values (such as vectors) that are stored at three extreme
                             // points of the triangle, and then interpolates the values weighted by the pixel's proximity
                             // to each extreme point, using them in formulas to determine color.  GLSL variables of type
                             // "varying" appear to have come from a single vertex, but are actually coming from all three,
                             // and are computed for every pixel in parallel by interpolated between the different values of
                             // the variable stored at the three vertices in this fashion.

                             // The fragment colors may or may not become final pixel colors; there could already be other
                             // triangles' fragments occupying the same pixels.  The Z-Buffer test is applied to see if the
                             // new triangle is closer to the camera, and even if so, blending settings may interpolate some
                             // of the old color into the result.  Finally, an image is displayed onscreen.

                             // You must define an update_GPU() function that includes the extra custom JavaScript code
                             // needed to populate your particular shader program with all the data values it is expecting.
}


const Texture = tiny.Texture =
class Texture
{                                             // **Texture** wraps a pointer to a new texture image where
                                              // it is stored in GPU memory, along with a new HTML image object.
                                              // This class initially copies the image to the GPU buffers,
                                              // optionally generating mip maps of it and storing them there too.
  constructor( filename, min_filter = "LINEAR_MIPMAP_LINEAR" )
    {
      Object.assign( this, { filename, min_filter } );

      if( !this.gpu_instances ) this.gpu_instances = new Map();     // Track which GPU contexts this object has copied itself onto.

                                                // Create a new HTML Image object:
      this.image          = new Image();
      this.image.onload   = () => this.ready = true;
      this.image.crossOrigin = "Anonymous";           // Avoid a browser warning.
      this.image.src = filename;
    }
  copy_onto_graphics_card( context, need_initial_settings = true )
    {                                     // copy_onto_graphics_card():  Called automatically as needed to load the
                                          // texture image onto one of your GPU contexts for its first time.

                // Define what this object should store in each new WebGL Context:
      const defaults = { texture_buffer_pointer: undefined };

      const existing_instance = this.gpu_instances.get( context );
      if( !existing_instance ) test_rookie_mistake();

          // If this Texture was never used on this GPU context before, then prepare new buffer indices for this context.
      const gpu_instance = existing_instance || this.gpu_instances.set( context, defaults ).get( context );

      if( !gpu_instance.texture_buffer_pointer ) gpu_instance.texture_buffer_pointer = context.createTexture();

      const gl = context;
      gl.bindTexture  ( gl.TEXTURE_2D, gpu_instance.texture_buffer_pointer );

      if( need_initial_settings )
      { gl.pixelStorei  ( gl.UNPACK_FLIP_Y_WEBGL, true );
        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );         // Always use bi-linear sampling when zoomed out.
        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl[ this.min_filter ]  );  // Let the user to set the sampling method
      }                                                                                    // when zoomed in.

      gl.texImage2D   ( gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.image );
      if( this.min_filter = "LINEAR_MIPMAP_LINEAR" )      // If the user picked tri-linear sampling (the default) then generate
        gl.generateMipmap(gl.TEXTURE_2D);                 // the necessary "mips" of the texture and store them on the GPU with it.
      return gpu_instance;
    }
  activate( context, texture_unit = 0 )
    {                                     // activate(): Selects this Texture in GPU memory so the next shape draws using it.
                                          // Optionally select a texture unit in case you're using a shader with many samplers.
                                          // Terminate draw requests until the image file is actually loaded over the network:
      if( !this.ready )
        return;
      const gpu_instance = this.gpu_instances.get( context ) || this.copy_onto_graphics_card( context );
      context.activeTexture( context[ "TEXTURE" + texture_unit ] );
      context.bindTexture( context.TEXTURE_2D, gpu_instance.texture_buffer_pointer );
    }
}


const Webgl_Manager = tiny.Webgl_Manager =
class Webgl_Manager
{                        // **Webgl_Manager** manages a whole graphics program for one on-page canvas, including its
                         // textures, shapes, shaders, and scenes.  It requests a WebGL context and stores Scenes.
  constructor( canvas, background_color = color( 0,0,0,1 ), dimensions )
    { const members = { prev_time: 0, scratchpad: {}, canvas };
                      // Non-standard solution for WebGL 1.  Build a group of variables meant
                      // to become shader uniforms.  These objects should be shared across
                      // scenes in a canvas, or even across canvases, to sync the contents.
      members.shared_uniforms = Shader.default_uniforms();
      Object.assign( this, members );
                                                 // Get the GPU ready, creating a new WebGL context for this canvas:
      for( let name of [ "webgl", "experimental-webgl", "webkit-3d", "moz-webgl" ] )
        if(  this.context = this.canvas.getContext( name ) ) break;
      if( !this.context ) throw "Canvas failed to make a WebGL context.";
      const gl = this.context;

      this.set_size( dimensions );

      gl.clearColor.apply( gl, background_color );           // Tell the GPU which color to clear the canvas with each frame.
      gl.getExtension( "OES_element_index_uint" );           // Load an extension to allow shapes with more than 65535 vertices.
      gl.enable( gl.DEPTH_TEST );                            // Enable Z-Buffering test.
                        // Specify an interpolation method for blending "transparent" triangles over the existing pixels:
      gl.enable( gl.BLEND );
      gl.blendFunc( gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA );
                                              // Store a single red pixel, as a placeholder image to prevent a console warning:
      gl.bindTexture(gl.TEXTURE_2D, gl.createTexture() );
      gl.texImage2D (gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 0, 0, 255]));

              // Find the correct browser's version of requestAnimationFrame() needed for queue-ing up re-display events:
      window.requestAnimFrame = ( w =>
           w.requestAnimationFrame    || w.webkitRequestAnimationFrame
        || w.mozRequestAnimationFrame || w.oRequestAnimationFrame || w.msRequestAnimationFrame
        || function( callback, element ) { w.setTimeout(callback, 1000/60);  } )( window );
    }
  set_size( dimensions = [ 1080, 600 ] )
    {                                   // set_size():  Allows you to re-size the canvas anytime.  To work, it must change the
                                        // size in CSS, wait for style to re-flow, and then change the size again within canvas
                                        // attributes.  Both are needed because the attributes on a canvas ave a special effect
                                        // on buffers, separate from their style.
      const [ width, height ] = dimensions;
      this.canvas.style[ "width" ]  =  width + "px";
      this.canvas.style[ "height" ] = height + "px";
      Object.assign( this,        { width, height } );
      Object.assign( this.canvas, { width, height } );
                            // Build the canvas's matrix for converting -1 to 1 ranged coords (NCDS) into its own pixel coords:
      this.context.viewport( 0, 0, width, height );
    }
  render( time=0 )
    {               // render(): Draw a single frame of animation, using all loaded Scene objects.  Measure
                    // how much real time has transpired in order to animate shapes' movements accordingly.
      this.shared_uniforms.animation_delta_time = time - this.prev_time;
      if( this.shared_uniforms.animate ) this.shared_uniforms.animation_time += this.shared_uniforms.animation_delta_time;
      this.prev_time = time;

      const gl = this.context;
      gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);        // Clear the canvas's pixels and z-buffer.

      const open_list = [ this.component ];
      while( open_list.length )                           // Traverse all Scenes and their children, recursively.
      { open_list.push( ...open_list[0].animated_children );
                                                                // Call display() to draw each registered animation:
        open_list.shift().render_animation( this, this.shared_uniforms );
      }
                                              // Now that this frame is drawn, request that render() happen
                                              // again as soon as all other web page events are processed:
      this.event = window.requestAnimFrame( this.render.bind( this ) );
    }
}


const Component = tiny.Component =
class Component
{                           // **Scene** is the base class for any scene part or code snippet that you can add to a
                            // canvas.  Make your own subclass(es) of this and override their methods "display()"
                            // and "make_control_panel()" to make them draw to a canvas, or generate custom control
                            // buttons and readouts, respectively.  Scenes exist in a hierarchy; their child Scenes
                            // can either contribute more drawn shapes or provide some additional tool to the end
                            // user via drawing additional control panel buttons or live text readouts.
  constructor()
    {
      const rules = [
        `.documentation_treenode { }`,
        `.documentation { width:1060px; padding:0 10px; overflow:auto; background:white;
                                    box-shadow:10px 10px 90px 0 inset LightGray }`
        ];
      Component.initialize_CSS( Component, rules );

      this.animated_children =  [];
      this.document_children =  [];
                                                // Set up how we'll handle key presses for the scene's control panel:
      const callback_behavior = ( callback, event ) =>
           { callback( event );
             event.preventDefault();    // Fire the callback and cancel any default browser shortcut that is an exact match.
             event.stopPropagation();   // Don't bubble the event to parent nodes; let child elements be targetted in isolation.
           }
      this.key_controls = new Keyboard_Manager( document, callback_behavior);
    }
  static types_used_before = new Set()
  static initialize_CSS( classType, rules )
    {
      if( Component.types_used_before.has( classType ) )
        return;

      if( document.styleSheets.length == 0 ) document.head.appendChild( document.createElement( "style" ) );
      for( const r of rules ) document.styleSheets[document.styleSheets.length - 1].insertRule( r, 0 )
      Component.types_used_before.add( classType )
    }
  update_shared_state( context )
    {
          // Use the provided context to tick shared_uniforms.animation_time only once per frame.
      context.shared_uniforms = this.shared_uniforms;
      return this.shared_uniforms;
    }
  new_line( parent=this.control_panel )       // new_line():  Formats a scene's control panel with a new line break.
    { parent.appendChild( document.createElement( "br" ) ) }
  live_string( callback, parent=this.control_panel )
    {                                             // live_string(): Create an element somewhere in the control panel that
                                                  // does reporting of the scene's values in real time.  The event loop
                                                  // will constantly update all HTML elements made this way.
      parent.appendChild( Object.assign( document.createElement( "div"  ), { className:"live_string", onload: callback } ) );
    }
  key_triggered_button( description, shortcut_combination, callback, color = '#'+Math.random().toString(9).slice(-6),
                        release_event, recipient = this, parent = this.control_panel )
    {                                             // key_triggered_button():  Trigger any scene behavior by assigning
                                                  // a key shortcut and a labelled HTML button to fire any callback
                                                  // function/method of a Scene.  Optional release callback as well.
      const button = parent.appendChild( document.createElement( "button" ) );
      button.default_color = button.style.backgroundColor = color;
      const  press = () => { Object.assign( button.style, { 'background-color' : 'red',
                                                            'z-index': "1", 'transform': "scale(2)" } );
                             callback.call( recipient );
                           },
           release = () => { Object.assign( button.style, { 'background-color' : button.default_color,
                                                            'z-index': "0", 'transform': "scale(1)" } );
                             if( !release_event ) return;
                             release_event.call( recipient );
                           };
      const key_name = shortcut_combination.join( '+' ).split( " " ).join( "Space" );
      button.textContent = "(" + key_name + ") " + description;
      button.addEventListener( "mousedown" , press );
      button.addEventListener( "mouseup",  release );
      button.addEventListener( "touchstart", press, { passive: true } );
      button.addEventListener( "touchend", release, { passive: true } );
      if( !shortcut_combination ) return;
      this.key_controls.add( shortcut_combination, press, release );
    }
  render_layout( div, options = {} )
    {
      this.div = div;
      div.className = "documentation_treenode";
                                                        // Fit the existing document content to a fixed size:
      div.style.margin = "auto";
      div.style.width = "1080px";

      this.document_region = div.appendChild( document.createElement( "div" ) );
      this.document_region.className = "documentation";
      this.render_documentation();
                                                        // The next div down will hold a canvas and/or related interactive areas.
      this.program_stuff = div.appendChild( document.createElement( "div" ) );

      const defaults = { show_canvas: true,  make_controls: true,
                         make_editor: false, make_code_nav: true };

      const overridden_options = Object.assign( defaults, this.widget_options, options );

            // TODO:  One use case may have required canvas to be styled as a rule instead of as an element.  Keep an eye out.
      const canvas = this.program_stuff.appendChild( document.createElement( "canvas" ) );
      canvas.style = `width:1080px; height:600px; background:DimGray; margin:auto; margin-bottom:-4px`;

      if( !overridden_options.show_canvas )
        canvas.style.display = "none";
                                        // Use tiny-graphics-js to draw graphics to the canvas, using the given scene objects.
      this.webgl_manager = new tiny.Webgl_Manager( canvas );
      this.webgl_manager.component = this;

                                       // Start WebGL main loop - render() will re-queue itself for continuous calls.
      this.webgl_manager.event = window.requestAnimFrame( this.webgl_manager.render.bind( this.webgl_manager ) );

      if( overridden_options.make_controls )
      { this.embedded_controls_area = this.program_stuff.appendChild( document.createElement( "div" ) );
        this.embedded_controls_area.className = "controls-widget";
        this.embedded_controls = new tiny.Controls_Widget( this );
      }
      if( overridden_options.make_code_nav )
      { this.embedded_code_nav_area = this.program_stuff.appendChild( document.createElement( "div" ) );
        this.embedded_code_nav_area.className = "code-widget";
        this.embedded_code_nav = new tiny.Code_Widget( this );
      }
      if( overridden_options.make_editor )
      { this.embedded_editor_area = this.program_stuff.appendChild( document.createElement( "div" ) );
        this.embedded_editor_area.className = "editor-widget";
        this.embedded_editor = new tiny.Editor_Widget( this );
      }
    }
                                                // To use class Scene, override at least one of the below functions,
                                                // which will be automatically called by other classes:
  render_animation( context, shared_uniforms )
    {}                            // display(): Called by Webgl_Manager for drawing.
  render_documentation()
    {}                            // show_document(): Called by Document_Builder for generating documentation.
  make_control_panel()
    {}                            // make_control_panel(): Called by Controls_Widget for generating interactive UI.
}