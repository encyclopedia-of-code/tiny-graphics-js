import {tiny, defs} from './common.js';

                                                  // Pull these names into this module's scope for convenience:
const { vec3, vec4, color, Mat4, Shape, Shader, Texture, RenderListItem, Renderer } = tiny;
const {Camera, LightArray, Material} = defs

export
const Shadows_Demo = defs.Shadows_Demo =
class Shadows_Demo extends Renderer {
  init () {
    super.init();
    this.shapes = {cube: new defs.Instanced_Cube_Index()};
    // this.shapes = {cube: new defs.Minimaler_Shape()};

    this.lightArray =
         new defs.LightArray({ambient: .1, lights:[{direction_or_position: vec4(2.0, 5.0, 0.0, 0.0),
             color: color(1.0, 1.0, 1.0, 1.0), diffuse: 1, specular: 0.7, attenuation_factor: 0.01}]});
        //   new defs.Shadow_Light({ ambient: .1, lights:[{direction_or_position: vec4(2.0, 5.0, 0.0, 0.0),
        //      color: color(1.0, 1.0, 1.0, 1.0), diffuse: 1, specular: 0.7, attenuation_factor: 0.01, casts_shadow: true }]});

    this.camera = new Camera();

     this.shader = new defs.Universal_Shader (LightArray.NUM_LIGHTS, {has_shadows: false});
   // this.shader = new defs.Basic_Shader();
    //
    this.stars = new Material(this.shader, { color: vec4(.8, .7, .5, 1) }, { diffuse_texture: new Texture( "assets/stars.png" ) });
    //  new Material(this.shader, { color: vec4(.8, .7, .5, 1) }, { diffuse_texture: this.sun.shadow_map[0] });
    //  new defs.Material_From_File(this.shader, "assets/shark_cm/shark_cm.mtl" );

    this.renderList.push(new RenderListItem(this.shapes.cube, this.stars) );
    // this.renderList.push(new RenderListItem(this.shapes.cube, new Material(this.shader) ) );
    for( let renderListItem of this.renderList) {
      renderListItem.model_transforms.push( Mat4.translation(0.0, -2.0, 0.0).times(Mat4.scale(5, .5, 5))
         , Mat4.identity()
      );
      renderListItem.update_matrices();
    }

    const {camera, lightArray} = this;
    this.uniforms.UBOs = {camera, lightArray, material: this.stars};
  }
  render_controls() {
    this.frame_rates ??= [60, 120, 0, 1, 2, 8, 16, 30];
    this.key_triggered_button ("Framerate: ", ["&"], () => {
       this.frame_rates.push( this.frame_rates.shift() );
       this.max_fps = this.frame_rates[0];
       this.prev_frame_number = -1 } );
    this.live_string (box => { box.textContent = this.max_fps } );
  }
  render_frame () {
    if( !this.controls )  {
      this.camera.emplace( Mat4.look_at( vec3(-1.0, 2.0, 1.0), vec3(0,-3,-1), vec3(0,1,0) ) );  // Mat4.translation(0.0, 0.0, -1.0)
      this.camera.fields.projection = Mat4.perspective(Math.PI/2, this.width/this.height, 0.01, 500);

      this.uniforms.camera_inverse = this.camera.fields.camera_inverse;
      this.uniforms.camera_transform = this.camera.fields.camera_world;
      this.controls = new defs.Movement_Controls( { uniforms: this.uniforms } );
      this.controls.add_mouse_controls( this.canvas );
      this.animated_children.push( this.controls );
    }

    this.selected_UBOs.set(this.camera.get_binding_point(), this.camera);
    this.selected_UBOs.set(this.lightArray.get_binding_point(), this.lightArray);

    for( let renderListItem of this.renderList)
      this.draw(renderListItem, this.uniforms);

//    renderer.shadow_map_pass(this.uniforms);
//    renderer.flush(this.uniforms);
  }
};

export
const Prove_Column_Major_Scene = defs.Prove_Column_Major_Scene =
class Prove_Column_Major_Scene extends Renderer {
  init () {
    super.init();
    this.shapes = {tri: new defs.Minimal_Shape ()};

    this.shader = new defs.Debug_Shader ();
    this.plain = new Material(this.shader);

    // ASSIGN THE MATRIX TO DISPLAY:
    const m = Mat4.identity().times(0);
    for( let i = 0; i < 4; i++ )
    for( let j = 0; j < 4; j++ )
      m[i][j] = 10*i + j;

    this.renderList.push(new RenderListItem(this.shapes.tri, this.plain) );
    for( let renderListItem of this.renderList) {
      renderListItem.model_transforms.push(m);
      renderListItem.update_matrices();
    }
  }
  render_frame () {
    for( let renderListItem of this.renderList)
      this.draw(renderListItem, this.uniforms);
  }
};

export
const Minimal_Demo = defs.Minimal_Demo =
class Minimal_Demo extends Renderer {
  init () {
    super.init();
    this.shapes = {tri: new defs.Minimal_Shape ()};

    this.basic_shader = new defs.Basic_Shader ();
    this.dummy = new Material(this.basic_shader);

    this.renderList.push(new RenderListItem(this.shapes.tri, this.dummy) );
    for( let renderListItem of this.renderList) {
      renderListItem.model_transforms.push(Mat4.identity());
      renderListItem.update_matrices();
    }
  }
  render_frame () {
    for( let renderListItem of this.renderList)
      this.draw(renderListItem, this.uniforms);
  }
};
