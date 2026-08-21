import * as tiny from '../tiny-graphics.js';
import { MatVec, matvec, Shape, Shader, Component } from '../tiny-graphics.js';
import { Geometry } from './common.js';

export class Triangle extends Shape {
      init () {
          this.vertices[0] = { position: matvec([0, 0, 0]),
                               normal: matvec([0, 0, 1]),
                               texture_coord: matvec([0, 0]) };

          this.vertices[1] = { position: matvec([1, 0, 0]),
                               normal: matvec([0, 0, 1]),
                               texture_coord: matvec([1, 0]) };

          this.vertices[2] = { position: matvec([0, 1, 0]),
                               normal: matvec([0, 0, 1]),
                               texture_coord: matvec([0, 1]) };

          this.indices = [0, 1, 2];
      }
  };


export class Square extends Shape {
      init () {
          this.vertices[0] = { position: matvec([-1, -1, 0]), normal: matvec([0, 0, 1]), tangent: matvec([1, 0, 0]),
                               texture_coord: matvec([0, 0]) };
          this.vertices[1] = { position: matvec([ 1, -1, 0]), normal: matvec([0, 0, 1]), tangent: matvec([1, 0, 0]),
                               texture_coord: matvec([1, 0]) };
          this.vertices[2] = { position: matvec([-1,  1, 0]), normal: matvec([0, 0, 1]), tangent: matvec([1, 0, 0]),
                               texture_coord: matvec([0, 1]) };
          this.vertices[3] = { position: matvec([ 1,  1, 0]), normal: matvec([0, 0, 1]), tangent: matvec([1, 0, 0]),
                               texture_coord: matvec([1, 1]) };

          // Use two triangles this time, indexing into four distinct vertices:
          this.indices = [ 0, 1, 2, 1, 3, 2 ];
      }
  };

export class Tetrahedron extends Shape {
      init(using_flat_shading) {
          const a = 1 / Math.sqrt(3);

          if (!using_flat_shading) {
              // Method 1: A tetrahedron with shared vertices. Compact, performs better,
              // but can't produce flat shading or discontinuous seams in textures.
              this.vertices = [
                  { position: matvec([0, 0, 0]), normal: matvec([-a, -a, -a]), texture_coord: matvec([0, 0]) },
                  { position: matvec([1, 0, 0]), normal: matvec([1, 0, 0]),    texture_coord: matvec([1, 0]) },
                  { position: matvec([0, 1, 0]), normal: matvec([0, 1, 0]),    texture_coord: matvec([0, 1]) },
                  { position: matvec([0, 0, 1]), normal: matvec([0, 0, 1]),    texture_coord: matvec([1, 1]) }
              ];
              // Notice the repeats in the index list. Vertices are shared
              // and appear in multiple triangles with this method.
              this.indices.push(0, 1, 2, 0, 1, 3, 0, 2, 3, 1, 2, 3);
          } else {
              // Method 2: A tetrahedron with four independent triangles.
              // The essence of flat shading: This time, values of normal vectors can
              // be constant per whole triangle. Repeat them for all three vertices.
              // Each face in Method 2 also gets its own set of texture coords (half the
              // image is mapped onto each face).  We couldn't do this with shared
              // vertices since this features abrupt transitions when approaching the
              // same point from different directions.
              this.vertices = [
                  // Face 1
                  { position: matvec([0, 0, 0]), normal: matvec([0, 0, -1]), texture_coord: matvec([0, 0]) },
                  { position: matvec([1, 0, 0]), normal: matvec([0, 0, -1]), texture_coord: matvec([1, 0]) },
                  { position: matvec([0, 1, 0]), normal: matvec([0, 0, -1]), texture_coord: matvec([1, 1]) },
                  // Face 2
                  { position: matvec([0, 0, 0]), normal: matvec([0, -1, 0]), texture_coord: matvec([0, 0]) },
                  { position: matvec([1, 0, 0]), normal: matvec([0, -1, 0]), texture_coord: matvec([1, 0]) },
                  { position: matvec([0, 0, 1]), normal: matvec([0, -1, 0]), texture_coord: matvec([1, 1]) },
                  // Face 3
                  { position: matvec([0, 0, 0]), normal: matvec([-1, 0, 0]), texture_coord: matvec([0, 0]) },
                  { position: matvec([0, 1, 0]), normal: matvec([-1, 0, 0]), texture_coord: matvec([1, 0]) },
                  { position: matvec([0, 0, 1]), normal: matvec([-1, 0, 0]), texture_coord: matvec([1, 1]) },
                  // Face 4
                  { position: matvec([0, 0, 1]), normal: matvec([a, a, a]), texture_coord: matvec([0, 0]) },
                  { position: matvec([1, 0, 0]), normal: matvec([a, a, a]), texture_coord: matvec([1, 0]) },
                  { position: matvec([0, 1, 0]), normal: matvec([a, a, a]), texture_coord: matvec([1, 1]) }
              ];
              // Notice all vertices are unique this time.
              this.indices.push(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11);
          }
      }
  };

export class Windmill extends Shape {
      // **Windmill**  As our shapes get more complicated, we begin using matrices and flow
      // control (including loops) to generate non-trivial point clouds and connect them.
      init (num_blades=5) {
          // A for loop to automatically generate the triangles:
          for (let i = 0; i < num_blades; i++) {
              // Rotate around a few degrees in the XZ plane to place each new point:
              const spin     = matvec().rotate(i * 2*Math.PI / num_blades, 0,1,0);
              // Apply that XZ rotation matrix to point (1,0,0) of the base triangle.
              const newPoint = spin.clone().multiply( matvec([1, 0, 0]) );
              const triangle = [newPoint,                      // Store that XZ position as point 1.
                  newPoint.clone().add ( matvec([0, 1, 0]) ),    // Store it again but with higher y coord as point 2.
                  matvec([0, 0, 0])];          // All triangles touch this location -- point 3.
              const tex_coords = [ matvec([0, 0]), matvec([0, 1]), matvec([1, 0]) ];

              // Rotate our base triangle's normal (0,0,1) to get the new one.  Careful!  Normal vectors are not
              // points; their perpendicularity constraint gives them a mathematical quirk that when applying
              // matrices you have to apply the transposed inverse of that matrix instead.  But right now we've
              // got a pure rotation matrix, where the inverse and transpose operations cancel out, so it's ok.
              var newNormal = spin.clone().multiply ( matvec([0, 0, 1, 0]) );
              //var newNormal = spin.clone().invert().transpose().multiply ( matvec([0, 0, 1, 0]) );
              // Propagate the same normal to all three vertices:
              for( let i=0; i<3; i++ )
                this.vertices.push( { position: triangle[i], normal: newNormal, texture_coord: tex_coords[i] } );

              // Procedurally connect the 3 new vertices into triangles:
              this.indices.push (3 * i, 3 * i + 1, 3 * i + 2);
          }
      }
  };


export class Cube extends Shape {
        // **Cube** A closed 3D shape, and the first example of a compound shape (a Shape constructed
        // out of other Shapes).  A cube inserts six Square strips into its own arrays, using six
        // different matrices as offsets for each square.
        init () {
            // Loop 3 times (for each axis), and inside loop twice (for opposing cube sides):
            for (var i = 0; i < 3; i++)
                for (var j = 0; j < 2; j++) {
                    const square_transform = matvec()
                                            .rotate(i == 0 ? Math.PI / 2 : 0, 1,0,0)
                                            .rotate (Math.PI * j - (i == 1 ? Math.PI / 2 : 0), 0,1,0)
                                            .translate(0, 0, 1);
                    // Calling this function of a Square (or any Shape) copies it into the specified
                    // Shape (this one) at the specified matrix offset (square_transform):
                    Geometry.insert_transformed_copy_into (Square, this, [], square_transform);
                }
        }
    };

export class Subdivision_Sphere extends Shape {
      init (max_subdivisions, texture_coord_range) {
          // Start from the following equilateral tetrahedron:
          this.vertices[0] = { position: matvec([0,0,-1]) };
          this.vertices[1] = { position: matvec([0, .9428, .3333]) };
          this.vertices[2] = { position: matvec([-.8165, -.4714, .3333]) };
          this.vertices[3] = { position: matvec([.8165, -.4714, .3333]) };

          this.indices.push (0, 1, 2, 3, 2, 1, 1, 0, 3, 0, 2, 3);
          Geometry.subdivide(this, max_subdivisions)

          for( let v of this.vertices ) {
            v.position.normalize();
            // Each point has a normal vector that simply goes to the point from the origin:
            v.normal = v.position.clone();
            v.tangent = v.normal.clone().cross( matvec([0,1,0]) ).normalize();
            const p = v.position.data;

            // Textures are tricky.  A Subdivision sphere has no straight seams to which image
            // edges in UV space can be mapped.  The only way to avoid artifacts is to smoothly
            // wrap & unwrap the image in reverse - displaying the texture twice on the sphere
            // so that 1 and 0 map to the same coordinate.
            v.texture_coord = matvec([ 0.5 - Math.atan2 (p[ 2 ], p[ 0 ]) / (2 * Math.PI),
                                    0.5 + Math.asin (p[ 1 ]) / Math.PI ]);
          }
          this.fix_seam();
      }
      fix_seam() {
          // Even with 1 and 0 mapping to the same texture coordinate, the shader doesn't
          // know it and will still try to interpolate any triangles that straddle the image edge back across the
          // whole image, creating a seam. Fix any such edges by duplicating vertices with offset UV so that all triangles stick to one side of the image.
          for (let i = 0; i < this.indices.length; i += 3) {
              const a = this.indices[i], b = this.indices[i + 1], c = this.indices[i + 2];
              const v = this.vertices;
              if ([[a, b], [a, c], [b, c]].some (
                ([i1, i2]) => Math.abs (v[i1].texture_coord.data[0] - v[i2].texture_coord.data[0]) > 0.5 )) {
                  // Seam detected; duplicate the vertices on one side of the wrap.
                  for (const [p,idx] of [[a, i], [b, i + 1], [c, i + 2]]) {
                      if (v[p].texture_coord.data[0] < 0.5) {
                          const new_vertex = {
                              position: v[p].position.clone(),
                              normal: v[p].normal.clone(),
                              tangent: v[p].tangent.clone(),
                              texture_coord: v[p].texture_coord.clone().add( matvec([1,0]) )
                          };
                          this.indices[idx] = this.vertices.length;
                          this.vertices.push(new_vertex);
                      }
                  }
              }
          }
      }
  };

export class Grid_Patch extends Shape {
      init (rows, columns, next_row_function, next_column_function,
                   texture_coord_range = [[0, rows], [0, columns]]) {
          let points = [];
          for (let r = 0; r <= rows; r++) {
              points.push (new Array (columns + 1));
              // Allocate a 2D array. Use next_row_function to generate the start point of each row. Pass in the
              // progress ratio, and the previous point if it existed.
              points[ r ][ 0 ] = next_row_function (r / rows, points[ r - 1 ]?.[ 0 ]);
          }
          // From those, use next_column function to generate the remaining points:
          for (let r = 0; r <= rows; r++) {
              for (let c = 0; c <= columns; c++) {
                  if (c > 0) points[ r ][ c ] = next_column_function (c / columns, points[ r ][ c - 1 ], r / rows);

                  // Interpolate texture coords from a provided range.
                  const a1 = c / columns, a2 = r / rows,
                        x_range = texture_coord_range[ 0 ],
                        y_range = texture_coord_range[ 1 ],
                        position = points[ r ][ c ],
                        tangent = (c>0) ? position.clone().subtract( points[r][c-1] ) : undefined;
                  this.vertices.push({ position, tangent,
                                       texture_coord: matvec([ (a1) * x_range[ 1 ] + (1 - a1) * x_range[ 0 ],
                                                               (a2) * y_range[ 1 ] + (1 - a2) * y_range[ 0 ] ])
                                     })
              }
              this.vertices[r*(columns+1)].tangent = this.vertices[(r+1)*(columns+1)-1].tangent.clone();
          }
          for (let r = 0; r <= rows; r++)
            // Generate normals by averaging the cross products of all defined neighbor pairs.
              for (let c = 0; c <= columns; c++) {
                  let curr = points[ r ][ c ], normal = matvec([0, 0, 0]), v = this.vertices[ r*(columns+1)+c];
                  // Store each neighbor by rotational order.
                  const neighbors = [[-1, 0], [0, 1], [1, 0], [0, -1]].map( (dir, i) =>
                      // Leave "undefined" in the array wherever we hit a boundary.
                      points[ r+dir[1] ]?.[ c+dir[0] ] );

                  // Take cross-products of pairs of neighbors, proceeding in consistent rotational direction through
                  // the pairs:
                  for (let i = 0; i < 4; i++)
                      if (neighbors[ i ] && neighbors[ (i+1)%4 ])
                          normal.add( neighbors[ i ]      .clone().subtract(curr).cross(
                                      neighbors[ (i+1)%4 ].clone().subtract(curr)      )
                                    );
                  normal.normalize ();           // Normalize the sum to get the average vector.
                  // Store the normal if it's valid (not NaN or zero length), otherwise use a default:
                  if (normal.data.every (x => x == x) && normal.norm () > .01) v.normal = normal;
                  else v.normal = curr.clone();

                  const proj = v.normal.quickClone().multiply( v.tangent.dot(v.normal) ); // component of tangent along normal

                  // Subtract projection to make tangent orthogonal to normal
                  v.tangent.subtract(proj).normalize();

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
          return array[ Math.floor (frac) ].clone().mix (array[ Math.ceil (frac) ], alpha);
      }
  };


export class Surface_Of_Revolution extends Grid_Patch {
      init (rows, columns, points, texture_coord_range, total_curvature_angle = 2 * Math.PI) {
          const row_operation    = i => Grid_Patch.sample_array (points, i),
                column_operation = (j, p) => matvec()
                                                     .rotate(total_curvature_angle / columns, 0,0,1)
                                                     .multiply(p);
          super.init (rows, columns, row_operation, column_operation, texture_coord_range);
          for( let r=0; r <= rows; r++ ) {
            // We need the last column's normal to match the first column's.
            this.vertices[ (columns+1)*r + columns ].normal.loadVector(
                this.vertices[ (columns+1)*r ].normal
              );
          }
      }
  };


export class Regular_2D_Polygon extends Surface_Of_Revolution {
      init (rows, columns, texture_range) {
          super.init (rows, columns, [ matvec([0,0,0]), matvec([1,0,0]) ], texture_range);
          this.vertices.forEach( x => {
            const p = x.position.data;
            x.normal.loadVector([0, 0, 1]);
            x.texture_coord = matvec([ p[0]/2 + .5, p[1]/2 + .5 ]);
          });
      }
  };

export class Cylindrical_Tube extends Surface_Of_Revolution {
      init (rows, columns, texture_range) {
          super.init (rows, columns, [ matvec([1,0,.5]), matvec([1,0,-.5]) ], texture_range);
      }
  };

export class Cone_Tip extends Surface_Of_Revolution { // Note:  Touches the Z axis
      init (rows, columns, texture_range) {
          super.init (rows, columns, [ matvec([0,0,1]), matvec([1,0,-1]) ], texture_range);
      }
  };

export class Torus extends Surface_Of_Revolution {
      init (rows, columns, texture_range) {
          const circle_points = Array (rows).fill( matvec([1/3, 0, 0]) )
                                            .map ((p, i, a) => matvec()
                                                               .translate( -2/3, 0, 0)
                                                               .rotate( i/(a.length - 1) * 2*Math.PI, 0,-1,0)
                                                               .scale(1, 1, 3).multiply(p)
                                                 );
          super.init(rows, columns, circle_points, texture_range);
      }
  };

export class Grid_Sphere extends Surface_Of_Revolution {
      init (rows, columns, texture_range) {
          const semi_circle_points = Array (rows).fill( matvec([0, 0, 1]) )
                                                 .map ((p, i, a) => { return matvec()
                                                                            .rotate( i/(a.length - 1) * Math.PI, 0,1,0)
                                                                            .multiply(p);
                                                      });
          super.init(rows, columns, semi_circle_points, texture_range);
      }
  };

export class Closed_Cone extends Shape {
      init (rows, columns, texture_range) {
          Geometry.insert_transformed_copy_into (Cone_Tip, this, [rows, columns, texture_range]);
          const m = matvec().rotate(Math.PI, 0,1,0).translate(0, 0, 1);
          Geometry.insert_transformed_copy_into (Regular_2D_Polygon, this, [1, columns], m);
      }
  };

export class Rounded_Closed_Cone extends Surface_Of_Revolution {
      init (rows, columns, texture_range) {
          super.init (rows, columns, [matvec([0, 0, 1]), matvec([1, 0, -1]), matvec([0, 0, -1])], texture_range);
      }
  };

export class Capped_Cylinder extends Shape {
      init (rows, columns, texture_range) {
          const m1 = matvec().translate(0, 0, .5);
          const m2 = matvec().rotate(Math.PI, 0,1,0).translate(0, 0, .5);

          Geometry.insert_transformed_copy_into (Cylindrical_Tube, this, [rows, columns, texture_range]);
          Geometry.insert_transformed_copy_into (Regular_2D_Polygon, this, [1, columns], m1);
          Geometry.insert_transformed_copy_into (Regular_2D_Polygon, this, [1, columns], m2);
      }
  };

export class Rounded_Capped_Cylinder extends Surface_Of_Revolution {
      init (rows, columns, texture_range) {
          super.init(rows, columns, [matvec([0, 0, .5]), matvec([1, 0, .5]), matvec([1, 0, -.5]), matvec([0, 0, -.5])], texture_range);
      }
  };

export class Axis_Arrows extends Shape {
      init () {
          var stack = [];
          const m = matvec().rotate(Math.PI/2, 0,1,0).scale(.25, .25, .25);
          Geometry.insert_transformed_copy_into (Subdivision_Sphere, this, [3], m.clone());
          this.drawOneAxis (matvec(), [[.67, 1], [0, 1]]);

          m.set_identity().rotate(-Math.PI/2, 1,0,0).scale(1, -1, 1);
          this.drawOneAxis ( m.clone(), [[.34, .66], [0, 1]]);

          m.set_identity().rotate(Math.PI/2, 0,1,0).scale(-1, 1, 1);
          this.drawOneAxis ( m, [[0, .33], [0, 1]]);
      }
      drawOneAxis (transform, tex) {
          // Use a different texture coordinate range for each of the three axes, so they show up differently

          let m = transform.clone().translate(0, 0, 2).scale(.25, .25, .25);
          Geometry.insert_transformed_copy_into (Closed_Cone, this, [4, 10, tex], m);

          m = transform.clone().translate(.95, .95, .45).scale(.05, .05, .45);
          Geometry.insert_transformed_copy_into (Cube, this, [], m);

          m = transform.clone().translate(.95, 0, .5).scale(.05, .05, .4);
          Geometry.insert_transformed_copy_into (Cube, this, [], m);

          m = transform.clone().translate(0, .95, .5).scale(.05, .05, .4);
          Geometry.insert_transformed_copy_into (Cube, this, [], m);

          m = transform.clone().translate(0, 0, 1).scale(.1, .1, 2);
          Geometry.insert_transformed_copy_into (Cylindrical_Tube, this, [7, 7, tex], m);
      }
  };

export class Shape_From_File extends tiny.Shape {
                                      // **Shape_From_File** is a versatile standalone Shape that imports
                                      // all its arrays' data from an .obj 3D model file.
    init( filename ) {
        this.waiting = true;
        this.load_file( filename );
      }
    load_file( filename ) {                     // Request the external file and wait for it to load.
          return fetch( filename )
            .then( response =>
              { if ( response.ok )  return Promise.resolve( response.text() )
                else                return Promise.reject ( response.status )
              })
            .then( obj_file_contents => this.parse_into_mesh( obj_file_contents ) )
            .catch( error => { throw "OBJ file loader:  OBJ file either not found or is of unsupported format." } )
        }
    parse_into_mesh( data ) {                   // Adapted from the "webgl-obj-loader.js" library found online:
        var positions = [], normals = [], texture_coords = [], unpacked = {};

        unpacked.positions = [];    unpacked.normals = [];    unpacked.texture_coords = [];
        unpacked.hashindices = {};  unpacked.indices = [];  unpacked.index = 0;

        var lines = data.split('\n');

        var VERTEX_RE = /^v\s/;    var NORMAL_RE = /^vn\s/;    var TEXTURE_RE = /^vt\s/;
        var FACE_RE = /^f\s/;      var WHITESPACE_RE = /\s+/;

        for (var i = 0; i < lines.length; i++) {
          var line = lines[i].trim();
          var elements = line.split(WHITESPACE_RE);
          elements.shift();

          if      (VERTEX_RE.test(line))  positions.push(...elements);
          else if (NORMAL_RE.test(line))  normals.push(...elements);
          else if (TEXTURE_RE.test(line)) texture_coords.push(...elements.slice(0,2));
          else if (FACE_RE.test(line)) {
            var quad = false;
            for (var j = 0, eleLen = elements.length; j < eleLen; j++)
            {
                if(j === 3 && !quad) {  j = 2;  quad = true;  }
                if(elements[j] in unpacked.hashindices)
                    unpacked.indices.push(unpacked.hashindices[elements[j]]);
                else {
                    var vertex = elements[ j ].split( '/' );

                    unpacked.positions.push(+positions[(vertex[0] - 1) * 3 + 0]);
                    unpacked.positions.push(+positions[(vertex[0] - 1) * 3 + 1]);
                    unpacked.positions.push(+positions[(vertex[0] - 1) * 3 + 2]);

                    if (texture_coords.length) {
                      unpacked.texture_coords.push(+texture_coords[(vertex[1] - 1) * 2 + 0]);
                      unpacked.texture_coords.push(+texture_coords[(vertex[1] - 1) * 2 + 1]);
                    }

                    unpacked.normals.push(+normals[(vertex[2] - 1) * 3 + 0]);
                    unpacked.normals.push(+normals[(vertex[2] - 1) * 3 + 1]);
                    unpacked.normals.push(+normals[(vertex[2] - 1) * 3 + 2]);

                    unpacked.hashindices[elements[j]] = unpacked.index;
                    unpacked.indices.push(unpacked.index);
                    unpacked.index += 1;
                }
                if(j === 3 && quad)   unpacked.indices.push( unpacked.hashindices[elements[0]]);
            }
          }
        }

        ({ positions, normals, texture_coords } = unpacked);
        this.indices = unpacked.indices;

        for (let i = 0; i < positions.length; i += 3)
          this.vertices.push({ position: matvec([...positions.slice(i, i + 3)]),
                               normal:   matvec([...normals.slice(i, i + 3)]),
                               tangent:  matvec([0,0,0])
                             });
        for(let i = 0; i < texture_coords.length; i += 2 )
          this.vertices[i/2].texture_coord = matvec([ texture_coords[ i ], texture_coords[ i+1 ] ]);

        for (let i = 0; i < this.indices.length; i += 3) {     // Tangent calculation:
          const face = this.indices.slice(i, i+3);
          const vertices = face.map( i => this.vertices[i] );
          const points = vertices.map( v => v.position );
          const UVs = vertices.map( v => v.texture_coord );

          const edge1 = points[1].clone().subtract(points[0]);
          const edge2 = points[2].clone().subtract(points[0]);
          const deltaUV1 = UVs[1].clone().subtract(UVs[0]);
          const deltaUV2 = UVs[2].clone().subtract(UVs[0]);
          const r = 1.0 / (deltaUV1.data[0] * deltaUV2.data[1] - deltaUV1.data[1] * deltaUV2.data[0]);

          // Accumulate tangent to all three vertices of the face:
          const tangent = edge1.multiply( deltaUV2.data[1] ).subtract( edge2.multiply( deltaUV1.data[1] ) ).multiply(r);
          vertices.forEach( v => v.tangent.add(tangent) );
        }
        for (let v of this.vertices) {    // Finally, orthogonalize and normalize tangents:
          const n = v.normal;
          const t = v.tangent;
          t.subtract( n.quickClone().multiply( n.dot(t) ) ).normalize(); // Subtract out component along normal
        }

        Geometry.normalize_positions( this, true );
        this.waiting = false;
      }
  };

