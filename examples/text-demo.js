import {tiny, defs} from './common.js';
                                                  // Pull these names into this module's scope for convenience:
const { Vector, vec3, vec4, color, Mat4, Light, Shape, Material, Shader, Texture, Component } = tiny;

export
const Text_Line = defs.Text_Line =
class Text_Line extends Shape                
{                           // **Text_Line** embeds text in the 3D world, using a crude texture 
                            // method.  This Shape is made of a horizontal arrangement of quads.
                            // Each is textured over with images of ASCII characters, spelling 
                            // out a string.  Usage:  Instantiate the Shape with the desired
                            // character line width.  Then assign it a single-line string by calling
                            // set_string("your string") on it. Draw the shape on a material
                            // with full ambient weight, and text.png assigned as its texture 
                            // file.  For multi-line strings, repeat this process and draw with
                            // a different matrix.
  constructor( max_size )
    { super( "position", "normal", "texture_coord" );
      this.max_size = max_size;
      var object_transform = Mat4.identity();
      for( var i = 0; i < max_size; i++ )
      {                                       // Each quad is a separate Square instance:
        defs.Square.insert_transformed_copy_into( this, [], object_transform );
        object_transform.post_multiply( Mat4.translation( 1.5,0,0 ) );
      }
    }
  set_string( line, context )
    {           // set_string():  Call this to overwrite the texture coordinates buffer with new 
                // values per quad, which enclose each of the string's characters.
      this.arrays.texture_coord = [];
      for( var i = 0; i < this.max_size; i++ )
        {
          var row = Math.floor( ( i < line.length ? line.charCodeAt( i ) : ' '.charCodeAt() ) / 16 ),
              col = Math.floor( ( i < line.length ? line.charCodeAt( i ) : ' '.charCodeAt() ) % 16 );

          var skip = 3, size = 32, sizefloor = size - skip;
          var dim = size * 16,  
              left  = (col * size + skip) / dim,      top    = (row * size + skip) / dim,
              right = (col * size + sizefloor) / dim, bottom = (row * size + sizefloor + 5) / dim;

          this.arrays.texture_coord.push( ...Vector.cast( [ left,  1-bottom], [ right, 1-bottom ],
                                                          [ left,  1-top   ], [ right, 1-top    ] ) );
        }
      if( !this.existing )
        { this.copy_onto_graphics_card( context );
          this.existing = true;
        }
      else
        this.copy_onto_graphics_card( context, ["texture_coord"], false );
    }
}


export class Text_Demo extends Component
{             // **Text_Demo** is a scene with a cube, for demonstrating the Text_Line utility Shape.
  constructor()
    { super()
      this.shapes = { cube: new defs.Cube(), text: new Text_Line( 35 ) };
                                      // Don't create any DOM elements to control this scene:
      this.widget_options = { make_controls: false };
        
      const phong   = new defs.Phong_Shader();
      const texture = new defs.Textured_Phong( 1 );
      this.grey       = new Material( phong, { color: color( .5,.5,.5,1 ), ambient: 0, 
                                      diffusivity: .3, specularity: .5, smoothness: 10 })

                              // To show text you need a Material like this one:
      this.text_image = new Material( texture, { ambient: 1, diffusivity: 0, specularity: 0,
                                                 texture: new Texture( "assets/text.png" ) });
    }
  render_animation( context, shared_uniforms )
    { shared_uniforms.lights = [ new Light( vec4( 3,2,1,0 ),   color( 1,1,1,1 ),  1000000 ),
                                 new Light( vec4( 3,10,10,1 ), color( 1,.7,.7,1 ), 100000 ) ];
      shared_uniforms.set_camera( Mat4.look_at( ...Vector.cast( [ 0,0,4 ], [0,0,0], [0,1,0] ) ) );
      shared_uniforms.projection_transform = Mat4.perspective( Math.PI/4, context.width/context.height, 1, 500 );
      
      const t = shared_uniforms.animation_time/1000;
      const funny_orbit = Mat4.rotation( Math.PI/4*t,   Math.cos(t), Math.sin(t), .7*Math.cos(t) );
      this.shapes.cube.draw( context, shared_uniforms, funny_orbit, this.grey );
      
      
      let strings = [ "This is some text", "More text", "1234567890", "This is a line.\n\n\n"+"This is another line.", 
                      Text_Line.toString(), Text_Line.toString() ];
      
                        // Sample the "strings" array and draw them onto a cube.
      for( let i = 0; i < 3; i++ )                    
        for( let j = 0; j < 2; j++ )
        {             // Find the matrix for a basis located along one of the cube's sides:
          let cube_side = Mat4.rotation( i == 0 ? Math.PI/2 : 0,   1, 0, 0 )
                  .times( Mat4.rotation( Math.PI * j - ( i == 1 ? Math.PI/2 : 0 ),   0, 1, 0 ) )
                  .times( Mat4.translation( -.9, .9, 1.01 ) );

          const multi_line_string = strings[ 2*i + j ].split('\n');
                        // Draw a Text_String for every line in our string, up to 30 lines:
          for( let line of multi_line_string.slice( 0,30 ) )
          {             // Assign the string to Text_String, and then draw it.
            this.shapes.text.set_string( line, context.context );
            this.shapes.text.draw( context, shared_uniforms, funny_orbit.times( cube_side )
                                                 .times( Mat4.scale( .03,.03,.03 ) ), this.text_image );
                        // Move our basis down a line.
            cube_side.post_multiply( Mat4.translation( 0,-.06,0 ) );
          }
        }
    }
}