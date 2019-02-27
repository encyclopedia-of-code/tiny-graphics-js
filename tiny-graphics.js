// tiny-graphics.js - A file that shows how to organize a complete graphics program.
// It wraps common WebGL commands, math, and web page interactions.  (by Garett)

window.Vec = window.tiny_graphics.Vec =
class Vec extends Float32Array        // Vectors of floating point numbers.  This puts vector math into JavaScript.
                                      // See these examples for usage of each function:
  //     equals: "Vec.of( 1,0,0 ).equals( Vec.of( 1,0,0 ) )" returns true.
  //       plus: "Vec.of( 1,0,0 ).plus  ( Vec.of( 1,0,0 ) )" returns the Vec [ 2,0,0 ].
  //      minus: "Vec.of( 1,0,0 ).minus ( Vec.of( 1,0,0 ) )" returns the Vec [ 0,0,0 ].
  // mult-pairs: "Vec.of( 1,2,3 ).mult_pairs( Vec.of( 3,2,0 ) )" returns the Vec [ 3,4,0 ].
  //      scale: "Vec.of( 1,2,3 ).scale( 2 )" overwrites the Vec with [ 2,4,6 ].
  //      times: "Vec.of( 1,2,3 ).times( 2 )" returns the Vec [ 2,4,6 ].
  // randomized: Returns this Vec plus a random vector of a given maximum length.
  //        mix: "Vec.of( 0,2,4 ).mix( Vec.of( 10,10,10 ), .5 )" returns the Vec [ 5,6,7 ].
  //       norm: "Vec.of( 1,2,3 ).norm()" returns the square root of 15.
  // normalized: "Vec.of( 4,4,4 ).normalized()" returns the Vec [ sqrt(3), sqrt(3), sqrt(3) ]
  //  normalize: "Vec.of( 4,4,4 ).normalize()" overwrites the Vec with [ sqrt(3), sqrt(3), sqrt(3) ].
  //        dot: "Vec.of( 1,2,3 ).dot( Vec.of( 1,2,3 ) )" returns 15.
  //       cast: "Vec.cast( [-1,-1,0], [1,-1,0], [-1,1,0] )" converts a list of Array literals into a list of Vecs.
  //        to3: "Vec.of( 1,2,3,4 ).to3()" returns the Vec [ 1,2,3 ].  Use only on 4x1 Vecs to truncate them.
  //        to4: "Vec.of( 1,2,3 ).to4( true or false )" returns the homogeneous Vec [ 1,2,3, 1 or 0 ].  Use only on 3x1.
  //      cross: "Vec.of( 1,0,0 ).cross( Vec.of( 0,1,0 ) )" returns the Vec [ 0,0,1 ].  Use only on 3x1 Vecs.
  //  to_string: "Vec.of( 1,2,3 ).to_string()" returns "[vec 1, 2, 3]"
                            //  Notes:  Vecs should only be created with of() due to wierdness with the TypedArray spec.
                            //  Also, assign them with .copy() to avoid referring two variables to the same Vec object.
{ copy        () { return Vec.from( this )                                }
  equals     (b) { return this.every( (x,i) => x == b[i]                ) }
  plus       (b) { return this.map(   (x,i) => x +  b[i]                ) }
  minus      (b) { return this.map(   (x,i) => x -  b[i]                ) }
  mult_pairs (b) { return this.map(   (x,i) => x *  b[i]                ) }
  scale      (s) { this.forEach(  (x, i, a) => a[i] *= s                ) }
  times      (s) { return this.map(       x => s*x                      ) }
  randomized (s) { return this.map(       x => x + s*(Math.random()-.5) ) }
  mix     (b, s) { return this.map(   (x,i) => (1-s)*x + s*b[i]         ) }
  norm        () { return Math.sqrt( this.dot( this )                   ) }
  normalized  () { return this.times( 1/this.norm()                     ) }
  normalize   () {        this.scale( 1/this.norm()                     ) }
  dot(b)                                     // Optimized arithmetic unrolls loops for array lengths less than 4.
  { if( this.length == 3 ) return this[0]*b[0] + this[1]*b[1] + this[2]*b[2];
    if( this.length == 4 ) return this[0]*b[0] + this[1]*b[1] + this[2]*b[2] + this[3]*b[3];
    if( this.length >  4 ) return this.reduce( ( acc, x, i ) => { return acc + x*b[i]; }, 0 );
    return this[0]*b[0] + this[1]*b[1];                           // Assume a minimum length of 2.
  }                                       
  static cast( ...args ) { return args.map( x => Vec.from(x) ); } // For avoiding repeatedly typing Vec.of in lists.
  to3()          { return Vec.of( this[0], this[1], this[2]           ); }
  to4( isPoint ) { return Vec.of( this[0], this[1], this[2], +isPoint ); }
  cross(b) { return Vec.of( this[1]*b[2] - this[2]*b[1], this[2]*b[0] - this[0]*b[2], this[0]*b[1] - this[1]*b[0] ); }
  to_string() { return "[vec " + this.join( ", " ) + "]" }
}


window.Mat = window.tiny_graphics.Mat =
class Mat extends Array                         // M by N matrices of floats.  Enables matrix and vector math.  Usage:
  //  "Mat( rows )" returns a Mat with those rows, where rows is an array of float arrays.
  //  "M.set_identity( m, n )" assigns the m by n identity matrix to Mat M.
  //  "M.sub_block( start, end )" where start and end are each a [ row, column ] pair returns a sub-rectangle cut out from M.
  //  "M.copy()" creates a deep copy of M and returns it so you can modify it without affecting the original.
  //  "M.equals(b)" as well as plus and minus work the same as for Vec but the two operands are Mats instead; b must be a Mat.
  //  "M.transposed()" returns a new matrix where all rows of M became columns and vice versa.
  //  "M.times(b)" (where the post-multiplied b can be a scalar, a Vec, or another Mat) returns a new Mat or Vec holding the product.
  //  "M.pre_multiply(b)"  overwrites the matrix M with the product of b * M where b must be another Mat.
  //  "M.post_multiply(b)" overwrites the matrix M with the product of M * b where b can be a Mat, Vec, or scalar.
  //  "Mat.flatten_2D_to_1D( M )" flattens input (a Mat or any array of Vecs or float arrays) into a row-major 1D array of raw floats.
  //  "M.to_string()" where M contains the 4x4 identity returns "[[1, 0, 0, 0] [0, 1, 0, 0] [0, 0, 1, 0] [0, 0, 0, 1]]".
{ constructor  ( ...args ) { super(0); this.push( ...args ) }
  set_identity ( m, n )    { this.length = 0; for( let i = 0; i < m; i++ ) { this.push( Array(n).fill(0) ); if( i < n ) this[i][i] = 1; } }
  sub_block( start, end )  { return Mat.from( this.slice( start[0], end[0] ).map( r => r.slice( start[1], end[1] ) ) ); }
  copy      () { return this.map(      r  => Vec.of ( ...r )                  ) }
  equals   (b) { return this.every( (r,i) => r.every( (x,j) => x == b[i][j] ) ) }
  plus     (b) { return this.map(   (r,i) => r.map  ( (x,j) => x +  b[i][j] ) ) }
  minus    (b) { return this.map(   (r,i) => r.map  ( (x,j) => x -  b[i][j] ) ) }
  transposed() { return this.map(   (r,i) => r.map  ( (x,j) =>   this[j][i] ) ) }
  times    (b)                                                                       
    { const len = b.length;
      if( typeof len  === "undefined" ) return this.map( r => r.map( x => b*x ) );   // Mat * scalar case.
      const len2 = b[0].length;    
      if( typeof len2 === "undefined" )
      { let result = new Vec( this.length );                                         // Mat * Vec case.
        for( let r=0; r < len; r++ ) result[r] = b.dot(this[r]);                      
        return result;
      }
      let result = Mat.from( new Array( this.length ) );
      for( let r = 0; r < this.length; r++ )                                         // Mat * Mat case.
      { result[ r ] = new Array( len2 );
        for( let c = 0, sum = 0; c < len2; c++ )
        { result[ r ][ c ] = 0;
          for( let r2 = 0; r2 < len; r2++ )
            result[ r ][ c ] += this[ r ][ r2 ] * b[ r2 ][ c ];
        }
      }
      return result;
    }
  pre_multiply (b) { const new_value = b.times( this ); this.length = 0; this.push( ...new_value ); return this; }
  post_multiply(b) { const new_value = this.times( b ); this.length = 0; this.push( ...new_value ); return this; }
  static flatten_2D_to_1D( M )
    { let index = 0, floats = new Float32Array( M.length && M.length * M[0].length );
      for( let i = 0; i < M.length; i++ ) for( let j = 0; j < M[i].length; j++ ) floats[ index++ ] = M[i][j];
      return floats;
    }
  to_string() { return "[" + this.map( (r,i) => "[" + r.join(", ") + "]" ).join(" ") + "]" }
}


window.Mat4 = window.tiny_graphics.Mat4 =
class Mat4 extends Mat                               // Generate special 4x4 matrices that are useful for graphics.
{ static identity()       { return Mat.of( [ 1,0,0,0 ], [ 0,1,0,0 ], [ 0,0,1,0 ], [ 0,0,0,1 ] ); };
  static rotation( angle, axis )                                                    // Requires a scalar (angle) and a 3x1 Vec (axis)
                          { let [ x, y, z ] = Vec.from( axis ).normalized(), 
                                   [ c, s ] = [ Math.cos( angle ), Math.sin( angle ) ], omc = 1.0 - c;
                            return Mat.of( [ x*x*omc + c,   x*y*omc - z*s, x*z*omc + y*s, 0 ],
                                           [ x*y*omc + z*s, y*y*omc + c,   y*z*omc - x*s, 0 ],
                                           [ x*z*omc - y*s, y*z*omc + x*s, z*z*omc + c,   0 ],
                                           [ 0,             0,             0,             1 ] );
                          }
  static scale( s )       { return Mat.of( [ s[0], 0,    0,    0 ],                 // Requires a 3x1 Vec.
                                           [ 0,    s[1], 0,    0 ],
                                           [ 0,    0,    s[2], 0 ],
                                           [ 0,    0,    0,    1 ] );
                          }
  static translation( t ) { return Mat.of( [ 1, 0, 0, t[0] ],                       // Requires a 3x1 Vec.
                                           [ 0, 1, 0, t[1] ],
                                           [ 0, 0, 1, t[2] ],
                                           [ 0, 0, 0,   1  ] );
                          }                      
  // Note:  look_at() assumes the result will be used for a camera and stores its result in inverse space.  You can also use
  // it to point the basis of any *object* towards anything but you must re-invert it first.  Each input must be 3x1 Vec.                         
  static look_at( eye, at, up ) { let z = at.minus( eye ).normalized(),
                                      x =  z.cross( up  ).normalized(),        // Compute vectors along the requested coordinate axes.
                                      y =  x.cross( z   ).normalized();        // This is the "updated" and orthogonalized local y axis.
                            if( !x.every( i => i==i ) )                  // Check for NaN, indicating a degenerate cross product, which
                              throw "Two parallel vectors were given";   // happens if eye == at, or if at minus eye is parallel to up.
                            z.scale( -1 );                               // Enforce right-handed coordinate system.                                   
                            return Mat4.translation([ -x.dot( eye ), -y.dot( eye ), -z.dot( eye ) ])
                                   .times( Mat.of( x.to4(0), y.to4(0), z.to4(0), Vec.of( 0,0,0,1 ) ) );
                          }
  static orthographic( left, right, bottom, top, near, far )                        // Box-shaped view volume for projection.
                          { return    Mat4.scale( Vec.of( 1/(right - left), 1/(top - bottom), 1/(far - near) ) )
                              .times( Mat4.translation( Vec.of( -left - right, -top - bottom, -near - far ) ) )
                              .times( Mat4.scale( Vec.of( 2, 2, -2 ) ) );
                          }
  static perspective( fov_y, aspect, near, far )                                    // Frustum-shaped view volume for projection.
                          { const f = 1/Math.tan( fov_y/2 ), d = far - near;
                            return Mat.of( [ f/aspect, 0,               0,               0 ],
                                           [ 0,        f,               0,               0 ],
                                           [ 0,        0, -(near+far) / d, -2*near*far / d ],
                                           [ 0,        0,              -1,               0 ] );
                          }
  static inverse( m )              // Computing a 4x4 inverse is slow because of the amount of steps; call fewer times when possible.
    { const result = Mat4.identity(), m00 = m[0][0], m01 = m[0][1], m02 = m[0][2], m03 = m[0][3],
                                      m10 = m[1][0], m11 = m[1][1], m12 = m[1][2], m13 = m[1][3],
                                      m20 = m[2][0], m21 = m[2][1], m22 = m[2][2], m23 = m[2][3],
                                      m30 = m[3][0], m31 = m[3][1], m32 = m[3][2], m33 = m[3][3];
      result[ 0 ][ 0 ] = m12 * m23 * m31 - m13 * m22 * m31 + m13 * m21 * m32 - m11 * m23 * m32 - m12 * m21 * m33 + m11 * m22 * m33;
      result[ 0 ][ 1 ] = m03 * m22 * m31 - m02 * m23 * m31 - m03 * m21 * m32 + m01 * m23 * m32 + m02 * m21 * m33 - m01 * m22 * m33;
      result[ 0 ][ 2 ] = m02 * m13 * m31 - m03 * m12 * m31 + m03 * m11 * m32 - m01 * m13 * m32 - m02 * m11 * m33 + m01 * m12 * m33;
      result[ 0 ][ 3 ] = m03 * m12 * m21 - m02 * m13 * m21 - m03 * m11 * m22 + m01 * m13 * m22 + m02 * m11 * m23 - m01 * m12 * m23;
      result[ 1 ][ 0 ] = m13 * m22 * m30 - m12 * m23 * m30 - m13 * m20 * m32 + m10 * m23 * m32 + m12 * m20 * m33 - m10 * m22 * m33;
      result[ 1 ][ 1 ] = m02 * m23 * m30 - m03 * m22 * m30 + m03 * m20 * m32 - m00 * m23 * m32 - m02 * m20 * m33 + m00 * m22 * m33;
      result[ 1 ][ 2 ] = m03 * m12 * m30 - m02 * m13 * m30 - m03 * m10 * m32 + m00 * m13 * m32 + m02 * m10 * m33 - m00 * m12 * m33;
      result[ 1 ][ 3 ] = m02 * m13 * m20 - m03 * m12 * m20 + m03 * m10 * m22 - m00 * m13 * m22 - m02 * m10 * m23 + m00 * m12 * m23;
      result[ 2 ][ 0 ] = m11 * m23 * m30 - m13 * m21 * m30 + m13 * m20 * m31 - m10 * m23 * m31 - m11 * m20 * m33 + m10 * m21 * m33;
      result[ 2 ][ 1 ] = m03 * m21 * m30 - m01 * m23 * m30 - m03 * m20 * m31 + m00 * m23 * m31 + m01 * m20 * m33 - m00 * m21 * m33;
      result[ 2 ][ 2 ] = m01 * m13 * m30 - m03 * m11 * m30 + m03 * m10 * m31 - m00 * m13 * m31 - m01 * m10 * m33 + m00 * m11 * m33;
      result[ 2 ][ 3 ] = m03 * m11 * m20 - m01 * m13 * m20 - m03 * m10 * m21 + m00 * m13 * m21 + m01 * m10 * m23 - m00 * m11 * m23;
      result[ 3 ][ 0 ] = m12 * m21 * m30 - m11 * m22 * m30 - m12 * m20 * m31 + m10 * m22 * m31 + m11 * m20 * m32 - m10 * m21 * m32;
      result[ 3 ][ 1 ] = m01 * m22 * m30 - m02 * m21 * m30 + m02 * m20 * m31 - m00 * m22 * m31 - m01 * m20 * m32 + m00 * m21 * m32;
      result[ 3 ][ 2 ] = m02 * m11 * m30 - m01 * m12 * m30 - m02 * m10 * m31 + m00 * m12 * m31 + m01 * m10 * m32 - m00 * m11 * m32;
      result[ 3 ][ 3 ] = m01 * m12 * m20 - m02 * m11 * m20 + m02 * m10 * m21 - m00 * m12 * m21 - m01 * m10 * m22 + m00 * m11 * m22;
                                                                                               // Divide by determinant and return.
      return result.times( 1/( m00*result[0][0] + m10*result[0][1] + m20*result[0][2] + m30*result[0][3] ) );
    }
}


window.Keyboard_Manager = window.tiny_graphics.Keyboard_Manager =
class Keyboard_Manager     // This class maintains a running list of which keys are depressed.  You can map combinations of shortcut
  {                        // keys to trigger callbacks you provide by calling add().  See add()'s arguments.  The shortcut list is 
                           // indexed by convenient strings showing each bound shortcut combination.  The constructor optionally
                           // takes "target", which is the desired DOM element for keys to be pressed inside of, and
                           // "callback_behavior", which will be called for every key action and allows extra behavior on each event
                           // -- giving an opportunity to customize their bubbling, preventDefault, and more.  It defaults to no
                           // additional behavior besides the callback itself on each assigned key action.
    constructor( target = document, callback_behavior = ( callback, event ) => callback( event ) )
      { this.saved_controls = {};     
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
      // Method add() adds a keyboard operation.  The argument shortcut_combination wants an array of strings that follow 
      // standard KeyboardEvent key names. Both the keyup and keydown callbacks for any key combo are optional.
    add( shortcut_combination, callback = () => {}, keyup_callback = () => {} )
      { this.saved_controls[ shortcut_combination.join('+') ] = { shortcut_combination, callback, keyup_callback }; }
  }


window.Graphics_Card_Object = window.tiny_graphics.Graphics_Card_Object =
class Graphics_Card_Object              // Extending this class allows an object to, whenever used, copy
{                                       // itself onto a GPU context whenever it has not already been.
  constructor() { this.gpu_instances = new Map() }     // Track which GPU contexts this object has copied itself onto.
  copy_onto_graphics_card( context, ...args )
    { // To use this function, super call it, then populate the "gpu instance" object 
      // it returns with whatever GPU pointers you need (via performing WebGL calls).
    
      const existing_instance = this.gpu_instances.get( context );
      if( !existing_instance )
        this.check_idiot_alarm( ...args );    // Don't let beginners call the expensive copy_onto_graphics_card function too many times; 
                                              // beginner WebGL programs typically only need to call it a few times.
                                              // Don't trigger the idiot alarm if the user is correctly re-using
                                              // an existing GPU context and merely overwriting parts of itself.
     
                                              // Check if this object already exists on that GPU context.
      return existing_instance ||             // If necessary, start a new object associated with the context.
             this.gpu_instances.set( context, this.make_gpu_representation() ).get( context );
    }
  check_idiot_alarm( args )                      // Warn the user if they are avoidably making too many GPU objects.
    { Graphics_Card_Object.idiot_alarm |= 0;     // Start a program-wide counter.
      if( Graphics_Card_Object.idiot_alarm++ > 200 )
        throw `Error: You are sending a lot of object definitions to the GPU, probably by mistake!  Many of them are likely duplicates, which you
               don't want since sending each one is very slow.  To avoid this, from your display() function avoid ever declaring a Shape Shader
               or Texture (or subclass of these) with "new", thus causing the definition to be re-created and re-transmitted every frame.  
               Instead, call these in your scene's constructor and keep the result as a class member, or otherwise make sure it only happens 
               once.  In the off chance that you have a somehow deformable shape that MUST change every frame, then at least use the special
               arguments of copy_onto_graphics_card to limit which buffers get overwritten every frame to only the necessary ones.`;
    }
  activate( context, ...args )   // To use this, super call it to retrieve a container of GPU pointers associated with this object.  If 
                                 // none existed one will be created.  Then do any WebGL calls you need that require GPU pointers.
    { return this.gpu_instances.get( context ) || this.copy_onto_graphics_card( context, ...args ) }
  make_gpu_representation() {}             // Override this in your subclass, defining a blank container of GPU references for itself.
}


window.Vertex_Buffer = window.tiny_graphics.Vertex_Buffer =
class Vertex_Buffer extends Graphics_Card_Object            // To use Vertex_Buffer, make a subclass of it that overrides the constructor and fills in the right fields.  
{                             // Vertex_Buffer organizes data related to one 3D shape and copies it into GPU memory.  That data is broken
                              // down per vertex in the shape.  You can make several fields that you can look up in a vertex; for each
                              // field, a whole array will be made here of that data type and it will be indexed per vertex.  Along with
                              // those lists is an additional array "indices" describing triangles, expressed as triples of vertex indices,
                              // connecting the vertices to one another.
  constructor( ...array_names )                          // This superclass constructor expects a list of names of arrays that you plan for
    { super();
      [ this.arrays, this.indices ] = [ {}, [] ];
      for( let name of array_names ) this.arrays[ name ] = []; // Initialize a blank array member of the Shape with each of the names provided.      
    }
  copy_onto_graphics_card( context, selection_of_arrays = Object.keys( this.arrays ), write_to_indices = true )
    {     // Send the completed vertex and index lists to their own buffers in the graphics card.
          // Optional arguments allow calling this again to overwrite some or all GPU buffers as needed.
      const gpu_instance = super.copy_onto_graphics_card( context, selection_of_arrays, write_to_indices );

      const gl = context;
      for( let name of selection_of_arrays )
        { const buffer = gpu_instance.webGL_buffer_pointers[ name ] = gl.createBuffer();
          gl.bindBuffer( gl.ARRAY_BUFFER, buffer );
          gl.bufferData( gl.ARRAY_BUFFER, Mat.flatten_2D_to_1D( this.arrays[ name ] ), gl.STATIC_DRAW );
        }
      if( this.indices.length && write_to_indices )
      { gl.getExtension( "OES_element_index_uint" );          // Load an extension to allow shapes with more 
        this.index_buffer = gl.createBuffer();                // vertices than type "short" can hold.
        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, this.index_buffer );
        gl.bufferData( gl.ELEMENT_ARRAY_BUFFER, new Uint32Array( this.indices ), gl.STATIC_DRAW );
      }
      return gpu_instance;
    }
  make_gpu_representation() { return { webGL_buffer_pointers: {} } }
  execute_shaders( gl, type )     // Draws this shape's entire vertex buffer.
    { if( this.indices.length )
      { gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, this.index_buffer );                          
        gl.drawElements( gl[type], this.indices.length, gl.UNSIGNED_INT, 0 ) 
      }                                                                                 // If no indices were provided, assume the 
      else  gl.drawArrays( gl[type], 0, Object.values( this.arrays )[0].length );       // vertices are arranged as triples.
    }
  draw( context, graphics_state, model_transform, material, type = "TRIANGLES" )
                                                          // To appear onscreen, a shape of any variety goes through the draw() function,
    {                                                     // which executes the shader programs.  The shaders draw the right shape due to
                                                          // pre-selecting the correct buffer region in the GPU that holds that shape's data.
      const gpu_instance = this.activate( context );
      material.shader.activate( context, gpu_instance.webGL_buffer_pointers, graphics_state, model_transform, material );
      this.execute_shaders( context, type );                                                // Run the shaders to draw every triangle now.
    }
}


window.Shape = window.tiny_graphics.Shape =
class Shape extends Vertex_Buffer
{           // This class is used the same way as Vertex_Buffer, by subclassing it and writing a constructor that fills in certain fields.
            // Shape extends Vertex_Buffer's functionality for copying shapes into buffers the graphics card's memory.  It also adds the
            // basic assumption that each vertex will have a 3D position and a 3D normal vector as available fields to look up.  This means
            // there will be at least two arrays for the user to fill in: "positions" enumerating all the vertices' locations, and "normals"
            // enumerating all vertices' normal vectors pointing away from the surface.  Both are of type Vec of length 3.  By including 
            // these, Shape adds to class Vertex_Buffer the ability to compound shapes in together into a single performance-friendly
            // Vertex_Buffer, placing this shape into a larger one at a custom transforms by adjusting positions and normals with a call to
            // insert_transformed_copy_into().  Compared to Vertex_Buffer we also gain the ability via flat-shading to compute normals from
            // scratch for a shape that has none, and the ability to eliminate inter-triangle sharing of vertices for any data we want to
            // abruptly vary as we cross over a triangle edge (such as texture images).

            // Like in class Vertex_Buffer we have an array "indices" to fill in as well, a list of index triples defining which three 
            // vertices belong to each triangle.  Call new on a Shape and fill its arrays (probably in an overridden constructor).  Then,
            // submit it to Scene_Component's submit_shapes() and the GPU buffers will receive all the per-vertex data and the triangles
            // list needed to draw the shape correctly.

            // IMPORTANT: To use this class you must define all fields for every single vertex by filling in the arrays of each field, so 
            // this includes positions, normals, any more fields a specific Shape subclass decides to include per vertex, such as texture 
            // coordinates.  Be warned that leaving any empty elements in the lists will result in an out of bounds GPU warning (and nothing
            // drawn) whenever the "indices" list contains references to that position in the lists.
  static insert_transformed_copy_into( recipient, args, points_transform = Mat4.identity() )    // For building compound shapes.
    { const temp_shape = new this( ...args );  // If you try to bypass making a temporary shape and instead directly insert new data into
                                               // the recipient, you'll run into trouble when the recursion tree stops at different depths.
      recipient.indices.push( ...temp_shape.indices.map( i => i + recipient.arrays.position.length ) );
      
      for( let a in temp_shape.arrays )                // Copy each array from temp_shape into the recipient shape.
      { if( a == "position" || a == "tangents" )       // Apply points_transform to all points added during this call:
          recipient.arrays[a].push( ...temp_shape.arrays[a].map( p => points_transform.times( p.to4(1) ).to3() ) );
        else if( a == "normal" )                       // Do the same for normals, but use the inverse transpose matrix as math requires:
          recipient.arrays[a].push( ...temp_shape.arrays[a].map( n => Mat4.inverse( points_transform.transposed() ).times( n.to4(1) ).to3() ) );
        else recipient.arrays[a].push( ...temp_shape.arrays[a] );     // All other arrays get copied in unmodified.
      }
    }
  make_flat_shaded_version()                            // Auto-generate a new class that re-uses any Shape's points, 
    { return class extends this.constructor             // but with new normals generated from flat shading.
      { constructor( ...args ) { super( ...args );  this.duplicate_the_shared_vertices();  this.flat_shade(); }
        duplicate_the_shared_vertices()
          {   //  Prepare an indexed shape for flat shading if it is not ready -- that is, if there are any edges where 
              //  the same vertices are indexed by both the adjacent triangles, and those two triangles are not co-planar.
              //  The two would therefore fight over assigning different normal vectors to the shared vertices.
            const arrays = {};
            for( let arr in this.arrays ) arrays[ arr ] = [];
            for( let index of this.indices )
              for( let arr in this.arrays )
                arrays[ arr ].push( this.arrays[ arr ][ index ] );      // Make re-arranged versions of each data field, with
            Object.assign( this.arrays, arrays );                       // copied values every time an index was formerly re-used.
            this.indices = this.indices.map( (x,i) => i );    // Without shared vertices, we can use sequential numbering.
          }
        flat_shade()                // Automatically assign the correct normals to each triangular element to achieve flat shading.
          {                         // Affect all recently added triangles (those past "offset" in the list).  Assumes that no
            this.indices.length = false;   // vertices are shared across seams.   First, iterate through the index or position triples:
            for( let counter = 0; counter < (this.indices.length ? this.indices.length : this.arrays.position.length); counter += 3 )
            { const indices = this.indices.length ? [ this.indices[ counter ], this.indices[ counter + 1 ], this.indices[ counter + 2 ] ] : 
                                             [ counter, counter + 1, counter + 2 ];
              const [ p1, p2, p3 ] = indices.map( i => this.arrays.position[ i ] );
              const n1 = p1.minus(p2).cross( p3.minus(p1) ).normalized();          // Cross the two edge vectors of this
                                                                                   // triangle together to get its normal.
               if( n1.times(.1).plus(p1).norm() < p1.norm() ) n1.scale(-1);        // Flip the normal if adding it to the 
                                                                                   // triangle brings it closer to the origin.
              for( let i of indices ) this.arrays.normal[ i ] = Vec.from( n1 );    // Propagate this normal to the 3 vertices.
            }
          }
      }
    }
  normalize_positions( keep_aspect_ratios = true )
    { let p_arr = this.arrays.position;
      const average_position = p_arr.reduce( (acc,p) => acc.plus( p.times( 1/p_arr.length ) ), Vec.of( 0,0,0 ) );
      p_arr = p_arr.map( p => p.minus( average_position ) );           // Center the point cloud on the origin.
      const average_lengths  = p_arr.reduce( (acc,p) => 
                                         acc.plus( p.map( x => Math.abs(x) ).times( 1/p_arr.length ) ), Vec.of( 0,0,0 ) );
      if( keep_aspect_ratios )                            // Divide each axis by its average distance from the origin.
        this.arrays.position = p_arr.map( p => p.map( (x,i) => x/average_lengths[i] ) );    
      else
        this.arrays.position = p_arr.map( p => p.times( 1/average_lengths.norm() ) );
    }
}


window.Light = window.tiny_graphics.Light =
class Light                                                     // The properties of one light in the scene (Two 4x1 Vecs and a scalar)
{ constructor( position, color, size ) { Object.assign( this, { position, color, attenuation: 1/size } ); }  };

window.Color = window.tiny_graphics.Color =
class Color extends Vec { }    // Just an alias.  Colors are special 4x1 vectors expressed as ( red, green, blue, opacity ) each from 0 to 1.



window.Graphics_Addresses = window.tiny_graphics.Graphics_Addresses =
class Graphics_Addresses    // For organizing communication with the GPU for Shaders.  Now that we've compiled the Shader, we can query 
{                           // some things about the compiled program, such as the memory addresses it will use for uniform variables, 
                            // and the types and indices of its per-vertex attributes.  We'll need those for building vertex buffers.
  constructor( program, gl )
  { const num_uniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < num_uniforms; ++i)
      { let u = gl.getActiveUniform(program, i).name.split('[')[0];    // Retrieve the GPU addresses of each uniform variable in the shader
        this[ u ] = gl.getUniformLocation( program, u );               // based on their names, and store these pointers for later.
      }
    
    this.shader_attributes = {};                // Assume per-vertex attributes will each be a set of 1 to 4 floats:
    const type_to_size_mapping = { 0x1406: 1, 0x8B50: 2, 0x8B51: 3, 0x8B52: 4 };
    const numAttribs = gl.getProgramParameter( program, gl.ACTIVE_ATTRIBUTES ); 
    for ( let i = 0; i < numAttribs; i++ )      // https://github.com/greggman/twgl.js/blob/master/dist/twgl-full.js for another example.
    { const attribInfo = gl.getActiveAttrib( program, i );
      this.shader_attributes[ attribInfo.name ] = { index: gl.getAttribLocation( program, attribInfo.name ),  // Pointers to all shader
                                                    size: type_to_size_mapping[ attribInfo.type ],            // attribute variables
                                                    enabled: true, type: gl.FLOAT,
                                                    normalized: false, stride: 0, pointer: 0 };
    } 
  }
}


class Overridable     // Class Overridable allows a short way to create modified versions of JavaScript objects.  Some properties are
{                     // replaced with substitutes that you provide, without having to write out a new object from scratch.
       // To override, simply pass in "replacement", a JS Object of keys/values you want to override, to generate a new object.
       // For shorthand you can leave off the key and only provide a value (pass in directly as "replacement") and a guess will
       // be used for which member you want overridden based on type.  
  override( replacement ) { return this.helper( replacement, Object.create( this.constructor.prototype ) ) }
  replace(  replacement ) { return this.helper( replacement, this ) } // Replace is like override but modifies the original object.
  helper( replacement, target )
    { Object.assign( target, this );    // Clone all of our keys/values
      if( replacement.constructor === Object )
        return Object.assign( target, replacement );       // If a JS object was given, use its entries to override;
                                                           // Otherwise we'll try to guess the key to override by type.
      const matching_keys_by_type = Object.entries( this ).filter( ([key, value]) => replacement instanceof value.constructor );
      if( !matching_keys_by_type[0] ) throw "Overridable: Can't figure out which value you're trying to replace; nothing matched by type.";
      return Object.assign( target, { [ matching_keys_by_type[0][0] ]: replacement } );
    }
}



window.Graphics_State = window.tiny_graphics.Graphics_State =
class Graphics_State extends Overridable                 // Stores things that affect multiple shapes, such as lights and the camera.
{ constructor( camera_transform = Mat4.identity(), projection_transform = Mat4.identity() ) 
    { super(); Object.assign( this, { camera_transform, projection_transform, animation_time: 0, animation_delta_time: 0 } ); }
}


window.Shader = window.tiny_graphics.Shader =
class Shader extends Graphics_Card_Object     // Your subclasses of Shader will manage strings of GLSL code that will be sent to the GPU and will run, to
{                                             // draw every shape.  Extend the class and fill in the abstract functions; the constructor needs them.
  copy_onto_graphics_card( context )
    { const gpu_instance = super.copy_onto_graphics_card( context ),
                 program = gpu_instance.program || context.createProgram();

      const gl     = context;
      const shared = this.shared_glsl_code() || "";
      
      const vertShdr = gl.createShader( gl.VERTEX_SHADER );
      gl.shaderSource( vertShdr, shared + this.vertex_glsl_code() );
      gl.compileShader( vertShdr );
      if( !gl.getShaderParameter(vertShdr, gl.COMPILE_STATUS) ) throw "Vertex shader compile error: "   + gl.getShaderInfoLog( vertShdr );

      const fragShdr = gl.createShader( gl.FRAGMENT_SHADER );
      gl.shaderSource( fragShdr, shared + this.fragment_glsl_code() );
      gl.compileShader( fragShdr );
      if( !gl.getShaderParameter(fragShdr, gl.COMPILE_STATUS) ) throw "Fragment shader compile error: " + gl.getShaderInfoLog( fragShdr );

      gl.attachShader( program, vertShdr );
      gl.attachShader( program, fragShdr );
      gl.linkProgram(  program );
      if( !gl.getProgramParameter( program, gl.LINK_STATUS) ) throw "Shader linker error: "           + gl.getProgramInfoLog( this.program );

      if( !gpu_instance.program )
        Object.assign( gpu_instance, { program, gpu_addresses: new Graphics_Addresses( program, gl ) } );
      return gpu_instance;
    }
  make_gpu_representation() { return { program: undefined, gpu_addresses: undefined } }
  activate( context, buffer_pointers, graphics_state, model_transform, material )
    { const gpu_instance = super.activate( context );

      context.useProgram( gpu_instance.program );

          // --- Send over all the values needed by this particular shader to the GPU: ---
      this.update_GPU( context, gpu_instance.gpu_addresses, graphics_state, model_transform, material );
      
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
     }                    // You have to override the following five functions:
    material() { return class Material extends Overridable {} }
    update_GPU(){}  shared_glsl_code(){}  vertex_glsl_code(){}  fragment_glsl_code(){}
}


window.Texture = window.tiny_graphics.Texture =
class Texture extends Graphics_Card_Object                            // The Texture class wraps a pointer to a new texture
{ constructor( filename, min_filter = "LINEAR_MIPMAP_LINEAR" )        // buffer along with a new HTML image object. 
    { super();
      Object.assign( this, { filename, min_filter } );

      this.image          = new Image();
      this.image.onload   = () => this.ready = true;
      this.image.crossOrigin = "Anonymous";           // Avoid a browser warning.
      this.image.src = filename;                      // Load the image file to this HTML page.
    }
  copy_onto_graphics_card( context, need_initial_settings = true )
    { const gpu_instance = super.copy_onto_graphics_card( context );
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
  make_gpu_representation() { return { texture_buffer_pointer: undefined } }
  activate( context, texture_unit = 0 )   // Optionally select a texture unit in case you're using a shader with many samplers.
    { if( !this.ready ) return;     // Terminate draw requests until the image file is actually loaded over the network.
      
      const gpu_instance = super.activate( context );
      context.activeTexture( context[ "TEXTURE" + texture_unit ] );
      context.bindTexture( context.TEXTURE_2D, gpu_instance.texture_buffer_pointer );
    }

}


window.Webgl_Manager = window.tiny_graphics.Webgl_Manager =
class Webgl_Manager      // This class manages a whole graphics program for one on-page canvas, including its textures, shapes, shaders,
{                        // and scenes.  In addition to requesting a WebGL context and storing the aforementioned items, it informs the
                         // canvas of which functions to call during events - such as a key getting pressed or it being time to redraw.
  constructor( canvas, background_color, dimensions )
    { Object.assign( this, { instances: new Map(), scene_components: [], prev_time: 0, canvas,
                             globals: { animate: true, graphics_state: new Graphics_State() } } );
      
      for( let name of [ "webgl", "experimental-webgl", "webkit-3d", "moz-webgl" ] )   // Get the GPU ready, creating a new WebGL context
        if(  this.context = this.canvas.getContext( name ) ) break;                    // for this canvas.          
      if( !this.context ) throw "Canvas failed to make a WebGL context.";
      const gl = this.context;

      this.set_size( dimensions );
      gl.clearColor.apply( gl, background_color );    // Tell the GPU which color to clear the canvas with each frame.
      gl.enable( gl.DEPTH_TEST );   gl.enable( gl.BLEND );            // Enable Z-Buffering test with blending.
      gl.blendFunc( gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA );           // Specify an interpolation method for blending "transparent" 
                                                                      // triangles over the existing pixels.
      gl.bindTexture(gl.TEXTURE_2D, gl.createTexture() ); // A single red pixel, as a placeholder image to prevent a console warning:
      gl.texImage2D (gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 0, 0, 255]));
         
      window.requestAnimFrame = ( w =>                                    // Find the correct browser's version of requestAnimationFrame()
           w.requestAnimationFrame    || w.webkitRequestAnimationFrame    // needed for queue-ing up re-display events:
        || w.mozRequestAnimationFrame || w.oRequestAnimationFrame || w.msRequestAnimationFrame
        || function( callback, element ) { w.setTimeout(callback, 1000/60);  } )( window );
    }
  set_size( dimensions = [ 1080, 600 ] )                // This function allows you to re-size the canvas anytime.  
    { const [ width, height ] = dimensions;             // To work, it must change the size in CSS, wait for style to re-flow, 
      this.canvas.style[ "width" ]  =  width + "px";    // and then change the size in canvas attributes.
      this.canvas.style[ "height" ] = height + "px";     
      Object.assign( this,        { width, height } );   // Have to assign to both; these attributes on a canvas 
      Object.assign( this.canvas, { width, height } );   // have a special effect on buffers, separate from their style.
      this.context.viewport( 0, 0, width, height );      // Build the canvas's matrix for converting -1 to 1 ranged coords (NCDS)
    }                                                    // into its own pixel coords.
  register_scene_component( component )     // Allow a Scene_Component to show their control panel and enter the event loop.
    { this.scene_components.unshift( component );  component.make_control_panel( component.controls );
    }
  render( time=0 )                                                // Animate shapes based upon how much measured real time has transpired.
    {                            this.globals.graphics_state.animation_delta_time = time - this.prev_time;
      if( this.globals.animate ) this.globals.graphics_state.animation_time      += this.globals.graphics_state.animation_delta_time;
      this.prev_time = time;

      const gl = this.context;
      gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);        // Clear the canvas's pixels and z-buffer.
     
      for( let live_string of document.querySelectorAll(".live_string") ) live_string.onload( live_string );
      for ( let s of this.scene_components ) s.display( gl, this.globals.graphics_state );            // Draw each registered animation.
      this.event = window.requestAnimFrame( this.render.bind( this ) );   // Now that this frame is drawn, request that render() happen 
    }                                                                     // again as soon as all other web page events are processed.
}

window.Scene_Component = window.tiny_graphics.Scene_Component =
class Scene_Component       // The Scene_Component superclass is the base class for any scene part or code snippet that you can add to a
{                           // canvas.  Make your own subclass(es) of this and override their methods "display()" and "make_control_panel()"
                            // to make them do something.  Finally, push them onto your Webgl_Manager's "scene_components" array.
  constructor( webgl_manager, control_box )
    { const callback_behavior = ( callback, event ) => 
           { callback( event );
             event.preventDefault();    // Fire the callback and cancel any default browser shortcut that is an exact match.
             event.stopPropagation();   // Don't bubble the event to parent nodes; let child elements be targetted in isolation.
           }
      Object.assign( this, { key_controls: new Keyboard_Manager( document, callback_behavior), globals: webgl_manager.globals } );
      control_box.appendChild( Object.assign( document.createElement("div"), { textContent: this.constructor.name, className: "control-title" } ) )
      this.control_panel = control_box.appendChild( document.createElement( "div" ) );
      this.control_panel.className = "control-div";        
    }
  new_line( parent=this.control_panel ) { parent.appendChild( document.createElement( "br" ) ) }    // Format a scene's control panel.
  live_string( callback, parent=this.control_panel )    // Create an element somewhere in the control panel that does reporting of the
    {                                                   // scene's values in real time.  The event loop will constantly update all HTML 
                                                        // elements made this way.
      parent.appendChild( Object.assign( document.createElement( "div"  ), { className:"live_string", onload: callback } ) );
    }
  key_triggered_button( description, shortcut_combination, callback, color = '#'+Math.random().toString(9).slice(-6), 
                        release_event, recipient = this, parent = this.control_panel )      // Trigger any scene behavior by assigning a key
    { const button = parent.appendChild( document.createElement( "button" ) );              // shortcut and a labelled HTML button to it.
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
    }                                                          // You have to override the following functions to use class Scene_Component.
  make_control_panel(){}  display( graphics_state ){}  show_explanation( document_section ){}
}


window.Canvas_Widget = window.tiny_graphics.Canvas_Widget =
class Canvas_Widget                    // Canvas_Widget embeds a WebGL demo onto a website, along with various panels of controls.
{ constructor( element, scenes, show_controls = true )   // One panel exists per each scene that's used in the canvas.  You can use up
    { this.create( element, scenes, show_controls )      // to 16 Canvas_Widgets; browsers support up to 16 WebGL contexts per page.    

      const rules = [ ".canvas-widget { width: 1080px; background: DimGray }",
                      ".canvas-widget * { font-family: monospace }",
                      ".canvas-widget canvas { width: 1080px; height: 600px; margin-bottom:-3px }",
                      ".canvas-widget div { background: white }",
                      ".canvas-widget table { border-collapse: collapse; display:block; overflow-x: auto; }",
                      ".canvas-widget table.control-box { width: 1080px; border:0; margin:0; max-height:380px; transition:.5s; overflow-y:scroll; background:DimGray }",
                      ".canvas-widget table.control-box:hover { max-height:500px }",
                      ".canvas-widget table.control-box td { overflow:hidden; border:0; background:DimGray; border-radius:30px }",
                      ".canvas-widget table.control-box td .control-div { background: #EEEEEE; height:338px; padding: 5px 5px 5px 30px; box-shadow: 25px 0px 60px -15px inset }",
                      ".canvas-widget table.control-box td * { background:transparent }",
                      ".canvas-widget table.control-box .control-div td { border-radius:unset }",
                      ".canvas-widget table.control-box .control-title { padding:7px 40px; color:white; background:DarkSlateGray; box-shadow: 25px 0px 70px -15px inset black }",
                      ".canvas-widget *.live_string { display:inline-block; background:unset }",
                      ".dropdown { display:inline-block }",
                      ".dropdown-content { display:inline-block; transition:.2s; transform: scaleY(0); overflow:hidden; position: absolute; \
                                            z-index: 1; background:#E8F6FF; padding: 16px; margin-left:30px; min-width: 100px; \
                                            box-shadow: 5px 10px 16px 0px rgba(0,0,0,0.2) inset; border-radius:10px }",
                      ".dropdown-content a { color: black; padding: 4px 4px; display: block }",
                      ".dropdown a:hover { background: #f1f1f1 }",
                      ".canvas-widget button { background: #4C9F50; color: white; padding: 6px; border-radius:9px; \
                                                box-shadow: 4px 6px 16px 0px rgba(0,0,0,0.3); transition: background .3s, transform .3s }",
                      ".canvas-widget button:hover, button:focus { transform: scale(1.3); color:gold }",
                      ".link { text-decoration:underline; cursor: pointer }",
                      ".show { transform: scaleY(1); height:200px; overflow:auto }",
                      ".hide { transform: scaleY(0); height:0px; overflow:hidden  }" ];
                      
      const style = document.head.appendChild( document.createElement( "style" ) );
      for( const r of rules ) document.styleSheets[document.styleSheets.length - 1].insertRule( r, 0 )
    }
  create( element, scenes, show_controls )
    { this.patch_ios_bug();
      element = document.querySelector( "#" + element );
      try  { this.populate_canvas( element, scenes, show_controls );
           } catch( error )
           { element.innerHTML = "<H1>Error loading the demo.</H1>" + error }
    }
  patch_ios_bug()                               // Correct a flaw in Webkit (iPhone devices; safari mobile) that 
    { try{ Vec.of( 1,2,3 ).times(2) }           // breaks TypedArray.from() and TypedArray.of() in subclasses.
      catch 
      { Vec.of   = function()      { return new Vec( Array.from( arguments ) ) }
        Vec.from = function( arr ) { return new Vec( Array.from( arr       ) ) }
      }
    }
  populate_canvas( element, scenes, show_controls )   // Assign a Webgl_Manager to the WebGL canvas.
    { if( !scenes.every( x => window[ x ] ) )         // Make sure each scene class really exists.
        throw "(Featured class not found)";
      const canvas = element.appendChild( document.createElement( "canvas" ) );
      const control_panels = element.appendChild( document.createElement( "table" ) );
      control_panels.className = "control-box";      
      if( !show_controls ) control_panels.style.display = "none";
      const row = control_panels.insertRow( 0 );
      this.webgl_manager = new Webgl_Manager( canvas, Color.of( 0,0,0,1 ) );  // Second parameter sets background color.

      for( let scene_class_name of scenes )                  // Register the initially requested scenes to the render loop.
        this.webgl_manager.register_scene_component( new window[ scene_class_name ]( this.webgl_manager, row.insertCell() ) );   
                           
      this.webgl_manager.render();   // Start WebGL initialization.  Note that render() will re-queue itself for more calls.
    }
}

  
window.Code_Manager = window.tiny_graphics.Code_Manager =
class Code_Manager                            // Break up a string containing code (any es6 JavaScript).  The parser expression
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


window.Code_Widget = window.tiny_graphics.Code_Widget =
class Code_Widget
{ constructor( element, selected_class )
    { let rules = [ ".code-widget .code-panel { background:white; overflow:auto; font-family:monospace; width:1060px; padding:10px; padding-bottom:40px; max-height: 500px; \
                                                  border-radius:12px; box-shadow: 20px 20px 90px 0px powderblue inset, 5px 5px 30px 0px blue inset }",
                ".code-widget .code-display { min-width:1800px; padding:10px; white-space:pre-wrap; background:transparent }",
                ".code-widget .edit-button { left:800px; z-index:2; position:absolute; outline:0; height:80px; width:80px; border-radius:50% }",
                ".code-widget table { display:block; overflow-x:auto; width:1080px; border-radius:25px; border-collapse:collapse; border: 2px solid black }",
               ".code-widget table.class-list td { border-width:thin; background: #EEEEEE; padding:12px; font-family:monospace; border: 1px solid black }"
                 ];

      for( const r of rules ) document.styleSheets[0].insertRule( r, 1 );
      
      if( !window[ selected_class ] ) throw "Class not found.";
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