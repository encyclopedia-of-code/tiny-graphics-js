import {tiny} from './tiny-graphics.js';
                                            // Pull these names into this module's scope for convenience:
const { Vec, Mat, Mat4, Color, Light, Shape, Material, Shader, Overridable, Scene } = tiny;

import {widgets} from './tiny-graphics-widgets.js';
Object.assign( tiny, widgets );

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

      // Fix the UV seam by duplicating vertices with offset UV
        let tex = this.arrays.texture_coord;
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


const Phong_Shader = defs.Phong_Shader =
class Phong_Shader extends Shader
{                                    // Subclasses of class Shader each store and manage a complete GPU program.  "Phong"
                                     // Shading is a process of determining brightness of pixels via vector math.  It compares
                                     // the normal vector at that pixel to the vectors toward the camera and light sources.

  shared_glsl_code()            // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
    { return ` precision mediump float;
        uniform float ambient, diffusivity, specularity, smoothness;
        uniform vec4 lightColor, shapeColor, light_position_or_vector;
        uniform vec3 squared_scale, camera_center;
        varying vec3 N, L, H;           // Specifier "varying" means a variable's final value will be passed from the vertex shader 
                                        // on to the next phase (fragment shader), then interpolated per-fragment, weighted by the 
                                        // pixel fragment's proximity to each of the 3 vertices (barycentric interpolation).                                            
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
          { gl_Position = projection_camera_model_transform * vec4( position, 1.0 );           // The vertex's final resting place (in NDCS).
            N = normalize( mat3( model_transform ) * normal / squared_scale);                         // The final normal vector in screen space.
            
            vec3 vertex_worldspace = ( model_transform * vec4( position, 1.0 ) ).xyz;
            vec3 E = normalize( camera_center - vertex_worldspace );

            // Light positions use homogeneous coords.  Use w = 0 for a directional light source -- a vector instead of a point.
            L = normalize( light_position_or_vector.xyz - light_position_or_vector.w * vertex_worldspace );
            H = normalize( L + E );
          } ` ;
    }
  fragment_glsl_code()        // ********* FRAGMENT SHADER ********* 
    {   // A fragment is a pixel that's overlapped by the current triangle.  Fragments affect the final image or get discarded due to depth.                                 
      return `
        void main()
          { gl_FragColor = vec4( shapeColor.xyz * ambient, shapeColor.w );   // Compute an initial (ambient) color:
            gl_FragColor.xyz += phong_model_light( normalize( N ) );         // Compute the final color with contributions from lights.
          } ` ;
    }

    // Define how to synchronize our JavaScript's variables to the GPU's.  This is where the shader recieves ALL of its inputs.  Every
    // value the GPU wants is divided into two categories:  Values that belong to individual object being drawn (which we call "Material")
    // and values belonging to the whole scene or program (which we call the "Graphics State").  Send both a material and a graphics state
    // to the shaders to fully initialize them.
  update_GPU( context, gpu_addresses, g_state, model_transform, material )
    { const gpu = gpu_addresses, gl = context;

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

      const squared_scale = model_transform.reduce( (acc,r) => { return acc.plus( Vec.from(r).mult_pairs(r) ) }, Vec.of( 0,0,0,0 ) ).to3();
      gl.uniform3fv( gpu.squared_scale, squared_scale );          // Use the squared scale trick from Eric's blog instead of inverse transpose.


      gl.uniform4fv( gpu.shapeColor,     material.color       );    // Send the desired shape-wide material qualities 
      gl.uniform1f ( gpu.ambient,        material.ambient     );    // to the graphics card, where they will tweak the
      gl.uniform1f ( gpu.diffusivity,    material.diffusivity );    // Phong lighting formula.
      gl.uniform1f ( gpu.specularity,    material.specularity );
      gl.uniform1f ( gpu.smoothness,     material.smoothness  );

      const O = Vec.of( 0,0,0,1 ), camera_center = g_state.camera_transform.times( O ).to3();
      gl.uniform3fv( gpu.camera_center, camera_center );

      if( !g_state.lights.length ) return;      // Omitting lights will show only the material color, scaled by the ambient term.
      gl.uniform4fv( gpu.lightColor,          g_state.lights[0].color );
      
      const light_position_or_vector = g_state.lights[0].position;  // Light position uses homogeneous coords.
      gl.uniform4fv( gpu.light_position_or_vector, light_position_or_vector );
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


const Transforms_Sandbox_Base = defs.Transforms_Sandbox_Base =
class Transforms_Sandbox_Base extends Scene    // This Scene can be added to a display canvas.  This particular one
{                                              // sets up the machinery to draw a simple scene demonstrating a few concepts.
                                               // Scroll down to the display() method at the bottom to see where the shapes are drawn.
  constructor()             // The scene begins by requesting the shapes and materials it will need.
    { super();
                                                        // At the beginning of our program, load one of each of these shape 
                                                        // definitions onto the GPU.  NOTE:  Only do this ONCE per shape it
                                                        // would be redundant to tell it again.  You should just re-use the
                                                        // one called "box" more than once in display() to draw multiple cubes.
                                                        // Don't define more than one blueprint for the same thing here.
      this.shapes = { 'box'             : new Cube(),
                      'ball'            : new Subdivision_Sphere( 4 ) };

      [ this.hover, this.t ] = [ false, 0 ];    // Define a couple of data members called "hover" and "t".

      // *** Materials: *** Define more data members here, returned from the material() function of our shader.  Material objects contain
      //                    shader configurations.  They are used to light and color each shape.  Declare new materials as temps when
      //                    needed; they're just cheap wrappers for some numbers.  1st parameter:  Color (4 floats in RGBA format).
      this.shader = new defs.Phong_Shader();
      this.materials = { plastic: new Material( this.shader, 
                                    { ambient: .4, diffusivity: .4, specularity: .6, color: Color.of( .9,.5,.9,1 ) } ) };

      // *** Lights: *** Values of vector or point lights.  They'll be consulted by the shader when coloring shapes.  Two different lights 
      //                 *per shape* are supported by in the example shader; more requires changing a number in it or other tricks.
      //                 Arguments to construct a Light(): Light source position or vector (homogeneous coordinates), color, and intensity.
      this.lights = [ new Light( Vec.of( 1,1,1,0 ), Color.of( 1,1,1,1 ), 100000 ) ];
    }
  make_control_panel()               // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
    { this.control_panel.innerHTML += "Creature rotation angle: <br>";    // This line adds stationary text.  The next line adds live text.
      this.live_string( box => { box.textContent = ( this.hover ? 0 : ( this.t % (2*Math.PI)).toFixed(2) ) + " radians" } ); this.new_line();
      this.key_triggered_button( "Hover in place", [ "h" ], function() { this.hover ^= 1; } );    // Add a button for controlling the scene.
    }
}