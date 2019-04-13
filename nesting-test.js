import {tiny, defs} from './common.js';
const { Vec, Mat, Mat4, Color, Light, 
        Shape, Shader, Scene, Texture } = tiny;           // Pull these names into this module's scope for convenience.
const { Triangle, Square, Tetrahedron, Windmill, Cube, Subdivision_Sphere } = defs;

import { Tutorial_Animation, Transforms_Sandbox } from './transforms-sandbox.js';
Object.assign( defs, { Tutorial_Animation, Transforms_Sandbox } );


import { Many_Lights_Demo }  from "./many-lights-demo.js"
Object.assign( defs, { Many_Lights_Demo } );

export class Nesting_Test extends Tutorial_Animation
  { constructor()
      { super();
        
        this.test_scene = new Tutorial_Animation();
      }
    show_explanation( document_element, webgl_manager )
      { document_element.style.padding = 0;
        document_element.style.width = "1080px";
        document_element.style.overflowY = "hidden";

        const cw = new tiny.Canvas_Widget( document_element, undefined, [] );
        cw.webgl_manager.scenes.push( this.test_scene );
        cw.webgl_manager.program_state = webgl_manager.program_state;

        document_element.appendChild( document.createTextNode("adfafaf") );
      }
  }