import * as tiny from '../tiny-graphics.js';
import * as defs from './common.js';
import { MatVec, matvec, RenderListItem, Shape, Component, Renderer } from './common.js';
import { Camera, LightArray, Materials } from './common.js';

export class Parametric_Surfaces extends Renderer {
  num_sections = 6;
  init() {
      super.init();

      const materials = { "rgb":  "assets/rgb.jpg" };

      this.state.materials = new Materials( materials );
      this.state.samplers.set("texture_array", this.state.materials.texture_array );
      this.state.shader = new defs.PBR_Shader (LightArray.NUM_LIGHTS, Materials.NUM_MATERIALS, {has_shadows: false, has_textures: true});

      this.state.materials.set("rgb", { fallback_roughness: .2 });
      this.state.materials.set("rgb", { fallback_metallicity: .2 });
      this.state.materials.set("rgb", { textured_roughness_amount: .3 });
      this.state.materials.set("rgb", { textured_metallicity_amount: .4 });
      this.state.materials.set("rgb", { textured_albedo_amount: .8 });
      this.state.materials.set("rgb", { textured_normal_amount: .2 });

   //    this.state.shader = new defs.Minimal_Phong_Shader (1, 1);
   //    this.state.materials = new defs.Simple_Materials( { "solid": undefined } );

    this.state.lightArray = new defs.LightArray({ambient: .01, lights:[
           { direction_or_position: matvec([ 0,0,0, 0 ]),
             color: matvec([ 2,2,2 ]), diffuse: 1.0, specular: 1.0, attenuation_factor: 0.0001 },
         ]});
    }
  render_layout( div, options = {} )
    {
      this.div = div;
      div.className = "documentation_treenode";
                                                        // Fit the existing document content to a fixed size:
      div.style.margin = "auto";
      div.style.width = "1080px";

      const rules = [ `.documentation-big { width:1030px; padding:0 25px; font-size: 29px; font-family: Arial` ];
      Component.initialize_CSS( Parametric_Surfaces, rules );

      // TODO:  Should a loop like below exist in the core library, to loop through all document_children and call their render_layout()?

      for( let i = 0; i < this.num_sections; i++ ) {
        const inner_div = div.appendChild( document.createElement( "div" ) );
        this[ "region_" + i ] = inner_div

        const inner_scene = new Parametric_Surfaces_Section( { state: this.state, dont_tick: true, parent: this, section_index: i } );
        this.document_children.push( inner_scene );
        inner_scene.render_layout( inner_div );
      }
      // Start re-render loop:
      this.event = window.requestAnimFrame( this.frame_advance.bind( this ) );

      const final_text = div.appendChild( document.createElement( "div" ) );
      final_text.classList.add( "documentation", "documentation-big" );
      final_text.innerHTML = `<p>That's all the examples.  Below are interactive controls available on all the above canvases, and then the code that generates this whole multi-part tutorial is printed:</p>`;

      this.embedded_controls_area = div.appendChild( document.createElement( "div" ) );
      this.embedded_controls_area.className = "controls-widget";
      this.embedded_controls = new defs.widgets.Controls_Widget( this );

      this.embedded_code_nav_area = div.appendChild( document.createElement( "div" ) );
      this.embedded_code_nav_area.className = "code-widget";
      this.embedded_code_nav = new defs.widgets.Code_Widget( this );
    }
  render_frame() {
      if( !this.controls )  {
        const camera = { camera_inverse: matvec().set_identity().translate( matvec([ 0,0,-2.5 ]) ) };
        this.state.camera = new defs.Camera( camera );
        this.controls = new defs.Movement_Controls( { state: this.state } );
        this.animated_children.push( this.controls );
      }
                             // Tick values that update only once per frame (not per section).
      const t = this.t = this.state.animation_time/1000;
      const angle = Math.sin( t );
      const light_position = matvec().set_identity().rotate( angle,  0,1,0 ).multiply( matvec([ 0,1,1,0] ) );

      this.state.lightArray.fields.lights[0].direction_or_position = light_position;
      this.state.lightArray.dirty = true;
    }
}

export class Parametric_Surfaces_Section extends Renderer {
  init() {
      super.init();
      this.parent = this.props.parent;
      this.section_index = this.props.section_index;
      this.r = matvec();

      this.passes = [];
      this.passes.push( Object.create( this.state ) );

      // Switch on section_index to decide what to init:
      this[ "init_section_" + this.section_index ]();

      // Draw the ground:
      const initial_corner_point = matvec([ 1,-1,0 ]);
      const row_operation = (s,p) => p ? matvec().set_identity().translate(  0,.2,0 ).multiply(p) : initial_corner_point;
      const column_operation = (t,p) =>  matvec().set_identity().translate( -.2,0,0 ).multiply(p);
      const square = new defs.Grid_Patch( 10, 10, row_operation, column_operation )

      const matrix = matvec().set_identity().translate( 0,-10,0 ).rotate( Math.PI/2,  -1,0,0 ).scale( 50,50,1 );
      this.submit( square, matrix, matvec([ 0,.1,0 ] ), "rgb" );
  }
  render_frame() {
      if( this.parent.controls && !this.controls )  {
                            // Each section's canvas listens (by mouse) for the master Movement_Controls.
        this.parent.controls.add_mouse_controls( this.canvas );
        this.controls = this.parent.controls;
        this.state.camera.fields.projection = matvec().perspective(Math.PI/4, this.width/this.height, 0.1, 100);
        this.state.camera.dirty = true;
      }
      if( !this.parent.controls )
        return;

      // All sections do this every frame:
      this.r.loadVector( MatVec.quick.set_identity().rotate( -.5*Math.sin( this.state.animation_time/3000 ),  1,1,1 ) );

      // Switch on section_index to decide what to draw.
      this[ "display_section_" + this.section_index ]();
  }
  render_layout( div, options = {} )
    {
      this.div = div;
      div.className = "documentation_treenode";
                                                        // Fit the existing document content to a fixed size:
      div.style.margin = "auto";
      div.style.width = "1080px";

      this.document_region = div.appendChild( document.createElement( "div" ) );
      this.document_region.classList.add( "documentation", "documentation-big" );
      this[ "explain_section_" + this.section_index ]();
                                                        // The next div down will hold a canvas and/or related interactive areas.
      this.program_stuff = div.appendChild( document.createElement( "div" ) );

      const defaults = { show_canvas: true,  make_controls: true,
                         make_editor: false, make_code_nav: true };

      const overridden_options = Object.assign( defaults, this.widget_options, options );

      const canvas = this.program_stuff.appendChild( document.createElement( "canvas" ) );
      canvas.style = `margin-bottom:-4px`;

      if( !overridden_options.show_canvas )
        canvas.style.display = "none";

      this.make_context( canvas, undefined, [ 1080,300 ] );

                                      // Start WebGL main loop - render() will re-queue itself for continuous calls.
      this.event = window.requestAnimFrame( this.frame_advance.bind( this ) );

      this.embedded_code_nav_area = this.program_stuff.appendChild( document.createElement( "div" ) );
      this.embedded_code_nav_area.className = "code-widget";
      this.embedded_code_nav = new defs.widgets.Code_Widget( this, { code_in_focus: this[ "init_section_" + this.section_index ], hide_navigator: true } );

      this.secondary_embedded_code_nav_area = this.program_stuff.appendChild( document.createElement( "div" ) );
      this.secondary_embedded_code_nav_area.className = "code-widget";
      this.secondary_embedded_code_nav = new defs.widgets.Code_Widget( this, { code_in_focus: this[ "display_section_" + this.section_index ], hide_navigator: true } );
    }
  init_section_0() {
    const initial_corner_point = matvec([ 1,-1,0 ]);
                        // These two callbacks will step along s and t of the first sheet:
    const row_operation = (s,p) => p ? matvec().set_identity().translate( 0,.2,0 ).multiply(p)
                                     : initial_corner_point;
    const column_operation = (t,p) =>  matvec().set_identity().translate( -.2,0,0 ).multiply(p);
                        // These two callbacks will step along s and t of the second sheet:
    const row_operation_2    = (s,p)   => matvec([     1,2*s-1,Math.random()/4 ]);
    const column_operation_2 = (t,p,s) => matvec([ 1-2*t,2*s-1,Math.random()/4 ]);

    const sheet1 = new defs.Grid_Patch( 10, 10, row_operation, column_operation );
    const sheet2 = new defs.Grid_Patch( 10, 10, row_operation_2, column_operation_2 );

    this.sheets = [];
    for( let s of [ sheet1, sheet2 ] )
      this.sheets.push( this.submit( s, matvec().set_identity(), matvec([ 1,1,1 ]), "rgb" ) );

    this.sheets.forEach( s => s.hint = "STREAM_DRAW" );
  }
  display_section_0() {
    const positions = [-1.5, 1.5];
    this.sheets.forEach( (s,i) => {
      s.group_transform = matvec().set_identity().translate( positions[i],0,0 ).multiply(this.r);
      s.update_per_instance_buffer();
    });
    this.renderList.traverse( (item) => this.draw( item ) );
  }
  explain_section_0() {
    this.document_region.innerHTML =
          `<p>Using common-shapes.js and the Geometry class</p>
          <p>Parametric Surfaces can be generated by parametric functions that are driven by changes to two variables - s and t.  As either s or t increase, we can step along the shape's surface in some direction aligned with the shape, not the usual X,Y,Z axes.</p>
           <p>Grid_Patch is a generalized parametric surface.  It is always made of a sheet of squares arranged in rows and columns, corresponding to s and t.  The sheets are always guaranteed to have this row/column arrangement, but where it goes as you follow an edge to the next row or column over could vary.  When generating the shape below, we told it to do the most obvious thing whenever s or t increase; just increase X and Y.  A flat rectangle results.</p>
           <p>The shape on the right is the same except instead of building it incrementally by moving from the previous point, we assigned points manually.  The z values are a random height map.  The light is moving over its static peaks and valleys.  We have full control over where the sheet's points go.</p>
           <p>To create a new Grid_Patch shape, initialize it with the desired amounts of rows and columns you'd like.  The next two arguments are callback functions that return a new point given an old point (called p) and the current (s,t) coordinates.  The first callback is for rows, and will recieve arguments (s,p) back from Grid_Patch.  The second one is for columns, and will recieve arguments (t,p,s) back from Grid_Patch. </p>
           <p>Scroll down for more animations!</p>`;
  }
  init_section_1() {
    this.shapes = { sheet: new Shape() };
    this.sheet = this.submit( this.shapes.sheet, matvec().set_identity(), matvec([ .5,.5,.5 ]), "rgb" );
    this.sheet.hint = "STREAM_DRAW";
  }
  display_section_1() {
    const random = ( x ) => Math.sin( 1000*x + this.state.animation_time/1000 );

    const initial_corner_point = matvec([ 1,-1,0 ]);
    const row_operation = (s,p) => p ? matvec().set_identity().translate(  0,.2,.15*random( s ) ).multiply(p) : initial_corner_point;
    const column_operation = (t,p) =>  matvec().set_identity().translate( -.2,0,.15*random( t ) ).multiply(p);
    const new_sheet = new defs.Grid_Patch( 10, 10, row_operation, column_operation );

    const sheet = this.shapes.sheet;
    sheet.vertices = new_sheet.vertices;
    sheet.indices = new_sheet.indices;
    // this.index_buffers.delete( sheet );   // If indices need updating every frame.  (Uncommon)

    // Update the gpu-side shape with new vertices.
    sheet.VBO_plans = [ {attributes: [...Object.keys(sheet.vertices[0])] }];
    Shape.build_VBO_plan (sheet.vertices, sheet.VBO_plans[0]);

    this.renderList.traverse( (item) => this.draw( item ) );
  }
  explain_section_1() {
    this.document_region.innerHTML =
      `<p>Shapes in tiny-graphics.js can also be modified and animated if need be.  The shape drawn below has vertex positions and normals that are recalculated for every frame.</p>
          <p>Call copy_onto_graphics_card() on the Shape to make this happen.  Pass in the context, then an array of the buffer names you'd like to overwrite, then false to indicate that indices should be left alone.  Overwriting buffers in place saves us from slow reallocations.  Warning:  Do not try calling copy_onto_graphics_card() to update a shape until after the shape's first draw() call has completed.</p>`;
  }
  init_section_2() {
    this.shapes = {
      donut : new defs.Torus             ( 10, 10, [[0,2],[0,1]] ),
      hexagon : new defs.Regular_2D_Polygon( 1, 5 ),
      cone : new defs.Cone_Tip          ( 3, 10,  [[0,2],[0,1]] ),
      tube : new defs.Cylindrical_Tube  ( 1, 15,  [[0,2],[0,1]] ),
      ball : new defs.Grid_Sphere       ( 6, 6,   [[0,2],[0,1]] ),
  //    donut2 : new ( defs.Torus.prototype.make_flat_shaded_version() )( 20, 20, [[0,2],[0,1]] ),
    };

    for( let s of Object.values( this.shapes ) )
      this.submit( s, matvec().set_identity(), matvec([ .5,.5,.5 ]), "rgb" );

    this.model_transform = matvec();
  }
  display_section_2( caller ) {
    this.model_transform.set_identity().translate( -5,0,-1 );
    // Draw all the shapes stored in this.shapes side by side.
    this.renderList.traverse( (item) => {
      item.instance_vars[0].model_transform.loadVector( this.model_transform.quickClone()
                                  .rotate( this.state.animation_time/3000,  1,1,1 ) );
      item.update_per_instance_buffer();
      this.model_transform.multiply( this.model_transform.quickClone().set_identity()
                                     .translate( 2.5,0,0 ) );
    } );
    this.renderList.traverse( (item) => this.draw( item ) );
  }
  explain_section_2() {
    this.document_region.innerHTML =
      `<p>Parametric surfaces can be wrapped around themselves in circles, if increasing one of s or t causes a rotation around an axis.  These are called <a href="http://mathworld.wolfram.com/SurfaceofRevolution.html" target="blank">surfaces of revolution.</a></p>
          <p>To draw these using Grid_Patch, we provide another class called Surface_Of_Revolution that extends Grid_Patch and takes a set of points as input.  Surface_Of_Revolution automatically sweeps the given points around the Z axis to make each column.  Your list of points, which become the rows, could be arranged to make any 1D curve.  The direction of your points matters; be careful not to end up with your normal vectors all pointing inside out after the sweep.</p>`;
  }
  init_section_3() {
    const points = [ [0,0,.8], [.5,0,1], [.5,0,.8], [.4,0,.7], [.4,0,.5], [.5,0,.4], [.5,0,-1], [.4,0,-1.5], [.25,0,-1.8], [0,0,-1.6] ];
    const vec_points = points.map( p => matvec(p) );
    this.shapes = { bullet: new defs.Surface_Of_Revolution( 9, 9, vec_points ) };

    this.passes.push( Object.create( this.state ) );
    this.passes[1].shader = new defs.Minimal_Phong_Shader (1, 1);
    this.passes[1].materials = new defs.Simple_Materials( { "solid": undefined } );

    this.passes[1].materials.set("solid", { diffusivity: .2 });
    this.passes[1].materials.set("solid", { smoothness: 500 });

    this.bullet = this.submit( this.shapes.bullet, matvec().set_identity(), matvec([ .7,.8,.6 ]), "solid", 0, this.passes[1]);
  }
  display_section_3( caller ) {
    const matrix = matvec().set_identity().translate( 0,0,-1 );
    matrix.rotate( this.state.animation_time/3000, 0,1,0 ).multiply(this.r);
    this.bullet.instance_vars[0].model_transform = matrix;
    this.bullet.update_per_instance_buffer();
    this.renderList.traverse( (item) => this.draw( item ) );
  }
  explain_section_3() {
    this.document_region.innerHTML =
      `<p>Here's a surface of revolution drawn using a manually specified point list.  The points spell out a 1D curve of the outline of a bullet's right side.  The Surface_Of_Revolution sweeps this around the Z axis.</p>`;
  }
  init_section_4() {
    // Custom per-primitive colors inside a compound shape can be achieved by keying into a texture atlas via coords:
    this.shapes = {
      axis : new defs.Axis_Arrows(),
      ball : new defs.Subdivision_Sphere( 3 ),
      box : new defs.Cube(),
      cone_0 : new defs.Closed_Cone     ( 4, 10, [[ .67, 1  ], [ 0,1 ]] ),
      tube_0 : new defs.Cylindrical_Tube( 7, 7,  [[ .67, 1  ], [ 0,1 ]] ),
      cone_1 : new defs.Closed_Cone     ( 4, 10, [[ .34,.66 ], [ 0,1 ]] ),
      tube_1 : new defs.Cylindrical_Tube( 7, 7,  [[ .34,.66 ], [ 0,1 ]] ),
      cone_2 : new defs.Closed_Cone     ( 4, 10, [[  0 ,.33 ], [ 0,1 ]] ),
      tube_2 : new defs.Cylindrical_Tube( 7, 7,  [[  0 ,.33 ], [ 0,1 ]] ),
    };

    this.submit( this.shapes.axis, matvec().set_identity().translate( 2,-1,-2), matvec([ .5,.5,.5 ]), "rgb" );

    // Manually draw an Axis_Arrows without using a compound shape to consolidate GPU draw calls.
    const base = matvec().set_identity().translate(-1,-1,-2);
    const ball = base.clone().rotate( Math.PI/2,  0,1,0 )
                             .scale( .25,.25,.25 );
    const angles = [ matvec().set_identity(),
                     matvec().set_identity()
                             .rotate( -Math.PI/2,  1,0,0 )
                             .scale(1,-1,1),
                     matvec().set_identity()
                             .rotate( Math.PI/2,  0,1,0 )
                             .scale(-1,1,1) ];

    this.submit( this.shapes.ball, ball, matvec([ .5,.5,.5 ]), "rgb" );
    for( let i = 0; i < 3; i++ ) {
      const m = base.clone().multiply( angles[i] );
      const cone_matrix = m.clone().translate( 0,0,2 ).scale( .25, .25, .25 ),
          tube_matrix = m.clone().translate( 0,0,1 ).scale( .1, .1, 2 );
      const boxes = [ m.clone().translate( .95, .95, .45 ).scale( .05, .05, .45 ),
                      m.clone().translate( .95, 0, .5 ).scale( .05, .05, .4 ),
                      m.clone().translate( 0, .95, .5 ).scale( .05, .05, .4 )
        ];
      this.submit( this.shapes[ "cone_"+i ], cone_matrix, matvec([ .5,.5,.5 ]), "rgb" );
      this.submit( this.shapes[ "tube_"+i ],  tube_matrix, matvec([ .5,.5,.5 ]), "rgb" );
      for( let j = 0; j < 3; j++ )
        this.submit( this.shapes.box, boxes[j], matvec([ .5,.5,.5 ]), "rgb" );
    }
  }
  display_section_4( caller ) {
    this.renderList.traverse( (item) => this.draw( item ) );
  }
  explain_section_4() {
    this.document_region.innerHTML =
      `<p>Several Shapes can be compounded together into one, forming a single high-performance array.  Both of the axis arrows shapes below look identical and contain the same shapes, but the one on the right is must faster to draw because the shapes all exist together in one Vertex_Array object.</p>`;
  }
  init_section_5() {
    this.shapes = {
      box : new defs.Cube(),
      cone : new defs.Closed_Cone            ( 4, 10,  [[0,2],[0,1]] ),
      capped : new defs.Capped_Cylinder        ( 1, 10,  [[0,2],[0,1]] ),
      cone2 : new defs.Rounded_Closed_Cone    ( 5, 10,  [[0,2],[0,1]] ),
      capped2 : new defs.Rounded_Capped_Cylinder( 5, 10,  [[0,2],[0,1]] )
    };
    this.model_transform = matvec();

    for( let s of Object.values( this.shapes ) )
      this.submit( s, matvec().set_identity(), matvec([ .5,.5,.5 ]), "rgb");
  }
  display_section_5( caller ) {
    this.model_transform.set_identity().translate( -5,0,-2 );
    // Draw all the shapes stored in this.shapes side by side.
    this.renderList.traverse( (item) => {
      item.instance_vars[0].model_transform.loadVector( this.model_transform.quickClone()
                                  .rotate( this.state.animation_time/3000,  1,1,1 ) );
      item.update_per_instance_buffer();
      this.model_transform.multiply( this.model_transform.quickClone().set_identity()
                                     .translate( 3,0,0 ) );
    } );
    this.renderList.traverse( (item) => this.draw( item ) );
  }
  explain_section_5() {
    this.document_region.innerHTML =
      `<p>Here are some examples of other convenient shapes that are made by compounding other shapes together.  The rightmost two are not compound shapes but rather we tried to make them with just one Surface_Of_Revolution, preventing us from getting good crisp seams at the edges.</p>`;
  }
  init_section_6() {
    // Some helper arrays of points located along curves.  We'll extrude these into surfaces:
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


    this.shapes = { shell : new defs.Grid_Patch( 30, 30, sampler2, sample_two_arrays, [[0,1],[0,1]] ) };
  }
  display_section_6( caller ) {
    const model_transform = Mat4.rotation( this.uniforms.animation_time/5000,   0,1,0 );
    this.shapes.shell.draw( caller, this.uniforms, model_transform.times( this.r ), this.parent.material );
  }
  explain_section_6() {
    this.document_region.innerHTML =
      `<p>Blending two 1D curves as a "ruled surface" using the "mix" function of vectors.  We are using hand-made lists of points for our curves, but you could have generated the points from spline functions.</p>`;
  }
}
