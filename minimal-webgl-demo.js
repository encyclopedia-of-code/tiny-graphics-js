window.Minimal_Shape = window.classes.Minimal_Shape =
class Minimal_Shape extends Vertex_Buffer    // The simplest possible Shape – one triangle.  It has 3 vertices, each
{ constructor()                              // containing two values: a 3D position and a color.
    { super( "position", "color" );
      this.arrays.position = [ Vec.of(0,0,0), Vec.of(1,0,0), Vec.of(0,1,0) ];   // Describe the where the points of a triangle are in space.
      this.arrays.color    = [ Color.of(1,0,0,1), Color.of(0,1,0,1), Color.of(0,0,1,1) ];   // Besides a position, vertices also have a color.      
    }
}


window.Minimal_Webgl_Demo = window.classes.Minimal_Webgl_Demo =
class Minimal_Webgl_Demo extends Scene_Component
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