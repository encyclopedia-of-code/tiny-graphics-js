import {tiny, defs} from './common.js';

                                                  // Pull these names into this module's scope for convenience:
const { vec3, vec4, color, Mat4, Shape, Shader, Texture, Component } = tiny;
const {Renderer, Entity, Camera, Light, Material} = defs

export
const Shadows_Demo = defs.Shadows_Demo =
class Shadows_Demo extends Component {
  init () {
    this.shapes = {cube: new defs.Instanced_Cube_Index ()};
    this.shadowed_shader = new defs.Universal_Shader (Light.NUM_LIGHTS, {has_shadows: true});


    this.sun = new defs.Shadow_Light({direction_or_position: vec4(2.0, 5.0, 0.0, 0.0), color: vec3(1.0, 1.0, 1.0), diffuse: 1, specular: 0.7, attenuation_factor: 0.01,
      casts_shadow: true});

    //this.debug_shadow_map = new Material("Debug_Shadow_Map", this.shadowed_shader, { color: vec4(0.76, 0.69, 0.50, 1.0) }, { diffuse_texture: this.sun.shadow_map[0] });
   // this.sand = new Material("Sand", this.shadowed_shader, { color: vec4(0.76, 0.69, 0.50, 1.0) });
    this.stars = new Material("Stars", this.shadowed_shader, { color: vec4(0.76, 0.69, 0.50, 1.0) }, { diffuse_texture: new Texture( "assets/stars.png" ) });
  //  this.shark = new defs.Material_From_File("Shark", this.shadowed_shader, "assets/shark_cm/shark_cm.mtl" );

     this.renderer = new Renderer();

    // this.objects = 1;
    // this.size = 1;
     this.entities = [];
    // for (var obj = 0; obj < this.objects; obj++)
    // {
    //   this.entities.push(
    //       new Entity(new defs.Shape_From_File("assets/shark_cm/shark_cm.obj"), //Array(this.size).fill(0).map( (x,i) =>
    //           //Mat4.translation(... vec3(Math.random()* 2 - 1, Math.random(),  Math.random()*2 - 1).times_pairwise(vec3(20, 2, 20)))),
    //           Mat4.identity(),

    //           this.shark)
    //   );
    // }



    // this.entities.push(new Entity(this.shapes.cube,
    //     Mat4.translation(0,0,0),
    //     this.sand));
    // this.entities.push(new Entity(this.shapes.cube,
    //   Mat4.translation(...this.sun.direction_or_position),
    //   this.sand));

    this.entities.push(new Entity(this.shapes.cube,
      [
        Mat4.translation(0.0, -2.0, 0.0).times(Mat4.scale(5, .5, 5))
        , Mat4.identity()
        // , Mat4.translation(2.0+1.0, 5.0+1.0, 0.0+1.0)
      ],
      this.stars));

    this.camera = new Camera(vec3(-1.0, 2.0, 1.0));
  }
  render_animation (caller) {


    if( !caller.controls )
    {
      this.uniforms.camera_inverse = this.camera.camera_inverse;
      this.uniforms.camera_transform = this.camera.camera_world;
      this.animated_children.push( caller.controls = new defs.Movement_Controls(
              { uniforms: this.uniforms },
              () => {this.camera.initialize(caller)}
              ) );
      caller.controls.add_mouse_controls( caller.canvas );

      this.camera.initialize(caller);
    }

    this.sun.initialize(caller);

    let Lights = [this.sun];

    // Yet another test shape that doesn't work due to sharing transforms VBO.
    //this.shapes.cube.draw( caller, {lights: Lights}, Mat4.translation(2.0, 5.0, 0.0), this.stars, undefined, 1);

      for (let obj of this.entities)
      {
        // obj.apply_transform(Mat4.rotation( .1, 0,0,1));
        // obj.set_transforms(Array(this.size).fill(0).map( (x,i) =>
        // Mat4.translation(... vec3(Math.random()* 2 - 1, Math.random(),  Math.random()*2 - 1).times_pairwise(vec3(20, 2, 20)))))
        this.renderer.submit(obj);
      }

    this.renderer.shadow_map_pass(caller, Lights);
    this.renderer.flush(caller, Lights);
  }
};
