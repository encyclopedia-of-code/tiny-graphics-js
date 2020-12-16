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
          this.rotation                 = initial_rotation;
          this.angular_velocity         = initial_angular_velocity;
          this.desired_angular_velocity = vec3 (0, 0, 0);
          this.matrix_between_steps     =
            Mat4.translation (...this.center).times (initial_rotation).times (Mat4.scale (...this.size));
          this.previous                 = {rotation: this.rotation.copy ()};
          return this;
      }
      advance (time_amount) {
          this.previous = {rotation: this.rotation.copy ()};
          if (this.angular_velocity.norm () < .0000001) return;
          this.rotation.pre_multiply (
            Mat4.rotation (time_amount * this.angular_velocity.norm (), ...this.angular_velocity.normalized ()));
      }
      blend_rotation (alpha) {
          return this.rotation.map ((x, i) => vec4 (...this.previous.rotation[ i ]).mix (x, alpha));   // bad idea
      }
      blend_state (alpha) {
          this.matrix_between_steps =
            Mat4.translation (...this.center).times (this.blend_rotation (alpha)).times (Mat4.scale (...this.size));
      }
      static intersect_sphere (p, margin = 0) {
          return p.dot (p) < 1 + margin;
      }
  };

const Particle = defs.Particle =
  class Particle {
      reset (x, y, z, dx, dy, dz) {
          if ( !this.position) this.position = vec3 (0, 0, 0);
          if ( !this.previous_position) this.previous_position = vec3 (0, 0, 0);
          if ( !this.position_between_steps) this.position_between_steps = vec3 (0, 0, 0);
          if ( !this.linear_velocity) this.linear_velocity = vec3 (0, 0, 0);
          if ( !this.desired_velocity) this.desired_velocity = vec3 (0, 0, 0);
          this.position.set (x, y, z);
          this.previous_position.set (x, y, z);
          this.position_between_steps.set (x, y, z);
          this.linear_velocity.set (dx, dy, dz);
          this.desired_velocity.set (0, 0, 0);
          return this;
      }
      advance (time_amount) {
          this.previous_position.set (this.position[ 0 ], this.position[ 1 ], this.position[ 2 ]);
          this.position.add_by (this.linear_velocity.times (time_amount));
      }
      blend_state (alpha) {
          for (let i = 0; i < 3; i++)
              this.position_between_steps[ i ] =
                (1 - alpha) * this.previous_position[ i ] + (alpha) * this.position[ i ];
      }
  };


export class Particle_Demo extends Simulation {
    init () {
        super.init ();
        this.num_particles     = 2000;
        this.domain_size       = 6;
        this.dt                = 1 / 15;
        this.gravity           = .01;
        this.friction          = 0;
        this.rotating_friction = 0.01;
        this.wall_friction     = .1;

        this.particles = Array (this.num_particles).fill (0).map (() => new Particle ());
        for (let p of this.particles) {
            p.reset (999, 999, 999, 0, 0, 0);
        }

        const sizes   = [1, 3, 5];
        this.vortices = [];
        for (let s of sizes) {
            const radius = 1 / (s + 1);
            for (let x = radius; x < 1; x += radius * 2)
                for (let y = radius; y < 1; y += radius * 2)
                    for (let z = radius; z < 1; z += radius * 2) {
                        const position = vec3 (x, y, z).minus (vec3 (.5, .5, .5)).times (2 * this.domain_size);
                        const size     = vec3 (1, 1, 1).times (2 * radius * this.domain_size);
                        this.vortices.push (new Vortex (position, size));
                    }
        }
        for (let v of this.vortices) {
            v.reset (Mat4.identity (), vec3 (0, 0, 0));
        }
        this.bodies = [...this.particles, ...this.vortices];

        this.shapes    = {
            particles: new Particle_Cloud (this.particles.map (x => x.position.copy ())),
            ball     : new defs.Subdivision_Sphere (2)
        };
        this.materials = {
            particle: {shader: new Particle_Shader (), color: color (.4, .8, 1, 1), ambient: .6},
            phong   : {shader: new defs.Phong_Shader (), color: color (.1, .2, .1, 1), ambient: .05}
        };
    }
    update_state (dt) {
        if ( !this.temp_vec3) this.temp_vec3 = vec3 (0, 0, 0);

        for (let i = 0; i < this.vortices.length; i++) {
            const v            = this.vortices[ i ];
            v.total_influences = 0;
            v.desired_angular_velocity.scale_by (0);
        }
        for (let i = 0; i < this.particles.length; i++) {
            const p            = this.particles[ i ];
            p.total_influences = 0;
            p.desired_velocity.scale_by (0);

            const spread          = this.domain_size * 1 / 8,
                  velocity_spread = .01;
            if (Math.random () < .001)
                p.reset (-this.domain_size + 2 * spread * (Math.random () - .5),
                         this.domain_size / 2 + 2 * spread * (Math.random () - .5),
                         this.domain_size / 2 + 2 * spread * (Math.random () - .5),
                         1 + 2 * velocity_spread * (Math.random () - .5),
                         2 * velocity_spread * (Math.random () - .5),
                         2 * velocity_spread * (Math.random () - .5));

            for (let j = 0; j < this.vortices.length; j++) {
                const v = this.vortices[ j ];
                this.temp_vec3.set (p.position[ 0 ] - v.center[ 0 ], p.position[ 1 ] - v.center[ 1 ],
                                    p.position[ 2 ] - v.center[ 2 ]);
                // Particles are only affected by vortices they're inside the sphere of:
                if (this.temp_vec3.norm () > v.size[ 0 ])
                    continue;
                v.total_influences++;
                p.total_influences++;

                //v.desired_angular_velocity.add_by (p.linear_velocity.cross (this.temp_vec3).times (-1)
                // Equivalent:
                const a = p.linear_velocity,
                      b = this.temp_vec3;
                v.desired_angular_velocity[ 0 ] -= a[ 1 ] * b[ 2 ] - a[ 2 ] * b[ 1 ];
                v.desired_angular_velocity[ 1 ] -= a[ 2 ] * b[ 0 ] - a[ 0 ] * b[ 2 ];
                v.desired_angular_velocity[ 2 ] -= a[ 0 ] * b[ 1 ] - a[ 1 ] * b[ 0 ];

                if (v.angular_velocity.norm () < .0000001)
                    continue;


                Mat4.rotate_vec3 (this.temp_vec3, dt * v.angular_velocity.norm (), v.angular_velocity[ 0 ],
                                  v.angular_velocity[ 1 ], v.angular_velocity[ 2 ]);
                this.temp_vec3.set (this.temp_vec3[ 0 ] + v.center[ 0 ], this.temp_vec3[ 1 ] + v.center[ 1 ],
                                    this.temp_vec3[ 2 ] + v.center[ 2 ]);
                let vortex_influence_on_particle = this.temp_vec3.minus (p.position);
                vortex_influence_on_particle.scale_by (1 / v.size[ 0 ]);
                p.desired_velocity.add_by (vortex_influence_on_particle);
            }

            if (p.total_influences > 0) p.desired_velocity.scale_by (1 / p.total_influences);
            p.linear_velocity.add_by (p.desired_velocity);
            if (p.linear_velocity.norm () > 1) p.linear_velocity.normalize ();
            p.linear_velocity[ 1 ] -= this.gravity;                          // Gravity
            p.linear_velocity.scale_by (1 - this.friction);                  // Friction

            // Prevent particles from going out of bounds:
            for (let j = 0; j < 3; j++)
                if (Math.abs (p.position[ j ]) > this.domain_size && p.linear_velocity[ j ] * p.position[ j ] >
                    0) p.linear_velocity[ j ] *= -1 * (1 - this.wall_friction);
        }
        for (let j = 0; j < this.vortices.length; j++) {
            const v = this.vortices[ j ];
            if (v.total_influences > 0) v.desired_angular_velocity.scale_by (1 / v.total_influences);
            v.angular_velocity.add_by (v.desired_angular_velocity);
            if (v.angular_velocity.norm () > 1 / this.domain_size) v.angular_velocity.scale_by (
              1 / this.domain_size / v.angular_velocity.norm ());
            v.angular_velocity.scale_by (1 - this.rotating_friction);        // Friction
        }
    }
    render_explanation () {
        this.document_region.innerHTML += `<p>Let's render fluids using multi-scale balls that rotate in place and store momentum for our particles.</p>
                                        <p>Inspired by the "eigenfluids" method, which represents fluid flow as the combination of multi-scale basis functions that each sort of resemble a rotating flow.  We're not quite going to do Smooth Particle Hydrodynamics, which uses realistic fluid forces between particles but no background grid or background helpers like balls.</p>`;
    }
    render_animation (caller) {
        if ( !caller.controls) {
            this.animated_children.push (caller.controls = new defs.Movement_Controls ({uniforms: this.uniforms}));
            caller.controls.add_mouse_controls (caller.canvas);
            Shader.assign_camera (Mat4.translation (0, 0, -3 * this.domain_size), this.uniforms);
        }
        this.uniforms.projection_transform = Mat4.perspective (Math.PI / 4, caller.width / caller.height, 1, 500);
        this.uniforms.lights               =
          [defs.Phong_Shader.light_source (vec4 (.7, 1.5, 2, 0), color (1, 1, 1, 1), 100000)];

        if (this.uniforms.animate)
            this.simulate (this.uniforms.animation_delta_time);

        //Update vertex array with new positions and velocities:
        const s = this.shapes.particles.arrays;
        for (let i = 0; i < this.particles.length; i++) {
            s.offset[ 4 * i ] = s.offset[ 4 * i + 1 ] =
              s.offset[ 4 * i + 2 ] = s.offset[ 4 * i + 3 ] = this.particles[ i ].position_between_steps;

            s.normal[ 4 * i ] = s.normal[ 4 * i + 1 ] =
              s.normal[ 4 * i + 2 ] = s.normal[ 4 * i + 3 ] = this.particles[ i ].linear_velocity;
        }
        if (this.has_drawn)
            this.shapes.particles.copy_onto_graphics_card (caller.context, ["offset", "normal"], false);

        // for (let v of this.vortices)
        //     this.shapes.ball.draw (caller, this.uniforms, v.matrix_between_steps, this.materials.phong, "LINES");

        this.shapes.particles.draw (caller, this.uniforms, Mat4.identity (), this.materials.particle);
        this.has_drawn = true;
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
            vec4 square_point = vec4( position, 1.0);
            square_point.xy *= particle_square_size;
            gl_Position = projection_camera_model_transform * vec4( offset, 1.0 ) + square_point;     // Move vertex to final space.\
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
            vec4 tex_color = vec4( .013/( from_center - 0.1) - .4);
            tex_color.xyz *= f_normal * f_normal / 10.0;
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
