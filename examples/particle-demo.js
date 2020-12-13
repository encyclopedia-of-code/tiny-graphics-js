import {tiny, defs}       from './common.js';
import {Body, Simulation} from "./collisions-demo.js";
// Pull these names into this module's scope for convenience:
const {vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component} = tiny;

const Vortex = defs.Vortex =
  class Vortex {
      constructor (center, size) {
          Object.assign (this, {center, size});
      }
      reset (initial_rotation, initial_angular_velocity) {
          this.rotation             = initial_rotation;
          this.angular_velocity     = initial_angular_velocity;
          this.matrix_between_steps =
            Mat4.translation (...this.center).times (initial_rotation).times (Mat4.scale (...this.size));
          this.previous             = {rotation: this.rotation.copy ()};
          return this;
      }
      advance (time_amount) {
          this.previous = {rotation: this.rotation.copy ()};
          this.rotation.pre_multiply (
            Mat4.rotation (time_amount * this.angular_velocity.norm (), ...this.angular_velocity.normalized ()));
      }
      blend_rotation (alpha) {
          return this.rotation.map ((x, i) => vec4 (...this.previous.rotation[ i ]).mix (x, alpha));   // bad idea
      }
      blend_state (alpha) {
          this.matrix_between_steps =
            Mat4.translation (...this.center).this.blend_rotation (alpha).times (Mat4.scale (...this.size));
      }
      static intersect_sphere (p, margin = 0) {
          return p.dot (p) < 1 + margin;
      }
  };

const Particle = defs.Particle =
  class Particle {
      reset (initial_position, linear_velocity) {
          this.position        = this.position_between_steps = initial_position;
          this.linear_velocity = linear_velocity;
          this.previous        = {position: this.position.copy ()};
          return this;
      }
      advance (time_amount) {
          this.previous = {position: this.position.copy ()};
          this.position.add_by (...this.linear_velocity.times (time_amount));
      }
      blend_state (alpha) {
          this.position_between_steps = this.previous.position.mix (this.position, alpha);
      }
  };


export class Particle_Demo extends Simulation {
    init () {
        this.num_particles = 1000;

        this.particles = Array( this.num_particles ).fill(0).map( () => new Particle() );
        this.vortices = new Vortex( vec3( 0,0,0 ), vec3( 10,10,10 ) );


        this.shapes   = {particles: new Particle_Cloud (this.num_particles)};
        const shader  = new Particle_Shader ();
        this.material = {shader, color: color (.4, .8, .4, 1), ambient: .4};
    }
    update_state (dt) {
        const s           = this.shapes.particles.arrays;
        const random_vecs = Array (this.num_particles).fill (0).map (x => vec3 (0, .01, 0).randomized (.05));
        s.offset          = s.offset.map ((x, i) => x.plus (random_vecs[ ~~(i / 4) ]));
    }
    render_explanation () {
        this.document_region.innerHTML += `<p>Let's render fluids using multi-scale balls that rotate in place and store momentum for our particles.</p>
                                        <p>Inspired by the "eigenfluids" method, which represents fluid flow as the combination of multi-scale basis functions that each sort of resemble a rotating flow.  We're not quite going to do Smooth Particle Hydrodynamics, which uses realistic fluid forces between particles but no background grid or background helpers like balls.</p>`;
    }
    render_animation (caller) {
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
      constructor (num_particles) {
          super ("position", "normal", "texture_coord", "offset");

          for (let i = 0; i < num_particles; i++)
              defs.Square.insert_transformed_copy_into (this, [], Mat4.identity ());

          const random_vecs  = Array (num_particles).fill (0).map (x => vec3 (0, 0, 0).randomized (10));
          this.arrays.offset = this.arrays.position.map ((x, i) => random_vecs[ ~~(i / 4) ]);
      }
  };

const Particle_Shader = defs.Particle_Shader =
  class Particle_Shader extends defs.Textured_Phong {
      vertex_glsl_code () {         // ********* VERTEX SHADER *********
          return this.shared_glsl_code () + `
        varying vec2 f_tex_coord;
        attribute vec3 position, normal, offset;                            // Position is expressed in object coordinates.
        attribute vec2 texture_coord;

        uniform mat4 model_transform;
        uniform mat4 projection_camera_model_transform;
        uniform vec2 particle_square_size;

        void main() {
            vec3 temp = offset;
            temp[1] = mod( temp[1]+3.0,6.0)-3.0;
            vec4 square_point = vec4( position, 1.0);
            square_point.xy *= particle_square_size;
            gl_Position = projection_camera_model_transform * vec4( temp, 1.0 ) + square_point;     // Move vertex to final space.\
                                              // The final normal vector in screen space.
            N = normalize( mat3( model_transform ) * normal / squared_scale);

            vertex_worldspace = ( model_transform * vec4( position, 1.0 ) ).xyz;
                                              // Turn the per-vertex texture coordinate into an interpolated variable.
            f_tex_coord = texture_coord;
          } `;
      }
      fragment_glsl_code () {        // ********* FRAGMENT SHADER *********
          return this.shared_glsl_code () + `
        varying vec2 f_tex_coord;

        void main() {
            vec4 tex_color = vec4( .01/distance( f_tex_coord, vec2( .5,.5) ) - .2);
            if( tex_color.w < .01 ) discard;
                                                                     // Compute an initial (ambient) color:
            gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w );
                                                                     // Compute the final color with contributions from lights:
            gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
            
        //    gl_FragColor.xyz = gl_FragCoord.xyz * vec3( 1./1080.5, 1./600.5, 0. );
          } `;
      }
      send_uniforms (gl, gpu, uniforms, model_transform) {
          super.send_uniforms (gl, gpu, uniforms, model_transform);

          const particle_square_size = [uniforms.projection_transform[ 0 ][ 0 ],
                                        uniforms.projection_transform[ 1 ][ 1 ]];

          gl.uniform2fv (gpu.particle_square_size, particle_square_size);
      }
  };
