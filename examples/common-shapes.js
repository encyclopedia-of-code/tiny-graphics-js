import {tiny} from '../tiny-graphics.js';
// Pull these names into this module's scope for convenience:
const {Vector, Vector3, vec, vec2, vec3, vec4, color, Matrix, Mat4, Shape, Shader, Component} = tiny;

const defs = {};

export {tiny, defs};

const Triangle = defs.Triangle =
  class Triangle extends Shape {
      // **Triangle** The simplest possible 2D Shape – one triangle.  It stores 3 corner vertices, each with sufficient data to shade them.

      constructor () {
          super ();

          // Multiple data fields live at our triangle's corner points, besides just a position.  We will describe one "vertex" as the combination of a position, a normal vector, and lastly a coordinate in texture image space in case a texture image is applied.

          // Vertex positions: the three point locations of an imaginary triangle.
          // "Normal" vectors:  Vectors that point away from the triangle face.  They're needed so the graphics engine can know if the shape is pointed at light or not, and then color it accordingly.
          // Texture coordinates: Points in the seperate 2D X/Y pixel space belonging to any 2D images we might like to paint the shape with.
          this.vertices[0] = { position: vec3 (0, 0, 0),
                               normal: vec3 (0, 0, 1),
                               texture_coord: vec2 (0, 0) };

          this.vertices[1] = { position: vec3 (1, 0, 0),
                               normal: vec3 (0, 0, 1),
                               texture_coord: vec2 (1, 0) };

          this.vertices[2] = { position: vec3 (0, 1, 0),
                               normal: vec3 (0, 0, 1),
                               texture_coord: vec2 (0, 1) };

          // Next, describe how to connect whole triangles out of individual vertices.  Say a list of indices of vertex entries in your desired order. Every three indices in "this.indices" traces out one triangle.
          this.indices              = [0, 1, 2];

          this.fill_buffer ("position", "normal", "texture_coord")
      }
  };


const Square = defs.Square =
  class Square extends Shape {
      // **Square** demonstrates two triangles that share vertices.  On any planar surface, the
      // interior edges don't make any important seams.  In these cases there's no reason not
      // to re-use data of the common vertices between triangles.  This makes all the vertex
      // arrays (position, normals, etc) smaller and more cache friendly.
      constructor () {
          super ("position", "normal", "texture_coord");
          // Specify the 4 square corner locations, and match those up with normal vectors:
          this.arrays.position      = Vector3.cast ([-1, -1, 0], [1, -1, 0], [-1, 1, 0], [1, 1, 0]);
          this.arrays.normal        = Vector3.cast ([0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1]);
          // Arrange the vertices into a square shape in texture space too:
          this.arrays.texture_coord = Vector.create ([0, 0], [1, 0], [0, 1], [1, 1]);
          // Use two triangles this time, indexing into four distinct vertices:
          this.indices.push (0, 1, 2, 1, 3, 2);
      }
  };


const Tetrahedron = defs.Tetrahedron =
  class Tetrahedron extends Shape {
      // **Tetrahedron** demonstrates flat vs smooth shading (a boolean argument selects
      // which one).  It is also our first 3D, non-planar shape.  Four triangles share
      // corners with each other.  Unless we store duplicate points at each corner
      // (storing the same position at each, but different normal vectors), the lighting
      // will look "off".  To get crisp seams at the edges we need the repeats.
      constructor (using_flat_shading) {
          super ("position", "normal", "texture_coord");
          var a = 1 / Math.sqrt (3);
          if ( !using_flat_shading) {
              // Method 1:  A tetrahedron with shared vertices.  Compact, performs better,
              // but can't produce flat shading or discontinuous seams in textures.
              this.arrays.position      = Vector.create ([0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
              this.arrays.normal        = Vector.create ([-a, -a, -a], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
              this.arrays.texture_coord = Vector.create ([0, 0], [1, 0], [0, 1], [1, 1]);
              // Notice the repeats in the index list.  Vertices are shared
              // and appear in multiple triangles with this method.
              this.indices.push (0, 1, 2, 0, 1, 3, 0, 2, 3, 1, 2, 3);
          } else {
              // Method 2:  A tetrahedron with four independent triangles.
              this.arrays.position = Vector.create ([0, 0, 0], [1, 0, 0], [0, 1, 0],
                                                  [0, 0, 0], [1, 0, 0], [0, 0, 1],
                                                  [0, 0, 0], [0, 1, 0], [0, 0, 1],
                                                  [0, 0, 1], [1, 0, 0], [0, 1, 0]);

              // The essence of flat shading:  This time, values of normal vectors can
              // be constant per whole triangle.  Repeat them for all three vertices.
              this.arrays.normal = Vector.create ([0, 0, -1], [0, 0, -1], [0, 0, -1],
                                                [0, -1, 0], [0, -1, 0], [0, -1, 0],
                                                [-1, 0, 0], [-1, 0, 0], [-1, 0, 0],
                                                [a, a, a], [a, a, a], [a, a, a]);

              // Each face in Method 2 also gets its own set of texture coords (half the
              // image is mapped onto each face).  We couldn't do this with shared
              // vertices since this features abrupt transitions when approaching the
              // same point from different directions.
              this.arrays.texture_coord = Vector.create ([0, 0], [1, 0], [1, 1],
                                                       [0, 0], [1, 0], [1, 1],
                                                       [0, 0], [1, 0], [1, 1],
                                                       [0, 0], [1, 0], [1, 1]);
              // Notice all vertices are unique this time.
              this.indices.push (0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11);
          }
      }
  };

const Windmill = defs.Windmill =
  class Windmill extends Shape {
      // **Windmill**  As our shapes get more complicated, we begin using matrices and flow
      // control (including loops) to generate non-trivial point clouds and connect them.
      constructor (num_blades) {
          super ("position", "normal", "texture_coord");
          // A for loop to automatically generate the triangles:
          for (let i = 0; i < num_blades; i++) {
              // Rotate around a few degrees in the XZ plane to place each new point:
              const spin     = Mat4.rotation (i * 2 * Math.PI / num_blades, 0, 1, 0);
              // Apply that XZ rotation matrix to point (1,0,0) of the base triangle.
              const newPoint = spin.times (vec4 (1, 0, 0, 1)).to3 ();
              const triangle = [newPoint,                      // Store that XZ position as point 1.
                  newPoint.plus ([0, 1, 0]),    // Store it again but with higher y coord as point 2.
                  vec3 (0, 0, 0)];          // All triangles touch this location -- point 3.

              this.arrays.position.push (...triangle);
              // Rotate our base triangle's normal (0,0,1) to get the new one.  Careful!  Normal vectors are not
              // points; their perpendicularity constraint gives them a mathematical quirk that when applying
              // matrices you have to apply the transposed inverse of that matrix instead.  But right now we've
              // got a pure rotation matrix, where the inverse and transpose operations cancel out, so it's ok.
              var newNormal = spin.times (vec4 (0, 0, 1, 0)).to3 ();
              // Propagate the same normal to all three vertices:
              this.arrays.normal.push (newNormal, newNormal, newNormal);
              this.arrays.texture_coord.push (...Vector.create ([0, 0], [0, 1], [1, 0]));
              // Procedurally connect the 3 new vertices into triangles:
              this.indices.push (3 * i, 3 * i + 1, 3 * i + 2);
          }
      }
  };


const Cube = defs.Cube =
  class Cube extends Shape {
      // **Cube** A closed 3D shape, and the first example of a compound shape (a Shape constructed
      // out of other Shapes).  A cube inserts six Square strips into its own arrays, using six
      // different matrices as offsets for each square.
      constructor () {
          super ("position", "normal", "texture_coord");
          // Loop 3 times (for each axis), and inside loop twice (for opposing cube sides):
          for (var i = 0; i < 3; i++)
              for (var j = 0; j < 2; j++) {
                  var square_transform = Mat4.rotation (i == 0 ? Math.PI / 2 : 0, 1, 0, 0)
                                             .times (Mat4.rotation (Math.PI * j - (i == 1 ? Math.PI / 2 : 0), 0, 1, 0))
                                             .times (Mat4.translation (0, 0, 1));
                  // Calling this function of a Square (or any Shape) copies it into the specified
                  // Shape (this one) at the specified matrix offset (square_transform):
                  Square.insert_transformed_copy_into (this, [], square_transform);
              }
      }
  };


const Subdivision_Sphere = defs.Subdivision_Sphere =
  class Subdivision_Sphere extends Shape {
      constructor (max_subdivisions) {
          super ("position", "normal", "texture_coord");
          // Start from the following equilateral tetrahedron:
          const tetrahedron    = [[0, 0, -1], [0, .9428, .3333], [-.8165, -.4714, .3333], [.8165, -.4714, .3333]];
          this.arrays.position = Vector3.cast (...tetrahedron);
          // Begin recursion:
          this.subdivide_triangle (0, 1, 2, max_subdivisions);
          this.subdivide_triangle (3, 2, 1, max_subdivisions);
          this.subdivide_triangle (1, 0, 3, max_subdivisions);
          this.subdivide_triangle (0, 2, 3, max_subdivisions);

          // With positions calculated, fill in normals and texture_coords of the finished Sphere:
          for (let p of this.arrays.position) {
              // Each point has a normal vector that simply goes to the point from the origin:
              this.arrays.normal.push (p.copy ());

              // Textures are tricky.  A Subdivision sphere has no straight seams to which image
              // edges in UV space can be mapped.  The only way to avoid artifacts is to smoothly
              // wrap & unwrap the image in reverse - displaying the texture twice on the sphere.
              this.arrays.texture_coord.push (Vector.of (
                0.5 - Math.atan2 (p[ 2 ], p[ 0 ]) / (2 * Math.PI),
                0.5 + Math.asin (p[ 1 ]) / Math.PI));
          }

          // Fix the UV seam by duplicating vertices with offset UV:
          const tex = this.arrays.texture_coord;
          for (let i = 0; i < this.indices.length; i += 3) {
              const a = this.indices[ i ], b = this.indices[ i + 1 ], c = this.indices[ i + 2 ];
              if ([[a, b], [a, c], [b, c]].some (x => (Math.abs (tex[ x[ 0 ] ][ 0 ] - tex[ x[ 1 ] ][ 0 ]) > 0.5))
                  && [a, b, c].some (x => tex[ x ][ 0 ] < 0.5)) {
                  for (let q of [[a, i], [b, i + 1], [c, i + 2]]) {
                      if (tex[ q[ 0 ] ][ 0 ] < 0.5) {
                          this.indices[ q[ 1 ] ] = this.arrays.position.length;
                          this.arrays.position.push (this.arrays.position[ q[ 0 ] ].copy ());
                          this.arrays.normal.push (this.arrays.normal  [ q[ 0 ] ].copy ());
                          tex.push (tex[ q[ 0 ] ].plus (vec (1, 0)));
                      }
                  }
              }
          }
      }
      subdivide_triangle (a, b, c, count) {
          if (count <= 0) {
              // Base case of recursion - we've hit the finest level of detail we want.
              this.indices.push (a, b, c);
              return;
          }
          // So we're not at the base case.  So, build 3 new vertices at midpoints,
          // and extrude them out to touch the unit sphere (length 1).
          var ab_vert = this.arrays.position[ a ].mix (this.arrays.position[ b ], 0.5).normalized (),
              ac_vert = this.arrays.position[ a ].mix (this.arrays.position[ c ], 0.5).normalized (),
              bc_vert = this.arrays.position[ b ].mix (this.arrays.position[ c ], 0.5).normalized ();
          // Here, push() returns the indices of the three new vertices (plus one).
          var ab      = this.arrays.position.push (ab_vert) - 1,
              ac      = this.arrays.position.push (ac_vert) - 1,
              bc      = this.arrays.position.push (bc_vert) - 1;
          // Recurse on four smaller triangles, and we're done.  Skipping every fourth vertex index in
          // our list takes you down one level of detail, and so on, due to the way we're building it.
          this.subdivide_triangle (a, ab, ac, count - 1);
          this.subdivide_triangle (ab, b, bc, count - 1);
          this.subdivide_triangle (ac, bc, c, count - 1);
          this.subdivide_triangle (ab, bc, ac, count - 1);
      }
  };


const Grid_Patch = defs.Grid_Patch =
  class Grid_Patch extends Shape {
      constructor (rows, columns, next_row_function, next_column_function,
                   texture_coord_range = [[0, rows], [0, columns]]) {
          super ("position", "normal", "texture_coord");
          let points = [];
          for (let r = 0; r <= rows; r++) {
              points.push (new Array (columns + 1));
              // Allocate a 2D array. Use next_row_function to generate the start point of each row. Pass in the
              // progress ratio, and the previous point if it existed.
              points[ r ][ 0 ] = next_row_function (r / rows, points[ r - 1 ] && points[ r - 1 ][ 0 ]);
          }
          // From those, use next_column function to generate the remaining points:
          for (let r = 0; r <= rows; r++)
              for (let c = 0; c <= columns; c++) {
                  if (c > 0) points[ r ][ c ] = next_column_function (c / columns, points[ r ][ c - 1 ], r / rows);

                  this.arrays.position.push (points[ r ][ c ]);
                  // Interpolate texture coords from a provided range.
                  const a1 = c / columns, a2 = r / rows, x_range = texture_coord_range[ 0 ],
                        y_range                                  = texture_coord_range[ 1 ];
                  this.arrays.texture_coord.push (
                    vec ((a1) * x_range[ 1 ] + (1 - a1) * x_range[ 0 ], (a2) * y_range[ 1 ] + (1 - a2) * y_range[ 0 ]));
              }
          for (let r = 0; r <= rows; r++)
            // Generate normals by averaging the cross products of all defined neighbor pairs.
              for (let c = 0; c <= columns; c++) {
                  let curr = points[ r ][ c ], neighbors = new Array (4), normal = vec3 (0, 0, 0);
                  // Store each neighbor by rotational order.
                  for (let [i, dir] of [[-1, 0], [0, 1], [1, 0], [0, -1]].entries ())
                    // Leave "undefined" in the array wherever we hit a boundary.
                      neighbors[ i ] = points[ r + dir[ 1 ] ] && points[ r + dir[ 1 ] ][ c + dir[ 0 ] ];

                  // Take cross-products of pairs of neighbors, proceeding in consistent rotational direction through
                  // the pairs:
                  for (let i = 0; i < 4; i++)
                      if (neighbors[ i ] && neighbors[ (i + 1) % 4 ])
                          normal =
                            normal.plus (neighbors[ i ].minus (curr).cross (neighbors[ (i + 1) % 4 ].minus (curr)));
                  normal.normalize ();           // Normalize the sum to get the average vector.
                  // Store the normal if it's valid (not NaN or zero length), otherwise use a default:
                  if (normal.every (x => x == x) && normal.norm () > .01) this.arrays.normal.push (normal.copy ());
                  else this.arrays.normal.push (vec3 (0, 0, 1));
              }

          // Generate an index sequence like this (if #columns is 10):
          // "1 11 0  11 1 12  2 12 1  12 2 13  3 13 2  13 3 14  4 14 3..."
          for (var h = 0; h < rows; h++)
              for (var i = 0; i < 2 * columns; i++)
                  for (var j = 0; j < 3; j++)
                      this.indices.push (h * (columns + 1) + columns * ((i + (j % 2)) % 2) + (~~((j % 3) / 2) ?
                        (~~(i / 2) + 2 * (i % 2)) : (~~(i / 2) + 1)));
      }
      static sample_array (array, ratio) {
          const frac = ratio * (array.length - 1), alpha = frac - Math.floor (frac);
          return array[ Math.floor (frac) ].mix (array[ Math.ceil (frac) ], alpha);
      }
  };


const Surface_Of_Revolution = defs.Surface_Of_Revolution =
  class Surface_Of_Revolution extends Grid_Patch {
      constructor (rows, columns, points, texture_coord_range, total_curvature_angle = 2 * Math.PI) {
          const row_operation    = i => Grid_Patch.sample_array (points, i),
                column_operation = (j, p) => Mat4.rotation (total_curvature_angle / columns, 0, 0, 1).times (p.to4 (1))
                                                 .to3 ();

          super (rows, columns, row_operation, column_operation, texture_coord_range);
      }
  };


const Regular_2D_Polygon = defs.Regular_2D_Polygon =
  class Regular_2D_Polygon extends Surface_Of_Revolution {
      constructor (rows, columns) {
          super (rows, columns, Vector3.cast ([0, 0, 0], [1, 0, 0]));
          this.arrays.normal = this.arrays.normal.map (x => vec3 (0, 0, 1));
          this.arrays.texture_coord.forEach (
            (x, i, a) => a[ i ] = this.arrays.position[ i ].map (x => x / 2 + .5).slice (0, 2));
      }
  };

const Cylindrical_Tube = defs.Cylindrical_Tube =
  class Cylindrical_Tube extends Surface_Of_Revolution {
      constructor (rows, columns, texture_range) {
          super (rows, columns, Vector3.cast ([1, 0, .5], [1, 0, -.5]), texture_range);
      }
  };

const Cone_Tip = defs.Cone_Tip =
  class Cone_Tip extends Surface_Of_Revolution { // Note:  Touches the Z axis
      constructor (rows, columns, texture_range) {
          super (rows, columns, Vector3.cast ([0, 0, 1], [1, 0, -1]), texture_range);
      }
  };

const Torus = defs.Torus =
  class Torus extends Shape {
      constructor (rows, columns, texture_range) {
          super ("position", "normal", "texture_coord");
          const circle_points = Array (rows).fill (vec3 (1 / 3, 0, 0))
                                            .map ((p, i, a) => Mat4.translation (-2 / 3, 0, 0)
                                                                   .times (
                                                                     Mat4.rotation (i / (a.length - 1) * 2 * Math.PI, 0,
                                                                                    -1, 0))
                                                                   .times (Mat4.scale (1, 1, 3))
                                                                   .times (p.to4 (1)).to3 ());

          Surface_Of_Revolution.insert_transformed_copy_into (this, [rows, columns, circle_points, texture_range]);
      }
  };

const Grid_Sphere = defs.Grid_Sphere =
  class Grid_Sphere extends Shape {
      constructor (rows, columns, texture_range) {
          super ("position", "normal", "texture_coord");
          const semi_circle_points = Array (rows).fill (vec3 (0, 0, 1)).map ((x, i, a) =>
                                                                               Mat4.rotation (
                                                                                 i / (a.length - 1) * Math.PI, 0, 1, 0)
                                                                                   .times (x.to4 (1)).to3 ());

          Surface_Of_Revolution.insert_transformed_copy_into (this, [rows, columns, semi_circle_points, texture_range]);
      }
  };

const Closed_Cone = defs.Closed_Cone =
  class Closed_Cone extends Shape {
      constructor (rows, columns, texture_range) {
          super ("position", "normal", "texture_coord");
          Cone_Tip.insert_transformed_copy_into (this, [rows, columns, texture_range]);
          Regular_2D_Polygon.insert_transformed_copy_into (this, [1, columns], Mat4.rotation (Math.PI, 0, 1, 0)
                                                                                   .times (Mat4.translation (0, 0, 1)));
      }
  };

const Rounded_Closed_Cone = defs.Rounded_Closed_Cone =
  class Rounded_Closed_Cone extends Surface_Of_Revolution {
      constructor (rows, columns, texture_range) {
          super (rows, columns, [vec3 (0, 0, 1), vec3 (1, 0, -1), vec3 (0, 0, -1)], texture_range);
      }
  };

const Capped_Cylinder = defs.Capped_Cylinder =
  class Capped_Cylinder extends Shape {
      constructor (rows, columns, texture_range) {
          super ("position", "normal", "texture_coord");
          Cylindrical_Tube.insert_transformed_copy_into (this, [rows, columns, texture_range]);
          Regular_2D_Polygon.insert_transformed_copy_into (this, [1, columns], Mat4.translation (0, 0, .5));
          Regular_2D_Polygon.insert_transformed_copy_into (this, [1, columns], Mat4.rotation (Math.PI, 0, 1, 0).times (
            Mat4.translation (0, 0, .5)));
      }
  };

const Rounded_Capped_Cylinder = defs.Rounded_Capped_Cylinder =
  class Rounded_Capped_Cylinder extends Surface_Of_Revolution {
      constructor (rows, columns, texture_range) {
          super (rows, columns, [vec3 (0, 0, .5), vec3 (1, 0, .5), vec3 (1, 0, -.5), vec3 (0, 0, -.5)], texture_range);
      }
  };


const Axis_Arrows = defs.Axis_Arrows =
  class Axis_Arrows extends Shape {
      constructor () {
          super ("position", "normal", "texture_coord");
          var stack = [];
          Subdivision_Sphere.insert_transformed_copy_into (this, [3], Mat4.rotation (Math.PI / 2, 0, 1, 0)
                                                                          .times (Mat4.scale (.25, .25, .25)));
          this.drawOneAxis (Mat4.identity (), [[.67, 1], [0, 1]]);
          this.drawOneAxis (Mat4.rotation (-Math.PI / 2, 1, 0, 0).times (Mat4.scale (1, -1, 1)), [[.34, .66], [0, 1]]);
          this.drawOneAxis (Mat4.rotation (Math.PI / 2, 0, 1, 0).times (Mat4.scale (-1, 1, 1)), [[0, .33], [0, 1]]);
      }
      drawOneAxis (transform, tex) {
          // Use a different texture coordinate range for each of the three axes, so they show up differently
          Closed_Cone.insert_transformed_copy_into (this, [4, 10, tex], transform.times (Mat4.translation (0, 0, 2))
                                                                                 .times (Mat4.scale (.25, .25, .25)));
          Cube.insert_transformed_copy_into (this, [], transform.times (Mat4.translation (.95, .95, .45))
                                                                .times (Mat4.scale (.05, .05, .45)));
          Cube.insert_transformed_copy_into (this, [], transform.times (Mat4.translation (.95, 0, .5))
                                                                .times (Mat4.scale (.05, .05, .4)));
          Cube.insert_transformed_copy_into (this, [], transform.times (Mat4.translation (0, .95, .5))
                                                                .times (Mat4.scale (.05, .05, .4)));
          Cylindrical_Tube.insert_transformed_copy_into (this, [7, 7, tex], transform.times (Mat4.translation (0, 0, 1))
                                                                                     .times (Mat4.scale (.1, .1, 2)));
      }
  };

const Instanced_Shape = defs.Instanced_Shape =
  class Instanced_Shape extends tiny.Shape {
      // A truly minimal triangle, with three vertices each holding a 3D position and a color.
      constructor () {
          super();
          // Describe the where the points of a triangle are in space, and also describe their colors:
          this.vertices[0] = { position: vec3 (0, 0, 0), color: color (1, 0, 0, 1) };
          this.vertices[1] = { position: vec3 (1, 0, 0), color: color (0, 1, 0, 1) };
          this.vertices[2] = { position: vec3 (0, 1, 0), color: color (0, 0, 1, 1) };

          this.fill_buffer( ["position", "color"] );

          this.single_triangle = this.vertices;
      }
  };

  const Instanced_Square = defs.Instanced_Square =
  class Instanced_Square extends tiny.Shape {
      // A truly minimal Square, with six vertices each holding a 3D position and a color.
      constructor () {
          super();
          // Describe the where the points of a triangle are in space, and also describe their colors:
          this.vertices[0] = { position: vec3 (-0.5, -0.5, 0), color: color (1, 0, 0, 1) };
          this.vertices[1] = { position: vec3 (0.5, -0.5, 0), color: color (0, 1, 0, 1) };
          this.vertices[2] = { position: vec3 (-0.5, 0.5, 0), color: color (0, 0, 1, 1) };
          this.vertices[3] = { position: vec3 (0.5, -0.5, 0), color: color (0, 1, 0, 1) };
          this.vertices[4] = { position: vec3 (-0.5, 0.5, 0), color: color (0, 0, 1, 1) };
          this.vertices[5] = { position: vec3 (0.5, 0.5, 0), color: color (0, 1, 1, 1) };
          this.num_vertices = this.vertices.length

          this.fill_buffer( ["position", "color"] );

          this.single_triangle = this.vertices;
      }
  };

  const Instanced_Square_Index = defs.Instanced_Square_Index =
  class Instanced_Square_Index extends tiny.Shape {
      // A truly minimal Square, with six vertices each holding a 3D position and a color.
      constructor () {
          super();
          // Describe the where the points of a triangle are in space, and also describe their colors:
          this.vertices[0] = { position: vec3 (-0.5, -0.5, 0), color: color (1, 0, 0, 1) };
          this.vertices[1] = { position: vec3 (0.5, -0.5, 0), color: color (0, 1, 0, 1) };
          this.vertices[2] = { position: vec3 (-0.5, 0.5, 0), color: color (0, 0, 1, 1) };
          this.vertices[3] = { position: vec3 (0.5, 0.5, 0), color: color (0, 1, 1, 1) };

          this.indices = [0, 1, 2, 1, 2, 3];

          this.fill_buffer( ["position", "color"] );

          this.single_triangle = this.vertices;
      }
  };

const Instanced_Cube_Index = defs.Instanced_Cube_Index =
  class Instanced_Cube_Index extends tiny.Shape {
      // A truly minimal Cube
      constructor () {
          super();
          // Describe the where the points of a triangle are in space, and also describe their colors:
          this.vertices[0] = { position: vec3 (-0.5, -0.5, -0.5), normal: vec3( 0.0, 0.0, -1.0), texture_coord: Vector.create (0.0, 0.0) }
          this.vertices[1] = { position: vec3 (0.5, -0.5, -0.5),  normal: vec3(0.0, 0.0, -1.0 ), texture_coord: Vector.create (1.0, 0.0) }
          this.vertices[2] = { position: vec3 (0.5,  0.5, -0.5),  normal: vec3(0.0, 0.0, -1.0 ), texture_coord: Vector.create ( 1.0, 1.0) }
          this.vertices[3] = { position: vec3 (0.5,  0.5, -0.5),  normal: vec3(0.0, 0.0, -1.0 ), texture_coord: Vector.create ( 1.0, 1.0) }
          this.vertices[4] = { position: vec3 (-0.5,  0.5, -0.5), normal: vec3( 0.0, 0.0, -1.0), texture_coord: Vector.create ( 0.0, 1.0) }
          this.vertices[5] = { position: vec3 (-0.5, -0.5, -0.5), normal: vec3( 0.0, 0.0, -1.0), texture_coord: Vector.create ( 0.0, 0.0) }

          this.vertices[6] = { position: vec3 (-0.5, -0.5,  0.5), normal: vec3( 0.0, 0.0, 1.0), texture_coord: Vector.create ( 0.0, 0.0) }
          this.vertices[7] = { position: vec3 (0.5, -0.5,  0.5 ), normal: vec3( 0.0, 0.0, 1.0), texture_coord: Vector.create ( 1.0, 0.0) }
          this.vertices[8] = { position: vec3 (0.5,  0.5,  0.5 ), normal: vec3( 0.0, 0.0, 1.0), texture_coord: Vector.create ( 1.0, 1.0) }
          this.vertices[9] = { position: vec3 (0.5,  0.5,  0.5 ), normal: vec3( 0.0, 0.0, 1.0), texture_coord: Vector.create ( 1.0, 1.0) }
          this.vertices[10] = { position: vec3 (-0.5,  0.5,  0.5), normal: vec3( 0.0, 0.0, 1.0), texture_coord: Vector.create ( 0.0, 1.0) }
          this.vertices[11] = { position: vec3 (-0.5, -0.5,  0.5), normal: vec3( 0.0, 0.0, 1.0), texture_coord: Vector.create ( 0.0, 0.0) }

          this.vertices[12] = { position: vec3 (-0.5,  0.5,  0.5), normal: vec3( -1.0, 0.0, 0.0), texture_coord: Vector.create ( 1.0, 0.0) }
          this.vertices[13] = { position: vec3 (-0.5,  0.5, -0.5), normal: vec3( -1.0, 0.0, 0.0), texture_coord: Vector.create ( 1.0, 1.0) }
          this.vertices[14] = { position: vec3 (-0.5, -0.5, -0.5), normal: vec3( -1.0, 0.0, 0.0), texture_coord: Vector.create ( 0.0, 1.0) }
          this.vertices[15] = { position: vec3 (-0.5, -0.5, -0.5), normal: vec3( -1.0, 0.0, 0.0), texture_coord: Vector.create ( 0.0, 1.0) }
          this.vertices[16] = { position: vec3 (-0.5, -0.5,  0.5), normal: vec3( -1.0, 0.0, 0.0), texture_coord: Vector.create ( 0.0, 0.0) }
          this.vertices[17] = { position: vec3 (-0.5,  0.5,  0.5), normal: vec3( -1.0, 0.0, 0.0), texture_coord: Vector.create ( 1.0, 0.0) }

          this.vertices[18] = { position: vec3 (0.5,  0.5,  0.5), normal: vec3( 1.0, 0.0, 0.0), texture_coord: Vector.create ( 1.0, 0.0) }
          this.vertices[19] = { position: vec3 (0.5,  0.5, -0.5), normal: vec3( 1.0, 0.0, 0.0), texture_coord: Vector.create ( 1.0, 1.0) }
          this.vertices[20] = { position: vec3 (0.5, -0.5, -0.5), normal: vec3( 1.0, 0.0, 0.0), texture_coord: Vector.create ( 0.0, 1.0) }
          this.vertices[21] = { position: vec3 (0.5, -0.5, -0.5), normal: vec3( 1.0, 0.0, 0.0), texture_coord: Vector.create ( 0.0, 1.0) }
          this.vertices[22] = { position: vec3 (0.5, -0.5,  0.5), normal: vec3( 1.0, 0.0, 0.0), texture_coord: Vector.create ( 0.0, 0.0) }
          this.vertices[23] = { position: vec3 (0.5,  0.5,  0.5), normal: vec3( 1.0, 0.0, 0.0), texture_coord: Vector.create ( 1.0, 0.0) }

          this.vertices[24] = { position: vec3 (-0.5, -0.5, -0.5), normal: vec3( 0.0, -1.0, 0.0), texture_coord: Vector.create ( 0.0, 1.0) }
          this.vertices[25] = { position: vec3 (0.5, -0.5, -0.5),  normal: vec3(0.0, -1.0, 0.0 ), texture_coord: Vector.create (1.0, 1.0) }
          this.vertices[26] = { position: vec3 (0.5, -0.5,  0.5),  normal: vec3(0.0, -1.0, 0.0 ), texture_coord: Vector.create (1.0, 0.0) }
          this.vertices[27] = { position: vec3 (0.5, -0.5,  0.5),  normal: vec3(0.0, -1.0, 0.0 ), texture_coord: Vector.create (1.0, 0.0) }
          this.vertices[28] = { position: vec3 (-0.5, -0.5,  0.5), normal: vec3( 0.0, -1.0, 0.0), texture_coord: Vector.create ( 0.0, 0.0) }
          this.vertices[29] = { position: vec3 (-0.5, -0.5, -0.5), normal: vec3( 0.0, -1.0, 0.0), texture_coord: Vector.create ( 0.0, 1.0) }

          this.vertices[30] = { position: vec3 (-0.5,  0.5, -0.5), normal: vec3( 0.0, 1.0, 0.0), texture_coord: Vector.create ( 0.0, 1.0) }
          this.vertices[31] = { position: vec3 (0.5,  0.5, -0.5), normal: vec3( 0.0, 1.0, 0.0), texture_coord: Vector.create ( 1.0, 1.0) }
          this.vertices[32] = { position: vec3 (0.5,  0.5,  0.5), normal: vec3( 0.0, 1.0, 0.0), texture_coord: Vector.create ( 1.0, 0.0) }
          this.vertices[33] = { position: vec3 (0.5,  0.5,  0.5), normal: vec3( 0.0, 1.0, 0.0), texture_coord: Vector.create ( 1.0, 0.0) }
          this.vertices[34] = { position: vec3 (-0.5,  0.5,  0.5), normal: vec3( 0.0, 1.0, 0.0), texture_coord: Vector.create ( 0.0, 0.0) }
          this.vertices[35] = { position: vec3 (-0.5,  0.5, -0.5), normal: vec3( 0.0, 1.0, 0.0), texture_coord: Vector.create ( 0.0, 1.0) }

          this.indices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
                          10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
                          20, 21, 22, 23, 24, 25, 26, 27, 28, 29,
                          30, 31, 32, 33, 34, 35];

          this.fill_buffer( ["position", "normal", "texture_coord"] );

          this.single_cube = this.vertices;
      }
  };


const Minimal_Shape = defs.Minimal_Shape =
  class Minimal_Shape extends tiny.Shape {
      // A truly minimal triangle, with three vertices each holding a 3D position and a color.
      constructor () {
          super();
          // Describe the where the points of a triangle are in space, and also describe their colors:
          this.vertices[0] = { position: vec3 (0, 0, 0), color: color (1, 0, 0, 1) };
          this.vertices[1] = { position: vec3 (1, 0, 0), color: color (0, 1, 0, 1) };
          this.vertices[2] = { position: vec3 (0, 1, 0), color: color (0, 0, 1, 1) };

          this.fill_buffer( ["position", "color"] );
      }
  };

  const Minimaler_Shape = defs.Minimaler_Shape =
  class Minimaler_Shape extends tiny.Shape {
      constructor () {
          super();
          // Describe the where the points of a triangle are in space, and also describe their colors:
          this.vertices[0] = { position: vec3 (0, 0, 0)};
          this.vertices[1] = { position: vec3 (1, 0, 0)};
          this.vertices[2] = { position: vec3 (0, 1, 0)};

          this.fill_buffer( ["position"] );
      }
  };

  const Shape_From_File = defs.Shape_From_File =
  class Shape_From_File extends tiny.Shape
  {                                   // **Shape_From_File** is a versatile standalone Shape that imports
                                      // all its arrays' data from an .obj 3D model file.
    constructor( filename )
      { super( "position", "normal", "texture_coord" );
      this.ready = false;
                                      // Begin downloading the mesh. Once that completes, return
                                      // control to our parse_into_mesh function.
        this.load_file( filename );
      }
    load_file( filename )
        {                             // Request the external file and wait for it to load.
          return fetch( filename )
            .then( response =>
              { if ( response.ok )  return Promise.resolve( response.text() )
                else                return Promise.reject ( response.status )
              })
            .then( obj_file_contents => this.parse_into_mesh( obj_file_contents ) )
            .catch( error => { throw "OBJ file loader:  OBJ file either not found or is of unsupported format." } )
        }
    parse_into_mesh( data )
      {                           // Adapted from the "webgl-obj-loader.js" library found online:
        var verts = [], vertNormals = [], textures = [], unpacked = {};

        unpacked.verts = [];        unpacked.norms = [];    unpacked.textures = [];
        unpacked.hashindices = {};  unpacked.indices = [];  unpacked.index = 0;

        var lines = data.split('\n');

        var VERTEX_RE = /^v\s/;    var NORMAL_RE = /^vn\s/;    var TEXTURE_RE = /^vt\s/;
        var FACE_RE = /^f\s/;      var WHITESPACE_RE = /\s+/;

        for (var i = 0; i < lines.length; i++) {
          var line = lines[i].trim();
          var elements = line.split(WHITESPACE_RE);
          elements.shift();

          if      (VERTEX_RE.test(line))   verts.push.apply(verts, elements);
          else if (NORMAL_RE.test(line))   vertNormals.push.apply(vertNormals, elements);
          else if (TEXTURE_RE.test(line))  textures.push.apply(textures, elements);
          else if (FACE_RE.test(line)) {
            var quad = false;
            for (var j = 0, eleLen = elements.length; j < eleLen; j++)
            {
                if(j === 3 && !quad) {  j = 2;  quad = true;  }
                if(elements[j] in unpacked.hashindices)
                    unpacked.indices.push(unpacked.hashindices[elements[j]]);
                else
                {
                    var vertex = elements[ j ].split( '/' );

                    unpacked.verts.push(+verts[(vertex[0] - 1) * 3 + 0]);
                    unpacked.verts.push(+verts[(vertex[0] - 1) * 3 + 1]);
                    unpacked.verts.push(+verts[(vertex[0] - 1) * 3 + 2]);

                    if (textures.length)
                      {   unpacked.textures.push(+textures[( (vertex[1] - 1)||vertex[0]) * 2 + 0]);
                          unpacked.textures.push(+textures[( (vertex[1] - 1)||vertex[0]) * 2 + 1]);  }

                    unpacked.norms.push(+vertNormals[( (vertex[2] - 1)||vertex[0]) * 3 + 0]);
                    unpacked.norms.push(+vertNormals[( (vertex[2] - 1)||vertex[0]) * 3 + 1]);
                    unpacked.norms.push(+vertNormals[( (vertex[2] - 1)||vertex[0]) * 3 + 2]);

                    unpacked.hashindices[elements[j]] = unpacked.index;
                    unpacked.indices.push(unpacked.index);
                    unpacked.index += 1;
                }
                if(j === 3 && quad)   unpacked.indices.push( unpacked.hashindices[elements[0]]);
            }
          }
        }
        {
          const { verts, norms, textures } = unpacked;
          var selection_of_attributes = [];

          if (verts != [])
          {
            selection_of_attributes.push("position");
            for( var j = 0; j < verts.length/3; j++ )
              this.vertices[j].position = vec3( verts[ 3*j ], verts[ 3*j + 1 ], verts[ 3*j + 2 ] );
          }

          if (norms != [])
          {
            selection_of_attributes.push("normal");
            for( var j = 0; j < verts.length/3; j++ )
              this.vertices[j].normal = vec3( verts[ 3*j ], verts[ 3*j + 1 ], verts[ 3*j + 2 ] );
          }

          if (textures != [])
          {
            selection_of_attributes.push("texture_coord");
            for( var j = 0; j < verts.length/3; j++ )
              this.vertices[j].texture_coord = vec( textures[ 2*j ], textures[ 2*j + 1 ] );
          }

          this.indices = unpacked.indices;
        }
        this.normalize_positions( false );

        //Deduce it from the obj data!
        this.fill_buffer( selection_of_attributes );

        this.ready = true;
      }
    draw( caller, uniforms, model_transform, material, type = "TRIANGLES", instances )
      {               // draw(): Same as always for shapes, but cancel all
                      // attempts to draw the shape before it loads:
        if( this.ready )
          super.draw( caller, uniforms, model_transform, material, type, instances );
      }
  };
