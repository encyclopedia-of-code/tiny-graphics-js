import * as defs from './common.js';
import { vec3, vec4, color, Mat4, Texture, RenderListItem, Renderer } from './common.js';
import { Camera, LightArray, Material } from './common.js';

export class Instanced_Cubes_Demo extends Renderer {
  init () {
    super.init();
    this.shapes = {cube: new defs.Cube(), ball: new defs.Subdivision_Sphere(3) };

    this.textured_shader = new defs.Universal_Shader (LightArray.NUM_LIGHTS, {has_shadows: false, has_texture: true});

    this.state.samplers = new Map([ ["diffuse_texture", new Texture( "assets/rgb.jpg" )] ]);

    this.state.shader = new defs.Universal_Shader (LightArray.NUM_LIGHTS, {has_shadows: false, has_texture: false});

    this.fire = new Material({ color: vec4(0.1, 0.1, 0.1, 1.0) });
    this.water = new Material({ color: vec4(0.0, 0.5, 0.5, 1.0) });




    this.state.lightArray =
         new defs.LightArray({ambient: .1, lights:[
           {direction_or_position: vec4(0.0, 10.0, 0.0, 1.0),
             color: vec3(1.0, 0.0, 0.0), diffuse: 0.5, specular: 1.0, attenuation_factor: 0.001},
           {direction_or_position: vec4(5.0, 10.0, 0.0, 0.0),
             color: vec3(1.0, 1.0, 1.0), diffuse: 0.5, specular: 1.0, attenuation_factor: 0.001}
         ]});

  //  this.state_fire = { ...this.state, material: this.fire };
  //  this.state_water = { ...this.state, material: this.water };

     this.state_fire  = Object.assign( Object.create( this.state ), { material: this.fire } );
     this.state_water = Object.assign( Object.create( this.state ), { material: this.water } );

    const items = [ new RenderListItem(this.state_water, this.shapes.cube, 0),
                    new RenderListItem(this.state_water, this.shapes.ball, 0) ];

    for( let i=0; i<2; i++ ) {
      items[i].model_transforms.push(
        ...Array(1000).fill(0).map( (x,j) =>
              Mat4.translation(... vec3(Math.random()* 2 - 1, 2*i+1,  Math.random()*2 - 1)
                                  .times_pairwise(vec3(20, 2, 20))).times(Mat4.scale(.5,.5,.5)) )
      );
      this.renderList.insert( items[i] );
    }

    for( let i=0; i<1000; i++) {
      const item = new RenderListItem(this.state_fire, this.shapes.cube, 0);
      item.hint = "STREAM_DRAW";
      item.model_transforms.push(
              Mat4.translation(... vec3(Math.random()* 2 - 1, 5,  Math.random()*2 - 1)
                                  .times_pairwise(vec3(20, 2, 20))).times(Mat4.scale(.5,.5,.5)) )
      this.renderList.insert( item );
    }

    this.renderList.traverse( (item) => item.update_matrices(), {prune: false} );

}
render_frame () {
    if( !this.controls )  {
      const value = { camera_inverse: Mat4.look_at( vec3(0.0, 5.0, 20.0), vec3(0,0,0), vec3(0,1,0) ),
                          projection: Mat4.perspective(Math.PI/2, this.width/this.height, 0.01, 500) };
      this.state.camera = new Camera( value );
      this.controls = new defs.Movement_Controls( this.state );
      this.controls.add_mouse_controls( this.canvas );
      this.animated_children.push( this.controls );
    }

    this.renderList.get(this.state_fire, this.shapes.cube, 0).clear();
    for( let i=0; i<1000; i++) {
      const item = new RenderListItem(this.state_fire, this.shapes.cube, 0);
      item.hint = "STREAM_DRAW";
      item.model_transforms.push(
              Mat4.translation(... vec3(Math.random()* 2 - 1, 5,  Math.random()*2 - 1)
                                  .times_pairwise(vec3(20, 2, 20))).times(Mat4.scale(.5,.5,.5)) )
      this.renderList.insert( item );
    }
    this.renderList.get(this.state_fire, this.shapes.cube, 0).update_matrices();

    this.renderList.traverse( (item) => this.draw( item ), {prune: true} );
  }
};
