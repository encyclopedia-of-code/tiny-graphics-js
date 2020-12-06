import {tiny, defs}       from './common.js';
import {Body, Simulation} from "./collisions-demo";
// Pull these names into this module's scope for convenience:
const {vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component} = tiny;

export class Particle_Demo extends Simulation {
    init () {
        this.shapes   = {cube: new defs.Cube ()};
        const shader  = new defs.Textured_Phong ();
        this.material = {shader, color: color (.4, .8, .4, 1), ambient: .4};
    }
    update_state (dt) {

    }
    render_animation (caller) {
        if ( !caller.controls) {
            this.animated_children.push (caller.controls = new defs.Movement_Controls ({uniforms: this.uniforms}));
            caller.controls.add_mouse_controls (caller.canvas);
            Shader.assign_camera (Mat4.translation (0, 0, -50), this.uniforms);    // Locate the camera here (inverted
                                                                                   // matrix).
        }
        this.uniforms.projection_transform = Mat4.perspective (Math.PI / 4, caller.width / caller.height, 1, 500);
        this.uniforms.lights               =
          [defs.Phong_Shader.light_source (vec4 (.7, 1.5, 2, 0), color (1, 1, 1, 1), 100000)];

        this.shapes.cube.draw (caller, this.uniforms, Mat4.translation (...p).times (Mat4.scale (.3, 1, .3)),
                               this.brick);

    }
}
