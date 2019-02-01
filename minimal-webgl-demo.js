window.Minimal_Shape = window.classes.Minimal_Shape =
class Minimal_Shape extends Vertex_Buffer    // The simplest possible Shape – one triangle.  It has 3 vertices, each
{ constructor()                              // containing two values: a 3D position and a color.
    { super();
      this.arrays.position = [ Vec.of(0,0,0), Vec.of(1,0,0), Vec.of(0,1,0) ];   // Describe the where the points of a triangle are in space.
      this.arrays.color    = [ Color.of(1,0,0,1), Color.of(0,1,0,1), Color.of(0,0,1,1) ];   // Besides a position, vertices also have a color.
      this.indexed = false;                // With this turned off, every three vertices will be interpreted as one triangle.
    }
}


window.Minimal_Webgl_Demo = window.classes.Minimal_Webgl_Demo =
class Minimal_Webgl_Demo extends Scene_Component
{ constructor( context, control_panel )
    { super( context, control_panel );
      this.submit_shapes( context, { triangle : new Minimal_Shape() } );         // Send a Triangle's vertices to the GPU's buffers.
      this.shader = context.get_instance( Basic_Shader ).material();
    }
  display( graphics_state )                                                      // Do this every frame.
    { this.shapes.triangle.draw( graphics_state, Mat4.identity(), this.shader ); // Draw the triangle.    
    }
 make_control_panel()                 // Draw buttons, setup their actions and keyboard shortcuts, and monitor live variables.
    { this.control_panel.innerHTML += "(This one has no controls)";
    }
}