import {tiny, defs} from './common.js';

                                                  // Pull these names into this module's scope for convenience:
const { vec3, vec4, color, Mat4, Shape, Shader, Texture, Component } = tiny;
const {Renderer, Entity, Camera, Light, Material} = defs

export
const Fish_Demo = defs.Fish_Demo =
class Fish_Demo extends Component {
  init () {
    this.shapes = {
         cylinder: new defs.Shape_From_File("models/cylinder.obj"),
         ball: new defs.Shape_From_File("models/sphere6.obj"),
         //box_2: new defs.Cube2(),
         //axis: new Axis_Arrows(),
         //complex_shape: new Cube(),
         //"teapot": new Shape_From_File("assets/teapot.obj"),  // why the quotes?
         fish: new defs.Shape_From_File("models/fish.obj"),
         fish2: new defs.Shape_From_File("models/fish2.obj"),
         herring: new defs.Shape_From_File("models/herring.obj"),
         simple_fish: new defs.Shape_From_File("models/simple_fish.obj"),
         shark: new defs.Shape_From_File("assets/shark_cm/shark_cm.obj"),
         shark_OM: new defs.Shape_From_File("models/shark_OM.obj"),

         // animated shark sequence
         shark_2l: new defs.Shape_From_File("models/shark_2l.obj"),
         shark_1l: new defs.Shape_From_File("models/shark_1l.obj"),
         shark_c: new defs.Shape_From_File("models/shark_c.obj"),
         shark_1r: new defs.Shape_From_File("models/shark_1r.obj"),
         shark_2r: new defs.Shape_From_File("models/shark_2r.obj"),
         // Shrimp
         food: new defs.Shape_From_File("models/copepod.obj"),

      }

    this.shader = new defs.Textured_Instanced_Shader (Light.NUM_LIGHTS);

    this.materials = {
      red_phong: new Material("Red_Phong", this.shader, { color: vec4(0.92, 0.22, 0.66, 1.0), diffuse: vec3(0.92, 0.22, 0.66), specular: vec3(1.0, 1.0, 1.0), smoothness: 32.0 }),
      phong: new Material("Phong", this.shader, { color: vec4(1.0, 1.0, 1.0, 1.0), diffuse: vec3(1.0, 1.0, 1.0), specular: vec3(1.0, 1.0, 1.0), smoothness: 32.0 }, { diffuse_texture: new Texture( "assets/rgb.jpg" ) }),
      shark: new defs.Material_From_File("Shark", this.shader, "assets/shark_cm/shark_cm.mtl"),

   }

    this.sun = new Light({direction_or_position: vec4(0.0, 2.0, 0.0, 0.0), color: vec3(1.0, 1.0, 1.0), diffuse: 0.4, specular: 0.1, attenuation_factor: 0.001, casts_shadow: true});

    this.camera = new Camera(vec3(0.0, 0.0, 2.0));

    this.renderer = new Renderer();

    this.fish_entity = new Entity(this.shapes.shark, Mat4.identity(), this.materials.phong);
    this.shark_entity = new Entity(this.shapes.shark, Mat4.identity(), this.materials.shark);
    this.shrimp_entity = new Entity(this.shapes.food, Mat4.identity(), this.materials.red_phong);
  }
  render_animation (caller) {


    if( !caller.controls )
    {
      this.uniforms.camera_inverse = this.camera.view;
      this.animated_children.push( caller.controls = new defs.Movement_Controls(
              { uniforms: this.uniforms },
              () => {this.camera.initialize(caller)}
              ) );
      caller.controls.add_mouse_controls( caller.canvas );

      this.camera.initialize(caller);
    }

    this.sun.initialize(caller);
    //this.sun2.initialize(caller);


    let Lights = [this.sun];
    //this.renderer.shadow_map_pass(caller, Lights);
    this.renderer.submit(this.fish_entity);
    this.renderer.flush(caller, Lights);
  }
};
