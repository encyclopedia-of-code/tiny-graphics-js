import {tiny, defs} from './common.js';

                                                  // Pull these names into this module's scope for convenience:
const { vec3, vec4, color, Mat4, Shape, Shader, Texture, RenderListItem, Renderer } = tiny;
const {Camera, LightArray, Material} = defs

export
const Instanced_Cubes_Demo = defs.Instanced_Cubes_Demo =
class Instanced_Cubes_Demo extends Renderer {
  init () {
    super.init();
    this.shapes = {cube: new defs.Instanced_Cube_Index()};

     this.shader = new defs.Universal_Shader (LightArray.NUM_LIGHTS, {has_shadows: false, has_texture: false});
    // this.shader = new defs.Shader_Without_UBOs (1, {has_shadows: false, has_texture: false});
    this.textured_shader = new defs.Universal_Shader (LightArray.NUM_LIGHTS, {has_shadows: false, has_texture: true});

    // this.fire = new Material(this.textured_shader, { color: vec4(0.1, 0.1, 0.1, 1.0) }, { diffuse_texture: new Texture( "assets/rgb.jpg" ) });
    this.fire = new Material(this.textured_shader, { color: vec4(0.1, 0.1, 0.1, 1.0) }, { diffuse_texture: new Texture( "assets/rgb.jpg" ) });
    this.water = new Material(this.shader, { color: vec4(0.0, 0.5, 0.5, 1.0) });

 //   this.renderList.push(new RenderListItem(this.shapes.cube, new Material(this.shader)) );
 //   this.renderList.push(new RenderListItem(this.shapes.cube, new Material(this.shader)) );

    this.renderList.push(new RenderListItem(this.shapes.cube, this.fire) );
    this.renderList.push(new RenderListItem(this.shapes.cube, this.water) );

    for( let i=0; i<2; i++ ) {
      const renderListItem = this.renderList[i];
      renderListItem.model_transforms.push(
        ...Array(1000).fill(0).map( (x,j) =>
              Mat4.translation(... vec3(Math.random()* 2 - 1, 2*i+1,  Math.random()*2 - 1)
                                  .times_pairwise(vec3(20, 2, 20))))
      );
      renderListItem.update_matrices();
    }

    this.lightArray =
         new defs.LightArray({ambient: .1, lights:[
           {direction_or_position: vec4(0.0, 10.0, 0.0, 1.0),
             color: vec3(1.0, 0.0, 0.0), diffuse: 0.5, specular: 1.0, attenuation_factor: 0.001},
           {direction_or_position: vec4(5.0, 10.0, 0.0, 0.0),
             color: vec3(1.0, 1.0, 1.0), diffuse: 0.5, specular: 1.0, attenuation_factor: 0.001}
         ]});
    this.camera = new Camera();
    const {camera, lightArray} = this;
    this.uniforms.UBOs = {camera, lightArray, material: this.fire};
}
render_frame () {
    if( !this.controls )  {
      this.camera.emplace( Mat4.look_at( vec3(0.0, 5.0, 20.0), vec3(0,0,0), vec3(0,1,0) ) );
      this.camera.fields.projection = Mat4.perspective(Math.PI/2, this.width/this.height, 0.01, 500);

      this.uniforms.camera_inverse = this.camera.fields.camera_inverse;
      this.uniforms.camera_transform = this.camera.fields.camera_world;
      this.controls = new defs.Movement_Controls( { uniforms: this.uniforms } );
      this.controls.add_mouse_controls( this.canvas );
      this.animated_children.push( this.controls );
    }

    this.selected_UBOs.set(this.camera.get_binding_point(), this.camera);
    this.selected_UBOs.set(this.lightArray.get_binding_point(), this.lightArray);

    // this.draw( this.renderList[0], this.uniforms);

     for( let renderListItem of this.renderList)
       this.draw(renderListItem, this.uniforms);

//     if (this.uniforms.animation_time/500 % 2 < 1)
//       this.entities[0].set_material(this.fire);
//     else
//       this.entities[0].set_material(this.water)
  }
};


export
const UBO_Test_Demo = defs.UBO_Test_Demo =
class UBO_Test_Demo extends Renderer {
  init () {
    this.shader = new defs.Instanced_Shader (Light.NUM_LIGHTS);
    this.water = new Material("Water", this.shader, { color: vec4(0.0, 0.5, 0.5, 1.0) });
    this.renderer = new Renderer();

    this.entities = [];
      this.entities.push(
          new Entity(new defs.Instanced_Cube_Index (), Array(1000).fill(0).map( (x,i) =>
              Mat4.translation(... vec3(Math.random()* 2 - 1, Math.random(),  Math.random()*2 - 1).times_pairwise(vec3(20, 2, 20)))), undefined)
      );

    this.camera = new Camera(vec3(0.0, 5.0, 20.0));
    this.sun = new Light({direction_or_position: vec4(0.0, 10.0, 0.0, 1.0), color: vec3(1.0, 1.0, 1.0), diffuse: 1.0, specular: 1.0, attenuation_factor: 0.0001});
  }
  render_frame (caller) {
    this.camera.initialize(caller);
    this.sun.initialize(caller);

    this.entities[0].set_material(this.water)

      for (let obj of this.entities) {
        this.renderer.submit(obj);
      }
    this.renderer.flush(caller);
  }
};
