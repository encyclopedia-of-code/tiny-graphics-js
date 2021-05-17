import {tiny, defs} from './common.js';

                                                  // Pull these names into this module's scope for convenience:
const { vec3, vec4, color, Mat4, Shape, Shader, Texture, Component } = tiny;
const {Renderer, Entity, Camera, Light, Material} = defs

export
const Instanced_Cubes_Demo = defs.Instanced_Cubes_Demo =
class Instanced_Cubes_Demo extends Component {
  init () {
    this.widget_options = {make_controls: false};    // This demo is too minimal to have controls
    this.shapes = {triangle: new defs.Instanced_Square_Index ()};
    this.shader = new defs.Instanced_Shader (Light.NUM_LIGHTS);
    this.textured_shader = new defs.Textured_Instanced_Shader (Light.NUM_LIGHTS);

    this.fire = new Material("Fire", this.textured_shader, { color: vec4(0.1, 0.1, 0.1, 1.0) }, { diffuse_texture: new Texture( "assets/rgb.jpg" ) });
    this.water = new Material("Water", this.shader, { color: vec4(0.0, 0.5, 0.5, 1.0) });
    this.renderer = new Renderer();

    this.objects = 1;
    this.size = 1000;
    this.entities = [];
    for (var obj = 0; obj < this.objects; obj++)
    {
      this.entities.push(
          new Entity(new defs.Instanced_Cube_Index (), Array(this.size).fill(0).map( (x,i) =>
              Mat4.translation(... vec3(Math.random()* 2 - 1, Math.random(),  Math.random()*2 - 1).times_pairwise(vec3(20, 2, 20)))), undefined)
      );
    }

    this.camera = new Camera(vec3(0.0, 5.0, 20.0));
    this.sun = new Light({direction_or_position: vec4(0.0, 10.0, 0.0, 1.0), color: vec3(1.0, 0.0, 0.0), diffuse: 0.5, specular: 1.0, attenuation_factor: 0.001});
    this.sun2 = new Light({direction_or_position: vec4(5.0, 10.0, 0.0, 0.0), color: vec3(1.0, 1.0, 1.0), diffuse: 0.5, specular: 1.0, attenuation_factor: 0.001});
  }
  render_animation (caller) {


    if( !caller.controls )
    {
      this.animated_children.push( caller.controls = new defs.Movement_Controls( { uniforms: this.uniforms } ) );
      caller.controls.add_mouse_controls( caller.canvas );

      this.camera.initialize(caller);
    }

    this.sun.initialize(caller);
    this.sun2.initialize(caller);


    if (this.uniforms.animation_time/500 % 2 < 1)
      this.entities[0].set_material(this.fire);
    else
      this.entities[0].set_material(this.water)

      for (let obj of this.entities)
      {
        obj.apply_transform(Mat4.rotation( .1, 0,0,1));
        // obj.set_transforms(Array(this.size).fill(0).map( (x,i) =>
        // Mat4.translation(... vec3(Math.random()* 2 - 1, Math.random(),  Math.random()*2 - 1).times_pairwise(vec3(20, 2, 20)))))
        this.renderer.submit(obj);
      }
    this.renderer.flush(caller);
  }
};
