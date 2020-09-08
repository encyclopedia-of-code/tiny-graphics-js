import {tiny, defs} from './common.js';
                                                  // Pull these names into this module's scope for convenience:
const { Vector3, vec3, vec4, color, Mat4, Light, Shape, Material, Shader, Texture, Component } = tiny;
const { Triangle, Square, Tetrahedron, Windmill, Cube, Subdivision_Sphere } = defs;


export class Parametric_Surfaces extends Component
{
  render_layout( div, options = {} )
    {
      this.div = div;
      div.className = "documentation_treenode";
                                                        // Fit the existing document content to a fixed size:    
      div.style.margin = "auto";
      div.style.width = "1080px";

      this.initialize_shared_state();

      this.inner_scenes = [];
      for( let i = 0; i < this.num_sections(); i++ )
      {
        const inner_scene = new Parametric_Surfaces_Section( this, i );
        const inner_div = div.appendChild( document.createElement( "div" ) );
        this[ "region_" + i ] = inner_div
        this.inner_scenes.push( inner_scene );

        inner_scene.render_layout( inner_div );        
      }
    }
  initialize_shared_state()
  {
                             // Make a new uniforms holder for all child graphics contexts to share.
      this.shared_uniforms = new tiny.Shared_Uniforms();
      this.shared_uniforms.set_camera( Mat4.translation( 0,0,-3 ) );

      const shader = new defs.Textured_Phong( 1 );

      this.material = new Material( shader, { ambient: .5, texture: new Texture( "assets/rgb.jpg" ) } );

      this.movement_controls = new defs.Movement_Controls();
  }
  render_animation( context, shared_uniforms_unused )
    {
      const shared_uniforms = this.update_shared_state( context );

      context.scratchpad.controls = this.movement_controls;

                             // Tick values that update only once per frame (not per section).
      const t = this.t = shared_uniforms.animation_time/1000;
      const angle = Math.sin( t );
      const light_position = Mat4.rotation( angle,   1,0,0 ).times( vec4( 0,0,1,0 ) );
      shared_uniforms.lights = [ new Light( light_position, color( 1,1,1,1 ), 1000000 ) ];
    }
  num_sections() { return 1 }
}

export class Parametric_Surfaces_Section extends Component
{ constructor( parent, section_index )
    { super();
      
      this.parent = parent;
      this.section_index = section_index;

      this.animated_children.push( parent.movement_controls );
      
                                  // Switch on section_index to decide what to actually construct.
      const handler_at_index = this[ "construct_section_" + section_index ];
      handler_at_index.call( this );
    }
  render_animation( context, shared_uniforms )
    {
                        // Part I:  All sections do this every frame:
      this.r = Mat4.rotation( -.5*Math.sin( shared_uniforms.animation_time/5000 ),   1,1,1 );

      shared_uniforms.projection_transform = Mat4.perspective( Math.PI/4, context.width/context.height, 1, 100 );

                        // Part II:  Switch on section_index to decide what to actually draw.
      const handler_at_index = this[ "display_section_" + this.section_index ];
      handler_at_index.call( this, context, shared_uniforms );
    }
  render_layout( div, options = {} )
    {
      this.div = div;
      div.className = "documentation_treenode";
                                                        // Fit the existing document content to a fixed size:    
      div.style.margin = "auto";
      div.style.width = "1080px";
                
      this.document_region = div.appendChild( document.createElement( "div" ) );    
      this.document_region.className = "documentation";
      this.render_documentation();
                                                        // The next div down will hold a canvas and/or related interactive areas.
      this.program_stuff = div.appendChild( document.createElement( "div" ) );

      const defaults = { show_canvas: true,  make_controls: true,
                         make_editor: false, make_code_nav: true };

      const overridden_options = Object.assign( defaults, this.widget_options, options );

            // TODO:  One use case may have required canvas to be styled as a rule instead of as an element.  Keep an eye out.
      const canvas = this.program_stuff.appendChild( document.createElement( "canvas" ) );
      canvas.style = `width:1080px; height:600px; background:DimGray; margin:auto; margin-bottom:-4px`;

      if( !overridden_options.show_canvas )
        canvas.style.display = "none";
                                        // Use tiny-graphics-js to draw graphics to the canvas, using the given scene objects.
      this.webgl_manager = new tiny.Webgl_Manager( canvas );
      this.webgl_manager.component = this;

                                  // Load our common state.
      this.webgl_manager.shared_uniforms = this.parent.shared_uniforms;

                                       // Start WebGL main loop - render() will re-queue itself for continuous calls.
      this.webgl_manager.event = window.requestAnimFrame( this.webgl_manager.render.bind( this.webgl_manager ) );

      if( overridden_options.make_controls )
      { this.embedded_controls_area = this.program_stuff.appendChild( document.createElement( "div" ) );
        this.embedded_controls_area.className = "controls-widget";
        this.embedded_controls = new tiny.Controls_Widget( this );
      }
      if( overridden_options.make_code_nav )
      { this.embedded_code_nav_area = this.program_stuff.appendChild( document.createElement( "div" ) );
        this.embedded_code_nav_area.className = "code-widget";
        this.embedded_code_nav = new tiny.Code_Widget( this );
      }
      if( overridden_options.make_editor )
      { this.embedded_editor_area = this.program_stuff.appendChild( document.createElement( "div" ) );
        this.embedded_editor_area.className = "editor-widget";
        this.embedded_editor = new tiny.Editor_Widget( this );
      }
    }
  construct_section_0()
    { const initial_corner_point = vec3( -1,-1,0 );
                          // These two callbacks will step along s and t of the first sheet:
      const row_operation = (s,p) => p ? Mat4.translation( 0,.2,0 ).times(p.to4(1)).to3() 
                                       : initial_corner_point;
      const column_operation = (t,p) =>  Mat4.translation( .2,0,0 ).times(p.to4(1)).to3();
                          // These two callbacks will step along s and t of the second sheet:
      const row_operation_2    = (s,p)   => vec3(    -1,2*s-1,Math.random()/2 );
      const column_operation_2 = (t,p,s) => vec3( 2*t-1,2*s-1,Math.random()/2 );

      this.shapes = { sheet : new defs.Grid_Patch( 10, 10, row_operation, column_operation ),
                      sheet2: new defs.Grid_Patch( 10, 10, row_operation_2, column_operation_2 ) };      
    }
  display_section_0( context, shared_uniforms )
    {
                        // Draw the sheets, flipped 180 degrees so their normals point at us.
      const r = Mat4.rotation( Math.PI,   0,1,0 ).times( this.r );
      this.shapes.sheet .draw( context, shared_uniforms, Mat4.translation( -1.5,0,0 ).times(r), this.parent.material );
      this.shapes.sheet2.draw( context, shared_uniforms, Mat4.translation(  1.5,0,0 ).times(r), this.parent.material );
    }
  explain_section_0()
    { this.document_region.innerHTML =
          `<p>Parametric Surfaces can be generated by parametric functions that are driven by changes to two variables - s and t.  As either s or t increase, we can step along the shape's surface in some direction aligned with the shape, not the usual X,Y,Z axes.</p>
           <p>Grid_Patch is a generalized parametric surface.  It is always made of a sheet of squares arranged in rows and columns, corresponding to s and t.  The sheets are always guaranteed to have this row/column arrangement, but where it goes as you follow an edge to the next row or column over could vary.  When generating the shape below, we told it to do the most obvious thing whenever s or t increase; just increase X and Y.  A flat rectangle results.</p>
           <p>The shape on the right is the same except instead of building it incrementally by moving from the previous point, we assigned points manually.  The z values are a random height map.  The light is moving over its static peaks and valleys.  We have full control over where the sheet's points go.</p>
           <p>To create a new Grid_Patch shape, initialize it with the desired amounts of rows and columns you'd like.  The next two arguments are callback functions that return a new point given an old point (called p) and the current (s,t) coordinates.  The first callback is for rows, and will recieve arguments (s,p) back from Grid_Patch.  The second one is for columns, and will recieve arguments (t,p,s) back from Grid_Patch. </p>
           <p>Scroll down for more animations!</p>`;      
    }
}


// const Multi_Canvas_Scene = widgets.Multi_Canvas_Scene =
// class Multi_Canvas_Scene extends tiny.Scene
// {                               // **Multi_Canvas_Scene** is a special Scene whose documentation, when printed out by a Document_Builder,
//                                 // expands out into several sections -- each potentially drawing their own variation of the Scene or
//                                 // of any Scene.  Text and interactive areas can alternate as needed by the author. State of the 
//                                 // document is managed in a shared object at the top level, which continuously updates the sections' 
//                                 // contents via their display() functions.  Override the indicated functions with useful behavior.
//   constructor( content )
//     { super();

//       this.widget_options = { show_canvas: false };
                
//       this.inner_scenes = [];
                            
//                             // Instance child objects for each section.       
//       for( let i = 0; i < this.num_sections(); i++ )
//         this.inner_scenes.push( new content( i ) );

//                             // Make a new uniforms holder for all child graphics contexts to share.
//*//       this.shared_uniforms_of_children = new tiny.Shared_Uniforms();
//       this.initialize_shared_state();
//     }
//   show_document( document_builder )
//     {
//       for( let section of this.inner_scenes )
//       {
//         section.document_builder = document_builder.expand_tree( section );

//                             // Disseminate our one shared_uniforms.
//*//         section.webgl_manager.shared_uniforms = this.shared_uniforms_of_children;
//       }
//     }

//       // Override the following as needed:
//   num_sections() { return 0 }
//   initialize_shared_state() { }
//   update_shared_state( context )
//     {
//           // Use the provided context to tick shared_uniforms_of_children.animation_time only once per frame.
//*//       context.shared_uniforms = this.shared_uniforms_of_children;
//       return this.shared_uniforms_of_children;
//     }
//   expand_tree( new_section )
//     { const child = new tiny.Document_Builder( this.div, new_section );
//       this.children.push( child );
//       return child;
//     }
// }



/*
export class Parametric_Surfaces extends tiny.Multi_Canvas_Scene
{ constructor()
    { super( Parametric_Surfaces_Section )
    }
  initialize_shared_state()
    {
      this.shared_uniforms_of_children.set_camera( Mat4.translation( 0,0,-3 ) );

      const shader = new defs.Textured_Phong( 1 );

      this.material = new Material( shader, { ambient: .5, texture: new Texture( "assets/rgb.jpg" ) } );

      this.movement_controls = new defs.Movement_Controls();

      for( let section of this.inner_scenes )
        {
          section.material = this.material;
          section.children.push( this.movement_controls );
        }
    }
  num_sections() { return 7 }
  display( context, shared_uniforms_unused )
    { 
      const shared_uniforms = this.update_shared_state( context );

      context.scratchpad.controls = this.movement_controls;

                             // Tick values that update only once per frame (not per section).
      const t = this.t = shared_uniforms.animation_time/1000;
      const angle = Math.sin( t );
      const light_position = Mat4.rotation( angle,   1,0,0 ).times( vec4( 0,0,1,0 ) );
      shared_uniforms.lights = [ new Light( light_position, color( 1,1,1,1 ), 1000000 ) ];
    }
}


export
const Parametric_Surfaces_Section = defs.Parametric_Surfaces_Section =
class Parametric_Surfaces_Section extends Scene
{
  constructor( section_index )
    {
      super();
                                    // Switch on section_index to decide what to actually construct.
      this.section_index = section_index;      
      const handler_at_index = this[ "construct_section_" + section_index ];
      handler_at_index.call( this );
    }
  show_document( document_builder, document_element = document_builder.document_region )
    {
        document_builder.div.className = "documentation_treenode";

                                                // This document will repeat the following layout for each section:

                                                      // 1. Text region:
                                              // Switch on section_index to decide what to actually print.
        this[ "explain_section_" + this.section_index ] ( document_element );

                                                      // 2. Canvas showing a scene:
        const canvas = document_builder.div.appendChild( document.createElement( "canvas" ) );
        this.webgl_manager = new tiny.Webgl_Manager( canvas );

        this.webgl_manager.scenes.push( this );
        this.webgl_manager.set_size( [ 1080,300 ] )
        window.requestAnimFrame( this.webgl_manager.render.bind( this.webgl_manager ) );
                                                      // 3. Printouts of the constructor and the display function
                                                      //    of the scene shown by the canvas:
        const constructor_box = document_builder.div.appendChild( document.createElement( "div" ) );
        constructor_box.className = "code-widget";

        const code = new tiny.Code_Widget( constructor_box, 
                           this[ "construct_section_" + this.section_index ],
                           [], this, { hide_navigator: true } );

        const display_box = document_builder.div.appendChild( document.createElement( "div" ) );
        display_box.className = "code-widget";

        const code_2 = new tiny.Code_Widget( display_box, 
                           this[ "display_section_" + this.section_index ],
                           [], this, { hide_navigator: true } );

        if( this.section_index < 6 ) 
          return;
          
        const final_text = document_builder.div.appendChild( document.createElement( "div" ) );
        final_text.className = "documentation";
        final_text.innerHTML = `<p>That's all the examples.  Below are interactive controls, and then the code that generates this whole multi-part tutorial is printed:</p>`;
    }
  display( context, shared_uniforms )
    { 
                        // Part I:  All sections do this every frame:
      this.r = Mat4.rotation( -.5*Math.sin( shared_uniforms.animation_time/5000 ),   1,1,1 );

      shared_uniforms.projection_transform = Mat4.perspective( Math.PI/4, context.width/context.height, 1, 100 );

                        // Part II:  Switch on section_index to decide what to actually draw.
      const handler_at_index = this[ "display_section_" + this.section_index ];
      handler_at_index.call( this, context, shared_uniforms );
    }



  construct_section_0()
    { const initial_corner_point = vec3( -1,-1,0 );
                          // These two callbacks will step along s and t of the first sheet:
      const row_operation = (s,p) => p ? Mat4.translation( 0,.2,0 ).times(p.to4(1)).to3() 
                                       : initial_corner_point;
      const column_operation = (t,p) =>  Mat4.translation( .2,0,0 ).times(p.to4(1)).to3();
                          // These two callbacks will step along s and t of the second sheet:
      const row_operation_2    = (s,p)   => vec3(    -1,2*s-1,Math.random()/2 );
      const column_operation_2 = (t,p,s) => vec3( 2*t-1,2*s-1,Math.random()/2 );

      this.shapes = { sheet : new defs.Grid_Patch( 10, 10, row_operation, column_operation ),
                      sheet2: new defs.Grid_Patch( 10, 10, row_operation_2, column_operation_2 ) };      
    }
  construct_section_1()
    { const initial_corner_point = vec3( -1,-1,0 );
      const row_operation = (s,p) => p ? Mat4.translation( 0,.2,0 ).times(p.to4(1)).to3() 
                                       : initial_corner_point;
      const column_operation = (t,p) =>  Mat4.translation( .2,0,0 ).times(p.to4(1)).to3();
      this.shapes = { sheet : new defs.Grid_Patch( 10, 10, row_operation, column_operation ) };
    }
  construct_section_2()
    { this.shapes = { donut : new defs.Torus             ( 15, 15, [[0,2],[0,1]] ),
                    hexagon : new defs.Regular_2D_Polygon( 1, 5 ),
                       cone : new defs.Cone_Tip          ( 4, 10,  [[0,2],[0,1]] ),
                       tube : new defs.Cylindrical_Tube  ( 1, 10,  [[0,2],[0,1]] ),
                       ball : new defs.Grid_Sphere       ( 6, 6,   [[0,2],[0,1]] ),
                     donut2 : new ( defs.Torus.prototype.make_flat_shaded_version() )( 20, 20, [[0,2],[0,1]] ),
                    };
    }
  construct_section_3()
    { const points = Vector3.cast( [0,0,.8], [.5,0,1], [.5,0,.8], [.4,0,.7], [.4,0,.5], [.5,0,.4], [.5,0,-1], [.4,0,-1.5], [.25,0,-1.8], [0,0,-1.7] );

      this.shapes = { bullet: new defs.Surface_Of_Revolution( 9, 9, points ) };

      const phong    = new defs.Phong_Shader( 1 );
      this.solid     = new Material( phong, { diffusivity: .5, smoothness: 800, color: color( .7,.8,.6,1 ) } );
    }
  construct_section_4()
    { this.shapes = { axis : new defs.Axis_Arrows(),
                      ball : new defs.Subdivision_Sphere( 3 ),
                       box : new defs.Cube(),
                    cone_0 : new defs.Closed_Cone     ( 4, 10, [[ .67, 1  ], [ 0,1 ]] ),
                    tube_0 : new defs.Cylindrical_Tube( 7, 7,  [[ .67, 1  ], [ 0,1 ]] ),
                    cone_1 : new defs.Closed_Cone     ( 4, 10, [[ .34,.66 ], [ 0,1 ]] ),
                    tube_1 : new defs.Cylindrical_Tube( 7, 7,  [[ .34,.66 ], [ 0,1 ]] ),
                    cone_2 : new defs.Closed_Cone     ( 4, 10, [[  0 ,.33 ], [ 0,1 ]] ),
                    tube_2 : new defs.Cylindrical_Tube( 7, 7,  [[  0 ,.33 ], [ 0,1 ]] ),
                     };
    }
  construct_section_5()
    { this.shapes = { box : new defs.Cube(),
                     cone : new defs.Closed_Cone            ( 4, 10,  [[0,2],[0,1]] ),
                   capped : new defs.Capped_Cylinder        ( 1, 10,  [[0,2],[0,1]] ),
                    cone2 : new defs.Rounded_Closed_Cone    ( 5, 10,  [[0,2],[0,1]] ),
                  capped2 : new defs.Rounded_Capped_Cylinder( 5, 10,  [[0,2],[0,1]] )
                    };
    }
  construct_section_6()
    { // Some helper arrays of points located along curves.  We'll extrude these into surfaces:
      let square_array = Vector3.cast( [ 1,0,-1 ], [ 0,1,-1 ], [ -1,0,-1 ], [ 0,-1,-1 ], [ 1,0,-1 ] ),
            star_array = Array(19).fill( vec3( 1,0,-1 ) );

      // Fill in the correct points for a 1D star curve:

      star_array   =   star_array.map( (x,i,a) => 
                    Mat4.rotation( i/(a.length-1) * 2*Math.PI,   0,0,1 )
            .times( Mat4.translation( (i%2)/2,0,0 ) )
            .times( x.to4(1) ).to3() );

      // The square is transformed away from the origin:

      square_array = square_array.map( (x,i,a) =>
                           a[i] = Mat4.rotation( .5*Math.PI,   1,1,1 )
                          .times( Mat4.translation( 0,0,2 ) )
                          .times( x.to4(1) ).to3() );

      // Now that we have two 1D curves, let's make a surface between them:

      let sampler1 = i => defs.Grid_Patch.sample_array( square_array, i );
      let sampler2 = i => defs.Grid_Patch.sample_array( star_array,   i );

      let sample_two_arrays = (j,p,i) => sampler2(i).mix( sampler1(i), j );


      this.shapes = { shell : new defs.Grid_Patch( 30, 30, sampler2, sample_two_arrays, [[0,1],[0,1]] )
                    };
    }
  display_section_0( context, shared_uniforms )
    {
                        // Draw the sheets, flipped 180 degrees so their normals point at us.
      const r = Mat4.rotation( Math.PI,   0,1,0 ).times( this.r );
      this.shapes.sheet .draw( context, shared_uniforms, Mat4.translation( -1.5,0,0 ).times(r), this.material );
      this.shapes.sheet2.draw( context, shared_uniforms, Mat4.translation(  1.5,0,0 ).times(r), this.material );
    }
  display_section_1( context, shared_uniforms )
    { 
      const random = ( x ) => Math.sin( 1000*x + shared_uniforms.animation_time/1000 );
      
                                                      // Update the JavaScript-side shape with new vertices:
      this.shapes.sheet.arrays.position.forEach( (p,i,a) => 
                      a[i] = vec3( p[0], p[1], .15*random( i/a.length ) ) );
                                                     // Update the normals to reflect the surface's new arrangement.
                                                     // This won't be perfect flat shading because vertices are shared.
      this.shapes.sheet.flat_shade();
                                                     // Draw the current sheet shape.
      this.shapes.sheet.draw( context, shared_uniforms, this.r, this.material );

                                                // Update the gpu-side shape with new vertices.
                                                // Warning:  You can't call this until you've already drawn the shape once.      
      this.shapes.sheet.copy_onto_graphics_card( context.context, ["position","normal"], false );      
    }
  display_section_2( context, shared_uniforms )
    { const model_transform = Mat4.translation( -5,0,-2 );
                                          // Draw all the shapes stored in this.shapes side by side.
      for( let s of Object.values( this.shapes ) )
        { s.draw( context, shared_uniforms, model_transform.times( this.r ), this.material );
          model_transform.post_multiply( Mat4.translation( 2,0,0 ) );
        }
    }
  display_section_3( context, shared_uniforms )
    { const model_transform = Mat4.rotation( shared_uniforms.animation_time/5000,   0,1,0 );
      this.shapes.bullet.draw( context, shared_uniforms, model_transform.times( this.r ), this.solid );
    }
  display_section_4( context, shared_uniforms )
    {                                       // First, draw the compound axis shape all at once:
      this.shapes.axis.draw( context, shared_uniforms, Mat4.translation( 2,-1,-2 ), this.material );
      
          // Manually recreate the above compound Shape out of individual components:
      const base = Mat4.translation( -1,-1,-2 );
      const ball_matrix = base.times( Mat4.rotation( Math.PI/2,   0,1,0 ).times( Mat4.scale( .25, .25, .25 ) ) );
      this.shapes.ball.draw( context, shared_uniforms, ball_matrix, this.material );
      const matrices = [ Mat4.identity(), 
                         Mat4.rotation(-Math.PI/2,  1,0,0 ).times( Mat4.scale(  1,-1,1 )),
                         Mat4.rotation( Math.PI/2,  0,1,0 ).times( Mat4.scale( -1, 1,1 )) ];
      for( let i = 0; i < 3; i++ )
      { const m = base.times( matrices[i] );
        const cone_matrix = m.times( Mat4.translation(   0,   0,  2 ) ).times( Mat4.scale( .25, .25, .25 ) ),
              box1_matrix = m.times( Mat4.translation( .95, .95, .45) ).times( Mat4.scale( .05, .05, .45 ) ),
              box2_matrix = m.times( Mat4.translation( .95,   0, .5 ) ).times( Mat4.scale( .05, .05, .4  ) ),
              box3_matrix = m.times( Mat4.translation(   0, .95, .5 ) ).times( Mat4.scale( .05, .05, .4  ) ),
              tube_matrix = m.times( Mat4.translation(   0,   0,  1 ) ).times( Mat4.scale(  .1,  .1,  2  ) );
        this.shapes[ "cone_"+i ].draw( context, shared_uniforms, cone_matrix, this.material );       
        this.shapes.box         .draw( context, shared_uniforms, box1_matrix, this.material );    
        this.shapes.box         .draw( context, shared_uniforms, box2_matrix, this.material );    
        this.shapes.box         .draw( context, shared_uniforms, box3_matrix, this.material );
        this.shapes[ "tube_"+i ].draw( context, shared_uniforms, tube_matrix, this.material );
      }
    }
  display_section_5( context, shared_uniforms )
    { const model_transform = Mat4.translation( -5,0,-2 );
      const r = Mat4.rotation( shared_uniforms.animation_time/3000,   1,1,1 );
                                          // Draw all the shapes stored in this.shapes side by side.
      for( let s of Object.values( this.shapes ) )
        { s.draw( context, shared_uniforms, model_transform.times( r ), this.material );
          model_transform.post_multiply( Mat4.translation( 2.5,0,0 ) );
        }
    }
  display_section_6( context, shared_uniforms )
    { const model_transform = Mat4.rotation( shared_uniforms.animation_time/5000,   0,1,0 );
      this.shapes.shell.draw( context, shared_uniforms, model_transform.times( this.r ), this.material );
    } 
  explain_section_0( document_element )
    { document_element.innerHTML =
          `<p>Parametric Surfaces can be generated by parametric functions that are driven by changes to two variables - s and t.  As either s or t increase, we can step along the shape's surface in some direction aligned with the shape, not the usual X,Y,Z axes.</p>
           <p>Grid_Patch is a generalized parametric surface.  It is always made of a sheet of squares arranged in rows and columns, corresponding to s and t.  The sheets are always guaranteed to have this row/column arrangement, but where it goes as you follow an edge to the next row or column over could vary.  When generating the shape below, we told it to do the most obvious thing whenever s or t increase; just increase X and Y.  A flat rectangle results.</p>
           <p>The shape on the right is the same except instead of building it incrementally by moving from the previous point, we assigned points manually.  The z values are a random height map.  The light is moving over its static peaks and valleys.  We have full control over where the sheet's points go.</p>
           <p>To create a new Grid_Patch shape, initialize it with the desired amounts of rows and columns you'd like.  The next two arguments are callback functions that return a new point given an old point (called p) and the current (s,t) coordinates.  The first callback is for rows, and will recieve arguments (s,p) back from Grid_Patch.  The second one is for columns, and will recieve arguments (t,p,s) back from Grid_Patch. </p>
           <p>Scroll down for more animations!</p>`;      
    }
  explain_section_1( document_element )
    { document_element.innerHTML =
         `<p>Shapes in tiny-graphics.js can also be modified and animated if need be.  The shape drawn below has vertex positions and normals that are recalculated for every frame.</p>
          <p>Call copy_onto_graphics_card() on the Shape to make this happen.  Pass in the context, then an array of the buffer names you'd like to overwrite, then false to indicate that indices should be left alone.  Overwriting buffers in place saves us from slow reallocations.  Warning:  Do not try calling copy_onto_graphics_card() to update a shape until after the shape's first draw() call has completed.</p>`;            
    }
  explain_section_2( document_element )
    { document_element.innerHTML =
         `<p>Parametric surfaces can be wrapped around themselves in circles, if increasing one of s or t causes a rotation around an axis.  These are called <a href="http://mathworld.wolfram.com/SurfaceofRevolution.html" target="blank">surfaces of revolution.</a></p>
          <p>To draw these using Grid_Patch, we provide another class called Surface_Of_Revolution that extends Grid_Patch and takes a set of points as input.  Surface_Of_Revolution automatically sweeps the given points around the Z axis to make each column.  Your list of points, which become the rows, could be arranged to make any 1D curve.  The direction of your points matters; be careful not to end up with your normal vectors all pointing inside out after the sweep.</p>`;      
    }
  explain_section_3( document_element )
    { document_element.innerHTML =
         `<p>Here's a surface of revolution drawn using a manually specified point list.  The points spell out a 1D curve of the outline of a bullet's right side.  The Surface_Of_Revolution sweeps this around the Z axis.</p>`;
    }
  explain_section_4( document_element )
    { document_element.innerHTML =
         `<p>Several Shapes can be compounded together into one, forming a single high-performance array.  Both of the axis arrows shapes below look identical and contain the same shapes, but the one on the right is must faster to draw because the shapes all exist together in one Vertex_Array object.</p>`;
    }
  explain_section_5( document_element )
    { document_element.innerHTML =
         `<p>Here are some examples of other convenient shapes that are made by compounding other shapes together.  The rightmost two are not compound shapes but rather we tried to make them with just one Surface_Of_Revolution, preventing us from getting good crisp seams at the edges.</p>`;
    }
  explain_section_6( document_element )
    { document_element.innerHTML =
       `<p>Blending two 1D curves as a "ruled surface" using the "mix" function of vectors.  We are using hand-made lists of points for our curves, but you could have generated the points from spline functions.</p>`;
    }
}
*/