export const math = {};

const Vector = math.Vector =
  class Vector extends Float32Array {
      // See description at https://github.com/encyclopedia-of-code/tiny-graphics-js/wiki/tiny-graphics-math.js
      static create (...arr) {
          return new Vector (arr);
      }
      copy () { return new Vector (this); }
      equals (b) { return this.every ((x, i) => x == b[ i ]); }
      plus (b) { return this.map ((x, i) => x + b[ i ]); }
      minus (b) { return this.map ((x, i) => x - b[ i ]); }
      times_pairwise (b) { return this.map ((x, i) => x * b[ i ]); }
      scale_by (s) { this.forEach ((x, i, a) => a[ i ] *= s); }
      times (s) { return this.map (x => s * x); }
      randomized (s) { return this.map (x => x + s * (Math.random () - .5)); }
      mix (b, s) { return this.map ((x, i) => (1 - s) * x + s * b[ i ]); }
      norm () { return Math.sqrt (this.dot (this)); }
      normalized () { return this.times (1 / this.norm ()); }
      normalize () { this.scale_by (1 / this.norm ()); }
      dot (b) {
          if (this.length == 2)                    // Optimize for Vectors of size 2
              return this[ 0 ] * b[ 0 ] + this[ 1 ] * b[ 1 ];
          return this.reduce ((acc, x, i) => { return acc + x * b[ i ]; }, 0);
      }
      static cast (...args) { return args.map (x => Vector.from (x)); }
      to3 () { return vec3 (this[ 0 ], this[ 1 ], this[ 2 ]); }
      to4 (is_a_point) { return vec4 (this[ 0 ], this[ 1 ], this[ 2 ], +is_a_point); }
      cross (b) {
          return vec3 (this[ 1 ] * b[ 2 ] - this[ 2 ] * b[ 1 ], this[ 2 ] * b[ 0 ] - this[ 0 ] * b[ 2 ],
                       this[ 0 ] * b[ 1 ] - this[ 1 ] * b[ 0 ]);
      }
      to_string () { return "[vector " + this.join (", ") + "]"; }
  };


const Vector3 = math.Vector3 =
  class Vector3 extends Float32Array {
      // **Vector3** is a specialization of Vector only for size 3, for performance reasons.
      // See description at https://github.com/encyclopedia-of-code/tiny-graphics-js/wiki/tiny-graphics-math.js#vector3
      static create (x, y, z) {
          const v = new Vector3 (3);
          v[ 0 ]  = x;
          v[ 1 ]  = y;
          v[ 2 ]  = z;
          return v;
      }
      copy () { return Vector3.from (this); }
      // In-fix operations
      equals (b) { return this[ 0 ] === b[ 0 ] && this[ 1 ] === b[ 1 ] && this[ 2 ] === b[ 2 ]; }
      plus (b) { return vec3 (this[ 0 ] + b[ 0 ], this[ 1 ] + b[ 1 ], this[ 2 ] + b[ 2 ]); }
      minus (b) { return vec3 (this[ 0 ] - b[ 0 ], this[ 1 ] - b[ 1 ], this[ 2 ] - b[ 2 ]); }
      times (s) { return vec3 (this[ 0 ] * s, this[ 1 ] * s, this[ 2 ] * s); }
      times_pairwise (b) { return vec3 (this[ 0 ] * b[ 0 ], this[ 1 ] * b[ 1 ], this[ 2 ] * b[ 2 ]); }
      // Pre-fix operations
      add_by (b) {
          this[ 0 ] += b[ 0 ];
          this[ 1 ] += b[ 1 ];
          this[ 2 ] += b[ 2 ];
      }
      subtract_by (b) {
          this[ 0 ] -= b[ 0 ];
          this[ 1 ] -= b[ 1 ];
          this[ 2 ] -= b[ 2 ];
      }
      scale_by (s) {
          this[ 0 ] *= s;
          this[ 1 ] *= s;
          this[ 2 ] *= s;
      }
      scale_pairwise_by (b) {
          this[ 0 ] *= b[ 0 ];
          this[ 1 ] *= b[ 1 ];
          this[ 2 ] *= b[ 2 ];
      }
      // Other operations:
      randomized (s) {
          return vec3 (this[ 0 ] + s * (Math.random () - .5),
                       this[ 1 ] + s * (Math.random () - .5),
                       this[ 2 ] + s * (Math.random () - .5));
      }
      mix (b, s) {
          return vec3 ((1 - s) * this[ 0 ] + s * b[ 0 ],
                       (1 - s) * this[ 1 ] + s * b[ 1 ],
                       (1 - s) * this[ 2 ] + s * b[ 2 ]);
      }
      norm () { return Math.sqrt (this[ 0 ] * this[ 0 ] + this[ 1 ] * this[ 1 ] + this[ 2 ] * this[ 2 ]); }
      normalized () {
          const d = 1 / this.norm ();
          return vec3 (this[ 0 ] * d, this[ 1 ] * d, this[ 2 ] * d);
      }
      normalize () {
          const d = 1 / this.norm ();
          this[ 0 ] *= d;
          this[ 1 ] *= d;
          this[ 2 ] *= d;
      }
      dot (b) { return this[ 0 ] * b[ 0 ] + this[ 1 ] * b[ 1 ] + this[ 2 ] * b[ 2 ]; }
      cross (b) {
          return vec3 (this[ 1 ] * b[ 2 ] - this[ 2 ] * b[ 1 ],
                       this[ 2 ] * b[ 0 ] - this[ 0 ] * b[ 2 ],
                       this[ 0 ] * b[ 1 ] - this[ 1 ] * b[ 0 ]);
      }
      static cast (...args) {
          return args.map (x => Vector3.from (x));
      }
      static shared_memory = Vector3.create (0, 0, 0);
      static unsafe (x, y, z) {
          Vector3.shared_memory[ 0 ] = x;
          Vector3.shared_memory[ 1 ] = y;
          Vector3.shared_memory[ 2 ] = z;
          return Vector3.shared_memory;
      }
      to4 (is_a_point) { return vec4 (this[ 0 ], this[ 1 ], this[ 2 ], +is_a_point); }
      to_string () { return "[vec3 " + this.join (", ") + "]"; }
  };

const Vector4 = math.Vector4 =
  class Vector4 extends Float32Array {
      // **Vector4** is a specialization of Vector only for size 4, for performance reasons.
      // See description at https://github.com/encyclopedia-of-code/tiny-graphics-js/wiki/tiny-graphics-math.js#vector4
      static create (x, y, z, w) {
          const v = new Vector4 (4);
          v[ 0 ]  = x;
          v[ 1 ]  = y;
          v[ 2 ]  = z;
          v[ 3 ]  = w;
          return v;
      }
      copy () { return Vector4.from (this); }
      // In-fix operations:
      equals (b) {
          return this[ 0 ] === b[ 0 ] && this[ 1 ] === b[ 1 ] && this[ 2 ] === b[ 2 ] && this[ 3 ] === b[ 3 ];
      }
      plus (b) { return vec4 (this[ 0 ] + b[ 0 ], this[ 1 ] + b[ 1 ], this[ 2 ] + b[ 2 ], this[ 3 ] + b[ 3 ]); }
      minus (b) { return vec4 (this[ 0 ] - b[ 0 ], this[ 1 ] - b[ 1 ], this[ 2 ] - b[ 2 ], this[ 3 ] - b[ 3 ]); }
      times (s) { return vec4 (this[ 0 ] * s, this[ 1 ] * s, this[ 2 ] * s, this[ 3 ] * s); }
      times_pairwise (b) {
          return vec4 (this[ 0 ] * b[ 0 ], this[ 1 ] * b[ 1 ], this[ 2 ] * b[ 2 ], this[ 3 ] * b[ 3 ]);
      }
      // Pre-fix operations:
      add_by (b) {
          this[ 0 ] += b[ 0 ];
          this[ 1 ] += b[ 1 ];
          this[ 2 ] += b[ 2 ];
          this[ 3 ] += b[ 3 ];
      }
      subtract_by (b) {
          this[ 0 ] -= b[ 0 ];
          this[ 1 ] -= b[ 1 ];
          this[ 2 ] -= b[ 2 ];
          this[ 3 ] -= b[ 3 ];
      }
      scale_by (s) {
          this[ 0 ] *= s;
          this[ 1 ] *= s;
          this[ 2 ] *= s;
          this[ 3 ] *= s;
      }
      scale_pairwise_by (b) {
          this[ 0 ] *= b[ 0 ];
          this[ 1 ] *= b[ 1 ];
          this[ 2 ] *= b[ 2 ];
          this[ 3 ] *= b[ 3 ];
      }
      // Other operations:
      randomized (s) {
          return vec4 (this[ 0 ] + s * (Math.random () - .5),
                       this[ 1 ] + s * (Math.random () - .5),
                       this[ 2 ] + s * (Math.random () - .5),
                       this[ 3 ] + s * (Math.random () - .5));
      }
      mix (b, s) {
          return vec4 ((1 - s) * this[ 0 ] + s * b[ 0 ],
                       (1 - s) * this[ 1 ] + s * b[ 1 ],
                       (1 - s) * this[ 2 ] + s * b[ 2 ],
                       (1 - s) * this[ 3 ] + s * b[ 3 ]);
      }
      // The norms should behave like for Vector3 because of the homogenous format.
      norm () { return Math.sqrt (this[ 0 ] * this[ 0 ] + this[ 1 ] * this[ 1 ] + this[ 2 ] * this[ 2 ]); }
      normalized () {
          const d = 1 / this.norm ();
          return vec4 (this[ 0 ] * d, this[ 1 ] * d, this[ 2 ] * d, this[ 3 ]);    // (leaves the 4th coord alone)
      }
      normalize () {
          const d = 1 / this.norm ();
          this[ 0 ] *= d;
          this[ 1 ] *= d;
          this[ 2 ] *= d;                 // (leaves the 4th coord alone)
      }
      dot (b) { return this[ 0 ] * b[ 0 ] + this[ 1 ] * b[ 1 ] + this[ 2 ] * b[ 2 ] + this[ 3 ] * b[ 3 ]; }
      static cast (...args) {
          return args.map (x => Vector4.from (x));
      }
      static shared_memory = Vector4.create (0, 0, 0, 0);
      static unsafe (x, y, z, w) {
          Vector4.shared_memory[ 0 ] = x;
          Vector4.shared_memory[ 1 ] = y;
          Vector4.shared_memory[ 2 ] = z;
          Vector4.shared_memory[ 3 ] = w;
          return Vector4.shared_memory;
      }
      to3 () { return vec3 (this[ 0 ], this[ 1 ], this[ 2 ]); }
      to_string () { return "[vec4 " + this.join (", ") + "]"; }
  };

// See description at https://github.com/encyclopedia-of-code/tiny-graphics-js/wiki/tiny-graphics-math.js#shorthand
const vec     = math.vec = Vector.create;
const vec3    = math.vec3 = Vector3.create;
const vec4    = math.vec4 = Vector4.create;
const unsafe3 = math.unsafe3 = Vector3.unsafe;
const unsafe4 = math.unsafe4 = Vector4.unsafe;
const color   = math.color = Vector4.create;


// Part II: Matrices:   *************************************************************************************

const Matrix = math.Matrix =
  class Matrix extends Array {
      // See description at https://github.com/encyclopedia-of-code/tiny-graphics-js/wiki/tiny-graphics-math.js#matrix
      constructor (...args) {
          super (0);
          this.push (...args);
      }
      set (M) {
          this.length = 0;
          this.push (...M);
      }
      set_identity (m, n) {
          this.length = 0;
          for (let i = 0; i < m; i++) {
              this.push (Array (n).fill (0));
              if (i < n) this[ i ][ i ] = 1;
          }
      }
      sub_block (start, end) {
          return Matrix.from (this.slice (start[ 0 ], end[ 0 ]).map (r => r.slice (start[ 1 ], end[ 1 ])));
      }
      copy () { return this.map (r => [...r]); }
      equals (b) { return this.every ((r, i) => r.every ((x, j) => x == b[ i ][ j ])); }
      plus (b) { return this.map ((r, i) => r.map ((x, j) => x + b[ i ][ j ])); }
      minus (b) { return this.map ((r, i) => r.map ((x, j) => x - b[ i ][ j ])); }
      transposed () { return this.map ((r, i) => r.map ((x, j) => this[ j ][ i ])); }
      times (b, optional_preallocated_result) {
          const len = b.length;
          if (typeof len === "undefined") return this.map (r => r.map (x => b * x));   // Matrix * scalar case.
          const len2 = b[ 0 ].length;
          if (typeof len2 === "undefined") {
              let result = optional_preallocated_result || new Vector4 (this.length);     // Matrix * Vector4 case.
              for (let r = 0; r < len; r++) result[ r ] = b.dot (this[ r ]);
              return result;
          }
          let result = optional_preallocated_result || Matrix.from (new Array (this.length));
          for (let r = 0; r < this.length; r++)                                         // Matrix * Matrix case.
          {
              if ( !optional_preallocated_result)
                  result[ r ] = new Array (len2);
              for (let c = 0, sum = 0; c < len2; c++) {
                  result[ r ][ c ] = 0;
                  for (let r2 = 0; r2 < len; r2++)
                      result[ r ][ c ] += this[ r ][ r2 ] * b[ r2 ][ c ];
              }
          }
          return result;
      }
      pre_multiply (b) {
          const new_value = b.times (this);
          this.length     = 0;
          this.push (...new_value);
          return this;
      }
      post_multiply (b) {
          const new_value = this.times (b);
          this.length     = 0;
          this.push (...new_value);
          return this;
      }
      static flatten_2D_to_1D (M) {
          let index = 0, floats = new Float32Array (M.length && M.length * M[ 0 ].length);
          for (let i = 0; i < M.length; i++) for (let j = 0; j < M[ i ].length; j++) floats[ index++ ] = M[ i ][ j ];
          return floats;
      }
      to_string () { return "[" + this.map ((r, i) => "[" + r.join (", ") + "]").join (" ") + "]"; }
  };


const Mat4 = math.Mat4 =
  class Mat4 extends Matrix {
      // See description at https://github.com/encyclopedia-of-code/tiny-graphics-js/wiki/tiny-graphics-math.js#mat4
      static identity () { return Matrix.of ([1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]); };
      static rotation (angle, x, y, z) {
          const normalize = (x, y, z) => {
              const n = Math.sqrt (x * x + y * y + z * z);
              return [x / n, y / n, z / n];
          };
          let [i, j, k]   = normalize (x, y, z),
              [c, s]      = [Math.cos (angle), Math.sin (angle)],
              omc         = 1.0 - c;
          return Matrix.of ([i * i * omc + c, i * j * omc - k * s, i * k * omc + j * s, 0],
                            [i * j * omc + k * s, j * j * omc + c, j * k * omc - i * s, 0],
                            [i * k * omc - j * s, j * k * omc + i * s, k * k * omc + c, 0],
                            [0, 0, 0, 1]);
      }
      static scale (x, y, z) {
          return Matrix.of ([x, 0, 0, 0],
                            [0, y, 0, 0],
                            [0, 0, z, 0],
                            [0, 0, 0, 1]);
      }
      static translation (x, y, z) {
          return Matrix.of ([1, 0, 0, x],
                            [0, 1, 0, y],
                            [0, 0, 1, z],
                            [0, 0, 0, 1]);
      }
      static look_at (eye, at, up) {
          // Compute vectors along the requested coordinate axes. "y" is the "updated" and orthogonalized local y axis.
          let z = at.minus (eye).normalized (),
              x = z.cross (up).normalized (),
              y = x.cross (z).normalized ();

          // Check for NaN, indicating a degenerate cross product, which happens if eye == at, or if
          // at minus eye is parallel to up.
          if ( !x.every (i => i == i))
              throw "Two parallel vectors were given";
          z.scale_by (-1);                               // Enforce right-handed coordinate system.
          return Mat4.translation (-x.dot (eye), -y.dot (eye), -z.dot (eye))
                     .times (Matrix.of (x.to4 (0), y.to4 (0), z.to4 (0), vec4 (0, 0, 0, 1)));
      }
      static orthographic (left, right, bottom, top, near, far) {
          return Mat4.scale(1 / (right - left), 1 / (top - bottom), 1 / (far - near))
              .times(Mat4.translation(-left - right, -top - bottom, -near - far))
              .times(Mat4.scale(2, 2, -2));
      }
      static perspective (fov_y, aspect, near, far) {
          const f = 1 / Math.tan (fov_y / 2), d = far - near;
          return Matrix.of ([f / aspect, 0, 0, 0],
                            [0, f, 0, 0],
                            [0, 0, -(near + far) / d, -2 * near * far / d],
                            [0, 0, -1, 0]);
      }
      static inverse (m) {
          const result               = Mat4.identity ();
          const [m00, m01, m02, m03] = [m[ 0 ][ 0 ], m[ 0 ][ 1 ], m[ 0 ][ 2 ], m[ 0 ][ 3 ]],
                [m10, m11, m12, m13] = [m[ 1 ][ 0 ], m[ 1 ][ 1 ], m[ 1 ][ 2 ], m[ 1 ][ 3 ]],
                [m20, m21, m22, m23] = [m[ 2 ][ 0 ], m[ 2 ][ 1 ], m[ 2 ][ 2 ], m[ 2 ][ 3 ]],
                [m30, m31, m32, m33] = [m[ 3 ][ 0 ], m[ 3 ][ 1 ], m[ 3 ][ 2 ], m[ 3 ][ 3 ]];

          result[ 0 ][ 0 ] = m12 * m23 * m31 - m13 * m22 * m31 + m13 * m21 * m32 -
                             m11 * m23 * m32 - m12 * m21 * m33 + m11 * m22 * m33;
          result[ 0 ][ 1 ] = m03 * m22 * m31 - m02 * m23 * m31 - m03 * m21 * m32 +
                             m01 * m23 * m32 + m02 * m21 * m33 - m01 * m22 * m33;
          result[ 0 ][ 2 ] = m02 * m13 * m31 - m03 * m12 * m31 + m03 * m11 * m32 -
                             m01 * m13 * m32 - m02 * m11 * m33 + m01 * m12 * m33;
          result[ 0 ][ 3 ] = m03 * m12 * m21 - m02 * m13 * m21 - m03 * m11 * m22 +
                             m01 * m13 * m22 + m02 * m11 * m23 - m01 * m12 * m23;
          result[ 1 ][ 0 ] = m13 * m22 * m30 - m12 * m23 * m30 - m13 * m20 * m32 +
                             m10 * m23 * m32 + m12 * m20 * m33 - m10 * m22 * m33;
          result[ 1 ][ 1 ] = m02 * m23 * m30 - m03 * m22 * m30 + m03 * m20 * m32 -
                             m00 * m23 * m32 - m02 * m20 * m33 + m00 * m22 * m33;
          result[ 1 ][ 2 ] = m03 * m12 * m30 - m02 * m13 * m30 - m03 * m10 * m32 +
                             m00 * m13 * m32 + m02 * m10 * m33 - m00 * m12 * m33;
          result[ 1 ][ 3 ] = m02 * m13 * m20 - m03 * m12 * m20 + m03 * m10 * m22 -
                             m00 * m13 * m22 - m02 * m10 * m23 + m00 * m12 * m23;
          result[ 2 ][ 0 ] = m11 * m23 * m30 - m13 * m21 * m30 + m13 * m20 * m31 -
                             m10 * m23 * m31 - m11 * m20 * m33 + m10 * m21 * m33;
          result[ 2 ][ 1 ] = m03 * m21 * m30 - m01 * m23 * m30 - m03 * m20 * m31 +
                             m00 * m23 * m31 + m01 * m20 * m33 - m00 * m21 * m33;
          result[ 2 ][ 2 ] = m01 * m13 * m30 - m03 * m11 * m30 + m03 * m10 * m31 -
                             m00 * m13 * m31 - m01 * m10 * m33 + m00 * m11 * m33;
          result[ 2 ][ 3 ] = m03 * m11 * m20 - m01 * m13 * m20 - m03 * m10 * m21 +
                             m00 * m13 * m21 + m01 * m10 * m23 - m00 * m11 * m23;
          result[ 3 ][ 0 ] = m12 * m21 * m30 - m11 * m22 * m30 - m12 * m20 * m31 +
                             m10 * m22 * m31 + m11 * m20 * m32 - m10 * m21 * m32;
          result[ 3 ][ 1 ] = m01 * m22 * m30 - m02 * m21 * m30 + m02 * m20 * m31 -
                             m00 * m22 * m31 - m01 * m20 * m32 + m00 * m21 * m32;
          result[ 3 ][ 2 ] = m02 * m11 * m30 - m01 * m12 * m30 - m02 * m10 * m31 +
                             m00 * m12 * m31 + m01 * m10 * m32 - m00 * m11 * m32;
          result[ 3 ][ 3 ] = m01 * m12 * m20 - m02 * m11 * m20 + m02 * m10 * m21 -
                             m00 * m12 * m21 - m01 * m10 * m22 + m00 * m11 * m22;
          // Divide by determinant and return.
          return result.times (
            1 / (m00 * result[ 0 ][ 0 ] + m10 * result[ 0 ][ 1 ] + m20 * result[ 0 ][ 2 ] + m30 * result[ 0 ][ 3 ]));

      }
  };
