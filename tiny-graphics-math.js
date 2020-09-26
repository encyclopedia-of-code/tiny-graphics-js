// This file defines a lot of panels that can be placed on websites to create interactive graphics programs that use tiny-graphics.js.

import {tiny} from './tiny-graphics.js';

export const math = {};


// Vector and Matrix algebra are not built into JavaScript at first.  We will add it now.
// Part I of this file:  Vectors,  Part II of this file:  Matrices

// Part I: Vectors:   **************

    // You will be able to declare a 3D vector [x,y,z] supporting various common vector operations 
    // with syntax:  vec(x,y), vec3( x,y,z ) or vec4( x,y,z, zero or one ).  For general sized vectors, use 
    // class Vector and declare them with standard Array-supported operations like .of().

    // For matrices, you will use class Mat4 to generate the 4 by 4 matrices that are common
    // in graphics, or for general sized matrices you can use class Matrix.

    // To get vector algebra that performs well in JavaScript, we based class Vector on consecutive 
    // buffers (using type Float32Array).  Implementations should specialize for common vector 
    // sizes 3 and 4 since JavaScript engines can better optimize functions when they can predict
    // argument count.  Implementations should also avoid allocating new array objects since these
    // will all have to be garbage collected.

      // Examples:
      
  //  ** For size 3 **   
  //     equals: "vec3( 1,0,0 ).equals( vec3( 1,0,0 ) )" returns true.
  //       plus: "vec3( 1,0,0 ).plus  ( vec3( 1,0,0 ) )" returns the Vector [ 2,0,0 ].
  //      minus: "vec3( 1,0,0 ).minus ( vec3( 1,0,0 ) )" returns the Vector [ 0,0,0 ].
  // mult-pairs: "vec3( 1,2,3 ).mult_pairs( vec3( 3,2,0 ) )" returns the Vector [ 3,4,0 ].
  //      scale: "vec3( 1,2,3 ).scale( 2 )" overwrites the Vector with [ 2,4,6 ].
  //      times: "vec3( 1,2,3 ).times( 2 )" returns the Vector [ 2,4,6 ].
  // randomized: Returns this Vector plus a random vector of a given maximum length.
  //        mix: "vec3( 0,2,4 ).mix( vec3( 10,10,10 ), .5 )" returns the Vector [ 5,6,7 ].
  //       norm: "vec3( 1,2,3 ).norm()" returns the square root of 15.
  // normalized: "vec3( 4,4,4 ).normalized()" returns the Vector [ sqrt(3), sqrt(3), sqrt(3) ]
  //  normalize: "vec3( 4,4,4 ).normalize()" overwrites the Vector with [ sqrt(3), sqrt(3), sqrt(3) ].
  //        dot: "vec3( 1,2,3 ).dot( vec3( 1,2,3 ) )" returns 15.
  //       cast: "vec3.cast( [-1,-1,0], [1,-1,0], [-1,1,0] )" converts a list of Array literals into a list of vec3's.
  //        to4: "vec3( 1,2,3 ).to4( true or false )" returns the homogeneous vec4 [ 1,2,3, 1 or 0 ].
  //      cross: "vec3( 1,0,0 ).cross( vec3( 0,1,0 ) )" returns the Vector [ 0,0,1 ].  Use only on 3x1 Vecs.
  //  to_string: "vec3( 1,2,3 ).to_string()" returns "[vec3 1, 2, 3]"
  //  ** For size 4, same except: **    
  //        to3: "vec4( 4,3,2,1 ).to3()" returns the vec3 [ 4,3,2 ].  Use to truncate vec4 to vec3.
  //  ** To assign by value **
  //       copy: "let new_vector = old_vector.copy()" assigns by value so you get a different vector object.
  //  ** For any size **
  // to declare: Vector.of( 1,2,3,4,5,6,7,8,9,10 ) returns a Vector filled with those ten entries.
  //  ** For multiplication by matrices **
  //             "any_mat4.times( vec4( 1,2,3,0 ) )" premultiplies the homogeneous Vector [1,2,3]
  //              by the 4x4 matrix and returns the new vec4.  Requires a vec4 as input.

const Vector = math.Vector =
class Vector extends Float32Array
{                                   // **Vector** stores vectors of floating point numbers.  Puts vector math into JavaScript.
                                    // Note:  Vectors should be created with of() due to weirdness with the TypedArray spec.
                                    // Tip: Assign Vectors with .copy() to avoid referring two variables to the same Vector object.
  static create( ...arr )
    { return new Vector( arr );
    }
  copy() 
    { return new Vector( this ) }
  equals( b ) 
    { return this.every( (x,i) => x == b[i] ) }
  plus( b )
    { return this.map(   (x,i) => x +  b[i] ) }
  minus( b )
    { return this.map(   (x,i) => x -  b[i] ) }
  times_pairwise( b )
    { return this.map(   (x,i) => x *  b[i] ) }
  scale_by( s )
    { this.forEach(  (x, i, a) => a[i] *= s ) }
  times( s )
    { return this.map(       x => s*x ) }
  randomized( s )
    { return this.map(       x => x + s*(Math.random()-.5) ) }
  mix( b, s ) 
    { return this.map(   (x,i) => (1-s)*x + s*b[i] ) }
  norm()
    { return Math.sqrt( this.dot( this ) ) }
  normalized()
    { return this.times( 1/this.norm() ) }
  normalize()
    {     this.scale_by( 1/this.norm() ) }
  dot(b)
    { if( this.length == 2 )                    // Optimize for Vectors of size 2
        return this[0]*b[0] + this[1]*b[1];  
      return this.reduce( ( acc, x, i ) => { return acc + x*b[i]; }, 0 );
    }
  static cast( ...args )
                            // cast(): For compact syntax when declaring lists.      
    { return args.map( x => Vector.from(x) ) }
                // to3() / to4() / cross():  For standardizing the API with Vector3/Vector4, so
                // the performance hit of changing between these types can be measured.
  to3()
    { return vec3( this[0], this[1], this[2]              ); }
  to4( is_a_point )
    { return vec4( this[0], this[1], this[2], +is_a_point ); }
  cross(b)
    { return vec3( this[1]*b[2] - this[2]*b[1], this[2]*b[0] - this[0]*b[2], this[0]*b[1] - this[1]*b[0] ); }
  to_string() { return "[vector " + this.join( ", " ) + "]" }
}


const Vector3 = math.Vector3 =
class Vector3 extends Float32Array
{                                 // **Vector3** is a specialization of Vector only for size 3, for performance reasons.
  static create( x, y, z )
    { const v = new Vector3( 3 );
      v[0] = x; v[1] = y; v[2] = z;
      return v;
    }
  copy()
    { return Vector3.from( this ) }
                                              // In-fix operations: Use these for more readable math expressions.
  equals( b )
    { return this[0] == b[0] && this[1] == b[1] && this[2] == b[2] }
  plus( b )
    { return vec3( this[0]+b[0], this[1]+b[1], this[2]+b[2] ) }
  minus( b )
    { return vec3( this[0]-b[0], this[1]-b[1], this[2]-b[2] ) }
  times( s )
    { return vec3( this[0]*s,    this[1]*s,    this[2]*s    ) }
  times_pairwise( b )
    { return vec3( this[0]*b[0], this[1]*b[1], this[2]*b[2] ) }
                                            // Pre-fix operations: Use these for better performance (to avoid new allocation).  
  add_by( b )
    { this[0] += b[0];  this[1] += b[1];  this[2] += b[2] }
  subtract_by( b )
    { this[0] -= b[0];  this[1] -= b[1];  this[2] -= b[2] }
  scale_by( s )
    { this[0] *= s;  this[1] *= s;  this[2] *= s }
  scale_pairwise_by( b )
    { this[0] *= b[0];  this[1] *= b[1];  this[2] *= b[2] }
                                            // Other operations:  
  randomized( s )
    { return vec3( this[0]+s*(Math.random()-.5), 
                   this[1]+s*(Math.random()-.5),
                   this[2]+s*(Math.random()-.5) );
    }
  mix( b, s )
    { return vec3( (1-s)*this[0] + s*b[0],
                   (1-s)*this[1] + s*b[1],
                   (1-s)*this[2] + s*b[2] );
    }
  norm()
    { return Math.sqrt( this[0]*this[0] + this[1]*this[1] + this[2]*this[2] ) }
  normalized()
    { const d = 1/this.norm();
      return vec3( this[0]*d, this[1]*d, this[2]*d );
    }
  normalize()
    { const d = 1/this.norm();
      this[0] *= d;  this[1] *= d;  this[2] *= d; 
    }
  dot( b )
    { return this[0]*b[0] + this[1]*b[1] + this[2]*b[2] }
  cross( b )
    { return vec3( this[1]*b[2] - this[2]*b[1],
                   this[2]*b[0] - this[0]*b[2],
                   this[0]*b[1] - this[1]*b[0]  ) }
  static cast( ...args )
    {                             // cast(): Converts a bunch of arrays into a bunch of vec3's.
      return args.map( x => Vector3.from( x ) );
    }
  static unsafe( x,y,z )
    {                // unsafe(): returns vec3s only meant to be consumed immediately. Aliases into 
                     // shared memory, to be overwritten upon next unsafe3 call.  Faster.
      const shared_memory = vec3( 0,0,0 );
      Vector3.unsafe = ( x,y,z ) =>
        { shared_memory[0] = x;  shared_memory[1] = y;  shared_memory[2] = z;
          return shared_memory;
        }
      return Vector3.unsafe( x,y,z );
    }
  to4( is_a_point )
                    // to4():  Convert to a homogeneous vector of 4 values.
    { return vec4( this[0], this[1], this[2], +is_a_point ) }
  to_string()
    { return "[vec3 " + this.join( ", " ) + "]" }
}

const Vector4 = math.Vector4 =
class Vector4 extends Float32Array
{                                 // **Vector4** is a specialization of Vector only for size 4, for performance reasons.
                                  // The fourth coordinate value is homogenized (0 for a vector, 1 for a point).
  static create( x, y, z, w )
    { const v = new Vector4( 4 );
      v[0] = x; v[1] = y; v[2] = z; v[3] = w;
      return v;
    }
  copy()
    { return Vector4.from( this ) }
                                            // In-fix operations: Use these for more readable math expressions.
  equals()
    { return this[0] == b[0] && this[1] == b[1] && this[2] == b[2] && this[3] == b[3] }
  plus( b )
    { return vec4( this[0]+b[0], this[1]+b[1], this[2]+b[2], this[3]+b[3] ) }
  minus( b )
    { return vec4( this[0]-b[0], this[1]-b[1], this[2]-b[2], this[3]-b[3] ) }
  times( s )
    { return vec4( this[0]*s, this[1]*s, this[2]*s, this[3]*s ) }
  times_pairwise( b )
    { return vec4( this[0]*b[0], this[1]*b[1], this[2]*b[2], this[3]*b[3] ) }
                                            // Pre-fix operations: Use these for better performance (to avoid new allocation).  
  add_by( b )
    { this[0] += b[0];  this[1] += b[1];  this[2] += b[2];  this[3] += b[3] }
  subtract_by( b )
    { this[0] -= b[0];  this[1] -= b[1];  this[2] -= b[2];  this[3] -= b[3] }
  scale_by( s )
    { this[0] *= s;  this[1] *= s;  this[2] *= s;  this[3] *= s }
  scale_pairwise_by( b )
    { this[0] *= b[0];  this[1] *= b[1];  this[2] *= b[2];  this[3] *= b[3] }
                                            // Other operations:  
  randomized( s )
    { return vec4( this[0]+s*(Math.random()-.5), 
                   this[1]+s*(Math.random()-.5),
                   this[2]+s*(Math.random()-.5),
                   this[3]+s*(Math.random()-.5) );
    }
  mix( b, s )
    { return vec4( (1-s)*this[0] + s*b[0],
                   (1-s)*this[1] + s*b[1],
                   (1-s)*this[2] + s*b[2], 
                   (1-s)*this[3] + s*b[3] );
    }
                // The norms should behave like for Vector3 because of the homogenous format.
  norm()
    { return Math.sqrt( this[0]*this[0] + this[1]*this[1] + this[2]*this[2] ) }
  normalized()
    { const d = 1/this.norm();
      return vec4( this[0]*d, this[1]*d, this[2]*d, this[3] );    // (leaves the 4th coord alone)
    }
  normalize()
    { const d = 1/this.norm();
      this[0] *= d;  this[1] *= d;  this[2] *= d;                 // (leaves the 4th coord alone)
    }
  dot( b )
    { return this[0]*b[0] + this[1]*b[1] + this[2]*b[2] + this[3]*b[3] }
  static unsafe( x, y, z, w )
    {                // **unsafe** Returns vec3s to be used immediately only. Aliases into 
                     // shared memory to be overwritten on next unsafe3 call.  Faster.
      const shared_memory = vec4( 0,0,0,0 );
      Vec4.unsafe = ( x,y,z,w ) =>
        { shared_memory[0] = x;  shared_memory[1] = y;
          shared_memory[2] = z;  shared_memory[3] = w; }
    }
  to3()
    { return vec3( this[0], this[1], this[2] ) }
  to_string()
    { return "[vec4 " + this.join( ", " ) + "]" }
}

const vec     = math.vec     = Vector .create;
const vec3    = math.vec3    = Vector3.create;
const vec4    = math.vec4    = Vector4.create;
const unsafe3 = math.unsafe3 = Vector3.unsafe;
const unsafe4 = math.unsafe4 = Vector4.unsafe;

      // **Color** is just an alias for class Vector4.  Colors should be made as special 4x1
      // vectors expressed as ( red, green, blue, opacity ) each ranging from 0 to 1.
const color = math.color = Vector4.create;


// Part II: Matrices:   **************

const Matrix = math.Matrix =
class Matrix extends Array
{                                   // **Matrix** holds M by N matrices of floats.  Enables matrix and vector math.
  // Example usage:
  //  "Matrix( rows )" returns a Matrix with those rows, where rows is an array of float arrays.
  //  "M.set_identity( m, n )" assigns the m by n identity to Matrix M.
  //  "M.sub_block( start, end )" where start and end are each a [ row, column ] pair returns a sub-rectangle cut out from M.
  //  "M.copy()" creates a deep copy of M and returns it so you can modify it without affecting the original.
  //  "M.equals(b)", "M.plus(b)", and "M.minus(b)" are operations betwen two matrices.
  //  "M.transposed()" returns a new matrix where all rows of M became columns and vice versa.
  //  "M.times(b)" (where the post-multiplied b can be a scalar, a Vector4, or another Matrix) returns a 
  //               new Matrix or Vector4 holding the product.
  //  "M.pre_multiply(b)"  overwrites the Matrix M with the product of b * M where b must be another Matrix.
  //  "M.post_multiply(b)" overwrites the Matrix M with the product of M * b where b can be a Matrix or scalar.
  //  "Matrix.flatten_2D_to_1D( M )" flattens input (a Matrix or any array of Vectors or float arrays)
  //                                 into a row-major 1D array of raw floats.
  //  "M.to_string()" where M contains the 4x4 identity returns "[[1, 0, 0, 0] [0, 1, 0, 0] [0, 0, 1, 0] [0, 0, 0, 1]]".

  constructor( ...args )
    { super(0);
      this.push( ...args )
    }
  set( M )
    { this.length = 0; 
      this.push( ...M );
    }
  set_identity ( m, n )
    { this.length = 0; 
      for( let i = 0; i < m; i++ ) 
      { this.push( Array(n).fill(0) ); 
        if( i < n ) this[i][i] = 1; 
      }
    }
  sub_block( start, end )  { return Matrix.from( this.slice( start[0], end[0] ).map( r => r.slice( start[1], end[1] ) ) ); }
  copy      () { return this.map(      r  => [ ...r ]                  ) }
  equals   (b) { return this.every( (r,i) => r.every( (x,j) => x == b[i][j] ) ) }
  plus     (b) { return this.map(   (r,i) => r.map  ( (x,j) => x +  b[i][j] ) ) }
  minus    (b) { return this.map(   (r,i) => r.map  ( (x,j) => x -  b[i][j] ) ) }
  transposed() { return this.map(   (r,i) => r.map  ( (x,j) =>   this[j][i] ) ) }
  times    (b, optional_preallocated_result)                                                                       
    { const len = b.length;
      if( typeof len  === "undefined" ) return this.map( r => r.map( x => b*x ) );   // Matrix * scalar case.
      const len2 = b[0].length;    
      if( typeof len2 === "undefined" )
      { let result = optional_preallocated_result || new Vector4( this.length );     // Matrix * Vector4 case.
        for( let r=0; r < len; r++ ) result[r] = b.dot(this[r]);                      
        return result;
      }
      let result = optional_preallocated_result || Matrix.from( new Array( this.length ) );
      for( let r = 0; r < this.length; r++ )                                         // Matrix * Matrix case.
      { if( !optional_preallocated_result )
          result[ r ] = new Array( len2 );
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


const Mat4 = math.Mat4 =
class Mat4 extends Matrix
{                                                   // **Mat4** generates special 4x4 matrices that are useful for graphics.
                                                    // All the methods below return a certain 4x4 matrix.
  static identity()
    { return Matrix.of( [ 1,0,0,0 ], [ 0,1,0,0 ], [ 0,0,1,0 ], [ 0,0,0,1 ] ); };
  static rotation( angle, x,y,z )
    {                                               // rotation(): Requires a scalar (angle) and a three-component axis vector.
      const normalize = ( x,y,z ) =>
        { const n = Math.sqrt( x*x + y*y + z*z );
          return [ x/n, y/n, z/n ]
        }
      let [ i, j, k ] = normalize( x,y,z ), 
             [ c, s ] = [ Math.cos( angle ), Math.sin( angle ) ],
                  omc = 1.0 - c;
      return Matrix.of( [ i*i*omc + c,   i*j*omc - k*s, i*k*omc + j*s, 0 ],
                        [ i*j*omc + k*s, j*j*omc + c,   j*k*omc - i*s, 0 ],
                        [ i*k*omc - j*s, j*k*omc + i*s, k*k*omc + c,   0 ],
                        [ 0,             0,             0,             1 ] );
    }
  static scale( x,y,z )
    {                                               // scale(): Builds and returns a scale matrix using x,y,z.
      return Matrix.of( [ x, 0, 0, 0 ],
                        [ 0, y, 0, 0 ],
                        [ 0, 0, z, 0 ],
                        [ 0, 0, 0, 1 ] );
    }
  static translation( x,y,z ) 
    {                                               // translation(): Builds and returns a translation matrix using x,y,z.
      return Matrix.of( [ 1, 0, 0, x ],
                        [ 0, 1, 0, y ],
                        [ 0, 0, 1, z ],
                        [ 0, 0, 0, 1 ] );
    }
  static look_at( eye, at, up )                      
    {                                   // look_at():  Produce a traditional graphics camera "lookat" matrix.
                                        // Each input must be a 3x1 Vector.
                                        // Note:  look_at() assumes the result will be used for a camera and stores its
                                        // result in inverse space.  
                                        // If you want to use look_at to point a non-camera towards something, you can
                                        // do so, but to generate the correct basis you must re-invert its result.
  
          // Compute vectors along the requested coordinate axes. "y" is the "updated" and orthogonalized local y axis.
      let z = at.minus( eye ).normalized(),
          x =  z.cross( up  ).normalized(),
          y =  x.cross( z   ).normalized();
          
                             // Check for NaN, indicating a degenerate cross product, which 
                             // happens if eye == at, or if at minus eye is parallel to up.
      if( !x.every( i => i==i ) )                  
        throw "Two parallel vectors were given";
      z.scale_by( -1 );                               // Enforce right-handed coordinate system.                                   
      return Mat4.translation( -x.dot( eye ), -y.dot( eye ), -z.dot( eye ) )
             .times( Matrix.of( x.to4(0), y.to4(0), z.to4(0), vec4( 0,0,0,1 ) ) );
    }
  static orthographic( left, right, bottom, top, near, far )
    {                                                          // orthographic(): Box-shaped view volume for projection.
      return    Mat4.scale( vec3( 1/(right - left), 1/(top - bottom), 1/(far - near) ) )
        .times( Mat4.translation( vec3( -left - right, -top - bottom, -near - far ) ) )
        .times( Mat4.scale( vec3( 2, 2, -2 ) ) );
    }
  static perspective( fov_y, aspect, near, far )
    {                                                         // perspective(): Frustum-shaped view volume for projection.
      const f = 1/Math.tan( fov_y/2 ), d = far - near;
      return Matrix.of( [ f/aspect, 0,               0,               0 ],
                        [ 0,        f,               0,               0 ],
                        [ 0,        0, -(near+far) / d, -2*near*far / d ],
                        [ 0,        0,              -1,               0 ] );
    }
  static inverse( m )              
    {                         // inverse(): A 4x4 inverse.  Computing it is slow because of 
                              // the amount of steps; call fewer times when possible.
      const result = Mat4.identity(), m00 = m[0][0], m01 = m[0][1], m02 = m[0][2], m03 = m[0][3],
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
