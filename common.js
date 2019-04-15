import * as tiny from './tiny-graphics.js';
const { Vec, Mat, Mat4, Color, Shape, Shader, Overridable, Scene } = tiny;           // Pull these names into this module's scope for convenience.

import {widgets} from './tiny-graphics-widgets.js';
tiny = Object.assign( {}, tiny, widgets );

const defs = {};

export { tiny, defs };

const Triangle = defs.Triangle =
class Triangle extends Shape    // The simplest possible Shape – one triangle.  It has 3 vertices, each
{ constructor()                        // having their own 3D position, normal vector, and texture-space coordinate.
    { super( "position", "normal", "texture_coord" );                              // Name the values we'll define per each vertex.
                                  // First, specify the vertex positions -- the three point locations of an imaginary triangle.
                                  // Next, supply vectors that point away from the triangle face.  They should match up with the points in 
                                  // the above list.  Normal vectors are needed so the graphics engine can know if the shape is pointed at 
                                  // light or not, and color it accordingly.  lastly, put each point somewhere in texture space too.
      this.arrays.position      = [ Vec.of(0,0,0), Vec.of(1,0,0), Vec.of(0,1,0) ];
      this.arrays.normal        = [ Vec.of(0,0,1), Vec.of(0,0,1), Vec.of(0,0,1) ];
      this.arrays.texture_coord = [ Vec.of(0,0),   Vec.of(1,0),   Vec.of(0,1)   ]; 
      this.indices        = [ 0, 1, 2 ];                         // Index into our vertices to connect them into a whole triangle.
                 // A position, normal, and texture coord fully describes one "vertex".  What's the "i"th vertex?  Simply the combined data 
                 // you get if you look up index "i" of those lists above -- a position, normal vector, and tex coord together.  Lastly we
                 // told it how to connect vertex entries into triangles.  Every three indices in "this.indices" traces out one triangle.
    }
}


const Square = defs.Square =
class Square extends Shape       // A square, demonstrating two triangles that share vertices.  On any planar surface, the interior 
                                        // edges don't make any important seams.  In these cases there's no reason not to re-use data of
{                                       // the common vertices between triangles.  This makes all the vertex arrays (position, normals, 
  constructor()                         // etc) smaller and more cache friendly.
    { super( "position", "normal", "texture_coord" );
      this.arrays.position      = Vec.cast( [-1,-1,0], [1,-1,0], [-1,1,0], [1,1,0] );   // Specify the 4 square corner locations.
      this.arrays.normal        = Vec.cast( [0,0,1],   [0,0,1],  [0,0,1],  [0,0,1] );   // Match those up with normal vectors.
      this.arrays.texture_coord = Vec.cast( [0,0],     [1,0],    [0,1],    [1,1]   );   // Draw a square in texture coordinates too.
      this.indices.push( 0, 1, 2,     1, 3, 2 );                   // Two triangles this time, indexing into four distinct vertices.
    }
}


const Tetrahedron = defs.Tetrahedron =
class Tetrahedron extends Shape                // The Tetrahedron shape demonstrates flat vs smooth shading (a boolean argument 
{ constructor( using_flat_shading )                   // selects which one).  It is also our first 3D, non-planar shape.
    { super( "position", "normal", "texture_coord" );
      var a = 1/Math.sqrt(3);
      if( !using_flat_shading )                                 // Method 1:  A tetrahedron with shared vertices.  Compact, performs better,
      {                                                         // but can't produce flat shading or discontinuous seams in textures.
          this.arrays.position      = Vec.cast( [ 0, 0, 0], [1,0,0], [0,1,0], [0,0,1] );          
          this.arrays.normal        = Vec.cast( [-a,-a,-a], [1,0,0], [0,1,0], [0,0,1] );          
          this.arrays.texture_coord = Vec.cast( [ 0, 0   ], [1,0  ], [0,1, ], [1,1  ] );
          this.indices.push( 0, 1, 2,   0, 1, 3,   0, 2, 3,   1, 2, 3 );  // Vertices are shared multiple times with this method.
      }
      else
      { this.arrays.position = Vec.cast( [0,0,0], [1,0,0], [0,1,0],         // Method 2:  A tetrahedron with 
                                         [0,0,0], [1,0,0], [0,0,1],         // four independent triangles.
                                         [0,0,0], [0,1,0], [0,0,1],
                                         [0,0,1], [1,0,0], [0,1,0] );

        this.arrays.normal   = Vec.cast( [0,0,-1], [0,0,-1], [0,0,-1],        // This here makes Method 2 flat shaded, since values
                                         [0,-1,0], [0,-1,0], [0,-1,0],        // of normal vectors can be constant per whole
                                         [-1,0,0], [-1,0,0], [-1,0,0],        // triangle.  Repeat them for all three vertices.
                                         [ a,a,a], [ a,a,a], [ a,a,a] );

        this.arrays.texture_coord = Vec.cast( [0,0], [1,0], [1,1],    // Each face in Method 2 also gets its own set of texture coords
                                              [0,0], [1,0], [1,1],    //(half the image is mapped onto each face).  We couldn't do this
                                              [0,0], [1,0], [1,1],    // with shared vertices since this features abrupt transitions
                                              [0,0], [1,0], [1,1] );  // when approaching the same point from different directions.

        this.indices.push( 0, 1, 2,    3, 4, 5,    6, 7, 8,    9, 10, 11 );      // Notice all vertices are unique this time.
      }
    }
}

const Windmill = defs.Windmill =
class Windmill extends Shape              // Windmill Shape.  As our shapes get more complicated, we begin using matrices and flow
{ constructor( num_blades )                      // control (including loops) to generate non-trivial point clouds and connect them.
    { super( "position", "normal", "texture_coord" );
      for( var i = 0; i < num_blades; i++ )     // A loop to automatically generate the triangles.
        {                                                                                   // Rotate around a few degrees in the
          var spin = Mat4.rotation( i * 2*Math.PI/num_blades, Vec.of( 0,1,0 ) );            // XZ plane to place each new point.
          var newPoint  = spin.times( Vec.of( 1,0,0,1 ) ).to3();   // Apply that XZ rotation matrix to point (1,0,0) of the base triangle.
          this.arrays.position.push( newPoint,                           // Store this XZ position.                  This is point 1.
                                     newPoint.plus( [ 0,1,0 ] ),         // Store it again but with higher y coord:  This is point 2.
                                              Vec.of( 0,0,0 )    );      // All triangles touch this location.       This is point 3.

                        // Rotate our base triangle's normal (0,0,1) to get the new one.  Careful!  Normal vectors are not points; 
                        // their perpendicularity constraint gives them a mathematical quirk that when applying matrices you have
                        // to apply the transposed inverse of that matrix instead.  But right now we've got a pure rotation matrix, 
                        // where the inverse and transpose operations cancel out.
          var newNormal = spin.times( Vec.of( 0,0,1 ).to4(0) ).to3();  
          this.arrays.normal.push( newNormal, newNormal, newNormal );           // Propagate the same normal to all three vertices.
          this.arrays.texture_coord.push( ...Vec.cast( [ 0,0 ], [ 0,1 ], [ 1,0 ] ) );
          this.indices.push( 3*i, 3*i + 1, 3*i + 2 );                    // Procedurally connect the 3 new vertices into triangles.
        }
    }
}


const Cube = defs.Cube =
class Cube extends Shape    // A cube inserts six square strips into its arrays.
{ constructor()  
    { super( "position", "normal", "texture_coord" );
      for( var i = 0; i < 3; i++ )                    
        for( var j = 0; j < 2; j++ )
        { var square_transform = Mat4.rotation( i == 0 ? Math.PI/2 : 0, Vec.of(1, 0, 0) )
                         .times( Mat4.rotation( Math.PI * j - ( i == 1 ? Math.PI/2 : 0 ), Vec.of( 0, 1, 0 ) ) )
                         .times( Mat4.translation([ 0, 0, 1 ]) );
          Square.insert_transformed_copy_into( this, [], square_transform );
        }
    }
}


const Line_Segment_Array = defs.Line_Segment_Array =
class Line_Segment_Array extends Shape    // Plot 2D points.
{ constructor()
  { super( "position", "color" );
  }
  set_data( origins, destinations, colors, gl = this.gl )      // Provide two lists of points (each pair will be connected into a segment),
    { this.arrays.position = [];                               // plus a list of enough colors for each of those two points per segment.
      for( let [i] of origins.entries() )
      { this.arrays.position[ 2*i     ] = origins[i];  
        this.arrays.position[ 2*i + 1 ] = destinations[i];
      }
      this.arrays.color = colors;
      this.copy_onto_graphics_card( gl );
    }
}


const Subdivision_Sphere = defs.Subdivision_Sphere =
class Subdivision_Sphere extends Shape   
{                                       // This Shape defines a Sphere surface, with nice uniform triangles.  A subdivision surface
                                        // (see Wikipedia article on those) is initially simple, then builds itself into a more and more 
                                        // detailed shape of the same layout.  Each act of subdivision makes it a better approximation of 
                                        // some desired mathematical surface by projecting each new point onto that surface's known 
                                        // implicit equation.  For a sphere, we begin with a closed 3-simplex (a tetrahedron).  For each
                                        // face, connect the midpoints of each edge together to make more faces.  Repeat recursively until 
                                        // the desired level of detail is obtained.  Project all new vertices to unit vectors (onto the                                         
  constructor( max_subdivisions )       // unit sphere) and group them into triangles by following the predictable pattern of the recursion.
    { super( "position", "normal", "texture_coord" );                          // Start from the following equilateral tetrahedron:
      this.arrays.position = Vec.cast( [ 0, 0, -1 ], [ 0, .9428, .3333 ], [ -.8165, -.4714, .3333 ], [ .8165, -.4714, .3333 ] );
      
      this.subdivideTriangle( 0, 1, 2, max_subdivisions);  // Begin recursion.
      this.subdivideTriangle( 3, 2, 1, max_subdivisions);
      this.subdivideTriangle( 1, 0, 3, max_subdivisions);
      this.subdivideTriangle( 0, 2, 3, max_subdivisions);
      
      for( let p of this.arrays.position )
        { this.arrays.normal.push( p.copy() );           // Each point has a normal vector that simply goes to the point from the origin.

                                                         // Textures are tricky.  A Subdivision sphere has no straight seams to which image 
                                                         // edges in UV space can be mapped.  The only way to avoid artifacts is to smoothly                                                          
          this.arrays.texture_coord.push(                // wrap & unwrap the image in reverse - displaying the texture twice on the sphere.
                                 Vec.of( Math.asin( p[0]/Math.PI ) + .5, Math.asin( p[1]/Math.PI ) + .5 ) ) }
    }
  subdivideTriangle( a, b, c, count )   // Recurse through each level of detail by splitting triangle (a,b,c) into four smaller ones.
    { 
      if( count <= 0) { this.indices.push( a,b,c ); return; }  // Base case of recursion - we've hit the finest level of detail we want.
                  
      var ab_vert = this.arrays.position[a].mix( this.arrays.position[b], 0.5).normalized(),     // We're not at the base case.  So, build 3 new
          ac_vert = this.arrays.position[a].mix( this.arrays.position[c], 0.5).normalized(),     // vertices at midpoints, and extrude them out to
          bc_vert = this.arrays.position[b].mix( this.arrays.position[c], 0.5).normalized();     // touch the unit sphere (length 1).
            
      var ab = this.arrays.position.push( ab_vert ) - 1,      // Here, push() returns the indices of the three new vertices (plus one).
          ac = this.arrays.position.push( ac_vert ) - 1,  
          bc = this.arrays.position.push( bc_vert ) - 1;  
      
      this.subdivideTriangle( a, ab, ac,  count - 1 );          // Recurse on four smaller triangles, and we're done.  Skipping every
      this.subdivideTriangle( ab, b, bc,  count - 1 );          // fourth vertex index in our list takes you down one level of detail,
      this.subdivideTriangle( ac, bc, c,  count - 1 );          // and so on, due to the way we're building it.
      this.subdivideTriangle( ab, bc, ac, count - 1 );
    }
}


const Grid_Patch = defs.Grid_Patch =
class Grid_Patch extends Shape       // A grid of rows and columns you can distort. A tesselation of triangles connects the
{                                           // points, generated with a certain predictable pattern of indices.  Two callbacks
                                            // allow you to dynamically define how to reach the next row or column.
  constructor( rows, columns, next_row_function, next_column_function, texture_coord_range = [ [ 0, rows ], [ 0, columns ] ]  )
    { super( "position", "normal", "texture_coord" );
      let points = [];
      for( let r = 0; r <= rows; r++ ) 
      { points.push( new Array( columns+1 ) );                                                    // Allocate a 2D array.
                                             // Use next_row_function to generate the start point of each row. Pass in the progress ratio,
        points[ r ][ 0 ] = next_row_function( r/rows, points[ r-1 ] && points[ r-1 ][ 0 ] );      // and the previous point if it existed.                                                                                                  
      }
      for(   let r = 0; r <= rows;    r++ )               // From those, use next_column function to generate the remaining points:
        for( let c = 0; c <= columns; c++ )
        { if( c > 0 ) points[r][ c ] = next_column_function( c/columns, points[r][ c-1 ], r/rows );
      
          this.arrays.position.push( points[r][ c ] );        
                                                                                      // Interpolate texture coords from a provided range.
          const a1 = c/columns, a2 = r/rows, x_range = texture_coord_range[0], y_range = texture_coord_range[1];
          this.arrays.texture_coord.push( Vec.of( ( a1 )*x_range[1] + ( 1-a1 )*x_range[0], ( a2 )*y_range[1] + ( 1-a2 )*y_range[0] ) );
        }
      for(   let r = 0; r <= rows;    r++ )            // Generate normals by averaging the cross products of all defined neighbor pairs.
        for( let c = 0; c <= columns; c++ )
        { let curr = points[r][c], neighbors = new Array(4), normal = Vec.of( 0,0,0 );          
          for( let [ i, dir ] of [ [ -1,0 ], [ 0,1 ], [ 1,0 ], [ 0,-1 ] ].entries() )         // Store each neighbor by rotational order.
            neighbors[i] = points[ r + dir[1] ] && points[ r + dir[1] ][ c + dir[0] ];        // Leave "undefined" in the array wherever
                                                                                              // we hit a boundary.
          for( let i = 0; i < 4; i++ )                                          // Take cross-products of pairs of neighbors, proceeding
            if( neighbors[i] && neighbors[ (i+1)%4 ] )                          // a consistent rotational direction through the pairs:
              normal = normal.plus( neighbors[i].minus( curr ).cross( neighbors[ (i+1)%4 ].minus( curr ) ) );          
          normal.normalize();                                                              // Normalize the sum to get the average vector.
                                                     // Store the normal if it's valid (not NaN or zero length), otherwise use a default:
          if( normal.every( x => x == x ) && normal.norm() > .01 )  this.arrays.normal.push( Vec.from( normal ) );    
          else                                                      this.arrays.normal.push( Vec.of( 0,0,1 )    );
        }   
        
      for( var h = 0; h < rows; h++ )             // Generate a sequence like this (if #columns is 10):  
        for( var i = 0; i < 2 * columns; i++ )    // "1 11 0  11 1 12  2 12 1  12 2 13  3 13 2  13 3 14  4 14 3..." 
          for( var j = 0; j < 3; j++ )
            this.indices.push( h * ( columns + 1 ) + columns * ( ( i + ( j % 2 ) ) % 2 ) + ( ~~( ( j % 3 ) / 2 ) ? 
                                   ( ~~( i / 2 ) + 2 * ( i % 2 ) )  :  ( ~~( i / 2 ) + 1 ) ) );
    }
  static sample_array( array, ratio )                 // Optional but sometimes useful as a next row or column operation. In a given array
    {                                                 // of points, intepolate the pair of points that our progress ratio falls between.  
      const frac = ratio * ( array.length - 1 ), alpha = frac - Math.floor( frac );
      return array[ Math.floor( frac ) ].mix( array[ Math.ceil( frac ) ], alpha );
    }
}


const Surface_Of_Revolution = defs.Surface_Of_Revolution =
class Surface_Of_Revolution extends Grid_Patch      
{                                                   // SURFACE OF REVOLUTION: Produce a curved "sheet" of triangles with rows and columns.
                                                    // Begin with an input array of points, defining a 1D path curving through 3D space -- 
                                                    // now let each such point be a row.  Sweep that whole curve around the Z axis in equal 
                                                    // steps, stopping and storing new points along the way; let each step be a column. Now
                                                    // we have a flexible "generalized cylinder" spanning an area until total_curvature_angle.
  constructor( rows, columns, points, texture_coord_range, total_curvature_angle = 2*Math.PI )
    { const row_operation =     i => Grid_Patch.sample_array( points, i ),
         column_operation = (j,p) => Mat4.rotation( total_curvature_angle/columns, Vec.of( 0,0,1 ) ).times(p.to4(1)).to3();
         
       super( rows, columns, row_operation, column_operation, texture_coord_range );
    }
}


const Regular_2D_Polygon = defs.Regular_2D_Polygon =
class Regular_2D_Polygon extends Surface_Of_Revolution     // Approximates a flat disk / circle
  { constructor( rows, columns )
      { super( rows, columns, Vec.cast( [0, 0, 0], [1, 0, 0] ) ); 
        this.arrays.normal = this.arrays.normal.map( x => Vec.of( 0,0,1 ) );
        this.arrays.texture_coord.forEach( (x, i, a) => a[i] = this.arrays.position[i].map( x => x/2 + .5 ).slice(0,2) ); } }

const Cylindrical_Tube = defs.Cylindrical_Tube =
class Cylindrical_Tube extends Surface_Of_Revolution    // An open tube shape with equally sized sections, pointing down Z locally.    
  { constructor( rows, columns, texture_range ) { super( rows, columns, Vec.cast( [1, 0, .5], [1, 0, -.5] ), texture_range ); } }

const Cone_Tip = defs.Cone_Tip =
class Cone_Tip extends Surface_Of_Revolution    // Note:  Touches the Z axis; squares degenerate into triangles as they sweep around.
  { constructor( rows, columns, texture_range ) { super( rows, columns, Vec.cast( [0, 0, 1],  [1, 0, -1]  ), texture_range ); } }

const Torus = defs.Torus =
class Torus extends Shape                                         // Build a donut shape.  An example of a surface of revolution.
  { constructor( rows, columns )  
      { super( "position", "normal", "texture_coord" );
        const circle_points = Array( rows ).fill( Vec.of( 1/3,0,0 ) )
                                           .map( (p,i,a) => Mat4.translation([ -2/3,0,0 ])
                                                    .times( Mat4.rotation( i/(a.length-1) * 2*Math.PI, Vec.of( 0,-1,0 ) ) )
                                                    .times( Mat4.scale([ 1,1,3 ]) )
                                                    .times( p.to4(1) ).to3() );

        Surface_Of_Revolution.insert_transformed_copy_into( this, [ rows, columns, circle_points ] );         
      } }

const Grid_Sphere = defs.Grid_Sphere =
class Grid_Sphere extends Shape                  // With lattitude / longitude divisions; this means singularities are at 
  { constructor( rows, columns, texture_range )         // the mesh's top and bottom.  Subdivision_Sphere is a better alternative.
      { super( "position", "normal", "texture_coord" );
        const semi_circle_points = Array( rows ).fill( Vec.of( 0,0,1 ) ).map( (x,i,a) =>
                                     Mat4.rotation( i/(a.length-1) * Math.PI, Vec.of( 0,1,0 ) ).times( x.to4(1) ).to3() );
        
        Surface_Of_Revolution.insert_transformed_copy_into( this, [ rows, columns, semi_circle_points, texture_range ] );
      } }

const Closed_Cone = defs.Closed_Cone =
class Closed_Cone extends Shape     // Combine a cone tip and a regular polygon to make a closed cone.
  { constructor( rows, columns, texture_range )
      { super( "position", "normal", "texture_coord" );
        Cone_Tip          .insert_transformed_copy_into( this, [ rows, columns, texture_range ]);    
        Regular_2D_Polygon.insert_transformed_copy_into( this, [ 1, columns ], Mat4.rotation( Math.PI, Vec.of(0, 1, 0) )
                                                                       .times( Mat4.translation([ 0, 0, 1 ]) ) ); } }

const Rounded_Closed_Cone = defs.Rounded_Closed_Cone =
class Rounded_Closed_Cone extends Surface_Of_Revolution   // An alternative without two separate sections
  { constructor( rows, columns, texture_range ) { super( rows, columns, Vec.cast( [0, 0, 1], [1, 0, -1], [0, 0, -1] ), texture_range ) ; } }

const Capped_Cylinder = defs.Capped_Cylinder =
class Capped_Cylinder extends Shape                // Combine a tube and two regular polygons to make a closed cylinder.
  { constructor( rows, columns, texture_range )           // Flat shade this to make a prism, where #columns = #sides.
      { super( "position", "normal", "texture_coord" );
        Cylindrical_Tube  .insert_transformed_copy_into( this, [ rows, columns, texture_range ] );
        Regular_2D_Polygon.insert_transformed_copy_into( this, [ 1, columns ],                                                  Mat4.translation([ 0, 0, .5 ]) );
        Regular_2D_Polygon.insert_transformed_copy_into( this, [ 1, columns ], Mat4.rotation( Math.PI, Vec.of(0, 1, 0) ).times( Mat4.translation([ 0, 0, .5 ]) ) ); } }

const Rounded_Capped_Cylinder = defs.Rounded_Capped_Cylinder =
class Rounded_Capped_Cylinder extends Surface_Of_Revolution   // An alternative without three separate sections
  { constructor ( rows, columns, texture_range ) { super( rows, columns, Vec.cast( [0, 0, .5], [1, 0, .5], [1, 0, -.5], [0, 0, -.5] ), texture_range ); } }
  
  
const Axis_Arrows = defs.Axis_Arrows =
class Axis_Arrows extends Shape                               // An axis set with arrows, made out of a lot of various primitives.
{ constructor()
    { super( "position", "normal", "texture_coord" );
      var stack = [];       
      Subdivision_Sphere.insert_transformed_copy_into( this, [ 3 ], Mat4.rotation( Math.PI/2, Vec.of( 0,1,0 ) ).times( Mat4.scale([ .25, .25, .25 ]) ) );
      this.drawOneAxis( Mat4.identity(),                                                            [[ .67, 1  ], [ 0,1 ]] );
      this.drawOneAxis( Mat4.rotation(-Math.PI/2, Vec.of(1,0,0)).times( Mat4.scale([  1, -1, 1 ])), [[ .34,.66 ], [ 0,1 ]] );
      this.drawOneAxis( Mat4.rotation( Math.PI/2, Vec.of(0,1,0)).times( Mat4.scale([ -1,  1, 1 ])), [[  0 ,.33 ], [ 0,1 ]] ); 
    }
  drawOneAxis( transform, tex )    // Use a different texture coordinate range for each of the three axes, so they show up differently.
    { Closed_Cone     .insert_transformed_copy_into( this, [ 4, 10, tex ], transform.times( Mat4.translation([   0,   0,  2 ]) ).times( Mat4.scale([ .25, .25, .25 ]) ) );
      Cube            .insert_transformed_copy_into( this, [ ],            transform.times( Mat4.translation([ .95, .95, .45]) ).times( Mat4.scale([ .05, .05, .45 ]) ) );
      Cube            .insert_transformed_copy_into( this, [ ],            transform.times( Mat4.translation([ .95,   0, .5 ]) ).times( Mat4.scale([ .05, .05, .4  ]) ) );
      Cube            .insert_transformed_copy_into( this, [ ],            transform.times( Mat4.translation([   0, .95, .5 ]) ).times( Mat4.scale([ .05, .05, .4  ]) ) );
      Cylindrical_Tube.insert_transformed_copy_into( this, [ 7, 7,  tex ], transform.times( Mat4.translation([   0,   0,  1 ]) ).times( Mat4.scale([  .1,  .1,  2  ]) ) );
    }
}


const Minimal_Shape = defs.Minimal_Shape =
class Minimal_Shape extends tiny.Vertex_Buffer    // The simplest possible Shape – one triangle.  It has 3 vertices, each
{ constructor()                                     // containing two values: a 3D position and a color.
    { super( "position", "color" );
      this.arrays.position = [ Vec.of(0,0,0), Vec.of(1,0,0), Vec.of(0,1,0) ];   // Describe the where the points of a triangle are in space.
      this.arrays.color    = [ Color.of(1,0,0,1), Color.of(0,1,0,1), Color.of(0,0,1,1) ];   // Besides a position, vertices also have a color.      
    }
}


const Minimal_Webgl_Demo = defs.Minimal_Webgl_Demo =
class Minimal_Webgl_Demo extends Scene
{ constructor( webgl_manager, control_panel )
    { super( webgl_manager, control_panel );
      this.shapes = { triangle : new Minimal_Shape() };         // Send a Triangle's vertices to the GPU's buffers.
      this.shader = new Basic_Shader();
    }
  display( context, graphics_state )                                                      // Do this every frame.
    { this.shapes.triangle.draw( context, graphics_state, Mat4.identity(), this.shader.material() );  // Draw the triangle.
    }
 make_control_panel()                 // Draw buttons, setup their actions and keyboard shortcuts, and monitor live variables.
    { this.control_panel.innerHTML += "(This one has no controls)";
    }
}


const Basic_Shader = defs.Basic_Shader =
class Basic_Shader extends Shader      // Subclasses of Shader each store and manage a complete GPU program.  This Shader is 
{                                             // the simplest example of one.  It samples pixels from colors that are directly assigned 
                                              // to the vertices.
  material() { return new class Material extends Overridable {}().replace({ shader: this }) }      // Materials here are minimal, without any settings.
  update_GPU( context, gpu_addresses, graphics_state, model_transform, material )    // Define how to synchronize our JavaScript's variables to the GPU's:
      { const [ P, C, M ] = [ graphics_state.projection_transform, graphics_state.camera_inverse, model_transform ],
                      PCM = P.times( C ).times( M );
        context.uniformMatrix4fv( gpu_addresses.projection_camera_model_transform, false, Mat.flatten_2D_to_1D( PCM.transposed() ) );
      }
  shared_glsl_code()            // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
    { return `precision mediump float;
              varying vec4 VERTEX_COLOR;
      `;
    }
  vertex_glsl_code()           // ********* VERTEX SHADER *********
    { return `
        attribute vec4 color;
        attribute vec3 position;                            // Position is expressed in object coordinates.
        uniform mat4 projection_camera_model_transform;

        void main()
        { gl_Position = projection_camera_model_transform * vec4( position, 1.0 );      // The vertex's final resting place (in NDCS).
          VERTEX_COLOR = color;                                                         // Use the hard-coded color of the vertex.
        }`;
    }
  fragment_glsl_code()           // ********* FRAGMENT SHADER *********
    { return `
        void main()
        { gl_FragColor = VERTEX_COLOR;                              // The interpolation gets done directly on the per-vertex colors.
        }`;
    }
}


const Funny_Shader = defs.Funny_Shader =
class Funny_Shader extends Shader         // Simple "procedural" texture shader, with texture coordinates but without an input image.
{ material() { return new class Material extends Overridable {}().replace({ shader: this }) }      // Materials here are minimal, without any settings.
  update_GPU( context, gpu_addresses, graphics_state, model_transform, material )    // Define how to synchronize our JavaScript's variables to the GPU's:
      { const [ P, C, M ] = [ graphics_state.projection_transform, graphics_state.camera_inverse, model_transform ],
                      PCM = P.times( C ).times( M );
        context.uniformMatrix4fv( gpu_addresses.projection_camera_model_transform, false, Mat.flatten_2D_to_1D( PCM.transposed() ) );
        context.uniform1f ( gpu_addresses.animation_time, graphics_state.animation_time / 1000 );
      }
  shared_glsl_code()            // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
    { return `precision mediump float;
              varying vec2 f_tex_coord;
      `;
    }
  vertex_glsl_code()           // ********* VERTEX SHADER *********
    { return `
        attribute vec3 position;                            // Position is expressed in object coordinates.
        attribute vec2 texture_coord;
        uniform mat4 projection_camera_model_transform;

        void main()
        { gl_Position = projection_camera_model_transform * vec4( position, 1.0 );   // The vertex's final resting place (in NDCS).
          f_tex_coord = texture_coord;                                       // Directly use original texture coords and interpolate between.
        }`;
    }
  fragment_glsl_code()           // ********* FRAGMENT SHADER *********
    { return `
        uniform float animation_time;
        void main()
        { float a = animation_time, u = f_tex_coord.x, v = f_tex_coord.y;   
                                                                  // Use an arbitrary math function to color in all pixels as a complex                                                                  
          gl_FragColor = vec4(                                    // function of the UV texture coordintaes of the pixel and of time.  
            2.0 * u * sin(17.0 * u ) + 3.0 * v * sin(11.0 * v ) + 1.0 * sin(13.0 * a),
            3.0 * u * sin(18.0 * u ) + 4.0 * v * sin(12.0 * v ) + 2.0 * sin(14.0 * a),
            4.0 * u * sin(19.0 * u ) + 5.0 * v * sin(13.0 * v ) + 3.0 * sin(15.0 * a),
            5.0 * u * sin(20.0 * u ) + 6.0 * v * sin(14.0 * v ) + 4.0 * sin(16.0 * a));
        }`;
    }
}


const Phong_Shader = defs.Phong_Shader =
class Phong_Shader extends Shader   // THE DEFAULT SHADER: This uses the Phong Reflection Model, with optional Gouraud shading. 
                                           // Wikipedia has good defintions for these concepts.  Subclasses of class Shader each store 
                                           // and manage a complete GPU program.  This particular one is a big "master shader" meant to 
                                           // handle all sorts of lighting situations in a configurable way. 
                                           // Phong Shading is the act of determining brightness of pixels via vector math.  It compares
                                           // the normal vector at that pixel to the vectors toward the camera and light sources.
          // *** How Shaders Work:
                                           // The "vertex_glsl_code" string below is code that is sent to the graphics card at runtime, 
                                           // where on each run it gets compiled and linked there.  Thereafter, all of your calls to draw 
                                           // shapes will launch the vertex shader program once per vertex in the shape (three times per 
                                           // triangle), sending results on to the next phase.  The purpose of this vertex shader program 
                                           // is to calculate the final resting place of vertices in screen coordinates; each vertex 
                                           // starts out in local object coordinates and then undergoes a matrix transform to get there.
                                           //
                                           // Likewise, the "fragment_glsl_code" string is used as the Fragment Shader program, which gets 
                                           // sent to the graphics card at runtime.  The fragment shader runs once all the vertices in a 
                                           // triangle / element finish their vertex shader programs, and thus have finished finding out 
                                           // where they land on the screen.  The fragment shader fills in (shades) every pixel (fragment) 
                                           // overlapping where the triangle landed.  It retrieves different values (such as vectors) that 
                                           // are stored at three extreme points of the triangle, and then interpolates the values weighted 
                                           // by the pixel's proximity to each extreme point, using them in formulas to determine color.
                                           // The fragment colors may or may not become final pixel colors; there could already be other 
                                           // triangles' fragments occupying the same pixels.  The Z-Buffer test is applied to see if the 
                                           // new triangle is closer to the camera, and even if so, blending settings may interpolate some 
                                           // of the old color into the result.  Finally, an image is displayed onscreen.
{ material( options )                      // Phong Materials expect you to pass in options like the following:
    { const defaults = { color: Color.of( 0,0,0,1 ), ambient: 0, diffusivity: 1, specularity: 1, smoothness: 40 };
      return new class Material extends Overridable
        { constructor()                         
            { super();
              Object.assign( this, defaults, options );
            }
        }().replace({ shader: this })
    }
  shared_glsl_code()            // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
    { return `precision mediump float;
        const int N_LIGHTS = 2;             // We're limited to only so many inputs in hardware.  Lights are costly (lots of sub-values).
        uniform float ambient, diffusivity, specularity, smoothness, animation_time, attenuation_factor[N_LIGHTS];
        uniform bool GOURAUD, COLOR_NORMALS, USE_TEXTURE;               // Flags for alternate shading methods
        uniform vec4 lightPosition[N_LIGHTS], lightColor[N_LIGHTS], shapeColor;
        varying vec3 N, E;                    // Specifier "varying" means a variable's final value will be passed from the vertex shader 
        varying vec2 f_tex_coord;             // on to the next phase (fragment shader), then interpolated per-fragment, weighted by the 
        varying vec4 VERTEX_COLOR;            // pixel fragment's proximity to each of the 3 vertices (barycentric interpolation).
        varying vec3 L[N_LIGHTS], H[N_LIGHTS];
        varying float dist[N_LIGHTS];
        
        vec3 phong_model_lights( vec3 N )
          { vec3 result = vec3(0.0);
            for(int i = 0; i < N_LIGHTS; i++)
              {
                float attenuation_multiplier = 1.0 / (1.0 + attenuation_factor[i] * (dist[i] * dist[i]));
                float diffuse  =      max( dot(N, normalize( L[i] ) ), 0.0 );
                float specular = pow( max( dot(N, normalize( H[i] ) ), 0.0 ), smoothness );

                result += attenuation_multiplier * ( shapeColor.xyz * diffusivity * diffuse + lightColor[i].xyz * specularity * specular );
              }
            return result;
          } ` ;
    }
  vertex_glsl_code()           // ********* VERTEX SHADER *********
    { return `
        attribute vec3 position, normal;                            // Position is expressed in object coordinates.
        attribute vec2 texture_coord;

        uniform mat4 camera_transform, camera_model_transform, projection_camera_model_transform;
        uniform mat3 inverse_transpose_modelview;

        void main()
        { gl_Position = projection_camera_model_transform * vec4( position, 1.0 );            // The vertex's final resting place (in NDCS).
          N = normalize( inverse_transpose_modelview * normal );                              // The final normal vector in screen space.
          f_tex_coord = texture_coord;                                      // Directly use original texture coords and interpolate between.
          
          if( COLOR_NORMALS )                                     // Bypass all lighting code if we're lighting up vertices some other way.
          { VERTEX_COLOR = vec4( N[0] > 0.0 ? N[0] : sin( animation_time * 3.0   ) * -N[0],             // In "normals" mode, 
                                 N[1] > 0.0 ? N[1] : sin( animation_time * 15.0  ) * -N[1],             // rgb color = xyz quantity.
                                 N[2] > 0.0 ? N[2] : sin( animation_time * 45.0  ) * -N[2] , 1.0 );     // Flash if it's negative.
            return;
          }
                                                  // The rest of this shader calculates some quantities that the Fragment shader will need:
          vec3 view_space_pos = ( camera_model_transform * vec4( position, 1.0 ) ).xyz;
          E = normalize( -view_space_pos );

          for( int i = 0; i < N_LIGHTS; i++ )
          {            // Light positions use homogeneous coords.  Use w = 0 for a directional light source -- a vector instead of a point.
            L[i] = normalize( ( camera_transform * lightPosition[i] ).xyz - lightPosition[i].w * view_space_pos );
            H[i] = normalize( L[i] + E );
            
            // Is it a point light source?  Calculate the distance to it from the object.  Otherwise use some arbitrary distance.
            dist[i]  = lightPosition[i].w > 0.0 ? distance((camera_transform * lightPosition[i]).xyz, view_space_pos )
                                                : distance( attenuation_factor[i] * -lightPosition[i].xyz, position.xyz );
          }

          if( GOURAUD )                   // Gouraud shading mode?  If so, finalize the whole color calculation here in the vertex shader, 
          {                               // one per vertex, before we even break it down to pixels in the fragment shader.   As opposed 
                                          // to Smooth "Phong" Shading, where we *do* wait to calculate final color until the next shader.
            VERTEX_COLOR      = vec4( shapeColor.xyz * ambient, shapeColor.w);
            VERTEX_COLOR.xyz += phong_model_lights( normalize( N ) );
          }
        } ` ;
    }
  fragment_glsl_code()           // ********* FRAGMENT SHADER ********* 
    {                            // A fragment is a pixel that's overlapped by the current triangle.
                                 // Fragments affect the final image or get discarded due to depth.
      return `
        uniform sampler2D texture;
        void main()
        { if( GOURAUD || COLOR_NORMALS )    // Do smooth "Phong" shading unless options like "Gouraud mode" are wanted instead.
          { gl_FragColor = VERTEX_COLOR;    // Otherwise, we already have final colors to smear (interpolate) across vertices.            
            return;
          }                                 // If we get this far, calculate Smooth "Phong" Shading as opposed to Gouraud Shading.
                                            // Phong shading is not to be confused with the Phong Reflection Model.
          vec4 tex_color = texture2D( texture, f_tex_coord );                         // Sample the texture image in the correct place.
          if( USE_TEXTURE && tex_color.w < .01 ) discard;
                                                                                      // Compute an initial (ambient) color:
          if( USE_TEXTURE ) gl_FragColor = vec4( ( tex_color.xyz + shapeColor.xyz ) * ambient, shapeColor.w * tex_color.w ); 
          else gl_FragColor = vec4( shapeColor.xyz * ambient, shapeColor.w );
          gl_FragColor.xyz += phong_model_lights( normalize( N ) );                     // Compute the final color with contributions from lights.
        } ` ;
    }
  update_GPU( context, gpu_addresses, g_state, model_transform, material )    // Define how to synchronize our JavaScript's variables to the GPU's:
    { const gpu = gpu_addresses, gl = context;
      this.update_matrices( gl, gpu, g_state, model_transform );  // First, send the matrices to the GPU.
      gl.uniform1f ( gpu.animation_time, g_state.animation_time / 1000 );

      if( g_state.gouraud === undefined ) { g_state.gouraud = g_state.color_normals = false; }    // Keep the flags seen by the shader
      gl.uniform1i( gpu.GOURAUD,        g_state.gouraud || material.gouraud );                // program up-to-date and make sure 
      gl.uniform1i( gpu.COLOR_NORMALS,  g_state.color_normals );                              // they are declared.

      gl.uniform4fv( gpu.shapeColor,     material.color       );    // Send the desired shape-wide material qualities 
      gl.uniform1f ( gpu.ambient,        material.ambient     );    // to the graphics card, where they will tweak the
      gl.uniform1f ( gpu.diffusivity,    material.diffusivity );    // Phong lighting formula.
      gl.uniform1f ( gpu.specularity,    material.specularity );
      gl.uniform1f ( gpu.smoothness,     material.smoothness  );

      if( material.texture && material.texture.ready )                // NOTE: To signal not to draw a texture, omit the texture parameter from Materials.
      { gpu.shader_attributes["texture_coord"].enabled = true;
        gl.uniform1f ( gpu.USE_TEXTURE, 1 );
        gl.uniform1i( gpu.texture, 0);            // Select texture unit 0 for the fragment shader Sampler2D uniform called "texture"
        material.texture.activate( context );
      }
      else  { gl.uniform1f ( gpu.USE_TEXTURE, 0 );   gpu.shader_attributes["texture_coord"].enabled = false; }

      if( !g_state.lights || !g_state.lights.length )  return;
      var lightPositions_flattened = [], lightColors_flattened = [], lightAttenuations_flattened = [];
      for( var i = 0; i < 4 * g_state.lights.length; i++ )
        { lightPositions_flattened                  .push( g_state.lights[ Math.floor(i/4) ].position[i%4] );
          lightColors_flattened                     .push( g_state.lights[ Math.floor(i/4) ].color[i%4] );
          lightAttenuations_flattened[ Math.floor(i/4) ] = g_state.lights[ Math.floor(i/4) ].attenuation;
        }
      gl.uniform4fv( gpu.lightPosition,       lightPositions_flattened );
      gl.uniform4fv( gpu.lightColor,          lightColors_flattened );
      gl.uniform1fv( gpu.attenuation_factor,  lightAttenuations_flattened );
    }
  update_matrices( gl, gpu, g_state, model_transform )                                    // Helper function for sending matrices to GPU.
    {                                                  // (PCM will mean Projection * Camera * Model)
      let [ P, C, M ]    = [ g_state.projection_transform, g_state.camera_inverse, model_transform ],
            CM     =      C.times(  M ),     // Cache some extra products of our matrices to save computing them in the shader.
            PCM    =      P.times( CM ),
            inv_CM = Mat4.inverse( CM ).sub_block([0,0], [3,3]);
                                                                  // Send the current matrices to the shader.  Go ahead and pre-compute
                                                                  // the products we'll need of the of the three special matrices and just
                                                                  // cache and send those.  They will be the same throughout this draw
                                                                  // call, and thus across each instance of the vertex shader.
                                                                  // Transpose them since the GPU expects matrices as column-major arrays.                                  
      gl.uniformMatrix4fv( gpu.camera_transform,                  false, Mat.flatten_2D_to_1D(     C .transposed() ) );
      gl.uniformMatrix4fv( gpu.camera_model_transform,            false, Mat.flatten_2D_to_1D(     CM.transposed() ) );
      gl.uniformMatrix4fv( gpu.projection_camera_model_transform, false, Mat.flatten_2D_to_1D(    PCM.transposed() ) );
      gl.uniformMatrix3fv( gpu.inverse_transpose_modelview,       false, Mat.flatten_2D_to_1D( inv_CM              ) );       
    }
}


const Fake_Bump_Map = defs.Fake_Bump_Map =
class Fake_Bump_Map extends Phong_Shader                         // Same as Phong_Shader, except this adds one line of code.
{ fragment_glsl_code()           // ********* FRAGMENT SHADER ********* 
    { return `
        uniform sampler2D texture;
        void main()
        { if( GOURAUD || COLOR_NORMALS )    // Do smooth "Phong" shading unless options like "Gouraud mode" are wanted instead.
          { gl_FragColor = VERTEX_COLOR;    // Otherwise, we already have final colors to smear (interpolate) across vertices.            
            return;
          }                                 // If we get this far, calculate Smooth "Phong" Shading as opposed to Gouraud Shading.
                                            // Phong shading is not to be confused with the Phong Reflection Model.
          
          vec4 tex_color = texture2D( texture, f_tex_coord );                    // Use texturing as well.
          vec3 bumped_N  = normalize( N + tex_color.rgb - .5*vec3(1,1,1) );      // Slightly disturb normals based on sampling
                                                                                 // the same image that was used for texturing.
                                                                                 
                                                                                 // Compute an initial (ambient) color:
          if( USE_TEXTURE ) gl_FragColor = vec4( ( tex_color.xyz + shapeColor.xyz ) * ambient, shapeColor.w * tex_color.w ); 
          else gl_FragColor = vec4( shapeColor.xyz * ambient, shapeColor.w );
          gl_FragColor.xyz += phong_model_lights( bumped_N );                    // Compute the final color with contributions from lights.
        }`;
    }
}


const Movement_Controls = defs.Movement_Controls =
class Movement_Controls extends Scene    // Movement_Controls is a Scene that can be attached to a canvas, like
{                                               // any other Scene, but it is a Secondary Scene Component -- meant to stack alongside
                                                // other scenes.  Rather than drawing anything it embeds both first-person and third-
                                                // person style controls into the website.  These can be used to manually move your
                                                // camera or other objects smoothly through your scene using key, mouse, and HTML
                                                // button controls to help you explore what's in it.
  constructor()
    { super();
      [ this.roll, this.look_around_locked ] = [ 0, true, true ];                  // Data members.
      [ this.thrust, this.pos, this.z_axis ] = [ Vec.of( 0,0,0 ), Vec.of( 0,0,0 ), Vec.of( 0,0,0 ) ];
      [ this.radians_per_frame, this.meters_per_frame, this.speed_multiplier ] = [ 1/200, 20, 1 ];                    // Constants.

      this.mouse_enabled_canvases = new Set();
      this.will_take_over_graphics_state = true;
    }                                        // The camera matrix is not actually stored here inside Movement_Controls; instead, track an
                                             // external target matrix to modify.  Targets must be pointer references made using closures.
  set_recipient( matrix_closure, inverse_closure )
    { this.matrix  =  matrix_closure;
      this.inverse = inverse_closure;
    }                               // Initially, the default target is the camera matrix that Shaders use, stored in the 
  reset( graphics_state )           // global graphics_state object.  Targets must be pointer references made using closures.
    { this.set_recipient( () => graphics_state.camera_transform, 
                          () => graphics_state.camera_inverse   );
    }
  add_mouse_controls( canvas )
    { this.mouse = { "from_center": Vec.of( 0,0 ) };                           // Measure mouse steering, for rotating the flyaround camera:
      const mouse_position = ( e, rect = canvas.getBoundingClientRect() ) => 
                                   Vec.of( e.clientX - (rect.left + rect.right)/2, e.clientY - (rect.bottom + rect.top)/2 );
                                        // Set up mouse response.  The last one stops us from reacting if the mouse leaves the canvas.
      document.addEventListener( "mouseup",   e => { this.mouse.anchor = undefined; } );
      canvas  .addEventListener( "mousedown", e => { e.preventDefault(); this.mouse.anchor      = mouse_position(e); } );
      canvas  .addEventListener( "mousemove", e => { e.preventDefault(); this.mouse.from_center = mouse_position(e); } );
      canvas  .addEventListener( "mouseout",  e => { if( !this.mouse.anchor ) this.mouse.from_center.scale(0) } );
    }
  show_explanation( document_element ) { }
  make_control_panel()                                                        // This function of a scene sets up its keyboard shortcuts.
    { this.control_panel.innerHTML += "Click and drag the scene to <br> spin your viewpoint around it.<br>";
      this.key_triggered_button( "Up",     [ " " ], () => this.thrust[1] = -1, undefined, () => this.thrust[1] = 0 );
      this.key_triggered_button( "Forward",[ "w" ], () => this.thrust[2] =  1, undefined, () => this.thrust[2] = 0 );  this.new_line();
      this.key_triggered_button( "Left",   [ "a" ], () => this.thrust[0] =  1, undefined, () => this.thrust[0] = 0 );
      this.key_triggered_button( "Back",   [ "s" ], () => this.thrust[2] = -1, undefined, () => this.thrust[2] = 0 );
      this.key_triggered_button( "Right",  [ "d" ], () => this.thrust[0] = -1, undefined, () => this.thrust[0] = 0 );  this.new_line();
      this.key_triggered_button( "Down",   [ "z" ], () => this.thrust[1] =  1, undefined, () => this.thrust[1] = 0 ); 

      const speed_controls = this.control_panel.appendChild( document.createElement( "span" ) );
      speed_controls.style.margin = "30px";
      this.key_triggered_button( "-",  [ "o" ], () => this.speed_multiplier  /=  1.2, "green", undefined, undefined, speed_controls );
      this.live_string( box => { box.textContent = "Speed: " + this.speed_multiplier.toFixed(2) }, speed_controls );
      this.key_triggered_button( "+",  [ "p" ], () => this.speed_multiplier  *=  1.2, "green", undefined, undefined, speed_controls );
      this.new_line();
      this.key_triggered_button( "Roll left",  [ "," ], () => this.roll =  1, undefined, () => this.roll = 0 );
      this.key_triggered_button( "Roll right", [ "." ], () => this.roll = -1, undefined, () => this.roll = 0 );  this.new_line();
      this.key_triggered_button( "(Un)freeze mouse look around", [ "f" ], () => this.look_around_locked ^=  1, "green" );
      this.new_line();
      this.live_string( box => box.textContent = "Position: " + this.pos[0].toFixed(2) + ", " + this.pos[1].toFixed(2) 
                                                       + ", " + this.pos[2].toFixed(2) );
      this.new_line();        // The facing directions are actually affected by the left hand rule:
      this.live_string( box => box.textContent = "Facing: " + ( ( this.z_axis[0] > 0 ? "West " : "East ")
                   + ( this.z_axis[1] > 0 ? "Down " : "Up " ) + ( this.z_axis[2] > 0 ? "North" : "South" ) ) );
      this.new_line();     
      this.key_triggered_button( "Go to world origin", [ "r" ], () => { this. matrix().set_identity( 4,4 );
                                                                        this.inverse().set_identity( 4,4 ) }, "orange" );  this.new_line();
      this.key_triggered_button( "Attach to global camera", [ "Shift", "R" ], this.reset, "blue" );
      this.new_line();
    }
  first_person_flyaround( radians_per_frame, meters_per_frame, leeway = 70 )
    {                                                         // Compare mouse's location to all four corners of a dead box:
      const offsets_from_dead_box = { plus: [ this.mouse.from_center[0] + leeway, this.mouse.from_center[1] + leeway ],
                                     minus: [ this.mouse.from_center[0] - leeway, this.mouse.from_center[1] - leeway ] }; 
                // Apply a camera rotation movement, but only when the mouse is past a minimum distance (leeway) from the canvas's center:
      if( !this.look_around_locked ) 
        for( let i = 0; i < 2; i++ )      // Steer according to "mouse_from_center" vector, but don't start
        {                                 // increasing until outside a leeway window from the center.
          let o = offsets_from_dead_box,                                          // The &&'s in the next line might zero the vectors out:
            velocity = ( ( o.minus[i] > 0 && o.minus[i] ) || ( o.plus[i] < 0 && o.plus[i] ) ) * radians_per_frame;
          this.matrix().post_multiply( Mat4.rotation( -velocity, Vec.of( i, 1-i, 0 ) ) );   // On X step, rotate around Y axis, and vice versa.
          this.inverse().pre_multiply( Mat4.rotation( +velocity, Vec.of( i, 1-i, 0 ) ) );
        }
      this.matrix().post_multiply( Mat4.rotation( -.1 * this.roll, Vec.of( 0,0,1 ) ) );
      this.inverse().pre_multiply( Mat4.rotation( +.1 * this.roll, Vec.of( 0,0,1 ) ) );
                                                  // Now apply translation movement of the camera, in the newest local coordinate frame.
      this.matrix().post_multiply( Mat4.translation( this.thrust.times( -meters_per_frame ) ) );
      this.inverse().pre_multiply( Mat4.translation( this.thrust.times( +meters_per_frame ) ) );
    }
  third_person_arcball( radians_per_frame )
    { const dragging_vector = this.mouse.from_center.minus( this.mouse.anchor );               // Spin the scene around a point on an
      if( dragging_vector.norm() <= 0 ) return;                                                // axis determined by user mouse drag.

      this.matrix().post_multiply( Mat4.translation([ 0,0, -25 ]) );
      this.inverse().pre_multiply( Mat4.translation([ 0,0, +25 ]) );

      const rotation = Mat4.rotation( radians_per_frame * dragging_vector.norm(), Vec.of( dragging_vector[1], dragging_vector[0], 0 ) );
      this.matrix().post_multiply( rotation );
      this.inverse().pre_multiply( rotation );

      this. matrix().post_multiply( Mat4.translation([ 0,0, +25 ]) );
      this.inverse().pre_multiply( Mat4.translation([ 0,0, -25 ]) );
    }
  display( context, graphics_state, dt = graphics_state.animation_delta_time / 1000 )    // Camera code starts here.
    { const m = this.speed_multiplier * this. meters_per_frame,
            r = this.speed_multiplier * this.radians_per_frame;

      if( this.will_take_over_graphics_state )
      { this.reset( graphics_state );
        this.will_take_over_graphics_state = false;
      }

      if( !this.mouse_enabled_canvases.has( context.canvas ) )
      { this.add_mouse_controls( context.canvas );
        this.mouse_enabled_canvases.add( context.canvas )
      }

      this.first_person_flyaround( dt * r, dt * m );     // Do first-person.  Scale the normal camera aiming speed by dt for smoothness.
      if( this.mouse.anchor )                            // Also apply third-person "arcball" camera mode if a mouse drag is occurring.  
        this.third_person_arcball( dt * r );           
      
      this.pos    = this.inverse().times( Vec.of( 0,0,0,1 ) );      // Log some values.
      this.z_axis = this.inverse().times( Vec.of( 0,0,1,0 ) );
    }
}


const Program_State_Viewer = defs.Program_State_Viewer =
class Program_State_Viewer extends Scene          // A class that just toggles, monitors, and reports some 
{ make_control_panel()                                // global values via its control panel.
    { this.program_state = {};    // display() will replace this
      this.key_triggered_button( "(Un)pause animation", ["Alt", "a"], function() { this.program_state.animate ^= 1; } ); this.new_line();
      this.live_string( box => { box.textContent = "Animation Time: " + ( this.program_state.animation_time/1000 ).toFixed(3) + "s" } );
      this.live_string( box => { box.textContent = this.program_state.animate ? " " : " (paused)" } );  this.new_line();
      this.key_triggered_button( "Gouraud shading",     ["Alt", "g"], function() { this.program_state.gouraud       ^= 1;         } ); 
      this.new_line();
      this.key_triggered_button( "Normals shading",     ["Alt", "n"], function() { this.program_state.color_normals ^= 1;         } ); 
      this.new_line();
      
      const show_object = ( element, obj = this.program_state ) => 
      { if( this.box ) this.box.innerHTML = "";
        else this.box = element.appendChild( Object.assign( document.createElement( "div" ), { style: "overflow:auto; width: 200px" } ) );
        if( obj !== this.program_state )
          this.box.appendChild( Object.assign( document.createElement( "div" ), { className:"link", innerText: "(back to program_state)", 
                                               onmousedown: () => this.current_object = this.program_state } ) )
        if( obj.to_string ) return this.box.appendChild( Object.assign( document.createElement( "div" ), { innerText: obj.to_string() } ) );
        for( let [key,val] of Object.entries( obj ) )
        { if( typeof( val ) == "object" ) 
            this.box.appendChild( Object.assign( document.createElement( "a" ), { className:"link", innerText: key, 
                                                 onmousedown: () => this.current_object = val } ) )
          else
            this.box.appendChild( Object.assign( document.createElement( "span" ), { innerText: key + ": " + val.toString() } ) );
          this.box.appendChild( document.createElement( "br" ) );
        }
      }
      this.live_string( box => show_object( box, this.current_object ) );      
    }
  display( context, program_state ) { this.program_state = program_state }
}