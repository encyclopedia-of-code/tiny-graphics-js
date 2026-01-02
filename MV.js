// Need loadVector test case: arr can be a plain array or a matvec.
// Need vec * mat test case, for both pre_multiply and multiply.
// Does quickClone really need to copy both buffers and index?

export class MatVec {
  constructor(data) {
    // Internally always has 2 buffers each length 16 (max for 4x4 matric)
    this.buffers = [new Float32Array(16), new Float32Array(16)];
    this.currentIndex = 0;
    this.size = 0; // Logical size: number of floats valid in buffers (3 for vec3, 4 for vec4, 16 for mat4)

    if (Array.isArray(data) && data.length) {
      if (Array.isArray(data[0])) {
        this.loadMatrix(data);
      } else {
        this.loadVector(data);
      }
    }
    return this;
  }

  get data() {
    return this.buffers[this.currentIndex];
  }
  get nextBuffer() {
    return this.buffers[1 - this.currentIndex];
  }

  static quick = new MatVec();
  static helper = new MatVec();
  quickClone() {
    const q = MatVec.quick;
    q.buffers[0].set(this.buffers[0]);
    q.buffers[1].set(this.buffers[1]);
    q.currentIndex = this.currentIndex;
    q.size = this.size;
    return q;
  }
  clone() {
    const copy = new MatVec([]);
    copy.currentIndex = 0;
    copy.size = this.size;
    copy.buffers[copy.currentIndex].set(this.data);
    copy.buffers[1 - copy.currentIndex].set(this.buffers[1 - this.currentIndex]);
    return copy;
  }

  // Load another matvec or a flat array as vector into first N positions, rest zero
  loadVector(arr) {   // arr can be a plain array or a matvec.
    const buf = this.data;
    this.size = arr.size || arr.length;
    for (let i = 0; i < this.size && i < 16; i++) {
      buf[i] = arr.size ? arr.data[i] : arr[i];
    }
    for (let i = this.size; i < 16; i++) buf[i] = 0;
    return this;
  }

  // Load matrix given array of rows, padded to 4x4, row-major order
  loadMatrix(rowsArr) {
    const buf = this.data;
    buf.fill(0);
    for (let r = 0; r < Math.min(rowsArr.length, 4); r++)
      for (let c = 0; c < Math.min(rowsArr[r].length, 4); c++)
        buf[r * 4 + c] = rowsArr[r][c];
    this.size = 16;
  }

  equals(other, eps = 1e-6) {
    if (this.size !== other.size) return false;
    const a = this.data, b = other.data;
    for (let i = 0; i < this.size; i++)
      if (Math.abs(a[i] - b[i]) > eps) return false;
    return true;
  }

  add(other) {
    if (this.size !== other.size)
      throw new Error("Size mismatch in add()");
    const a = this.data, b = other.data, out = this.nextBuffer;
    for (let i = 0; i < this.size; i++) out[i] = a[i] + b[i];
    this.currentIndex = 1 - this.currentIndex;
    return this;
  }

  subtract(other) {
    if (this.size !== other.size)
      throw new Error("Size mismatch in subtract()");
    const a = this.data, b = other.data, out = this.nextBuffer;
    for (let i = 0; i < this.size; i++) out[i] = a[i] - b[i];
    this.currentIndex = 1 - this.currentIndex;
    return this;
  }

  dot(other) {
    if (this.size !== other.size)
      throw new Error("Dot product size mismatch.");
    const a = this.data, b = other.data;
    let sum = 0;
    for (let i = 0; i < this.size; i++) sum += a[i] * b[i];
    return sum;
  }

  norm() {
    let sum = 0;
    const a = this.data;
    for (let i = 0; i < this.size; i++) sum += a[i] * a[i];
    return Math.sqrt(sum);
  }

  normalize() {
    const n = this.norm();
    if (n === 0) return this;
    const a = this.data, out = this.nextBuffer;
    for (let i = 0; i < this.size; i++) out[i] = a[i] / n;
    this.currentIndex = 1 - this.currentIndex;
    return this;
  }

  random(magnitude = 1, size = 3) {
    this.size = size;
    const out = this.nextBuffer;
    for (let i = 0; i < size; i++)
      out[i] = ( Math.random() * 2 - 1 ) * magnitude;
    for (let i = size; i < 16; i++) out[i] = 0;
    this.currentIndex = 1 - this.currentIndex;
    return this;
  }

  mix(other, t) {
    if (this.size !== other.size) throw new Error("mix size mismatch");
    const a = this.data;
    const b = other.data;
    const out = this.nextBuffer;
    for(let i=0; i < this.size; i++)
      out[i] = a[i] * (1 - t) + b[i] * t;
    for(let i=this.size; i <16; i++) out[i] = 0;
    this.currentIndex = 1 - this.currentIndex;
    return this;
  }

  cross(other) {
    if (this.size !== 3 || other.size !== 3)
      throw new Error("Cross product only valid for vec3");
    const a = this.data, b = other.data, out = this.nextBuffer;
    out[0] = a[1] * b[2] - a[2] * b[1];
    out[1] = a[2] * b[0] - a[0] * b[2];
    out[2] = a[0] * b[1] - a[1] * b[0];
    for (let i = 3; i < 16; i++) out[i] = 0;
    this.currentIndex = 1 - this.currentIndex;
    return this;
  }

  set_identity() {
    const buf = this.data;
    buf.fill(0);
    for(let i=0; i<4; i++)
      buf[i*5] = 1;
    this.size = 16;
    return this;
  }

  // Convert current logical size to vector3 (3 floats)
  to3() {
    this.size = 3;
    return this;
  }

  // Convert current logical size to vector4 (4 floats)
  to4(fourth) {
    this.size = 4;
    this.data[3] = fourth;
    return this;
  }

  // Convert current logical size to matrix4x4 (16 floats)
  toMatrix4() {
    this.size = 16;
    return this;
  }
/*
 * OLD:
  multiply(other) {
    const a = this.data;
    const out = this.nextBuffer;

    if (typeof other === 'number') {
      // Scalar multiply
      for (let i = 0; i < this.size; i++) out[i] = a[i] * other;
      for (let i = this.size; i < 16; i++) out[i] = 0;
      this.currentIndex = 1 - this.currentIndex;
      return this;
    }

    const b = other.data;

    // Elementwise multiply for vec3 and vec4 same size inputs
    if ((this.size === 3 || this.size === 4) && other.size === this.size) {
      for (let i = 0; i < this.size; i++) out[i] = a[i] * b[i];
      for (let i = this.size; i < 16; i++) out[i] = 0;
      this.currentIndex = 1 - this.currentIndex;
      return this;
    }

    if (this.size === 16 && (other.size === 16 || other.size === 3 || other.size === 4)) {
      // Combine matrix * matrix and matrix * vector multiplication
      const isMatrix = other.size === 16;
      let outputCols = isMatrix ? 4 : 1;
      let vecLen = isMatrix ? 4 : other.size;

      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < outputCols; col++) {
          out[row * outputCols + col] = 0;
          for (let k = 0; k < vecLen; k++) {
            out[row * outputCols + col] += a[row * 4 + k] * b[k * outputCols + col * isMatrix];
          }
          if( vecLen === 3 ) {
            out[row * outputCols + col] += a[row * 4 + 3] * 1;   // Homogenize vec3s to positions by convention.
          }
        }
      }
      this.size = (outputCols === 4) ? 16 : vecLen;
      for (let i = this.size; i < 16; i++) out[i] = 0;
      this.currentIndex = 1 - this.currentIndex;
      return this;
    }

    throw new Error("Unsupported multiply for sizes " + this.size + " and " + other.size);
  }
  */

  multiply(other) {
    const out = this.nextBuffer;
    const a = this.data;
    if (typeof other === 'number') {
      // Scalar multiply
      for (let i = 0; i < this.size; i++) out[i] = a[i] * other;
      for (let i = this.size; i < 16; i++) out[i] = 0;
      this.currentIndex = 1 - this.currentIndex;
      return this;
    }
    const b = other.data;
    const aRows  = (this.size == 16 ? 4 : 1);
    const aCols = (this.size == 16 ? 4 : this.size);
    const bCols = (other.size == 16 ? 4 : 1);
    const outputCols = (aRows == 4 ? bCols : 1);

    // Elementwise multiply for vec3 and vec4 same size inputs
    if ((this.size === 3 || this.size === 4) && other.size === this.size) {
      for (let i = 0; i < this.size; i++) out[i] = a[i] * b[i];
      for (let i = this.size; i < 16; i++) out[i] = 0;
      this.currentIndex = 1 - this.currentIndex;
      return this;
    }

    // Combine matrix * matrix and matrix * vector and vector * matrix multiplication.
    for (let row = 0; row < aRows; row++) {
      for (let col = 0; col < outputCols; col++) {
        out[row * outputCols + col] = 0;
        for (let k = 0; k < aCols; k++) {
          out[row * outputCols + col] += a[row * aCols + k] * b[k * bCols + col];
        }
        if( other.size == 3 ) {
          out[row * outputCols + col] += a[row * aCols + 3] * 1; // Homogenize vec3s to positions by convention.
        }
      }
    }
    this.size = aRows * bCols;
    // If we multiply by a vec3, assume we want a vec3 result.
    if( this.size == 4 && other.size == 3 ) this.size = 3;
    for (let i = this.size; i < 16; i++) out[i] = 0;
    this.currentIndex = 1 - this.currentIndex;
    return this;
  }

  pre_multiply(other) {
    const out = this.nextBuffer;
    const a = other.data;
    const b = this.data;
    const aRows  = (other.size == 16 ? 4 : 1);
    const aCols = (other.size == 16 ? 4 : other.size);
    const bCols = (this.size == 16 ? 4 : 1);
    const outputCols = (aRows == 4 ? bCols : 1);

    for (let row = 0; row < aRows; row++) {
      for (let col = 0; col < outputCols; col++) {
        out[row * outputCols + col] = 0;
        for (let k = 0; k < aCols; k++) {
          out[row * outputCols + col] += a[row * aCols + k] * b[k * bCols + col];
        }
      }
    }
    this.size = aRows * bCols;
    this.currentIndex = 1 - this.currentIndex;
    return this;

    // TODO: Specialized unrolled branches for Mat4*Mat4 and Mat4*Vec4.  In gl-matrix, outside the innermost loop
    // they cache whichever multiplicand gets reused as the innermost loop index varies - i.e. the current row.
  }
 //   Old:
 //   const temp = other.clone().multiply(this).data;
 //   for (let i = 0; i < this.size; i++) out[i] = temp[i];
 //   this.currentIndex = 1 - this.currentIndex;
 //   return this;

  toString() {
    const d = this.data;
    if (this.size === 16) {
      // 4x4 matrix: each row is 4 values
      return Array.from({length: 4}, (_, i) =>
        d.slice(i*4, i*4+4).map(x => x.toFixed(2)).join(" ")
      ).join(" | ");
    } else {
      // Vector: simply display as [x, y, z]
      return d.slice(0, this.size).map(x => x.toFixed(3)).join(" ");
    }
  }

  get value() {
    return this.toString();
  }

  rotate(angle, x, y, z) {
    const len = Math.sqrt(x*x + y*y + z*z);
    if (len === 0) throw new Error("Rotation axis zero length");
    x /= len; y /= len; z /= len;
    const c = Math.cos(angle), s = Math.sin(angle), t = 1 - c;

    const rotMat = MatVec.helper;
    rotMat.loadMatrix([
      [t*x*x + c,   t*x*y - s*z, t*x*z + s*y, 0],
      [t*x*y + s*z, t*y*y + c,   t*y*z - s*x, 0],
      [t*x*z - s*y, t*y*z + s*x, t*z*z + c,   0],
      [0,           0,           0,           1]
    ]);
    return this.multiply(rotMat);
  }

  scale(x, y, z) {
    if( x.data ) {
      const d = x.data;
      x = d[0]; y = d[1]; z = d[2];
    }
    const scaleMat = MatVec.helper;
    scaleMat.loadMatrix([
      [x, 0, 0, 0],
      [0, y, 0, 0],
      [0, 0, z, 0],
      [0, 0, 0, 1]
    ]);
    return this.multiply(scaleMat);
  }

  translate(dx, dy, dz) {
    if( dx.data ) {
      const d = dx.data;
      dx = d[0]; dy = d[1]; dz = d[2];
    }
    const transMat = MatVec.helper;
    transMat.loadMatrix([
      [1, 0, 0, dx],
      [0, 1, 0, dy],
      [0, 0, 1, dz],
      [0, 0, 0, 1]
    ]);
    return this.multiply(transMat);
  }

  look_at(eye, at, up) {
    let z = at.clone().subtract(eye);
    let zNorm = z.norm();
    if (zNorm === 0) throw new Error("look_at eye and at cannot be the same");
    z = z.multiply(1 / zNorm);

    let x = z.clone().cross(up);
    let xNorm = x.norm();
    if (xNorm === 0) throw new Error("look_at up vector parallel to view direction");
    x = x.multiply(1 / xNorm);

    let y = x.clone().cross(z);

    z.multiply(-1); // Enforce right-handed coordinate system.

    this.loadMatrix([
      [x.data[0], x.data[1], x.data[2], -x.dot(eye)],
      [y.data[0], y.data[1], y.data[2], -y.dot(eye)],
      [z.data[0], z.data[1], z.data[2], -z.dot(eye)],
      [0, 0, 0, 1]
    ]);
    return this;
  }

  orthographic(left, right, bottom, top, near, far) {
    const tx = -(right + left) / (right - left);
    const ty = -(top + bottom) / (top - bottom);
    const tz = -(far + near) / (far - near);

    this.loadMatrix([
      [2 / (right - left), 0, 0, tx],
      [0, 2 / (top - bottom), 0, ty],
      [0, 0, -2 / (far - near), tz],
      [0, 0, 0, 1]
    ]);
    return this;
  }

  perspective(fovY, aspect, near, far) {
    const f = 1 / Math.tan(fovY / 2);
    const d = far - near;

    this.loadMatrix([
      [f / aspect, 0, 0, 0],
      [0, f, 0, 0],
      [0, 0, -(far + near) / d, (-2 * near * far) / d],
      [0, 0, -1, 0]
    ]);
    return this;
  }

  transpose() {
    const out = this.nextBuffer;
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 4; col++)
        out[col * 4 + row] = this.data[row * 4 + col];
    this.currentIndex = 1 - this.currentIndex;
    return this;
    // Transposing a vector = undefined behavior.
  }

  invert() {
    const m = this.data;
    const out = this.nextBuffer;

    const m00 = m[0],  m01 = m[1],  m02 = m[2],  m03 = m[3];
    const m10 = m[4],  m11 = m[5],  m12 = m[6],  m13 = m[7];
    const m20 = m[8],  m21 = m[9],  m22 = m[10], m23 = m[11];
    const m30 = m[12], m31 = m[13], m32 = m[14], m33 = m[15];

    out[0]  = m12 * m23 * m31 - m13 * m22 * m31 + m13 * m21 * m32 - m11 * m23 * m32 - m12 * m21 * m33 + m11 * m22 * m33;
    out[1]  = m03 * m22 * m31 - m02 * m23 * m31 - m03 * m21 * m32 + m01 * m23 * m32 + m02 * m21 * m33 - m01 * m22 * m33;
    out[2]  = m02 * m13 * m31 - m03 * m12 * m31 + m03 * m11 * m32 - m01 * m13 * m32 - m02 * m11 * m33 + m01 * m12 * m33;
    out[3]  = m03 * m12 * m21 - m02 * m13 * m21 - m03 * m11 * m22 + m01 * m13 * m22 + m02 * m11 * m23 - m01 * m12 * m23;
    out[4]  = m13 * m22 * m30 - m12 * m23 * m30 - m13 * m20 * m32 + m10 * m23 * m32 + m12 * m20 * m33 - m10 * m22 * m33;
    out[5]  = m02 * m23 * m30 - m03 * m22 * m30 + m03 * m20 * m32 - m00 * m23 * m32 - m02 * m20 * m33 + m00 * m22 * m33;
    out[6]  = m03 * m12 * m30 - m02 * m13 * m30 - m03 * m10 * m32 + m00 * m13 * m32 + m02 * m10 * m33 - m00 * m12 * m33;
    out[7]  = m02 * m13 * m20 - m03 * m12 * m20 + m03 * m10 * m22 - m00 * m13 * m22 - m02 * m10 * m23 + m00 * m12 * m23;
    out[8]  = m11 * m23 * m30 - m13 * m21 * m30 + m13 * m20 * m31 - m10 * m23 * m31 - m11 * m20 * m33 + m10 * m21 * m33;
    out[9]  = m03 * m21 * m30 - m01 * m23 * m30 - m03 * m20 * m31 + m00 * m23 * m31 + m01 * m20 * m33 - m00 * m21 * m33;
    out[10] = m01 * m13 * m30 - m03 * m11 * m30 + m03 * m10 * m31 - m00 * m13 * m31 - m01 * m10 * m33 + m00 * m11 * m33;
    out[11] = m03 * m11 * m20 - m01 * m13 * m20 - m03 * m10 * m21 + m00 * m13 * m21 + m01 * m10 * m23 - m00 * m11 * m23;
    out[12] = m12 * m21 * m30 - m11 * m22 * m30 - m12 * m20 * m31 + m10 * m22 * m31 + m11 * m20 * m32 - m10 * m21 * m32;
    out[13] = m01 * m22 * m30 - m02 * m21 * m30 + m02 * m20 * m31 - m00 * m22 * m31 - m01 * m20 * m32 + m00 * m21 * m32;
    out[14] = m02 * m11 * m30 - m01 * m12 * m30 - m02 * m10 * m31 + m00 * m12 * m31 + m01 * m10 * m32 - m00 * m11 * m32;
    out[15] = m01 * m12 * m20 - m02 * m11 * m20 + m02 * m10 * m21 - m00 * m12 * m21 - m01 * m10 * m22 + m00 * m11 * m22;

    const det = m00 * out[0] + m10 * out[1] + m20 * out[2] + m30 * out[3];
    if (det === 0) throw new Error("Matrix not invertible");

    for (let i = 0; i < 16; i++) out[i] /= det;

    this.currentIndex = 1 - this.currentIndex;
    return this;
  }
}

// Helpers for easy creation
export function matvec(data) { return new MatVec(data); }

// Tests
(function(){
  // Example usage
  let mat = matvec([[1,0,0,2],[0,1,0,3],[0,0,1,4],[0,0,0,1]]); // matrix4x4 with translation
  let vec = matvec([5,6,7]); // vec3

  console.log("Matrix:");
  console.log(mat.toString());

  console.log("Vector:");
  console.log(vec.toString());

  let resVec = mat.clone().multiply(vec.quickClone().to4(1)).to3();
  console.log("Result mat * vec:");
  console.log(resVec.toString());


  function assert(condition, msg) {
    // if (!condition) throw new Error("Assertion failed: " + (msg || ""));
    if (!condition) console.log("Assertion failed: " + (msg || ""));
  }

  function arraysAlmostEqual(a, b, eps=1e-6) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++)
      if (Math.abs(a[i] - b[i]) > eps) return false;
    return true;
  }

  // 1. Vector equality
  let mv_1_1 = new MatVec([1,2,3]);
  let mv_1_2 = new MatVec([1,2,3]);
  assert(mv_1_1.equals(mv_1_2), "1. Vectors with identical data should be equal");

  // 2. quickClone mutation isolation
  let mv_2_orig = new MatVec([1,2,3]);
  let mv_2_qc = mv_2_orig.quickClone();
  mv_2_qc.add(new MatVec([1,1,1]));
  assert(arraysAlmostEqual(mv_2_qc.data.slice(0,3), [2,3,4]), "2. quickClone add updates correctly");
  assert(arraysAlmostEqual(mv_2_orig.data.slice(0,3), [1,2,3]), "2. Original unchanged after quickClone add");

  // 3. Matrix times vec3 vector (homogeneous position)
  let mv_3_mat = new MatVec([[1,0,0,10],[0,1,0,20],[0,0,1,30],[0,0,0,1]]);
  let mv_3_vec3 = new MatVec([3,4,5]);
  let mv_3_result = mv_3_mat.multiply(mv_3_vec3);
  assert(arraysAlmostEqual(mv_3_result.data.slice(0,3), [13,24,35]), "3. Matrix * vec3 gives transformed position");

  // 4. to4 sets fourth component correctly
  let mv_4 = new MatVec([1,2,3]);
  mv_4.to4(0);
  assert(mv_4.size === 4 && mv_4.data[3] === 0, "4. to4 sets fourth component to 0");
  mv_4.to4(1);
  assert(mv_4.data[3] === 1, "4. to4 updates fourth component to 1");

  // 5. Buffer swapping and chaining
  let mv_5_a = new MatVec([1,2,3]);
  let mv_5_b = new MatVec([3,2,1]);
  let mv_5_c = new MatVec([1,1,1]);
  let mv_5_chain = mv_5_a.clone().add(mv_5_b).subtract(mv_5_c).normalize();

  let mv_5_exp = [];
  for(let i=0; i<3; i++) mv_5_exp[i] = mv_5_a.data[i] + mv_5_b.data[i] - mv_5_c.data[i];
  let mv_5_n = Math.sqrt(mv_5_exp.reduce((s,x)=>s+x*x,0));
  for(let i=0; i<3; i++) mv_5_exp[i] /= mv_5_n;
  assert(arraysAlmostEqual(mv_5_chain.data.slice(0,3), mv_5_exp), "5. Chained add-subtract-normalize is correct");

  // 6. Scalar multiply chain doesn't corrupt input
  let mv_6_m = new MatVec([2,4,6]);
  let mv_6_m2 = mv_6_m.clone().multiply(2).multiply(0.5);
  assert(arraysAlmostEqual(mv_6_m.data.slice(0,3), [2,4,6]), "6. Scalar multiply does not change input");
  assert(arraysAlmostEqual(mv_6_m2.data.slice(0,3), [2,4,6]), "6. Chained scalar multiply consistent");

  // 7. Matrix × Matrix multiplication 4x4
  let mv_7_A = new MatVec([
    [1, 2, 3, 4],
    [5, 6, 7, 8],
    [9,10,11,12],
    [13,14,15,16]
  ]);
  let mv_7_B = new MatVec([
    [16,15,14,13],
    [12,11,10,9],
    [8,7,6,5],
    [4,3,2,1],
  ]);
  let mv_7_expected = [
    80,70,60,50,
    240,214,188,162,
    400,358,316,274,
    560,502,444,386
  ];

  let mv_7_C = mv_7_A.clone().multiply(mv_7_B);
  assert(mv_7_C.size === 16, "7. Matrix-matrix result size is 16");
  assert(arraysAlmostEqual(mv_7_C.data.slice(0,16), mv_7_expected), "7. Matrix * matrix correct");

  // 8. Matrix × vec4
  let mv_8_mat = new MatVec([[1,0,0,10],[0,1,0,20],[0,0,1,30],[0,0,0,1]]);
  let mv_8_vec4 = new MatVec([3,4,5,1]);
  let mv_8_result = mv_8_mat.multiply(mv_8_vec4);
  assert(mv_8_result.size === 4, "8. Matrix * vec4 should return vec4");
  assert(arraysAlmostEqual(mv_8_result.data.slice(0,4), [13,24,35,1]), "8. Matrix * vec4 correct");

  // 9. Vector addition chain
  let mv_9_v1 = new MatVec([1,2,3]);
  let mv_9_v2 = new MatVec([3,2,1]);
  let mv_9_v3 = new MatVec([1,1,1]);
  let mv_9_chain = mv_9_v1.clone().add(mv_9_v2).subtract(mv_9_v3);
  assert(arraysAlmostEqual(mv_9_chain.data.slice(0,3), [3,3,3]), "9. Vector addition/subtraction correct");

  // 10. Dot product
  let mv_10_dot = mv_9_v1.dot(mv_9_v2);
  assert(Math.abs(mv_10_dot - 10) < 1e-6, "10. Dot product correct");

  // 11. Cross product
  let mv_11_cross = mv_9_v1.clone().cross(mv_9_v2);
  assert(arraysAlmostEqual(mv_11_cross.data.slice(0,3), [-4,8,-4]), "11. Cross product correct");

  // 12. Normalize test
  let mv_12 = new MatVec([3,0,4]).normalize();
  let mv_12_len = Math.sqrt(3*3 + 4*4);
  assert(arraysAlmostEqual(mv_12.data.slice(0,3), [3/mv_12_len, 0, 4/mv_12_len]), "12. Normalize correct");

  // 13. Scalar multiply chain, again
  let mv_13 = new MatVec([2,4,6]).multiply(0.5).multiply(2);
  assert(arraysAlmostEqual(mv_13.data.slice(0,3), [2,4,6]), "13. Scalar multiply chain correct");

  // 14. Random vector generation
  let mv_14_rand = new MatVec().random();
  assert(mv_14_rand.size === 3, "14. Random vector size correct");

  // 15. mix() test
  let mv_15_start = new MatVec([0,0,0]);
  let mv_15_end = new MatVec([10,10,10]);
  let mv_15_mix05 = mv_15_start.clone().mix(mv_15_end, 0.5);
  assert(arraysAlmostEqual(mv_15_mix05.data.slice(0,3), [5,5,5]), "15. mix() interpolation correct");

  const EPS = 1e-5;

  function matricesAlmostEqual(mat, expectedArray) {
    return arraysAlmostEqual(mat.data, expectedArray);
  }

  let matrix = matvec().set_identity();

  // 16. Rotate 90deg around Z axis (right-hand rule)
  matrix.rotate(Math.PI/2, 0,0,1);
  const expectedRotZ90 = [
    0, -1, 0, 0,
    1,  0, 0, 0,
    0,  0, 1, 0,
    0,  0, 0, 1
  ];
  assert(matricesAlmostEqual(matrix, expectedRotZ90, EPS), "16. Rotate Z 90 degrees");

  // 17. Scale by 2, 3, 4
  matrix.scale(2, 3, 4);
  let expectedScale = expectedRotZ90.slice();
  for (let row = 0; row < 4; row++) {
    expectedScale[row * 4 + 0] *= 2;  // scale X
    expectedScale[row * 4 + 1] *= 3;  // scale Y
    expectedScale[row * 4 + 2] *= 4;  // scale Z
  }
  assert(matricesAlmostEqual(matrix, expectedScale, EPS), "17. Scale 2x3x4");

  // 18. Translate world by (5,6,7)
  const translation = matvec().set_identity().translate(5,6,7);
  translation.multiply(matrix);
  let expectedTranslate = expectedScale.slice();
  expectedTranslate[3] += 5;
  expectedTranslate[7] += 6;
  expectedTranslate[11] += 7;
  assert(matricesAlmostEqual(translation, expectedTranslate, EPS), "18. Translate 5,6,7");

  // 19. LookAt from origin looking down -Z with +Y up
  let eye = matvec([0,0,0 ]);
  let at  = matvec([0,0,-1]);
  let up  = matvec([0,1,0 ]);
  matrix.look_at(eye, at, up);
  const expectedLookAtIdentity = [
    1,0,0,0,
    0,1,0,0,
    0,0,1,0,
    0,0,0,1
  ];
  assert(matricesAlmostEqual(matrix, expectedLookAtIdentity, EPS), "19. LookAt identity");

  // 20. Orthographic projection test
  matrix.orthographic(-1,1,-1,1,1,100);
  assert(Math.abs(matrix.data[0] - 1) < EPS, "20. Ortho scale X approx");
  assert(Math.abs(matrix.data[5] - 1) < EPS, "20. Ortho scale Y approx");
  assert(Math.abs(matrix.data[10] + 0.020202) < 1e-3, "20. Ortho scale Z approx");

  // 21. Perspective projection test (fov=90°, aspect=1)
  matrix.perspective(Math.PI/2, 1.0, 1, 1000);
  assert(Math.abs(matrix.data[0] - 1) < EPS, "21. Perspective scale X approx");
  assert(Math.abs(matrix.data[5] - 1) < EPS, "21. Perspective scale Y approx");
  assert(Math.abs(matrix.data[14] + 1) < EPS, "21. Perspective depth exact");

  // 22. Invert translation matrix
  matrix.loadMatrix([
    [1, 0, 0, 1],
    [0, 1, 0, 2],
    [0, 0, 1, 3],
    [0, 0, 0, 1]
  ]);
  matrix.invert();
  const expectedInvertTranslation = [
    1,0,0,-1,
    0,1,0,-2,
    0,0,1,-3,
    0,0,0,1
  ];
  assert(matricesAlmostEqual(matrix, expectedInvertTranslation, EPS), "22. Invert translation");

  // 23. Zero-length vector normalization
  let mv_23_zeroNorm = matvec([0, 0, 0]);
  mv_23_zeroNorm.normalize();
  assert(mv_23_zeroNorm.size === 3, "23. Zero-length normalize size");
  assert(mv_23_zeroNorm.data[0] === 0 && mv_23_zeroNorm.data[1] === 0 && mv_23_zeroNorm.data[2] === 0, "23. Zero-length vector stays zero");

  // 24. Identity matrix multiplication
  let mv_24_identity = matvec().set_identity();
  let mv_24_M = matvec([
    [2, 3, 4, 5],
    [1, 0, 3, 2],
    [0, 1, 4, 3],
    [0, 0, 0, 1]
  ]);
  let mv_24_res = mv_24_M.clone().multiply(mv_24_identity);
  assert(mv_24_res.equals(mv_24_M), "24. Identity matrix multiplication leaves matrix unchanged");

  // 25. Inversion of non-invertible matrix throws
  let mv_25_singular = matvec([
    [1, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ]);
  let mv_25_threw = false;
  try {
    mv_25_singular.invert();
  } catch(e) {
    mv_25_threw = true;
  }
  assert(mv_25_threw, "25. Non-invertible matrix throws on invert");

  // 26. Rotation by 0 and 2 * PI
  let mv_26_identity = matvec().set_identity();
  let mv_26_rot0 = mv_26_identity.clone().rotate(0, 0, 1, 0);
  let mv_26_rot2pi = mv_26_identity.clone().rotate(2 * Math.PI, 0, 1, 0);
  assert(mv_26_rot0.equals(mv_26_identity), "26. Rotate 0 radians unchanged");
  assert(mv_26_rot2pi.equals(mv_26_identity), "26. Rotate 2*PI radians unchanged");

  // 27. Matrix-vector multiplication associativity: (A*B)*v === A*(B*v)
  let mv_27_A = matvec([
    [1, 0, 0, 0],
    [0, 2, 0, 0],
    [0, 0, 3, 0],
    [0, 0, 0, 1]
  ]);
  let mv_27_B = matvec([
    [0, -1, 0, 0],
    [1,  0, 0, 0],
    [0,  0, 1, 0],
    [0,  0, 0, 1]
  ]);
  let mv_27_v = matvec([1, 2, 3]);
  let mv_27_res1 = mv_27_A.clone().multiply(mv_27_B).multiply(mv_27_v.quickClone().to4(1));
  let mv_27_res2 = mv_27_A.clone().multiply(mv_27_B.clone().multiply(mv_27_v.quickClone().to4(1)));
  assert(mv_27_res1.equals(mv_27_res2), "27. Matrix multiplication associativity with vector");

  // 28. Clone deep copy validation
  let mv_28_original = matvec([1, 2, 3]);
  let mv_28_copy = mv_28_original.clone();
  mv_28_copy.data[0] = 999;
  assert(mv_28_original.data[0] !== 999, "28. Clone creates deep copy");

  // 29. Equals threshold edge case
  let mv_29_a = matvec([1, 2, 3]);
  let mv_29_b = matvec([1 + 1e-6, 2, 3]);
  assert(mv_29_a.equals(mv_29_b, 1e-6), "29. equals with boundary epsilon");
  assert(!mv_29_a.equals(mv_29_b, 1e-7), "29. equals fails below epsilon");

  // 30. Mix at edges and beyond bounds
  let mv_30_start = matvec([0, 0, 0]);
  let mv_30_end = matvec([10, 10, 10]);
  let mv_30_t0 = mv_30_start.clone().mix(mv_30_end, 0);
  let mv_30_t1 = mv_30_start.clone().mix(mv_30_end, 1);
  let mv_30_tb = mv_30_start.clone().mix(mv_30_end, -0.5);  // Below 0
  let mv_30_ta = mv_30_start.clone().mix(mv_30_end, 1.5);   // Above 1
  assert(mv_30_t0.equals(mv_30_start), "30. mix with t=0");
  assert(mv_30_t1.equals(mv_30_end), "30. mix with t=1");
  assert(mv_30_tb.data[0] < 0, "30. mix with t < 0 extrapolates");
  assert(mv_30_ta.data[0] > 10, "30. mix with t > 1 extrapolates");

  // 31. look_at with parallel up and view throws error
  let mv_31_eye = matvec([0, 0, 0]);
  let mv_31_at = matvec([0, 0, -1]);
  let mv_31_up = matvec([0, 0, -1]);  // Parallel to view direction
  let mv_31_threw = false;
  try {
    let mv_31_test = matvec().look_at(mv_31_eye, mv_31_at, mv_31_up);
  } catch (e) {
    mv_31_threw = true;
  }
  assert(mv_31_threw, "31. look_at throws when up parallel to view");

  // 32. pre_multiply 4x4 matrix: result matches reference (A * B)
  let mv_32_A = new MatVec([
    [2, 0, 0, 0],
    [0, 3, 0, 0],
    [0, 0, 4, 0],
    [0, 0, 0, 1]
  ]);
  let mv_32_B = new MatVec([
    [1, 2, 3, 4],
    [4, 5, 6, 7],
    [7, 8, 9,10],
    [10,11,12,13]
  ]);
  // Reference: A * B
  let mv_32_expected = [
    2, 4, 6, 8,
    12,15,18,21,
    28,32,36,40,
    10,11,12,13
  ];
  let mv_32_res = mv_32_B.clone().pre_multiply(mv_32_A);
  assert(arraysAlmostEqual(mv_32_res.data.slice(0,16), mv_32_expected), "32. pre_multiply matrix correct");

  // 33. pre_multiply leaves the input size, A is not mutated, and buffer is correct
  let mv_33_A = matvec().set_identity();
  let mv_33_B = matvec([[2,0,0,0],[0,3,0,0],[0,0,4,0],[0,0,0,1]]);
  let mv_33_B_clone = mv_33_B.clone();
  let mv_33_pre = mv_33_B.pre_multiply(mv_33_A);
  assert(mv_33_pre.equals(mv_33_B_clone), "33. pre_multiply(identity) leaves matrix unchanged");
  assert(mv_33_B.size === 16, "33. pre_multiply preserves size");

  // 34. pre_multiply with translation
  let mv_34_T = matvec([[1,0,0,5],[0,1,0,6],[0,0,1,7],[0,0,0,1]]);
  let mv_34_V = matvec([1,2,3,1]);
  let mv_34_exp = [6,8,10,1];
  let mv_34_res = mv_34_V.clone().pre_multiply(mv_34_T);
  assert(arraysAlmostEqual(mv_34_res.data.slice(0,4), mv_34_exp), "34. pre_multiply with translation vector correct");

  // 35. pre_multiply chain matches multiply
  let mv_35_A = matvec([[1,2,3,4],[4,3,2,1],[0,1,0,1],[1,0,1,0]]);
  let mv_35_B = matvec([[2,0,0,0],[0,2,0,0],[0,0,2,0],[0,0,0,1]]);
  let mv_35_result1 = mv_35_A.clone().multiply(mv_35_B);
  let mv_35_result2 = mv_35_B.clone().pre_multiply(mv_35_A);
  assert(arraysAlmostEqual(mv_35_result1.data.slice(0,16), mv_35_result2.data.slice(0,16)), "35. pre_multiply matches multiply");

 // 36. Transpose of identity matrix is itself
  let mv_36_identity = matvec().set_identity().transpose();
  let mv_36_expected = [
    1,0,0,0,
    0,1,0,0,
    0,0,1,0,
    0,0,0,1
  ];
  assert(matricesAlmostEqual(mv_36_identity, mv_36_expected, EPS), "36. Transpose of identity");

  // 37. Transpose of upper-triangular matrix becomes lower-triangular
  let mv_37_upper = matvec([
    [1,2,3,4],
    [0,5,6,7],
    [0,0,8,9],
    [0,0,0,10]
  ]);
  let mv_37_trans = mv_37_upper.clone().transpose();
  let mv_37_expected = [
    1,0,0,0,
    2,5,0,0,
    3,6,8,0,
    4,7,9,10
  ];
  assert(matricesAlmostEqual(mv_37_trans, mv_37_expected, EPS), "37. Transpose upper triangular");

  // 38. Transpose twice yields original
  let mv_38_A = matvec([
    [1,2,3,4],
    [5,6,7,8],
    [9,10,11,12],
    [13,14,15,16]
  ]);
  let mv_38_TT = mv_38_A.clone().transpose().transpose();
  assert(mv_38_A.equals(mv_38_TT), "38. Transpose twice returns original");

  console.log("All MatVec tests performed.");
})();
