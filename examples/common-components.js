import {tiny} from '../tiny-graphics.js';
// Pull these names into this module's scope for convenience:
const {Vector, Vector3, vec, vec3, vec4, color, Matrix, Mat4, Shape, Shader, Component} = tiny;

const defs = {};

export {tiny, defs};

const Minimal_Webgl_Demo = defs.Minimal_Webgl_Demo =
  class Minimal_Webgl_Demo extends Component {
      init () {
          this.widget_options = {make_controls: false};    // This demo is too minimal to have controls
          this.shapes         = {triangle: new Minimal_Shape ()};
          this.shader         = new Basic_Shader ();
      }
      render_animation (caller) {
          this.shapes.triangle.draw (caller, this.uniforms, Mat4.identity (), {shader: this.shader});
      }
  };

const Movement_Controls = defs.Movement_Controls =
  class Movement_Controls extends Component {
      roll                    = 0;
      look_around_locked      = true;
      thrust                  = vec3 (0, 0, 0);
      pos                     = vec3 (0, 0, 0);
      z_axis                  = vec3 (0, 0, 0);
      radians_per_frame       = 1 / 200;
      meters_per_frame        = 20;
      speed_multiplier        = 1;
      mouse_enabled_canvases  = new Set ();
      will_take_over_uniforms = true;
      set_recipient (matrix_closure, inverse_closure) {
          this.matrix  = matrix_closure;
          this.inverse = inverse_closure;
      }
      reset () {
          this.set_recipient (() => this.uniforms.camera_transform,
                              () => this.uniforms.camera_inverse);
      }
      add_mouse_controls (canvas) {
          if (this.mouse_enabled_canvases.has (canvas))
              return;
          this.mouse_enabled_canvases.add (canvas);
          // First, measure mouse steering, for rotating the flyaround camera:
          this.mouse           = {"from_center": vec (0, 0)};
          const mouse_position = (e, rect = canvas.getBoundingClientRect ()) =>
            vec (e.clientX - (rect.left + rect.right) / 2, e.clientY - (rect.bottom + rect.top) / 2);
          // Set up mouse response.  The last one stops us from reacting if the mouse leaves the canvas:
          document.addEventListener ("mouseup", e => { this.mouse.anchor = undefined; });
          canvas.addEventListener ("mousedown", e => {
              e.preventDefault ();
              this.mouse.anchor = mouse_position (e);
          });
          canvas.addEventListener ("mousemove", e => {
              e.preventDefault ();
              this.mouse.from_center = mouse_position (e);
          });
          canvas.addEventListener ("mouseout", e => { if ( !this.mouse.anchor) this.mouse.from_center.scale_by (0); });
      }
      render_explanation (document_builder, document_element = document_builder.document_region) { }
      render_controls () {
          this.control_panel.innerHTML += "Click and drag the scene to <br> spin your viewpoint around it.<br>";
          this.key_triggered_button ("Up", [" "], () => this.thrust[ 1 ] = -1, undefined, () => this.thrust[ 1 ] = 0);
          this.key_triggered_button ("Forward", ["w"], () => this.thrust[ 2 ] = 1, undefined,
                                     () => this.thrust[ 2 ] = 0);
          this.new_line ();
          this.key_triggered_button ("Left", ["a"], () => this.thrust[ 0 ] = 1, undefined, () => this.thrust[ 0 ] = 0);
          this.key_triggered_button ("Back", ["s"], () => this.thrust[ 2 ] = -1, undefined, () => this.thrust[ 2 ] = 0);
          this.key_triggered_button ("Right", ["d"], () => this.thrust[ 0 ] = -1, undefined,
                                     () => this.thrust[ 0 ] = 0);
          this.new_line ();
          this.key_triggered_button ("Down", ["z"], () => this.thrust[ 1 ] = 1, undefined, () => this.thrust[ 1 ] = 0);

          const speed_controls        = this.control_panel.appendChild (document.createElement ("span"));
          speed_controls.style.margin = "30px";
          this.key_triggered_button ("-", ["o"], () =>
            this.speed_multiplier /= 1.2, "green", undefined, undefined, speed_controls);
          this.live_string (box => { box.textContent = "Speed: " + this.speed_multiplier.toFixed (2); },
                            speed_controls);
          this.key_triggered_button ("+", ["p"], () =>
            this.speed_multiplier *= 1.2, "green", undefined, undefined, speed_controls);
          this.new_line ();
          this.key_triggered_button ("Roll left", [","], () => this.roll = 1, undefined, () => this.roll = 0);
          this.key_triggered_button ("Roll right", ["."], () => this.roll = -1, undefined, () => this.roll = 0);
          this.new_line ();
          this.key_triggered_button ("(Un)freeze mouse look around", ["f"], () => this.look_around_locked ^= 1,
                                     "green");
          this.new_line ();
          this.live_string (
            box => box.textContent = "Position: " + this.pos[ 0 ].toFixed (2) + ", " + this.pos[ 1 ].toFixed (2)
                                     + ", " + this.pos[ 2 ].toFixed (2));
          this.new_line ();
          // The facing directions are surprisingly affected by the left hand rule:
          this.live_string (box => box.textContent = "Facing: " + ((this.z_axis[ 0 ] > 0 ? "West " : "East ")
                                                     + (this.z_axis[ 1 ] > 0 ? "Down " : "Up ") +
                                                     (this.z_axis[ 2 ] > 0 ? "North" : "South")));
          this.new_line ();
          this.key_triggered_button ("Go to world origin", ["r"], () => {
              this.matrix ().set_identity (4, 4);
              this.inverse ().set_identity (4, 4);
          }, "orange");
          this.new_line ();

          this.key_triggered_button ("Look at origin from front", ["1"], () => {
              this.inverse ().set (Mat4.look_at (vec3 (0, 0, 10), vec3 (0, 0, 0), vec3 (0, 1, 0)));
              this.matrix ().set (Mat4.inverse (this.inverse ()));
          }, "black");
          this.new_line ();
          this.key_triggered_button ("from right", ["2"], () => {
              this.inverse ().set (Mat4.look_at (vec3 (10, 0, 0), vec3 (0, 0, 0), vec3 (0, 1, 0)));
              this.matrix ().set (Mat4.inverse (this.inverse ()));
          }, "black");
          this.key_triggered_button ("from rear", ["3"], () => {
              this.inverse ().set (Mat4.look_at (vec3 (0, 0, -10), vec3 (0, 0, 0), vec3 (0, 1, 0)));
              this.matrix ().set (Mat4.inverse (this.inverse ()));
          }, "black");
          this.key_triggered_button ("from left", ["4"], () => {
              this.inverse ().set (Mat4.look_at (vec3 (-10, 0, 0), vec3 (0, 0, 0), vec3 (0, 1, 0)));
              this.matrix ().set (Mat4.inverse (this.inverse ()));
          }, "black");
          this.new_line ();
          this.key_triggered_button ("Attach to global camera", ["Shift", "R"],
                                     () => { this.will_take_over_uniforms = true; }, "blue");
          this.new_line ();
      }
      first_person_flyaround (radians_per_frame, meters_per_frame, leeway = 70) {
          // Compare mouse's location to all four corners of a dead box:
          const offsets_from_dead_box = {
              plus : [this.mouse.from_center[ 0 ] + leeway, this.mouse.from_center[ 1 ] + leeway],
              minus: [this.mouse.from_center[ 0 ] - leeway, this.mouse.from_center[ 1 ] - leeway]
          };
          // Apply a camera rotation movement, but only when the mouse is
          // past a minimum distance (leeway) from the canvas's center:
          if ( !this.look_around_locked)
            // If steering, steer according to "mouse_from_center" vector, but don't
            // start increasing until outside a leeway window from the center.
              for (let i = 0; i < 2; i++) {
                  // The &&'s in the next line might zero the vectors out:
                  let o        = offsets_from_dead_box,
                      velocity = ((o.minus[ i ] > 0 && o.minus[ i ]) || (o.plus[ i ] < 0 && o.plus[ i ])) *
                                 radians_per_frame;
                  // On X step, rotate around Y axis, and vice versa.
                  this.matrix ().post_multiply (Mat4.rotation (-velocity, i, 1 - i, 0));
                  this.inverse ().pre_multiply (Mat4.rotation (+velocity, i, 1 - i, 0));
              }
          this.matrix ().post_multiply (Mat4.rotation (-.1 * this.roll, 0, 0, 1));
          this.inverse ().pre_multiply (Mat4.rotation (+.1 * this.roll, 0, 0, 1));
          // Now apply translation movement of the camera, in the newest local coordinate frame.
          this.matrix ().post_multiply (Mat4.translation (...this.thrust.times (-meters_per_frame)));
          this.inverse ().pre_multiply (Mat4.translation (...this.thrust.times (+meters_per_frame)));
      }
      third_person_arcball (radians_per_frame) {
          // Spin the scene around a point on an axis determined by user mouse drag:
          const dragging_vector = this.mouse.from_center.minus (this.mouse.anchor);
          if (dragging_vector.norm () <= 0)
              return;
          this.matrix ().post_multiply (Mat4.translation (0, 0, -25));
          this.inverse ().pre_multiply (Mat4.translation (0, 0, +25));

          const rotation = Mat4.rotation (radians_per_frame * dragging_vector.norm (),
                                          dragging_vector[ 1 ], dragging_vector[ 0 ], 0);
          this.matrix ().post_multiply (rotation);
          this.inverse ().pre_multiply (rotation);

          this.matrix ().post_multiply (Mat4.translation (0, 0, +25));
          this.inverse ().pre_multiply (Mat4.translation (0, 0, -25));
      }
      render_animation (context) {
          const m  = this.speed_multiplier * this.meters_per_frame,
                r  = this.speed_multiplier * this.radians_per_frame,
                dt = this.uniforms.animation_delta_time / 1000;

          // TODO:  Once there is a way to test it, remove the below, because uniforms are no longer inaccessible
          // outside this function, so we could just tell this class to take over the uniforms' matrix anytime.
          if (this.will_take_over_uniforms) {
              this.reset ();
              this.will_take_over_uniforms = false;
          }
          // Move in first-person.  Scale the normal camera aiming speed by dt for smoothness:
          this.first_person_flyaround (dt * r, dt * m);
          // Also apply third-person "arcball" camera mode if a mouse drag is occurring:
          if (this.mouse.anchor)
              this.third_person_arcball (dt * r);
          // Log some values:
          this.pos    = this.inverse ().times (vec4 (0, 0, 0, 1));
          this.z_axis = this.inverse ().times (vec4 (0, 0, 1, 0));
      }
  };
