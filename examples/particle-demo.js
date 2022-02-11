import {tiny, defs}       from './common.js';
import {Body, Simulation} from "./collisions-demo.js";
// Pull these names into this module's scope for convenience:
const {vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component} = tiny;

export class Particle_Demo extends Simulation {
    init () {
        super.init ();
        this.num_particles = 1000;

        const random_vecs  = Array (this.num_particles).fill (0).map (x => vec3 (0, 0, 0).randomized (10));

        this.shapes   = {particles: new Particle_Cloud (random_vecs)};
        this.material = {shader: new Particle_Shader (), color: color (.4, .8, .4, 1), ambient: .4};
    }
    update_state (dt) {
        const s           = this.shapes.particles.arrays;
        const random_vecs = Array (this.num_particles).fill (0).map (x => vec3 (0, .01, 0).randomized (.02));
        s.offset          = s.offset.map ((x, i) => x.plus (random_vecs[ ~~(i / 4) ]));
    }
    render_explanation () {
        this.document_region.innerHTML +=
          `<p>A minimal example of a particle shader.  The cloud of particles is collectively one big Shape made of lots of squares at the origin.  The vertex shader identifies each square and moves them each to different places, while ensuring that they always face the screen.  The fragment shader colors them in with transparency. </p>`;
    }
    render_frame (caller) {
        if ( !caller.controls) {
            this.animated_children.push (caller.controls = new defs.Movement_Controls ({uniforms: this.uniforms}));
            caller.controls.add_mouse_controls (caller.canvas);
            Shader.assign_camera (Mat4.translation (0, 0, -10), this.uniforms);
        }
        this.uniforms.projection_transform = Mat4.perspective (Math.PI / 4, caller.width / caller.height, 1, 500);
        this.uniforms.lights               =
          [defs.Phong_Shader.light_source (vec4 (.7, 1.5, 2, 0), color (1, 1, 1, 1), 100000)];

        if (this.uniforms.animate)
            this.simulate (this.uniforms.animation_delta_time);

        this.shapes.particles.draw (caller, this.uniforms, Mat4.identity (), this.material);
        this.shapes.particles.copy_onto_graphics_card (caller.context, ["offset"], false);
    }
}


const Particle_Cloud = defs.Particle_Cloud =
  class Particle_Cloud extends Shape {
      constructor (positions) {
          super ("position", "normal", "texture_coord", "offset");

          for (let i = 0; i < positions.length; i++)
              defs.Square.insert_transformed_copy_into (this, [], Mat4.identity ());

          this.arrays.offset = this.arrays.position.map ((x, i) => positions[ ~~(i / 4) ]);
      }
  };

/*
const Particle_Shader = defs.Particle_Shader =
  class Particle_Shader extends defs.Textured_Phong {
      vertex_glsl_code () {         // ********* VERTEX SHADER *********
          return this.shared_glsl_code () + `
        varying vec2 f_tex_coord;
        varying vec3 f_normal;
        attribute vec3 position, normal, offset;                            // Position is expressed in object coordinates.
        attribute vec2 texture_coord;

        uniform mat4 model_transform;
        uniform mat4 projection_camera_model_transform;
        uniform vec2 particle_square_size;

        void main() {

            float particle_scale_factor = .4;
            vec4 square_point = vec4( position, 1.0);
            square_point.xy *= particle_square_size * particle_scale_factor;

            vec3 temp = offset;
            temp[1] = mod( temp[1]+3.0,6.0)-3.0;    // Keep particles from rising too high.

                                              // Move vertex to final space:
            gl_Position = projection_camera_model_transform * vec4( temp, 1.0 ) + square_point;
                                              // The final normal vector in screen space.
            N = normalize( mat3( model_transform ) * normal / squared_scale);

            vertex_worldspace = ( model_transform * vec4( position, 1.0 ) ).xyz;
                                              // Turn the per-vertex texture coordinate into an interpolated variable.
            f_tex_coord = texture_coord;
            f_normal = normal;
          } `;
      }
      fragment_glsl_code () {        // ********* FRAGMENT SHADER *********
          return this.shared_glsl_code () + `
        varying vec2 f_tex_coord;
        varying vec3 f_normal;

        void main() {
            float from_center = distance( f_tex_coord, vec2( .5,.5) )   ;
            vec4 tex_color = vec4( .01/( from_center - 0.05) - .4);
            tex_color.xyz *= f_normal * f_normal / 10.0;
            if( tex_color.w < .01 ) discard;
                                                                     // Compute an initial (ambient) color:
            gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w );
                                                                     // Compute the final color with contributions from lights:
            gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
          } `;
      }
      send_uniforms (gl, gpu, uniforms, model_transform) {
          super.send_uniforms (gl, gpu, uniforms, model_transform);

          const particle_square_size =  [uniforms.projection_transform[ 0 ][ 0 ],
                                        uniforms.projection_transform[ 1 ][ 1 ]];

          gl.uniform2fv (gpu.particle_square_size, particle_square_size);
      }
  };
*/
