// tiny-graphics.js - A file that shows how to organize a complete graphics program.  It wraps common WebGL commands and math.
// The file tiny-graphics-widgets.js additionally wraps web page interactions.  By Garett.

export class Vec extends Float32Array       // Vectors of floating point numbers.  This puts vector math into JavaScript.
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
                            //  Notes:  Vecs should be created with of() due to wierdness with the TypedArray spec.
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


export class Mat extends Array                         // M by N matrices of floats.  Enables matrix and vector math.  Usage:
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
  set_identity ( m, n )
    { this.length = 0; for( let i = 0; i < m; i++ ) { this.push( Array(n).fill(0) ); if( i < n ) this[i][i] = 1; } }
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


export class Mat4 extends Mat                               // Generate special 4x4 matrices that are useful for graphics.
{ static identity()       { return Mat.of( [ 1,0,0,0 ], [ 0,1,0,0 ], [ 0,0,1,0 ], [ 0,0,0,1 ] ); };
  static rotation( angle, axis )                                             // Requires a scalar (angle) and a 3x1 Vec (axis)
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


export class Graphics_Card_Object       // Extending this class allows an object to, whenever used, copy
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


export class Vertex_Buffer extends Graphics_Card_Object
{                             // To use Vertex_Buffer, make a subclass of it that overrides the constructor and fills in the right fields.  
                              // Vertex_Buffer organizes data related to one 3D shape and copies it into GPU memory.  That data is broken
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
      { this.index_buffer = gl.createBuffer();
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


export const Color = Vec;    // Just an alias.  Colors are special 4x1 vectors expressed as ( red, green, blue, opacity ) each from 0 to 1.

export class Graphics_Addresses    // For organizing communication with the GPU for Shaders.  Once we've compiled the Shader, we can query 
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


export class Overridable     // Class Overridable allows a short way to create modified versions of JavaScript objects.  Some properties are
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



export class Graphics_State extends Overridable                 // Stores things that affect multiple shapes, such as lights and the camera.
{ constructor( camera_transform = Mat4.identity(), projection_transform = Mat4.identity() ) 
    { super();
      this.set_camera( camera_transform );
      Object.assign( this, { projection_transform, animation_time: 0, animation_delta_time: 0 } );
    }
  set_camera( matrix )      // It's often useful to cache both the camera matrix and its inverse.  Both are needed
    {                       // often and matrix inversion is too slow to recompute needlessly.  
                            // Note that setting a camera matrix traditionally means storing the inverted version, 
                            // so that's the one this function expects to receive; it automatically sets the other.
      Object.assign( this, { camera_transform: Mat4.inverse( matrix ), camera_inverse: matrix } )
    }
}


export class Shader extends Graphics_Card_Object
{                           // Your subclasses of Shader will manage strings of GLSL code that will be sent to the GPU and will run, to
                            // draw every shape.  Extend the class and fill in the abstract functions; the constructor needs them.
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


export class Webgl_Manager      // This class manages a whole graphics program for one on-page canvas, including its textures, shapes, shaders,
{                        // and scenes.  In addition to requesting a WebGL context and storing the aforementioned items, it informs the
                         // canvas of which functions to call during events - such as a key getting pressed or it being time to redraw.
  constructor( canvas, background_color, dimensions )
    { Object.assign( this, { instances: new Map(), scenes: [], prev_time: 0, canvas,
                             globals: { animate: true, graphics_state: new Graphics_State() } } );
      
      for( let name of [ "webgl", "experimental-webgl", "webkit-3d", "moz-webgl" ] )   // Get the GPU ready, creating a new WebGL context
        if(  this.context = this.canvas.getContext( name ) ) break;                    // for this canvas.          
      if( !this.context ) throw "Canvas failed to make a WebGL context.";
      const gl = this.context;

      this.set_size( dimensions );
               
      gl.clearColor.apply( gl, background_color );           // Tell the GPU which color to clear the canvas with each frame.
      gl.getExtension( "OES_element_index_uint" );           // Load an extension to allow shapes with more than 65535 vertices.
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
  render( time=0 )                                                // Animate shapes based upon how much measured real time has transpired.
    {                            this.globals.graphics_state.animation_delta_time = time - this.prev_time;
      if( this.globals.animate ) this.globals.graphics_state.animation_time      += this.globals.graphics_state.animation_delta_time;
      this.prev_time = time;

      const gl = this.context;
      gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);        // Clear the canvas's pixels and z-buffer.
     
      const open_list = [ ...this.scenes ];
      while( open_list.length )                       // Traverse all scenes and their children, recursively
      { open_list.push( ...open_list[0].children );
        open_list.shift().display( gl, this.globals.graphics_state );           // Draw each registered animation.
      }
      this.event = window.requestAnimFrame( this.render.bind( this ) );   // Now that this frame is drawn, request that render() happen 
    }                                                                     // again as soon as all other web page events are processed.
}


export class Scene          // The Scene superclass is the base class for any scene part or code snippet that you can add to a
{                           // canvas.  Make your own subclass(es) of this and override their methods "display()" and "make_control_panel()"
                            // to make them do something.  Finally, push them onto your Webgl_Manager's "scenes" array.
  constructor( webgl_manager )
    { this.children = [];
      this.desired_controls_position = 0; // Set as undefined to omit this scene's control panel.  Set to negative/positive to move its panel.
      this.globals = webgl_manager.globals;      
                                                          // Set up how we'll handle key presses for the scene's control panel:
      const callback_behavior = ( callback, event ) => 
           { callback( event );
             event.preventDefault();    // Fire the callback and cancel any default browser shortcut that is an exact match.
             event.stopPropagation();   // Don't bubble the event to parent nodes; let child elements be targetted in isolation.
           }
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
    }                                                          // You have to override the following functions to use class Scene.
  make_control_panel(){}  display( graphics_state ){}  show_explanation( document_section ){}
}


export class Canvas_Widget                    // Canvas_Widget embeds a WebGL demo onto a website, along with various panels of controls.
{ constructor(     element, main_scene, additional_scenes, show_controls = true )   // One panel exists per each scene that's used in the canvas.  You can use up
    { this.create( element, main_scene, additional_scenes, show_controls )      // to 16 Canvas_Widgets; browsers support up to 16 WebGL contexts per page.    

      const rules = [ ".canvas-widget { width: 1080px; background: DimGray }",
                      ".canvas-widget canvas { width: 1080px; height: 600px; margin-bottom:-3px }" ];
                      
      if( document.styleSheets.length == 0 ) document.head.appendChild( document.createElement( "style" ) );
      for( const r of rules ) document.styleSheets[document.styleSheets.length - 1].insertRule( r, 0 )
    }
  create( element, main_scene, additional_scenes, show_controls )
    { this.patch_ios_bug();
      try  { this.populate_canvas( element, main_scene, additional_scenes, show_controls );
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
  populate_canvas( element, main_scene, additional_scenes, show_controls )   // Assign a Webgl_Manager to the WebGL canvas.
    { const canvas = document.querySelector( "#" + element ).appendChild( document.createElement( "canvas" ) );

      this.webgl_manager = new Webgl_Manager( canvas, Color.of( 0,0,0,1 ) );  // Second parameter sets background color.

      for( let scene_class_name of [ main_scene, ...additional_scenes ] )   // Register the initially requested scenes to the render loop. 
        this.webgl_manager.scenes.push( new scene_class_name( this.webgl_manager ) );


      this.embedded_controls = document.querySelector( "#" + element ).appendChild( document.createElement( "div" ) );
      this.embedded_controls.className = "controls-widget";
      if( show_controls ) new Controls_Widget( this.webgl_manager.scenes, this.embedded_controls );
                           
      this.webgl_manager.render();   // Start WebGL initialization.  Note that render() will re-queue itself for more calls.
    }
}