import * as tiny from '../tiny-graphics.js';
import { MatVec, matvec, Component } from '../tiny-graphics.js';
import * as shapes from './common-shapes.js';
import * as shaders from './common-shaders.js';

export class Movement_Controls extends Component {
    constructor(props)
      {
        super(props);
        this.recipient = this.state.camera;

        const defaults = {
          roll                    : 0,
          look_around_locked      : true,
          thrust                  : matvec ([0, 0, 0]),
          pos                     : matvec ([0, 0, 0]),
          z_axis                  : matvec ([0, 0, 0]),
          radians_per_frame       : 1 / 200,
          meters_per_frame        : 20,
          speed_multiplier        : 1,
          mouse_enabled_canvases  : new Set ()
          };
        Object.assign( this, defaults );
      }
      add_mouse_controls (canvas) {
          if (this.mouse_enabled_canvases.has (canvas))
              return;
          this.mouse_enabled_canvases.add (canvas);
          // First, measure mouse steering, for rotating the flyaround camera:
          this.mouse           = {"from_center": matvec ([0, 0])};
          const mouse_position = (e, rect = canvas.getBoundingClientRect ()) =>
            matvec ([e.clientX - (rect.left + rect.right) / 2, e.clientY - (rect.bottom + rect.top) / 2]);
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
          canvas.addEventListener ("mouseout", e => { if ( !this.mouse.anchor) this.mouse.from_center.multiply (0); });
      }
      render_explanation (document_builder, document_element = document_builder.document_region) { }
      render_controls () {
          this.control_panel.innerHTML += "Click and drag the scene to <br> spin your viewpoint around it.<br>";
          [ { label: "Up",      keys: [" "], idx: 1, val: -1 },
            { label: "Forward", keys: ["w"], idx: 2, val: 1 },
            { label: "Left",    keys: ["a"], idx: 0, val: 1 },
            { label: "Back",    keys: ["s"], idx: 2, val: -1 },
            { label: "Right",   keys: ["d"], idx: 0, val: -1 },
            { label: "Down",    keys: ["z"], idx: 1, val: 1 }
          ].forEach(({ label, keys, idx, val }, i) => {
            this.key_triggered_button(label, keys, () => this.thrust.data[idx] = val, undefined, () => this.thrust.data[idx] = 0);
            if ([1, 4].includes(i)) this.new_line();
          });

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
            box => box.textContent = "Position: " + this.pos.data[ 0 ].toFixed (2) + ", " + this.pos.data[ 1 ].toFixed (2)
                                     + ", " + this.pos.data[ 2 ].toFixed (2));
          this.new_line ();
          // The facing directions actually follow the left hand rule:
          this.live_string (box => box.textContent = "Facing: " + ((this.z_axis.data[ 0 ] > 0 ? "West " : "East ")
                                                     + (this.z_axis.data[ 1 ] > 0 ? "Down " : "Up ") +
                                                     (this.z_axis.data[ 2 ] > 0 ? "North" : "South")));
          this.new_line ();
          this.key_triggered_button ("Go to world origin", ["r"], () => {
              this.recipient.assign( { camera_world: matvec().set_identity() } )
          }, "orange");
          this.new_line ();

          this.key_triggered_button ("Look at origin from front", ["1"], () => {
              this.recipient.assign( { camera_inverse:
                  matvec().look_at (matvec ([0, 0, 10]), matvec ([0, 0, 0]), matvec ([0, 1, 0])) } )
          }, "black");
          this.new_line ();
          [ { label: "from right", keys: ["2"], pos: matvec([10,0,0]) },
            { label: "from rear",  keys: ["3"], pos: matvec([0,0,-10]) },
            { label: "from left",  keys: ["4"], pos: matvec([-10,0,0]) }
          ].forEach(({ label, keys, pos }) => {
            this.key_triggered_button(label, keys, () => {
              this.recipient.assign({ camera_inverse: matvec().look_at(pos, matvec([0,0,0]), matvec([0,1,0])) });
            }, "black");
          });
          this.new_line ();
          this.key_triggered_button ("Attach to global camera", ["Shift", "R"],
                                     () => { this.reset(); }, "blue");
          this.new_line ();
      }
      first_person_flyaround (radians_per_frame, meters_per_frame, leeway = 70) {
            // Apply a camera rotation movement according to "mouse_from_center" vector, but only start
            // increasing once the mouse is past a minimum distance (dead box/leeway) from the canvas's center.
          const getVelocity = (v) => { if (v < -leeway) return (v + leeway) * radians_per_frame;
                                       if (v > leeway)  return (v - leeway) * radians_per_frame;
                                       return 0; };
          const matrix = matvec().set_identity();
          if (!this.look_around_locked) {
              // Apply camera rotation for both axes
              const v = this.mouse.from_center.data;
              this.recipient.pre_multiply( matrix.quickClone().rotate(getVelocity(v[1]), 1, 0, 0)
                                                              .rotate(getVelocity(v[0]), 0, 1, 0) );
          }
          this.recipient.pre_multiply ( matrix.translate( ...this.thrust.quickClone().multiply(meters_per_frame) )
                                              .rotate(.1 * this.roll, 0, 0, 1) );
      }
      third_person_arcball (radians_per_frame) {
          // Spin the scene around a point on an axis determined by user mouse drag:
          const dragging_vector = this.mouse.from_center.clone().subtract (this.mouse.anchor);
          if (dragging_vector.norm () <= 0)
              return;

          const matrix = matvec().set_identity().translate([0, 0, -25])
                                                .rotate(radians_per_frame * dragging_vector.norm (),
                                                        dragging_vector.data[ 1 ], dragging_vector.data[ 0 ], 0)
                                                .translate([0, 0, 25]);
          this.recipient.pre_multiply (matrix);
      }
      render_frame (caller) {
          const m  = this.speed_multiplier * this.meters_per_frame,
                r  = this.speed_multiplier * this.radians_per_frame,
                dt = this.state.animation_delta_time / 1000;

          // Move in first-person.  Scale the normal camera aiming speed by dt for smoothness:
          this.first_person_flyaround (dt * r, dt * m);
          // Also apply third-person "arcball" camera mode if a mouse drag is occurring:
          if (this.mouse.anchor)
              this.third_person_arcball (dt * r);

          // Log some values:
          this.pos.loadVector( this.recipient.fields.camera_world.quickClone().multiply ( matvec([0, 0, 0, 1]) ).data );
          this.z_axis.loadVector( this.recipient.fields.camera_world.quickClone().multiply ( matvec([0, 0, 1, 0]) ).data );
      }
  };
