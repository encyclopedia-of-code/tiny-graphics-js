import {tiny, defs} from './common.js';
const { Vec, Mat, Mat4, Color, Light, 
        Shape, Shader, Scene, Texture } = tiny;           // Pull these names into this module's scope for convenience.

export class Text_Line extends Shape                // Text_Line embeds text in the 3D world, using a crude texture method.  This
{                                                   // Shape is made of a horizontal arrangement of quads. Each is textured over with
                                                    // images of ASCII characters, spelling out a string.  Usage:  Instantiate the
                                                    // Shape with the desired character line width.  Assign it a single-line string
                                                    // by calling set_string("your string") on it. Draw the shape on a material
                                                    // with full ambient weight, and text.png assigned as its texture file.  For
  constructor( max_size )                           // multi-line strings, repeat this process and draw with a different matrix.
    { super( "position", "normal", "texture_coord" );
      this.max_size = max_size;
      var object_transform = Mat4.identity();
      for( var i = 0; i < max_size; i++ )
      { defs.Square.insert_transformed_copy_into( this, [], object_transform );   // Each quad is a separate Square instance.
        object_transform.post_multiply( Mat4.translation([ 1.5,0,0 ]) );
      }
    }
  set_string( line, context )        // Overwrite the texture coordinates buffer with new values per quad,
    { this.arrays.texture_coord = [];           // which enclose each of the string's characters.
      for( var i = 0; i < this.max_size; i++ )
        {
          var row = Math.floor( ( i < line.length ? line.charCodeAt( i ) : ' '.charCodeAt() ) / 16 ),
              col = Math.floor( ( i < line.length ? line.charCodeAt( i ) : ' '.charCodeAt() ) % 16 );

          var skip = 3, size = 32, sizefloor = size - skip;
          var dim = size * 16,  left  = (col * size + skip) / dim,      top    = (row * size + skip) / dim,
                                right = (col * size + sizefloor) / dim, bottom = (row * size + sizefloor + 5) / dim;

          this.arrays.texture_coord.push( ...Vec.cast( [ left,  1-bottom], [ right, 1-bottom ], [ left,  1-top ], [ right, 1-top ] ) );
        }
      this.copy_onto_graphics_card( context, ["texture_coord"], false );
    }
}


export class Text_Demo extends Scene                   // A scene with a cube, for showing the Text_Line utility Shape.
{ constructor( webgl_manager )
    { super(   webgl_manager )
                                    // Store the desired camera and projection matrices in the shader-bound graphics state:
      webgl_manager.globals.graphics_state.set_camera( Mat4.look_at( ...Vec.cast( [ 0,0,4 ], [0,0,0], [0,1,0] ) ) );
      webgl_manager.globals.graphics_state.projection_transform = Mat4.perspective( Math.PI/4, webgl_manager.width/webgl_manager.height, .1, 1000 );                 
      
      this.shapes = { cube: new defs.Cube(), text: new Text_Line( 35 ) };
      this.shapes.text.copy_onto_graphics_card( webgl_manager.context );
      
      this.shader = new defs.Phong_Shader();
      this.grey       = this.shader.material({ ambient: 0, diffusivity: .3, specularity: .5, smoothness: 10 })
                             .override( Color.of( .5,.5,.5,1 ) );
      this.text_image = this.shader.material({ ambient: 1, diffusivity: 0, specularity: 0, texture: new Texture( "assets/text.png" ) });
    }
  display( context, graphics_state )
    { graphics_state.lights = [ new Light( Vec.of( 3,2,1,0 ),   Color.of( 1,1,1,1 ),  1000000 ),
                                new Light( Vec.of( 3,10,10,1 ), Color.of( 1,.7,.7,1 ), 100000 ) ];
      
      const t = graphics_state.animation_time/1000;
      const funny_orbit = Mat4.rotation(  Math.PI/4*t, Vec.of( Math.cos(t), Math.sin(t), .7*Math.cos(t) ) );
      this.shapes.cube.draw( context, graphics_state, funny_orbit, this.grey );
      
      
      let strings = [ "This is some text", "More text", "1234567890", "This is a line.\n\n\n"+"This is another line.", 
                      Text_Line.toString(), Text_Line.toString() ];
      
      for( var i = 0; i < 3; i++ )                    
        for( var j = 0; j < 2; j++ )
        { var cube_side = Mat4.rotation( i == 0 ? Math.PI/2 : 0, Vec.of(1, 0, 0) )
                  .times( Mat4.rotation( Math.PI * j - ( i == 1 ? Math.PI/2 : 0 ), Vec.of( 0, 1, 0 ) ) )
                  .times( Mat4.translation([ -.9, .9, 1.01 ]) );
          for( let line of strings[ 2*i + j ].split('\n') )
          { this.shapes.text.set_string( line, context );
            this.shapes.text.draw( context, graphics_state, funny_orbit.times( cube_side )
                                                              .times( Mat4.scale([ .03,.03,.03 ])), this.text_image );
            cube_side.post_multiply( Mat4.translation([ 0,-.06,0 ]) );
          }          
        } 
    }
}