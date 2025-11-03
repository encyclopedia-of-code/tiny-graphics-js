import * as defs from './common.js';
import { vec3, vec4, color, Mat4, Texture, RenderListItem, Renderer } from './common.js';
import { Camera, LightArray, Materials } from './common.js';

export class Instanced_Cubes_Demo extends Renderer {
  init () {
    super.init();

    this.num_objects = 1000;
    this.shapes = { cube: new defs.Cube(),
                    teapot: new defs.Shape_From_File("assets/teapot.obj"),
                    ball: new defs.Subdivision_Sphere(3),
                    turtle: new defs.Shape_From_File("assets/13103_pearlturtle_v1_l2.obj"),
                    cone: new defs.Rounded_Closed_Cone(12, 12, [[0,1],[0,1]]) };

    function blender_pbr_filenames(name) {
      return ["albedo", "roughness", "metallic", "ao", "normal-ogl", "height"]
          .map(s => "assets/" + name + "-bl/" + name + "_" + s + ".png");
    }
    const materials = {
            "gold":      blender_pbr_filenames("gold-scuffed"),
            "planks":    blender_pbr_filenames("agedplanks1"),
            "dark-wood": blender_pbr_filenames("dark-wood-stain"),
            "bark":      blender_pbr_filenames("ash-tree-bark"),
            "leather":   blender_pbr_filenames("older-padded-leather"),
            "red":       blender_pbr_filenames("red-scifi-metal"),
            "scales":    blender_pbr_filenames("fancy-scaled-gold"),
            "grass":     blender_pbr_filenames("agedplanks1"),
            "cobble":    blender_pbr_filenames("dusty-cobble"),
            "rgb":       "assets/rgb.jpg",
            "earth":     "assets/earth.gif",
        //  "turtle":    "assets/13103_pearlturtle_diffuse.jpg",
            "solid":      undefined
    };
    this.num_materials = Object.keys(materials).length;

    this.state.materials = new Materials( materials );
    this.state.samplers.set("texture_array", this.state.materials.texture_array );
    /*
    this.state.materials.set("turtle", {
          fallback_roughness: 1,
          fallback_metallicity: .2,
          textured_roughness_amount: .5,
          textured_metallicity_amount: .5,
    });
    */
    this.state.materials.set("gold", { textured_roughness_amount: .8 });

    this.state.shader = new defs.PBR_Shader (LightArray.NUM_LIGHTS, Materials.NUM_MATERIALS, {has_shadows: false, has_textures: true});
    this.state.lightArray = new defs.LightArray({ambient: .025, lights:[
           {direction_or_position: vec4(-3.0, 10.0, 0.0, 0.0),
             color: vec3(1.0, 0.7, 0.7), diffuse: 1.0, specular: 1.0, attenuation_factor: 0.00001},
           {direction_or_position: vec4(5.0, 10.0, 0.0, 0.0),
             color: vec3(1.0, 1.0, 1.0), diffuse: 1.0, specular: 1.0, attenuation_factor: 0.00001}
         ]});

    this.passes = [];
    this.passes.push( Object.create( this.state ) );

    const items = [ new RenderListItem(this.passes[0], this.shapes.cube, 0),
                    new RenderListItem(this.passes[0], this.shapes.ball, 0) ];

    for( let i=0; i<2; i++ ) {
      items[i].instance_vars.push(
        ...Array(this.num_objects).fill(0).map( (x,j) =>
              Mat4.translation(...vec3(Math.random()* 2 - 1, 2*i+1,  Math.random()*2 - 1)
                                  .times_pairwise(vec3(20, 2, 20)))
              .times(Mat4.rotation( Math.PI, ...defs.unsafe3( 0,0,0 ).randomized(1).normalized() ))
              .times(Mat4.scale(.5,.5,.5)) )
        .map( (m,j) => { return {
          model_transform: m, color: vec3(1,1,1).randomized(.3), material_index: j%this.num_materials } } ) );
      this.renderList.insert( items[i] );
    }
/*
    for( let i=0; i<this.num_objects; i++) {
      const item = new RenderListItem(this.passes[0], this.shapes.cube, 1);
      item.hint = "STREAM_DRAW";
      item.instance_vars.push( { model_transform:
              Mat4.translation(...vec3(Math.random()*2 - 1, 1,  Math.random()*2 - 1)
                                  .times_pairwise(vec3(20, 10, 20))).times(Mat4.scale(.5,.5,.5))
                              , color: vec3(.7,.7,.7).randomized(.5), material_index: i%this.num_materials } );
      this.renderList.insert( item );
    }

    const item = new RenderListItem(this.passes[0], this.shapes.turtle, 0);
      item.instance_vars.push( { model_transform:
              Mat4.translation(...vec3(0, .25, .5).times_pairwise(vec3(20, 10, 20)))
                              , color: vec3(.7,.7,.7).randomized(.5), material_index: 11 } );
    this.renderList.insert( item );
*/
   // this.renderList.traverse( (item) => item.update_per_instance_buffer(), {prune: false} );

}
render_frame () {
    if( !this.controls )  {
      const camera = { camera_inverse: Mat4.look_at( vec3(0.0, 5.0, 20.0), vec3(0,0,0), vec3(0,1,0) ),
                          projection: Mat4.perspective(Math.PI/2, this.width/this.height, 0.01, 500) };
      this.state.camera = new Camera( camera );
      this.controls = new defs.Movement_Controls( { state: this.state } );
      this.controls.add_mouse_controls( this.canvas );
      this.animated_children.push( this.controls );
    }
/*
    this.renderList.get(this.passes[0], this.shapes.cube, 1).clear();
    for( let i=0; i<this.num_objects; i++) {
      const item = new RenderListItem(this.passes[0], this.shapes.cube, 1);
      item.hint = "STREAM_DRAW";
      item.instance_vars.push( { model_transform:
              Mat4.translation(...vec3(Math.random()* 2 - 1, 1,  Math.random()*2 - 1)
                                  .times_pairwise(vec3(20, 10, 20))).times(Mat4.scale(.5,.5,.5))
                              , color: vec3(.5,.5,.5).randomized(.5), material_index: i%this.num_materials } );
      this.renderList.insert( item );
    }
    this.renderList.get(this.passes[0], this.shapes.cube, 1).update_per_instance_buffer();
*/
    this.renderList.traverse( (item) => this.draw( item ), {prune: true} );
  }
};
