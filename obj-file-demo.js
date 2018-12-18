window.Shape_From_File = window.classes.Shape_From_File =
class Shape_From_File extends Shape          // A versatile standalone Shape that imports all its arrays' data from an .obj 3D model file.
{ constructor( filename )
    { super( "positions", "normals", "texture_coords" );
      this.load_file( filename );      // Begin downloading the mesh. Once that completes, return control to our parse_into_mesh function.
    }
  load_file( filename )
      { return fetch( filename )       // Request the external file and wait for it to load.
          .then( response =>
            { if ( response.ok )  return Promise.resolve( response.text() )
              else                return Promise.reject ( response.status )
            })
          .then( obj_file_contents => this.parse_into_mesh( obj_file_contents ) )
          .catch( error => { this.copy_onto_graphics_card( this.gl ); } )                     // Failure mode:  Loads an empty shape.
      }
  parse_into_mesh( data )                                           // Adapted from the "webgl-obj-loader.js" library found online:
    { var verts = [], vertNormals = [], textures = [], unpacked = {};   

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

                  unpacked.verts.push(+verts[(vertex[0] - 1) * 3 + 0]);   unpacked.verts.push(+verts[(vertex[0] - 1) * 3 + 1]);   
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
      for( var j = 0; j < unpacked.verts.length/3; j++ )
      {
        this.positions     .push( Vec.of( unpacked.verts[ 3*j ], unpacked.verts[ 3*j + 1 ], unpacked.verts[ 3*j + 2 ] ) );        
        this.normals       .push( Vec.of( unpacked.norms[ 3*j ], unpacked.norms[ 3*j + 1 ], unpacked.norms[ 3*j + 2 ] ) );
        this.texture_coords.push( Vec.of( unpacked.textures[ 2*j ], unpacked.textures[ 2*j + 1 ]  ));
      }
      this.indices = unpacked.indices;

      this.normalize_positions( false );
      this.copy_onto_graphics_card( this.gl );
      this.ready = true;
    }
  draw( graphics_state, model_transform, material )       // Cancel all attempts to draw the shape before it loads.
    { if( this.ready ) super.draw( graphics_state, model_transform, material );   }
}

window.Obj_File_Demo = window.classes.Obj_File_Demo =
class Obj_File_Demo extends Scene_Component     // An example that loads a single 3D model from an OBJ file.  Detailed model files can be
  {                                             // used in place of simpler primitive-based shapes to add complexity to a scene.  Simpler
                                                // primitives in your scene can just be thought of as placeholders until you find a model
                                                // file that fits well.  This demo shows the teapot model twice, with one teapot showing
    constructor( context, control_box )         // off the Fake_Bump_Map effect while the other has a regular texture and Phong lighting.             
      { super(   context, control_box );
        context.globals.graphics_state.    camera_transform = Mat4.translation([ 0,0,-5 ]);
        context.globals.graphics_state.projection_transform = Mat4.perspective( Math.PI/4, context.width/context.height, .1, 1000 ); 
      
        var shapes = { "teapot": new Shape_From_File( "/assets/teapot.obj" ) };             // Load the model file.
        this.submit_shapes( context, shapes );
        
        this.stars = context.get_instance( Phong_Shader )  .material( Color.of( .5,.5,.5,1 ),       // Non bump mapped:
          { ambient: .3, diffusivity: .5, specularity: .5, texture: context.get_instance( "/assets/stars.png" ) } );
        this.bumps = context.get_instance( Fake_Bump_Map ).material( Color.of( .5,.5,.5,1 ),        // Bump mapped:
          { ambient: .3, diffusivity: .5, specularity: .5, texture: context.get_instance( "/assets/stars.png" ) } );
      }
    display( graphics_state )
      { const t = graphics_state.animation_time;
        graphics_state.lights = [ new Light( Mat4.rotation( t/300, Vec.of(1, 0, 0) ).times( Vec.of( 3,  2,  10, 1 ) ), 
                                             Color.of( 1, .7, .7, 1 ), 100000 ) ];        // A spinning light to show off the bump map.
        
        for( let i of [ -1, 1 ] )
        { const model_transform = Mat4.rotation( t/2000, Vec.of( 0, 2, 1 ) )              // Spin the 3D model shapes as well.
                          .times( Mat4.translation([ 2*i, 0, 0 ]) )
                          .times( Mat4.rotation( t/1500, Vec.of( -1, 2, 0 ) ) )
                          .times( Mat4.rotation( -Math.PI/2, Vec.of( 1, 0, 0 ) ) );
          this.shapes.teapot.draw( graphics_state, model_transform, i == 1 ? this.stars : this.bumps );   // Draw the shapes.
        }
      }
  show_explanation( document_element )
    { document_element.innerHTML += "<p>This demo loads an external 3D model file of a teapot.  It uses a condensed version of the \"webgl-obj-loader.js\" "
                                 +  "open source library, though this version is not guaranteed to be complete.  It is contained in the class \"Shape_From_File\". "
                                 +  "</p><p>One of these teapots is lit with bump mapping.  Can you tell which one?</p>";
    }
  }