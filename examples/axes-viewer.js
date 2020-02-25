import {tiny, defs} from './common.js';
                                                  // Pull these names into this module's scope for convenience:
const { vec3, vec4, color, Mat4, Light, Shape, Material, Shader, Texture, Component } = tiny;

export
const Axes_Viewer = defs.Axes_Viewer =
class Axes_Viewer extends Component
{                                      // **Axes_Viewer** is a helper scene (a secondary Scene Component) for helping you 
                                       // visualize the coordinate bases that are used in your real scene.  Your scene 
                                       // can feed this object a list of bases to draw as axis arrows.  Pressing the 
                                       // buttons of this helper scene cycles through a list of each basis you have added,
                                       // drawing the selected one.  Call insert() and pass it a basis to add one to the
                                       // list.
                                       // Always reset the data structure by calling reset() before each frame in your scene.

                                          // Bases at the same level in your scene's hierarchy can be grouped together and
                                          // displayed all at once; just store them at the same index in "this.groups" by
                                          // passing the same ID number into insert().  Normally passing an ID is optional;
                                          // omitting it inserts your basis in the next empty group.  To re-use IDs easily,
                                          // obtain the next unused ID by calling next_group_id(), so you can re-use it for
                                          // all bases that you want to appear at the same level.
  constructor()
    { super();
                                              
      this.selected_basis_id = 0;             
      this.reset();
      this.shapes = { axes: new defs.Axis_Arrows() };
      const bump = new defs.Fake_Bump_Map();
      this.material = new Material( bump, { color: color( 0,0,0,1 ), ambient: 1, 
                          texture: new Texture( "assets/rgb.jpg" ) });       
    }
  insert( basis, group_id = ++this.cursor )
    {                                         // insert(): Default to putting the basis in the next empty group; otherwise 
                                              // use group number. Update the cursor if a group number was supplied.
      this.cursor = group_id;
      if( ! this.groups[ group_id ] )
        this.groups[ group_id ] = [ basis ];
      else
        this.groups[ group_id ].push( basis );
    }
  next_group_id() { return this.groups.length }
  reset()
    {                           // reset(): Call this every frame -- The beginning of every call to your scene's display().
      this.groups = [ [] ];
      this.cursor = -1;
    }
  make_control_panel()
    {                           // make_control_panel(): Create the buttons for using the viewer.
      this.key_triggered_button( "Previous group", [ "g" ], this.decrease );
      this.key_triggered_button(     "Next group", [ "h" ], this.increase ); this.new_line();
      this.live_string( box => { box.textContent = "Selected basis id: " + this.selected_basis_id } );
    }
  increase() { this.selected_basis_id = Math.min( this.selected_basis_id + 1, this.groups.length-1 ); }
  decrease() { this.selected_basis_id = Math.max( this.selected_basis_id - 1, 0 ); }   // Don't allow selection of negative IDs.
  render_animation( context, shared_uniforms )
    {                                                 // display(): Draw the selected group of axes arrows.
      if( this.groups[ this.selected_basis_id ] )
        for( let a of this.groups[ this.selected_basis_id ] )
          this.shapes.axes.draw( context, shared_uniforms, a, this.material );
    }
}


export class Axes_Viewer_Test_Scene extends Component
{                             // **Axes_Viewer_Test_Scene** is an example of how your scene should properly manaage 
                              // an Axes_Viewer child scene, so that it is able to help you draw all the coordinate
                              // bases in your scene's hierarchy at the correct levels.
  constructor()
    { super();
      this.animated_children.push( this.axes_viewer = new Axes_Viewer() );
                                                                  // Scene defaults:
      this.shapes = { box: new defs.Cube() };
      const phong = new defs.Phong_Shader();
      this.material = new Material( phong, { color: color( .8,.4,.8,1 ) } );
    }
  make_control_panel()
    { this.control_panel.innerHTML += "(Substitute your own scene here)" }
  render_animation( context, shared_uniforms )
    {                                   // display():  *********** See instructions below ***********
      shared_uniforms.lights = [ new Light( vec4( 0,0,1,0 ), color( 0,1,1,1 ), 100000 ) ];

      if( !context.scratchpad.controls ) 
        { this.animated_children.push( context.scratchpad.controls = new defs.Movement_Controls() ); 
        
          shared_uniforms.set_camera( Mat4.translation( -1,-1,-20 ) );    // Locate the camera here (inverted matrix).
        }
      shared_uniforms.projection_transform = Mat4.perspective( Math.PI/4, context.width/context.height, 1, 500 );
      const t = shared_uniforms.animation_time / 1000, dt = shared_uniforms.animation_delta_time / 1000;

      this.shapes.box.draw( context, shared_uniforms, Mat4.scale( 10,.1,.1 ), this.material );    // Mark the global coordinate axes.
      this.shapes.box.draw( context, shared_uniforms, Mat4.scale( .1,10,.1 ), this.material );
      this.shapes.box.draw( context, shared_uniforms, Mat4.scale( .1,.1,10 ), this.material );


                                    // *********** How to use the Axes_Viewer ***********
                                    // First, reset the object:
      this.axes_viewer.reset();

                                    // Next, make your scene as usual, by incrementally modifying a transformation matrix.
                                    // In between every matrix operation you want to draw, call insert() on the object as shown.
                                    // Remember to use copy() to reference matrices by value so they don't all alias to the same one.
      let model_transform = Mat4.identity();
      this.axes_viewer.insert( model_transform.copy() );
      model_transform.post_multiply( Mat4.rotation( t,   0,1,0 ) );
      this.axes_viewer.insert( model_transform.copy() );
      model_transform.post_multiply( Mat4.translation( 5,0,0 )         );
      this.axes_viewer.insert( model_transform.copy() );
                                    // If your scene's hierarchy is about to branch (ie. arms of a human, legs of a table),
                                    // we might want to store multiple bases at the same level to draw them simultaneously.
                                    // Obtain the next group's ID number:
      const id = this.axes_viewer.next_group_id();
                                                        // We'll draw our scene's boxes as an outline so it doesn't block the axes.
      this.shapes.box.draw( context, shared_uniforms, model_transform.times( Mat4.scale( 2,2,2 ) ), this.material, "LINE_STRIP" );

      let center = model_transform.copy();
      for( let side of [ -1, 1 ] )
      { 
        model_transform = center.copy();      // Our scene returns back to this matrix twice to position the boxes.
        model_transform.post_multiply( Mat4.translation( side*2,2,0 ) );
                                              // Here there will be two different bases depending on our for loop. 
                                              // By passing in the old ID here, we accomplish saving both bases at the 
                                              // same hierarchy level so they'll be drawn together.
        this.axes_viewer.insert( model_transform.copy(), id );
        model_transform.post_multiply( Mat4.rotation( Math.sin(t),   0,0,side ) );
                                              // Count up the ID from there:
        this.axes_viewer.insert( model_transform.copy() );
        model_transform.post_multiply( Mat4.translation( side*2,2,0 ) );
        this.axes_viewer.insert( model_transform.copy() );
                                                       // Again, draw our scene's boxes as an outline so it doesn't block the axes.
        this.shapes.box.draw( context, shared_uniforms, model_transform.times( Mat4.scale( 2,2,2 ) ), this.material, "LINE_STRIP" );
      }
    }
}



export class Matrix_Game_1 extends Component
{ constructor()
    { super();
      this.shapes = { arrows : new Axis_Arrows() };
      const defaults = { post_multiply: 1, current_product: [], lag_matrix: Mat4.scale( 20,20,20 ), 
                         hovered_matrix: null, trim_factor: 20, font_size_factor: 20,
                         history: [ { product: [], string:"Identity Matrix" } ], old_goals: [ Mat4.identity() ]  }; 
      Object.assign( this, defaults);

      const shader = new defs.Fake_Bump_Map();

      this.rgb = new Material( shader, { color: color( 1,1,1,1 ),
                                 ambient: .05, diffusivity: .5, specularity: .5, smoothness: 10, 
                                 texture: new Texture( "assets/rgb.jpg" ) });
       
      
      this.goals = [ Matrix.of( [ 1, 0, 0, 6], [ 0, 1, 0, 0], [ 0, 0, 1, 0], [ 0, 0, 0, 1] ),
                     Matrix.of( [ 0,-1, 0, 6], [ 1, 0, 0, 0], [ 0, 0, 1, 0], [ 0, 0, 0, 1] ),
                     Matrix.of( [ 0,-1, 0, 6], [ 1, 0, 0, 3], [ 0, 0, 1, 0], [ 0, 0, 0, 1] ),
                     Matrix.of( [ 1, 0, 0, 6], [ 0, 1, 0, 3], [ 0, 0, 1, 0], [ 0, 0, 0, 1] ),
                     Matrix.of( [ 0,-1, 0,-3], [ 1, 0, 0, 6], [ 0, 0, 1, 0], [ 0, 0, 0, 1] ),
                     Matrix.of( [ 0, 2, 0, 6], [ 1, 0, 0, 6], [ 0, 0, 1, 0], [ 0, 0, 0, 1] ),
                     Matrix.of( [ 0, 2, 0, 6], [ 1, 0, 0,10], [ 0, 0, 1, 0], [ 0, 0, 0, 1] ),
                     Matrix.of( [ 2, 0, 0, 6], [ 0,-1, 0,10], [ 0, 0, 1, 0], [ 0, 0, 0, 1] ),
                     Matrix.of( [-1, 0, 0,-3], [ 0,-1, 0,10], [ 0, 0, 1, 0], [ 0, 0, 0, 1] ),
                     Matrix.of( [-1, 0, 0,-3], [-1,-1, 0,10], [ 0, 0, 1, 0], [ 0, 0, 0, 1] ),
                     Matrix.of( [-1, 0, 0,-7], [-1,-1, 0, 6], [ 0, 0, 1, 0], [ 0, 0, 0, 1] ),
                     Matrix.of( [ 0,-1, 0,-7], [ 1,-1, 0, 6], [ 0, 0, 1, 0], [ 0, 0, 0, 1] ),
                     Matrix.of( [-1,-1, 0,-7], [ 1, 0, 0,10], [ 0, 0, 1, 0], [ 0, 0, 0, 1] )  ];                     
    }
  make_control_panel()                                                              // Draw the buttons, setup their actions and keyboard shortcuts, and monitor live variables.
    { this.key_triggered_button( "Insert Translation(x)", ['1'], function() { this.current_product[ this.post_multiply ? "push" : "unshift" ]( { type: "Translation", amount: 1, color: "blue"  } ); }, "blue"  );
      this.key_triggered_button( "Insert Rotation(z)",    ['2'], function() { this.current_product[ this.post_multiply ? "push" : "unshift" ]( { type: "Rotation",    amount: 1, color: "green" } ); }, "green" );
      this.key_triggered_button( "Insert Scale(x)",       ['3'], function() { this.current_product[ this.post_multiply ? "push" : "unshift" ]( { type: "Scale",       amount:-1, color: "red"   } ); }, "red"   );
      this.key_triggered_button( "Insert Shear(x)",       ['4'], function() { this.current_product[ this.post_multiply ? "push" : "unshift" ]( { type: "Shear",       amount: 1, color: "olive" } ); }, "olive" ); this.new_line();
      
      this.control_panel.appendChild( this.current_product_div = document.createElement( "div" ) );  this.new_line();
      this.control_panel.appendChild( Object.assign( document.createElement( "div" ), { textContent: "Click each times symbol to swap pairs of matrices. Click on terms to erase them.", style:"margin:0px 0px 20px 0px" } ) );            
      this.current_product_div.style = "display:inline-block";
      
      let controls_table, row, left_side, right_side;
      this.control_panel.appendChild( controls_table = Object.assign( document.createElement( "table" ), { style:"border:0;text-align:center"} ) );
      controls_table.appendChild( row = document.createElement( "tr" ) );
      row.appendChild( left_side = Object.assign( document.createElement( "td" ), { style:"border:0" } ) );
      row.appendChild( right_side = Object.assign( document.createElement( "td" ), { style:"border:0" } ) );
      
      left_side.appendChild( Object.assign( document.createElement( "span" ), { textContent: "Final product: " } ) );
      left_side.appendChild( this.matrix_table = Object.assign( document.createElement( "table" ), { style:"border:0;display:inline-block"} ) );
      left_side.appendChild( Object.assign( document.createElement( "span" ), { textContent: " * 895 points", style:"display:inline-block;margin:30px 5px" } ) );
      this.key_triggered_button( "Switch pre / post multiply mode", ['0'], function() { this.post_multiply ^= 1; }, "black", undefined, undefined, right_side );  this.new_line( right_side ); this.new_line( right_side );
      
      right_side.appendChild( Object.assign( document.createElement( "span" ), { textContent: "New matrices will be inserted from the " } ) ); this.new_line( right_side );
      this.live_string( box => { box.textContent = (this.post_multiply ? "right (thinking in bases/frames of reference)." : "left (thinking in points/images).") }, right_side );
      
      this.control_panel.appendChild( Object.assign( document.createElement( "div" ), { style: "margin: 10px", innerHTML:"Goal:  Match the yellow basis<br>" } ) );
      
      
      this.control_panel.appendChild( this.history_div = document.createElement( "div" ) );  
      this.show_history();

      Object.assign( this.checkbox = document.createElement( "input" ), { type: "checkbox", onchange: () => this.lock_camera = this.checkbox.checked } );
      const label = Object.assign( document.createElement( "label" ), { 'textContent': "Lock camera to current matrix" } );
      label.insertAdjacentElement( 'afterbegin', this.checkbox );
      this.control_panel.appendChild( label );                          // Checkbox "Lock camera to current matrix"   
      
      this.control_panel.appendChild( this.inverse_div = document.createElement( "div" ) );
    }
  combine( previous = null ) { this.current_product = this.current_product.reduce( (acc,x,i,a)=>{ if( x.type == previous ) return acc[acc.length-1].amount += x.amount, acc; else return previous = x.type, acc.push( x ), acc }, [] ) }
  to_matrix( transform, type = transform.type, amount = transform.amount )
    { switch( type )
      { case "Translation": return Mat4.translation([ amount,0,0 ]);
        case "Rotation"   : return Mat4.rotation( amount * Math.PI/8, Vec.of( 0,0,1 ) );
        case "Scale"      : return Mat4.scale([ amount,1,1 ]);
        case "Shear"      : return Mat4.identity().map( (r,i) => { if( i == 1 ) r[0] = amount; return r } );
      }
    }
  fill_table( table, matrix )
    { table.innerHTML = "";
      matrix.forEach( r => 
        { const row = document.createElement( "tr" );
          r.forEach( c => row.appendChild( Object.assign( document.createElement( "td" ), { textContent: c.toFixed(1) } ) ) );
          table.appendChild( row );
        } )
    }
  show_history()
    { this.history_div.innerHTML = "History: Your found goal shapes exist at<br>";
      this.history_div.appendChild(  Object.assign( this.select_input = document.createElement( "select" ), { onchange: () => 
        { this.current_product = this.history[this.select_input.value].product.map( x => Object.assign( {}, x ) ) } } ) );
      for( let [i,h] of this.history.entries() ) this.select_input.appendChild( Object.assign( document.createElement( "option" ), { value: i, text: h.string, selected: true } ) )      
    }
  compare_to_goals( model_transform )
    { if( ! this.goals[0] ) return;
      
      this.distance = model_transform.reduce( (acc,x,i) => acc + Vec.from( this.goals[0][i] ).minus( x ).norm(), 0 );
      //const r = Array(2).fill(0).map( x => Vec.of( 0,0 ).randomized(1).normalized().times(2) );   // Generate random X and Y axes
      //const r2 = () => 10*Math.random()-5;
      if( this.distance > .1 ) return;
      this.old_goals.unshift( this.goals.shift() ); 
      this.history.push( { product: this.current_product.map( x => Object.assign( {}, x ) ), string: this.current_string } );
      this.show_history();
      
      //this.goals.push( Mat.of( [ r[0][0], r[1][0], 0, r2() ], [ r[0][1], r[1][1], 0, r2() ], [ 0, 0, 1, 0 ], [ 0,0,0,1 ] ) ) }
    }
  trim_string( s ) { const trimmed = s.slice( 0, this.trim_factor ); return trimmed.length == 0 ? s[0] : trimmed }
  display( shared_uniforms )
    {            
      context.globals.shared_uniforms.lights = [ new Light( Vec.of( 1,1,0,0 ).normalized(), Color.of(  1, .5, .5, 1 ), 100000 ),
                                                new Light( Vec.of( 0,1,0,0 ).normalized(), Color.of( .5,  1, .5, 1 ), 100000 ) ];



      let model_transform = Mat4.identity();
      this.combine();    // iterate through current product and combine neighbors of the same matrix type.
      
      const color = shared_uniforms.animation_time/1000 % 1 < .5 ? "unset" : "black",
           cursor = Object.assign( document.createElement( "span" ), { textContent: "_", style: "font-size:30px; background-color:" + color } );
      
      this.current_product_div.innerHTML = "Current Matrix: ";
      if( ! this.post_multiply ) this.current_product_div.appendChild( cursor );
      if( this.current_product.length == 0 ) this.current_product_div.innerHTML += "None (Identity)";
      
      this.current_string = ""
      this.current_product.forEach( (transform, i, a) => 
        { let curr_word = Object.assign( document.createElement( "span" ), { textContent: this.trim_string( transform.type ), style:"text-decoration:underline; color:"+transform.color, onmousedown: () => this.current_product.splice(i,1) } );
          this.current_product_div.appendChild( curr_word );
            
          this.current_string += ( i>0 ?"*":"") + this.trim_string( transform.type ) + "(" + transform.amount + ")";
          this.current_product_div.appendChild( Object.assign( document.createElement( "span" ), { textContent: "("+transform.amount+")", } ) )
          if( i+1 == a.length ) return;
          this.current_product_div.appendChild( Object.assign( document.createElement( "span" ), { textContent:"*",  style:"text-decoration:underline; margin:"+this.font_size_factor/2+"px",
                                    onmousedown: () => this.current_product[i] = this.current_product.splice( i+1, 1, this.current_product[i] )[0] } ) )
        } );     
      
      this.current_product_div.style.fontSize = this.inverse_div.style.fontSize = this.font_size_factor/2+10+"px";        // Transform text is big and obvious at first, then shrinks down to fit more.
      if( this.current_product_div.clientWidth > 600 ) 
             if( this.font_size_factor > 3 ) this.font_size_factor--;
        else if( this.trim_factor      > 1 ) this.trim_factor     --;
        
      if( this.current_product_div.clientWidth < 500 ) 
             if( this.font_size_factor < 20 ) this.font_size_factor++;
        else if( this.trim_factor      < 20 ) this.trim_factor     ++;
        
      this.inverse_div.style.display = this.lock_camera ? "block" : "none";      
      let amount, inverse_string = this.current_product.length == 0 ? "(identity matrix)" : "";
      this.current_product.forEach( (transform, i, a) => 
        { if( transform.type == "Scale" ) amount = ( transform.amount == -1 ? "-1" : "-1/" + (-transform.amount) );
          else amount = -transform.amount;
          let prepend = this.trim_string( transform.type ) + "(" + amount + ")";
          if( i > 0 ) prepend += "*";
          inverse_string = prepend + inverse_string;
        } );
        this.inverse_div.innerHTML = "All shapes will be pre-multiplied by: <br>" + inverse_string + "<br>to express all their points in your custom basis.";
      
      if( this.post_multiply ) this.current_product_div.appendChild( cursor );
        
      for( let transform of this.current_product ) model_transform.post_multiply( this.to_matrix( transform ) );
      
      this.fill_table( this.matrix_table, this.hovered_matrix || model_transform )   // Display the current or hovered matrix
            
      this.lag_matrix = model_transform.map( (x,i) => Vec.from( this.lag_matrix[i] ).mix( x, .2 ) );  // Move the current basis with lag
      
      const camera_base = this.lock_camera ? Mat4.inverse( this.lag_matrix ) : Mat4.identity();
      Object.assign( shared_uniforms, { camera_transform:  camera_base.times( Mat4.translation([ 0,-4,-20 ]) ) } ); 
      
      this.shapes.arrows.draw( shared_uniforms, this.lag_matrix, this.rgb );                           // Draw the current basis.
                                                                                                      // Draw the goal bases:
      this.goals    .forEach( (x,i) => { this.shapes.arrows.draw( shared_uniforms, x, this.material.override( { color: Color.of( 1,+(i==0),0,1/i**1.3 ) } ) ); } )
      this.old_goals.forEach( (x,i) => { this.shapes.arrows.draw( shared_uniforms, x, this.material.override( { color: Color.of( 1,      0,1,1/i**1.3 ) } ) ); } )
      
      this.compare_to_goals( model_transform );
    }
  show_explanation( document_element )
    { document_element.innerHTML += `<p>In graphics programming, placing shapes where they ought to appear in the world requires matrix math.  The game below is a training tool to make matrix math intuitive.  Randomly play with the buttons and watch what happens to a matrix basis -- a set of coordinate axes.  The one you'll customize is drawn below with red, green, and blue arrows corresponding to x,y and z axes.  The buttons manipulate it by using matrix multiplication, an operation that sounds intimidating but really just moves shapes around (in this case, the shape is 895 points arranged to look like axis arrows).  You can use this game as an experimental testbed to plan out matrix operations in a graphics program, because each button you press in this demo strings another term onto your matrix product (shown at the bottom) in whatever order you hit them in.  It's notoriously difficult to master the implications of left-to-right order in matrix formulas, but teaching that is where this game excels.
        
    </p><p style="font-style:italic;color:brown">Helpful reading:  If you're not familiar with the small 4x4 matrices used in graphics (rotation, scale, translation, and shear), <a href=https://piazza.com/class_profile/get_resource/j855t03rsfv1cn/j8l72h23is21sq target='_blank'>read this document</a>.  If you're not sure why their order matters, <a href=https://piazza.com/class_profile/get_resource/j855t03rsfv1cn/j8l72il7cq81tm target='_blank'>read this one</a>, which also goes over how to combine matrices in practice, and the implications of writing code that builds matrix products starting from the left versus the right.  <a href=https://piazza.com/class_profile/get_resource/j855t03rsfv1cn/j8l72hp54tc1sx target='_blank'>This one has more</a>.  For a breakdown of the camera matrix and other special parts of the final product used by graphics cards to get shapes to draw onscreen, <a href=https://piazza.com/class_profile/get_resource/j855t03rsfv1cn/j9c4ruopm3h22z target='_blank'>read this one</a>.
        
    </p><p>Try your luck at the real challenge:  Move your basis towards each yellow goal.   Your job is a bit more challenging than mindless because the buttons don't let you build just any possible 4x4 matrix -- you are limited to only use the X axis during translations, scales, and shears that all go exactly one unit forward (or more if you press the button repeatedly).  Scales are negative to keep things interesting.  Rotations are available too, each one spinning 1/16 of the way around the positive Z axis.
    
    </p><p>You're meant to reach each goal using only one action or operation each.  After a few goals you'll find that the buttons mentioned so far no longer suffice.  To succeed at taking the shortest route you'll have to start exercising other options.  First, notice that an extra button allows you to toggle whether new matrices get appended to the right or left end of your product.  It's important to understand the difference when you pre-multiply to introduce new terms onto the right (farthest away from the left, where the 3D points that your matrix will be used on reside) rather than post-multiply.  Finally, you'll need some more extra options presented to you as links where your matrix product is displayed.  Click the "times" symbols in your product to switch two terms and click terms themselves to delete them.  Some goals require a single simple manipulation of your product to reach them.    
    
    </p><p>Check the box "Lock camera to current matrix" to explore the inverted effects of your buttons on shapes when they act upon a basis that's actually the camera frame.  This also reflects how drawing a basis is inverted compared to expressing points in a basis, which is actually the opposite idea, requiring the opposite actions in the opposite order (just like when inverting a matrix product).
    </p>
   `}
}



export class Matrix_Game extends Component
{ constructor( scene_id, material )
    { super();

      this.widget_options = { show_canvas: false, make_controls: false,
                              make_editor: false, make_code_nav: false, show_explanation: true };

      if( typeof( scene_id ) === "undefined" )
        { this.is_master = true;
          this.sections = [];
        }

      this.num_scenes = 1;
      
      this.scene_id = scene_id;
      this.material = material;
      
      if( this.is_master )
      {                                                // Shared resources between all WebGL contexts:
        const scene = new defs.Axes_Viewer_Test_Scene();
        this.sections.push( scene );
      }
      else
        this[ "construct_scene_" + scene_id ] ();
    }
  show_explanation( document_element, webgl_manager )
    { if( this.is_master )
        {
          document_element.style.padding = 0;
          document_element.style.width = "1080px";
          document_element.style.overflowY = "hidden";

          for( let i = 0; i < this.num_scenes; i++ )
            {
              let element = document_element.appendChild( document.createElement( "p" ) );
              element.style["font-size"] = "29px";
              element.style["font-family"] = "Arial";
              element.style["padding"] = "0px 25px";

              element.appendChild( document.createElement("p") ).textContent = 
                `Welcome to Demopedia.  The WebGL demo below can be edited, remixed, and saved at a new  URL.`

              element.appendChild( document.createElement("p") ).textContent =  
                `Below that you'll find the starting code for a graphics assignment. Your goal is to model an insect.`;

              element.appendChild( document.createElement("p") ).textContent =
                `Try making changes to the code below.  The code comments suggest how to do so.  Once you have 
                 modeled an insect, save your result to a URL you can share!`;

              element.appendChild( document.createElement("p") ).textContent =  
                `First, the demo:`;

              element = document_element.appendChild( document.createElement( "div" ) );
              element.className = "canvas-widget";

              const cw = new tiny.Canvas_Widget( element, undefined,
                { make_controls: i==0, show_explanation: false, make_editor: false, make_code_nav: false } );
              cw.webgl_manager.scenes.push( this.sections[ i ] );
              cw.webgl_manager.shared_uniforms = webgl_manager.shared_uniforms;
              cw.webgl_manager.set_size( [ 1080,400 ] )


              element = document_element.appendChild( document.createElement( "p" ) );
              element.style["font-size"] = "29px";
              element.style["font-family"] = "Arial";
              element.style["padding"] = "30px 25px";
              element.textContent = 
                `Next, type here to edit the code, which is drawing the above:`

              element = document_element.appendChild( document.createElement( "div" ) );
              element.style["font-size"] = "29px";
              element.style["font-family"] = "Arial";
              element.style["padding"] = "30px 25px";
              element.appendChild( document.createElement("p") ).textContent =
                `Lastly, here is a code navigator to show the whole program we are using.`
              element.appendChild( document.createElement("p") ).textContent =
                 `The tiny-graphics.js library wraps the WebGL API for us and helps display the graphical 
                 output in a document that can interact with it.`

            }

         }
       else
         this[ "explain_scene_" + this.scene_id ] ( document_element );
    }
  display( context, shared_uniforms )
    { 
      shared_uniforms.projection_transform = Mat4.perspective( Math.PI/4, context.width/context.height, 1, 100 ); 
      this.r = Mat4.rotation( -.5*Math.sin( shared_uniforms.animation_time/5000 ),   1,1,1 );

      if( this.is_master )
        {                                           // *** Lights: *** Values of vector or point lights.  They'll be consulted by 
                                                    // the shader when coloring shapes.  See Light's class definition for inputs.
          const t = this.t = shared_uniforms.animation_time/1000;
          const angle = Math.sin( t );
          const light_position = Mat4.rotation( angle,   1,0,0 ).times( vec4( 0,0,1,0 ) );
          shared_uniforms.lights = [ new Light( light_position, color( 1,1,1,1 ), 1000000 ) ]; 
        }
      else
        this[ "display_scene_" + this.scene_id ] ( context, shared_uniforms );
    }
}