import {tiny} from './tiny-graphics.js';
                                                  // Pull these names into this module's scope for convenience:
const { Vec, Mat, Mat4, Color, Light, Shape, Material, Shader, Scene } = tiny;

import {widgets} from './tiny-graphics-widgets.js';
Object.assign( tiny, widgets );

const defs = {};

export { tiny, defs };

const Triangle = defs.Triangle =
class Triangle extends Shape
{                                 // **Triangle** The simplest possible 2D Shape – one triangle.  It stores 3 vertices, each
                                  // having their own 3D position, normal vector, and texture-space coordinate.
  constructor()
    {                             // Name the values we'll define per each vertex:
      super( "position", "normal", "texture_coord" );
                                  // First, specify the vertex positions -- the three point locations of an imaginary triangle:
      this.arrays.position      = [ Vec.of(0,0,0), Vec.of(1,0,0), Vec.of(0,1,0) ];
                                  // Next, supply vectors that point away from the triangle face.  They should match up with 
                                  // the points in the above list.  Normal vectors are needed so the graphics engine can
                                  // know if the shape is pointed at light or not, and color it accordingly.
      this.arrays.normal        = [ Vec.of(0,0,1), Vec.of(0,0,1), Vec.of(0,0,1) ];
                                  //  lastly, put each point somewhere in texture space too:
      this.arrays.texture_coord = [ Vec.of(0,0),   Vec.of(1,0),   Vec.of(0,1)   ]; 
                                  // Index into our vertices to connect them into a whole triangle:
      this.indices        = [ 0, 1, 2 ];
                       // A position, normal, and texture coord fully describes one "vertex".  What's the "i"th vertex?  Simply
                       // the combined data you get if you look up index "i" of those lists above -- a position, normal vector,
                       // and texture coordinate together.  Lastly we told it how to connect vertex entries into triangles.
                       // Every three indices in "this.indices" traces out one triangle.
    }
}


const Square = defs.Square =
class Square extends Shape
{                                 // **Square** demonstrates two triangles that share vertices.  On any planar surface, the 
                                  // interior edges don't make any important seams.  In these cases there's no reason not
                                  // to re-use data of the common vertices between triangles.  This makes all the vertex 
                                  // arrays (position, normals, etc) smaller and more cache friendly.
  constructor()
    { super( "position", "normal", "texture_coord" );
                                          // Specify the 4 square corner locations, and match those up with normal vectors:
      this.arrays.position      = Vec.cast( [-1,-1,0], [1,-1,0], [-1,1,0], [1,1,0] );
      this.arrays.normal        = Vec.cast( [0,0,1],   [0,0,1],  [0,0,1],  [0,0,1] );
                                                          // Arrange the vertices into a square shape in texture space too:
      this.arrays.texture_coord = Vec.cast( [0,0],     [1,0],    [0,1],    [1,1]   );
                                                     // Use two triangles this time, indexing into four distinct vertices:
      this.indices.push( 0, 1, 2,     1, 3, 2 );
    }
}


const Tetrahedron = defs.Tetrahedron =
class Tetrahedron extends Shape
{                                   // **Tetrahedron** demonstrates flat vs smooth shading (a boolean argument selects
                                    // which one).  It is also our first 3D, non-planar shape.  Four triangles share
                                    // corners with each other.  Unless we store duplicate points at each corner
                                    // (storing the same position at each, but different normal vectors), the lighting
                                    // will look "off".  To get crisp seams at the edges we need the repeats.
  constructor( using_flat_shading )
    { super( "position", "normal", "texture_coord" );
      var a = 1/Math.sqrt(3);
      if( !using_flat_shading )
      {                                         // Method 1:  A tetrahedron with shared vertices.  Compact, performs better,
                                                // but can't produce flat shading or discontinuous seams in textures.
          this.arrays.position      = Vec.cast( [ 0, 0, 0], [1,0,0], [0,1,0], [0,0,1] );          
          this.arrays.normal        = Vec.cast( [-a,-a,-a], [1,0,0], [0,1,0], [0,0,1] );          
          this.arrays.texture_coord = Vec.cast( [ 0, 0   ], [1,0  ], [0,1, ], [1,1  ] );
                                                // Notice the repeats in the index list.  Vertices are shared 
                                                // and appear in multiple triangles with this method.
          this.indices.push( 0, 1, 2,   0, 1, 3,   0, 2, 3,   1, 2, 3 );
      }
      else
      {                                           // Method 2:  A tetrahedron with four independent triangles.
        this.arrays.position = Vec.cast( [0,0,0], [1,0,0], [0,1,0],
                                         [0,0,0], [1,0,0], [0,0,1],
                                         [0,0,0], [0,1,0], [0,0,1],
                                         [0,0,1], [1,0,0], [0,1,0] );

                                          // The essence of flat shading:  This time, values of normal vectors can
                                          // be constant per whole triangle.  Repeat them for all three vertices.
        this.arrays.normal   = Vec.cast( [0,0,-1], [0,0,-1], [0,0,-1],
                                         [0,-1,0], [0,-1,0], [0,-1,0],
                                         [-1,0,0], [-1,0,0], [-1,0,0],
                                         [ a,a,a], [ a,a,a], [ a,a,a] );

                                          // Each face in Method 2 also gets its own set of texture coords (half the
                                          // image is mapped onto each face).  We couldn't do this with shared
                                          // vertices since this features abrupt transitions when approaching the
                                          // same point from different directions.
        this.arrays.texture_coord = Vec.cast( [0,0], [1,0], [1,1],
                                              [0,0], [1,0], [1,1],
                                              [0,0], [1,0], [1,1],
                                              [0,0], [1,0], [1,1] );
                                          // Notice all vertices are unique this time.
        this.indices.push( 0, 1, 2,    3, 4, 5,    6, 7, 8,    9, 10, 11 );
      }
    }
}

const Windmill = defs.Windmill =
class Windmill extends Shape
{                             // **Windmill**  As our shapes get more complicated, we begin using matrices and flow
                              // control (including loops) to generate non-trivial point clouds and connect them.
  constructor( num_blades )
    { super( "position", "normal", "texture_coord" );
                                                      // A for loop to automatically generate the triangles:
      for( let i = 0; i < num_blades; i++ )
        {                                      // Rotate around a few degrees in the XZ plane to place each new point:
          const spin = Mat4.rotation( i * 2*Math.PI/num_blades, Vec.of( 0,1,0 ) );
                                               // Apply that XZ rotation matrix to point (1,0,0) of the base triangle.
          const newPoint  = spin.times( Vec.of( 1,0,0,1 ) ).to3();
          const triangle = [ newPoint,                      // Store that XZ position as point 1.
                             newPoint.plus( [ 0,1,0 ] ),    // Store it again but with higher y coord as point 2.
                             Vec.of( 0,0,0 )    ];          // All triangles touch this location -- point 3.

          this.arrays.position.push( ...triangle );
                        // Rotate our base triangle's normal (0,0,1) to get the new one.  Careful!  Normal vectors are not
                        // points; their perpendicularity constraint gives them a mathematical quirk that when applying 
                        // matrices you have to apply the transposed inverse of that matrix instead.  But right now we've
                        // got a pure rotation matrix, where the inverse and transpose operations cancel out, so it's ok.
          var newNormal = spin.times( Vec.of( 0,0,1 ).to4(0) ).to3();
                                                                       // Propagate the same normal to all three vertices:
          this.arrays.normal.push( newNormal, newNormal, newNormal );
          this.arrays.texture_coord.push( ...Vec.cast( [ 0,0 ], [ 0,1 ], [ 1,0 ] ) );
                                                                // Procedurally connect the 3 new vertices into triangles:
          this.indices.push( 3*i, 3*i + 1, 3*i + 2 );
        }
    }
}


const Cube = defs.Cube =
class Cube extends Shape
{                         // **Cube** A closed 3D shape, and the first example of a compound shape (a Shape constructed
                          // out of other Shapes).  A cube inserts six Square strips into its own arrays, using six
                          // different matrices as offsets for each square.
  constructor()  
    { super( "position", "normal", "texture_coord" );
                          // Loop 3 times (for each axis), and inside loop twice (for opposing cube sides):
      for( var i = 0; i < 3; i++ )
        for( var j = 0; j < 2; j++ )
        { var square_transform = Mat4.rotation( i == 0 ? Math.PI/2 : 0, Vec.of(1, 0, 0) )
                         .times( Mat4.rotation( Math.PI * j - ( i == 1 ? Math.PI/2 : 0 ), Vec.of( 0, 1, 0 ) ) )
                         .times( Mat4.translation([ 0, 0, 1 ]) );
                                  // Calling this function of a Square (or any Shape) copies it into the specified
                                  // Shape (this one) at the specified matrix offset (square_transform):
          Square.insert_transformed_copy_into( this, [], square_transform );
        }
    }
}


const Subdivision_Sphere = defs.Subdivision_Sphere =
class Subdivision_Sphere extends Shape   
{                       // **Subdivision_Sphere** defines a Sphere surface, with nice uniform triangles.  A subdivision surface
                        // (see Wikipedia article on those) is initially simple, then builds itself into a more and more 
                        // detailed shape of the same layout.  Each act of subdivision makes it a better approximation of 
                        // some desired mathematical surface by projecting each new point onto that surface's known 
                        // implicit equation.  For a sphere, we begin with a closed 3-simplex (a tetrahedron).  For each
                        // face, connect the midpoints of each edge together to make more faces.  Repeat recursively until 
                        // the desired level of detail is obtained.  Project all new vertices to unit vectors (onto the
                        // unit sphere) and group them into triangles by following the predictable pattern of the recursion.
  constructor( max_subdivisions )
    { super( "position", "normal", "texture_coord" );                          
                                                                        // Start from the following equilateral tetrahedron:
      const tetrahedron = [ [ 0, 0, -1 ], [ 0, .9428, .3333 ], [ -.8165, -.4714, .3333 ], [ .8165, -.4714, .3333 ] ];
      this.arrays.position = Vec.cast( ...tetrahedron );
                                                                        // Begin recursion:
      this.subdivide_triangle( 0, 1, 2, max_subdivisions);
      this.subdivide_triangle( 3, 2, 1, max_subdivisions);
      this.subdivide_triangle( 1, 0, 3, max_subdivisions);
      this.subdivide_triangle( 0, 2, 3, max_subdivisions);
      
                                     // With positions calculated, fill in normals and texture_coords of the finished Sphere:
      for( let p of this.arrays.position )
        {                                    // Each point has a normal vector that simply goes to the point from the origin:
          this.arrays.normal.push( p.copy() );

                                         // Textures are tricky.  A Subdivision sphere has no straight seams to which image 
                                         // edges in UV space can be mapped.  The only way to avoid artifacts is to smoothly
                                         // wrap & unwrap the image in reverse - displaying the texture twice on the sphere.                                                        
          this.arrays.texture_coord.push( Vec.of( Math.asin( p[0]/Math.PI ) + .5, Math.asin( p[1]/Math.PI ) + .5 ) );
        }

                                                         // Fix the UV seam by duplicating vertices with offset UV:
      const tex = this.arrays.texture_coord;
      for (let i = 0; i < this.indices.length; i += 3) {
          const a = this.indices[i], b = this.indices[i + 1], c = this.indices[i + 2];
          if ([[a, b], [a, c], [b, c]].some(x => (Math.abs(tex[x[0]][0] - tex[x[1]][0]) > 0.5))
              && [a, b, c].some(x => tex[x][0] < 0.5))
          {
              for (let q of [[a, i], [b, i + 1], [c, i + 2]]) {
                  if (tex[q[0]][0] < 0.5) {
                      this.indices[q[1]] = this.arrays.position.length;
                      this.positions.push( this.arrays.position[q[0]].copy());
                      this.normals.push(this.arrays.normal[q[0]].copy());
                      tex.push(tex[q[0]].plus(Vec.of(1, 0)));
                  }
              }
          }
      }
    }
  subdivide_triangle( a, b, c, count )
    {                                           // subdivide_triangle(): Recurse through each level of detail 
                                                // by splitting triangle (a,b,c) into four smaller ones.
      if( count <= 0)
        {                                       // Base case of recursion - we've hit the finest level of detail we want.
          this.indices.push( a,b,c ); 
          return; 
        }
                                                // So we're not at the base case.  So, build 3 new vertices at midpoints,
                                                // and extrude them out to touch the unit sphere (length 1).
      var ab_vert = this.arrays.position[a].mix( this.arrays.position[b], 0.5).normalized(),     
          ac_vert = this.arrays.position[a].mix( this.arrays.position[c], 0.5).normalized(),
          bc_vert = this.arrays.position[b].mix( this.arrays.position[c], 0.5).normalized(); 
                                                // Here, push() returns the indices of the three new vertices (plus one).
      var ab = this.arrays.position.push( ab_vert ) - 1,
          ac = this.arrays.position.push( ac_vert ) - 1,  
          bc = this.arrays.position.push( bc_vert ) - 1;  
                               // Recurse on four smaller triangles, and we're done.  Skipping every fourth vertex index in 
                               // our list takes you down one level of detail, and so on, due to the way we're building it.
      this.subdivide_triangle( a, ab, ac,  count - 1 );
      this.subdivide_triangle( ab, b, bc,  count - 1 );
      this.subdivide_triangle( ac, bc, c,  count - 1 );
      this.subdivide_triangle( ab, bc, ac, count - 1 );
    }
}


const Minimal_Shape = defs.Minimal_Shape =
class Minimal_Shape extends tiny.Vertex_Buffer
{                                     // **Minimal_Shape** an even more minimal triangle, with three
                                      // vertices each holding a 3D position and a color.
  constructor()
    { super( "position", "color" );
              // Describe the where the points of a triangle are in space, and also describe their colors:
      this.arrays.position = [ Vec.of(0,0,0), Vec.of(1,0,0), Vec.of(0,1,0) ];
      this.arrays.color    = [ Color.of(1,0,0,1), Color.of(0,1,0,1), Color.of(0,0,1,1) ];
    }
}


const Minimal_Webgl_Demo = defs.Minimal_Webgl_Demo =
class Minimal_Webgl_Demo extends Scene
{                                       // **Minimal_Webgl_Demo** is an extremely simple example of a Scene class.
  constructor( webgl_manager, control_panel )
    { super( webgl_manager, control_panel );
                                                // Send a Triangle's vertices to the GPU's buffers:
      this.shapes = { triangle : new Minimal_Shape() };
      this.shader = new Basic_Shader();
    }
  display( context, graphics_state )
    {                                           // Every frame, simply draw the Triangle at its default location.
      this.shapes.triangle.draw( context, graphics_state, Mat4.identity(), this.shader.material() );
    }
 make_control_panel()
    { this.control_panel.innerHTML += "(This one has no controls)";
    }
}


const Basic_Shader = defs.Basic_Shader =
class Basic_Shader extends Shader
{                                  // **Basic_Shader** is nearly the simplest example of a subclass of Shader, which stores and
                                   // maanges a GPU program.  Basic_Shader is a trivial pass-through shader that applies a
                                   // shape's matrices and then simply samples literal colors stored at each vertex.
 update_GPU( context, gpu_addresses, graphics_state, model_transform, material )
      {       // update_GPU():  Defining how to synchronize our JavaScript's variables to the GPU's:
        const [ P, C, M ] = [ graphics_state.projection_transform, graphics_state.camera_inverse, model_transform ],
                      PCM = P.times( C ).times( M );
        context.uniformMatrix4fv( gpu_addresses.projection_camera_model_transform, false, 
                                                                          Mat.flatten_2D_to_1D( PCM.transposed() ) );
      }
  shared_glsl_code()           // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
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
        {                    // Compute the vertex's final resting place (in NDCS), and use the hard-coded color of the vertex:
          gl_Position = projection_camera_model_transform * vec4( position, 1.0 );
          VERTEX_COLOR = color;
        }`;
    }
  fragment_glsl_code()         // ********* FRAGMENT SHADER *********
    { return `
        void main()
        {                                                     // The interpolation gets done directly on the per-vertex colors:
          gl_FragColor = VERTEX_COLOR;
        }`;
    }
}


const Phong_Shader_Reduced = defs.Phong_Shader_Reduced =
class Phong_Shader_Reduced extends Shader
{                                  // **Phong_Shader** is a subclass of Shader, which stores and maanges a GPU program.  
                                   // Graphic cards prior to year 2000 had shaders like this one hard-coded into them
                                   // instead of customizable shaders.  "Phong" Shading is a process of determining 
                                   // brightness of pixels via vector math.  It compares the normal vector at that 
                                   // pixel to the vectors toward the camera and light sources.

  shared_glsl_code()           // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
    { return ` precision mediump float;
        uniform float ambient, diffusivity, specularity, smoothness;
        uniform vec4 lightColor, shapeColor, light_position_or_vector;
        uniform vec3 squared_scale, camera_center;

                              // Specifier "varying" means a variable's final value will be passed from the vertex shader
                              // on to the next phase (fragment shader), then interpolated per-fragment, weighted by the
                              // pixel fragment's proximity to each of the 3 vertices (barycentric interpolation).
        varying vec3 N, L, H;
                                                                                    
        vec3 phong_model_light( vec3 N )
          { float diffuse  =      max( dot( N, normalize( L ) ), 0.0 );
            float specular = pow( max( dot( N, normalize( H ) ), 0.0 ), smoothness );

            return shapeColor.xyz * diffusivity * diffuse + lightColor.xyz * specularity * specular;
          } ` ;
    }
  vertex_glsl_code()           // ********* VERTEX SHADER *********
    { return `
        attribute vec3 position, normal;                            // Position is expressed in object coordinates.
        
        uniform mat4 model_transform;
        uniform mat4 projection_camera_model_transform;

        void main()
          {                                                                   // The vertex's final resting place (in NDCS):
            gl_Position = projection_camera_model_transform * vec4( position, 1.0 );
                                                                              // The final normal vector in screen space.
            N = normalize( mat3( model_transform ) * normal / squared_scale);
            
            vec3 vertex_worldspace = ( model_transform * vec4( position, 1.0 ) ).xyz;
            vec3 E = normalize( camera_center - vertex_worldspace );

                                                              // Light positions use homogeneous coords.  Use w = 0 for a
                                                              // directional light source -- a vector instead of a point:
            L = normalize( light_position_or_vector.xyz - light_position_or_vector.w * vertex_worldspace );
            H = normalize( L + E );
          } ` ;
    }
  fragment_glsl_code()         // ********* FRAGMENT SHADER ********* 
    {                          // A fragment is a pixel that's overlapped by the current triangle.
                               // Fragments affect the final image or get discarded due to depth.                                 
      return `
        void main()
          {                                                          // Compute an initial (ambient) color:
            gl_FragColor = vec4( shapeColor.xyz * ambient, shapeColor.w );
                                                                     // Compute the final color with contributions from lights:
            gl_FragColor.xyz += phong_model_light( normalize( N ) );
          } ` ;
    }
  update_GPU( context, gpu_addresses, g_state, model_transform, material )
    {             // update_GPU(): Define how to synchronize our JavaScript's variables to the GPU's.  This is where the shader 
                  // recieves ALL of its inputs.  Every value the GPU wants is divided into two categories:  Values that belong
                  // to individual objects being drawn (which we call "Material") and values belonging to the whole scene or 
                  // program (which we call the "Program_State").  Send both a material and a program state to the shaders 
                  // within this function, one data field at a time, to fully initialize the shader for a draw.                  
      const gpu = gpu_addresses, gl = context;

      const defaults = { color: Color.of( 0,0,0,1 ), ambient: 0, diffusivity: 1, specularity: 1, smoothness: 40 };
      material = Object.assign( {}, defaults, material );
                                                      // Send the current matrices to the shader.  Go ahead and pre-compute
                                                      // the products we'll need of the of the three special matrices and just
                                                      // cache and send those.  They will be the same throughout this draw
                                                      // call, and thus across each instance of the vertex shader.
                                                      // Transpose them since the GPU expects matrices as column-major arrays.
      const PCM = g_state.projection_transform.times( g_state.camera_inverse ).times( model_transform );
      gl.uniformMatrix4fv( gpu.                  model_transform, false, Mat.flatten_2D_to_1D( model_transform.transposed() ) );
      gl.uniformMatrix4fv( gpu.projection_camera_model_transform, false, Mat.flatten_2D_to_1D(             PCM.transposed() ) );

                                         // Use the squared scale trick from "Eric's blog" instead of inverse transpose matrix:
      const squared_scale = model_transform.reduce( 
                                         (acc,r) => { return acc.plus( Vec.from(r).mult_pairs(r) ) }, Vec.of( 0,0,0,0 ) ).to3();                                            
      gl.uniform3fv( gpu.squared_scale, squared_scale );

                                                              // Send the desired shape-wide material qualities to the graphics
                                                              // card, where they will tweak the Phong lighting formula.
      gl.uniform4fv( gpu.shapeColor,     material.color       );
      gl.uniform1f ( gpu.ambient,        material.ambient     );
      gl.uniform1f ( gpu.diffusivity,    material.diffusivity );
      gl.uniform1f ( gpu.specularity,    material.specularity );
      gl.uniform1f ( gpu.smoothness,     material.smoothness  );

      const O = Vec.of( 0,0,0,1 ), camera_center = g_state.camera_transform.times( O ).to3();
      gl.uniform3fv( gpu.camera_center, camera_center );
                                             // Omitting lights will show only the material color, scaled by the ambient term:
      if( !g_state.lights.length )
        return;
      gl.uniform4fv( gpu.lightColor, g_state.lights[0].color );
                                                                  // Light position uses homogeneous coords:
      const light_position_or_vector = g_state.lights[0].position;
      gl.uniform4fv( gpu.light_position_or_vector, light_position_or_vector );
    }
}


const Movement_Controls = defs.Movement_Controls =
class Movement_Controls extends Scene
{                                       // **Movement_Controls** is a Scene that can be attached to a canvas, like any other
                                        // Scene, but it is a Secondary Scene Component -- meant to stack alongside other 
                                        // scenes.  Rather than drawing anything it embeds both first-person and third-
                                        // person style controls into the website.  These can be used to manually move your
                                        // camera or other objects smoothly through your scene using key, mouse, and HTML
                                        // button controls to help you explore what's in it.
  constructor()
    { super();
      const data_members = { roll: 0, look_around_locked: true, 
                             thrust: Vec.of( 0,0,0 ), pos: Vec.of( 0,0,0 ), z_axis: Vec.of( 0,0,0 ),
                             radians_per_frame: 1/200, meters_per_frame: 20, speed_multiplier: 1 };
      Object.assign( this, data_members );

      this.mouse_enabled_canvases = new Set();
      this.will_take_over_graphics_state = true;
    }
  set_recipient( matrix_closure, inverse_closure )
    {                               // set_recipient(): The camera matrix is not actually stored here inside Movement_Controls;
                                    // instead, track an external target matrix to modify.  Targets must be pointer references
                                    // made using closures.
      this.matrix  =  matrix_closure;
      this.inverse = inverse_closure;
    }
  reset( graphics_state )
    {                         // reset(): Initially, the default target is the camera matrix that Shaders use, stored in the
                              // encountered program_state object.  Targets must be pointer references made using closures.
      this.set_recipient( () => graphics_state.camera_transform, 
                          () => graphics_state.camera_inverse   );
    }
  add_mouse_controls( canvas )
    {                                       // add_mouse_controls():  Attach HTML mouse events to the drawing canvas.
                                            // First, measure mouse steering, for rotating the flyaround camera:
      this.mouse = { "from_center": Vec.of( 0,0 ) };
      const mouse_position = ( e, rect = canvas.getBoundingClientRect() ) => 
                                   Vec.of( e.clientX - (rect.left + rect.right)/2, e.clientY - (rect.bottom + rect.top)/2 );
                                // Set up mouse response.  The last one stops us from reacting if the mouse leaves the canvas:
      document.addEventListener( "mouseup",   e => { this.mouse.anchor = undefined; } );
      canvas  .addEventListener( "mousedown", e => { e.preventDefault(); this.mouse.anchor      = mouse_position(e); } );
      canvas  .addEventListener( "mousemove", e => { e.preventDefault(); this.mouse.from_center = mouse_position(e); } );
      canvas  .addEventListener( "mouseout",  e => { if( !this.mouse.anchor ) this.mouse.from_center.scale(0) } );
    }
  show_explanation( document_element ) { }
  make_control_panel()
    {                                 // make_control_panel(): Sets up a panel of interactive HTML elements, including
                                      // buttons with key bindings for affecting this scene, and live info readouts.
      this.control_panel.innerHTML += "Click and drag the scene to <br> spin your viewpoint around it.<br>";
      this.key_triggered_button( "Up",     [ " " ], () => this.thrust[1] = -1, undefined, () => this.thrust[1] = 0 );
      this.key_triggered_button( "Forward",[ "w" ], () => this.thrust[2] =  1, undefined, () => this.thrust[2] = 0 );
      this.new_line();
      this.key_triggered_button( "Left",   [ "a" ], () => this.thrust[0] =  1, undefined, () => this.thrust[0] = 0 );
      this.key_triggered_button( "Back",   [ "s" ], () => this.thrust[2] = -1, undefined, () => this.thrust[2] = 0 );
      this.key_triggered_button( "Right",  [ "d" ], () => this.thrust[0] = -1, undefined, () => this.thrust[0] = 0 );
      this.new_line();
      this.key_triggered_button( "Down",   [ "z" ], () => this.thrust[1] =  1, undefined, () => this.thrust[1] = 0 ); 

      const speed_controls = this.control_panel.appendChild( document.createElement( "span" ) );
      speed_controls.style.margin = "30px";
      this.key_triggered_button( "-",  [ "o" ], () => 
                                            this.speed_multiplier  /=  1.2, "green", undefined, undefined, speed_controls );
      this.live_string( box => { box.textContent = "Speed: " + this.speed_multiplier.toFixed(2) }, speed_controls );
      this.key_triggered_button( "+",  [ "p" ], () => 
                                            this.speed_multiplier  *=  1.2, "green", undefined, undefined, speed_controls );
      this.new_line();
      this.key_triggered_button( "Roll left",  [ "," ], () => this.roll =  1, undefined, () => this.roll = 0 );
      this.key_triggered_button( "Roll right", [ "." ], () => this.roll = -1, undefined, () => this.roll = 0 );
      this.new_line();
      this.key_triggered_button( "(Un)freeze mouse look around", [ "f" ], () => this.look_around_locked ^=  1, "green" );
      this.new_line();
      this.live_string( box => box.textContent = "Position: " + this.pos[0].toFixed(2) + ", " + this.pos[1].toFixed(2) 
                                                       + ", " + this.pos[2].toFixed(2) );
      this.new_line();
                                                  // The facing directions are surprisingly affected by the left hand rule:
      this.live_string( box => box.textContent = "Facing: " + ( ( this.z_axis[0] > 0 ? "West " : "East ")
                   + ( this.z_axis[1] > 0 ? "Down " : "Up " ) + ( this.z_axis[2] > 0 ? "North" : "South" ) ) );
      this.new_line();     
      this.key_triggered_button( "Go to world origin", [ "r" ], () => { this. matrix().set_identity( 4,4 );
                                                                        this.inverse().set_identity( 4,4 ) }, "orange" );
      this.new_line();

      this.key_triggered_button( "Look at origin from front", [ "1" ], () =>
        { this.inverse().set( Mat4.look_at( Vec.of( 0,0,10 ), Vec.of( 0,0,0 ), Vec.of( 0,1,0 ) ) );
          this. matrix().set( Mat4.inverse( this.inverse() ) );
        }, "black" );
      this.new_line();
      this.key_triggered_button( "from right", [ "2" ], () =>
        { this.inverse().set( Mat4.look_at( Vec.of( 10,0,0 ), Vec.of( 0,0,0 ), Vec.of( 0,1,0 ) ) );
          this. matrix().set( Mat4.inverse( this.inverse() ) );
        }, "black" );
      this.key_triggered_button( "from rear", [ "3" ], () =>
        { this.inverse().set( Mat4.look_at( Vec.of( 0,0,-10 ), Vec.of( 0,0,0 ), Vec.of( 0,1,0 ) ) );
          this. matrix().set( Mat4.inverse( this.inverse() ) );
        }, "black" );   
      this.key_triggered_button( "from left", [ "4" ], () =>
        { this.inverse().set( Mat4.look_at( Vec.of( -10,0,0 ), Vec.of( 0,0,0 ), Vec.of( 0,1,0 ) ) );
          this. matrix().set( Mat4.inverse( this.inverse() ) );
        }, "black" );
      this.new_line();
      this.key_triggered_button( "Attach to global camera", [ "Shift", "R" ], this.reset, "blue" );
      this.new_line();
    }
  first_person_flyaround( radians_per_frame, meters_per_frame, leeway = 70 )
    {                                                     // (Internal helper function)
                                                          // Compare mouse's location to all four corners of a dead box:
      const offsets_from_dead_box = { plus: [ this.mouse.from_center[0] + leeway, this.mouse.from_center[1] + leeway ],
                                     minus: [ this.mouse.from_center[0] - leeway, this.mouse.from_center[1] - leeway ] }; 
                                                          // Apply a camera rotation movement, but only when the mouse is
                                                          // past a minimum distance (leeway) from the canvas's center:
      if( !this.look_around_locked )
                                              // If steering, steer according to "mouse_from_center" vector, but don't
                                              // start increasing until outside a leeway window from the center.                                          
        for( let i = 0; i < 2; i++ )
        {                                     // The &&'s in the next line might zero the vectors out:
          let o = offsets_from_dead_box,
            velocity = ( ( o.minus[i] > 0 && o.minus[i] ) || ( o.plus[i] < 0 && o.plus[i] ) ) * radians_per_frame;
                                              // On X step, rotate around Y axis, and vice versa.
          this.matrix().post_multiply( Mat4.rotation( -velocity, Vec.of( i, 1-i, 0 ) ) );
          this.inverse().pre_multiply( Mat4.rotation( +velocity, Vec.of( i, 1-i, 0 ) ) );
        }
      this.matrix().post_multiply( Mat4.rotation( -.1 * this.roll, Vec.of( 0,0,1 ) ) );
      this.inverse().pre_multiply( Mat4.rotation( +.1 * this.roll, Vec.of( 0,0,1 ) ) );
                                    // Now apply translation movement of the camera, in the newest local coordinate frame.
      this.matrix().post_multiply( Mat4.translation( this.thrust.times( -meters_per_frame ) ) );
      this.inverse().pre_multiply( Mat4.translation( this.thrust.times( +meters_per_frame ) ) );
    }
  third_person_arcball( radians_per_frame )
    {                                           // (Internal helper function)
                                                // Spin the scene around a point on an axis determined by user mouse drag:
      const dragging_vector = this.mouse.from_center.minus( this.mouse.anchor );
      if( dragging_vector.norm() <= 0 )
        return;
      this.matrix().post_multiply( Mat4.translation([ 0,0, -25 ]) );
      this.inverse().pre_multiply( Mat4.translation([ 0,0, +25 ]) );

      const rotation = Mat4.rotation( radians_per_frame * dragging_vector.norm(), 
                                                  Vec.of( dragging_vector[1], dragging_vector[0], 0 ) );
      this.matrix().post_multiply( rotation );
      this.inverse().pre_multiply( rotation );

      this. matrix().post_multiply( Mat4.translation([ 0,0, +25 ]) );
      this.inverse().pre_multiply( Mat4.translation([ 0,0, -25 ]) );
    }
  display( context, graphics_state, dt = graphics_state.animation_delta_time / 1000 )
    {                                                            // The whole process of acting upon controls begins here.
      const m = this.speed_multiplier * this. meters_per_frame,
            r = this.speed_multiplier * this.radians_per_frame;

      if( this.will_take_over_graphics_state )
      { this.reset( graphics_state );
        this.will_take_over_graphics_state = false;
      }

      if( !this.mouse_enabled_canvases.has( context.canvas ) )
      { this.add_mouse_controls( context.canvas );
        this.mouse_enabled_canvases.add( context.canvas )
      }
                                     // Move in first-person.  Scale the normal camera aiming speed by dt for smoothness:
      this.first_person_flyaround( dt * r, dt * m );
                                     // Also apply third-person "arcball" camera mode if a mouse drag is occurring:
      if( this.mouse.anchor )
        this.third_person_arcball( dt * r );           
                                     // Log some values:
      this.pos    = this.inverse().times( Vec.of( 0,0,0,1 ) );
      this.z_axis = this.inverse().times( Vec.of( 0,0,1,0 ) );
    }
}


const Transforms_Sandbox_Base = defs.Transforms_Sandbox_Base =
class Transforms_Sandbox_Base extends Scene
{                                          // **Transforms_Sandbox_Base** is a Scene that can be added to any display canvas.
                                           // This particular scene is broken up into two pieces for easier understanding.
                                           // The piece here is the base class, which sets up the machinery to draw a simple 
                                           // scene demonstrating a few concepts.  A subclass of it, Transforms_Sandbox,
                                           // exposes only the display() method, which actually places and draws the shapes,
                                           // isolating that code so it can be experimented with on its own.
  constructor()
    {                  // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
      super();
      this.hover = this.swarm = false;
                                                        // At the beginning of our program, load one of each of these shape 
                                                        // definitions onto the GPU.  NOTE:  Only do this ONCE per shape it
                                                        // would be redundant to tell it again.  You should just re-use the
                                                        // one called "box" more than once in display() to draw multiple cubes.
                                                        // Don't define more than one blueprint for the same thing here.
      this.shapes = { 'box'  : new Cube(),
                      'ball' : new Subdivision_Sphere( 4 ) };
      
                                                  // *** Materials: *** Define a shader, and then define materials that use
                                                  // that shader.  Materials wrap a dictionary of "options" for the shader.
                                                  // Here we use a Phong shader and the Material stores the scalar 
                                                  // coefficients that appear in the Phong lighting formulas so that the
                                                  // appearance of particular materials can be tweaked via these numbers.
      this.shader = new defs.Phong_Shader_Reduced();
      this.materials = { plastic: new Material( this.shader, 
                                    { ambient: .2, diffusivity: 1, specularity: .5, color: Color.of( .9,.5,.9,1 ) } ),
                           metal: new Material( this.shader, 
                                    { ambient: .2, diffusivity: 1, specularity:  1, color: Color.of( .9,.5,.9,1 ) } ) };
    }
  make_control_panel()
    {                                 // make_control_panel(): Sets up a panel of interactive HTML elements, including
                                      // buttons with key bindings for affecting this scene, and live info readouts.
      this.control_panel.innerHTML += "Dragonfly rotation angle: <br>";
                                                // The next line adds a live text readout of a data member of our Scene.
      this.live_string( box => { box.textContent = ( this.hover ? 0 : ( this.t % (2*Math.PI)).toFixed(2) ) + " radians" } ); 
      this.new_line();
                                                // Add buttons so the user can actively toggle data members of our Scene:
      this.key_triggered_button( "Hover dragonfly in place", [ "h" ], function() { this.hover ^= 1; } );
      this.new_line();
      this.key_triggered_button( "Swarm mode", [ "m" ], function() { this.swarm ^= 1; } );
    }
  display( context, program_state )
    {                                                // display():  Called once per frame of animation.  We'll isolate out
                                                     // the code that actually draws things into Transforms_Sandbox, a
                                                     // subclass of this Scene.  Here, the base class's display only does
                                                     // some initial setup.
     
                           // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
      if( !context.scratchpad.controls ) 
        { this.children.push( context.scratchpad.controls = new defs.Movement_Controls() ); 

                    // Define the global camera and projection matrices, which are stored in program_state.  The camera
                    // matrix follows the usual format for transforms, but with opposite values (cameras exist as 
                    // inverted matrices).  The projection matrix follows an unusual format and determines how depth is 
                    // treated when projecting 3D points onto a plane.  The Mat4 functions perspective() and
                    // orthographic() automatically generate valid matrices for one.  The input arguments of
                    // perspective() are field of view, aspect ratio, and distances to the near plane and far plane.
          program_state.set_camera( Mat4.translation([ 0,3,-10 ]) );
          program_state.projection_transform = Mat4.perspective( Math.PI/4, context.width/context.height, 1, 100 );
        }

                                                // *** Lights: *** Values of vector or point lights.  They'll be consulted by 
                                                // the shader when coloring shapes.  See Light's class definition for inputs.
      const t = this.t = program_state.animation_time/1000;
      const angle = Math.sin( t );
      const light_position = Mat4.rotation( angle, [ 1,0,0 ] ).times( Vec.of( 0,-1,1,0 ) );
      program_state.lights = [ new Light( light_position, Color.of( 1,1,1,1 ), 1000000 ) ];
    }
}