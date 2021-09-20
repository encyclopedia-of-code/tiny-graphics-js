import {tiny, defs} from './common.js';

                                                  // Pull these names into this module's scope for convenience:
const { vec3, vec4, color, Mat4, Shape, Shader, Texture, Entity, Renderer } = tiny;
const {Camera, LightArray, Material} = defs

export
const Debug_Matrix_Scene = defs.Debug_Matrix_Scene =
class Debug_Matrix_Scene extends Renderer {
  init () {
    super.init();
    this.shapes = {tri: new defs.Minimal_Shape ()};

    this.lightArray = new defs.LightArray({lights:[{direction_or_position: vec4(2.0, 5.0, 0.0, 0.0),
              color: color(1.0, 1.0, 1.0, 1.0), diffuse: 1, specular: 0.7, attenuation_factor: 0.01}]});

    this.shader = new defs.Debug_Shader ();
    this.plain = new Material(this.shader);

    // ASSIGN THE MATRIX TO DISPLAY:
    const m = Mat4.identity().times(0);
    for( let i = 0; i < 4; i++ )
    for( let j = 0; j < 4; j++ )
      m[i][j] = 10*i + j;

    this.entities.push(new Entity(this.shapes.tri, [ m ], this.plain));
  }
  render_frame (renderer) {
    for (let entity of this.entities) {
      entity.apply_transform(Mat4.rotation( renderer.uniforms.animation_time/1000, 0,0,1));
      this.submit(entity);
    }
    this.lightArray.bind(this, this.lightArray.get_binding_point());
    renderer.flush(this.uniforms);
  }
};

export
const Minimal_Demo = defs.Minimal_Demo =
class Minimal_Demo extends Renderer {
  init () {
    super.init();
    this.shapes = {tri: new defs.Minimal_Shape ()};

    this.lightArray = new defs.LightArray({lights:[{direction_or_position: vec4(2.0, 5.0, 0.0, 0.0),
              color: color(1.0, 1.0, 1.0, 1.0), diffuse: 1, specular: 0.7, attenuation_factor: 0.01}]});

    this.basic_shader = new defs.Basic_Shader ();
    this.dummy = new Material(this.basic_shader);

    this.entities.push(new Entity(this.shapes.tri,
      [
        Mat4.identity()
      ],
      this.dummy));
  }
  render_frame (renderer) {
    for (let entity of this.entities) {
      entity.apply_transform(Mat4.rotation( renderer.uniforms.animation_time/1000, 0,0,1));
      this.submit(entity);
    }
    renderer.flush(this.uniforms);
  }
};


export
const Shadows_Demo = defs.Shadows_Demo =
class Shadows_Demo extends Renderer {
  init () {
    super.init();
    this.shapes = {cube: new defs.Instanced_Cube_Index ()};

    this.lightArray = new defs.LightArray({ambient: .1, lights:[{direction_or_position: vec4(2.0, 5.0, 0.0, 0.0),
              color: color(1.0, 1.0, 1.0, 1.0), diffuse: 1, specular: 0.7, attenuation_factor: 0.01}]});

    this.camera = new Camera();

    this.shadowed_shader = new defs.Universal_Shader (LightArray.NUM_LIGHTS, {has_shadows: false});
    this.stars = new Material(this.shadowed_shader, { color: vec4(0.76, 0.69, 0.50, 1.0) });

    const {camera, lightArray} = this;
    this.uniforms.UBOs = {camera, lightArray, material: this.stars};

    this.entities.push(new Entity(this.shapes.cube,
      [
        Mat4.translation(0.0, -2.0, 0.0).times(Mat4.scale(5, .5, 5))
        , Mat4.identity()
      ],
      this.stars));
  }
  render_frame (renderer) {
    if( !renderer.controls )  {
    // 0  this.camera.emplace( Mat4.look_at( vec3(-1.0, 2.0, 1.0), vec3(0,0,-1), vec3(0,0,1) ) );

      this.camera.emplace( Mat4.translation(0.0, 0.0, -1.0) );
      this.camera.fields.projection = Mat4.perspective(Math.PI/2, this.width/this.height, 0.01, 1024);

      this.uniforms.camera_inverse = this.camera.fields.camera_inverse;
      this.uniforms.camera_transform = this.camera.fields.camera_world;
      this.animated_children.push( renderer.controls = new defs.Movement_Controls(
              { uniforms: this.uniforms },
         // Can't do on first frame:    () => {this.camera.fill_buffer(this.camera.fields)}
         // Yuck:
              () => {if(this.buffers.get(this.camera)) this.buffers.get(this.camera).dirty = true;}
              ) );
      renderer.controls.add_mouse_controls( renderer.canvas );
    }
    this.camera.bind(this, this.camera.get_binding_point());
    this.lightArray.bind(this, this.lightArray.get_binding_point());

    for (let entity of this.entities)
      this.submit(entity);
 // 0   renderer.shadow_map_pass(this.uniforms);
    renderer.flush(this.uniforms);
  }
};



// See below for remaining TODO:



const Shadows_Demo_Old = defs.Shadows_Demo_Old =
class Shadows_Demo_Old extends Renderer {
  init () {
    super.init();
    this.shapes = {cube: new defs.Instanced_Cube_Index ()};

    this.lightArray = new defs.LightArray({lights:[{direction_or_position: vec4(2.0, 5.0, 0.0, 0.0), color: color(1.0, 1.0, 1.0, 1.0), diffuse: 1, specular: 0.7, attenuation_factor: 0.01}]});
      // this.sun = new defs.Shadow_Light({direction_or_position: vec4(2.0, 5.0, 0.0, 0.0), color: vec3(1.0, 1.0, 1.0), diffuse: 1, specular: 0.7, attenuation_factor: 0.01,
      //   casts_shadow: true});

    this.camera = new Camera({ projection: Mat4.perspective(Math.PI/2, caller.width/caller.height, 0.01, 1024) });


    this.shadowed_shader = new defs.Universal_Shader (LightArray.NUM_LIGHTS, {has_shadows: false});

    //  this.debug_shadow_map = new Material("Debug_Shadow_Map", this.shadowed_shader, { color: vec4(0.76, 0.69, 0.50, 1.0) }, { diffuse_texture: this.sun.shadow_map[0] });
    //  this.sand = new Material("Sand", this.shadowed_shader, { color: vec4(0.76, 0.69, 0.50, 1.0) });
    //  this.shark = new defs.Material_From_File("Shark", this.shadowed_shader, "assets/shark_cm/shark_cm.mtl" );
    this.stars = new Material(this.shadowed_shader, { color: vec4(0.76, 0.69, 0.50, 1.0) }
    //, { diffuse_texture: new Texture( "assets/stars.png" ) }
    );

    // TODO:  Support one UBO called "Lights", rather than individual Light objects each being a UBO?
    // OR keep the current setup involving an array of UBO blocks?
    // const lights = [sun];

    const {camera, lightArray} = this;
    this.uniforms.UBOs = {camera, lightArray, material: this.stars};

    // this.objects = 1;
    // this.size = 1;
    // for (var obj = 0; obj < this.objects; obj++) {
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
    // this.camera = new Camera(vec3(-1.0, 2.0, 1.0));
  }
  render_frame (renderer) {
    if( !renderer.controls )  {
      this.camera.emplace( Mat4.look_at( vec3(-1.0, 2.0, 1.0), vec3(0,0,-1), vec3(0,0,1) ) );
      this.uniforms.camera_inverse = this.camera.fields.camera_inverse;
      this.uniforms.camera_transform = this.camera.fields.camera_world;
      this.animated_children.push( renderer.controls = new defs.Movement_Controls(
              { uniforms: this.uniforms },
// FINISH:
         // Can't do on first frame:    () => {this.camera.fill_buffer(this.camera.fields)}
         // Yuck:
              () => {if(this.buffers.get(this.camera)) this.buffers.get(this.camera).dirty = true;}
              ) );
      renderer.controls.add_mouse_controls( renderer.canvas );
    }
    // this.sun.initialize(renderer);


    this.camera.bind(this, this.camera.get_binding_point());
    this.lightArray.bind(this, this.lightArray.get_binding_point());
// FINISH:
    // Yet another test shape that doesn't work due to sharing transforms VBO.
    //this.shapes.cube.draw( renderer, {lights: Lights}, Mat4.translation(2.0, 5.0, 0.0), this.stars, undefined, 1);

    for (let entity of this.entities) {
      // obj.apply_transform(Mat4.rotation( .1, 0,0,1));
      // obj.set_transforms(Array(this.size).fill(0).map( (x,i) =>
      // Mat4.translation(... vec3(Math.random()* 2 - 1, Math.random(),  Math.random()*2 - 1).times_pairwise(vec3(20, 2, 20)))))
      this.submit(entity);
    }
    renderer.shadow_map_pass(this.uniforms);
    renderer.flush(this.uniforms);
  }
};
