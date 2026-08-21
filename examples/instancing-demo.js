import * as defs from './common.js';
import { MatVec, matvec, Texture, RenderListItem, Renderer } from './common.js';
import { Camera, LightArray, Materials } from './common.js';

export class Instanced_Cubes_Demo extends Renderer {
  init () {
    super.init();

    this.num_objects = 1000;
    this.shapes = { box: new defs.Cube(),
//                    teapot: new defs.Shape_From_File("assets/teapot.obj"),
                      ball: new defs.Subdivision_Sphere(3),
//                    turtle: new defs.Shape_From_File("assets/13103_pearlturtle_v1_l2.obj"),
//                    cone: new defs.Rounded_Closed_Cone(12, 12, [[0,1],[0,1]])
                   };

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
            "grass":     blender_pbr_filenames("grass1"),
            "cobble":    blender_pbr_filenames("dusty-cobble"),
            "rgb":       "assets/rgb.jpg",
            "earth":     "assets/earth.gif",
        //  "turtle":    "assets/13103_pearlturtle_diffuse.jpg",
            "solid":      undefined
    };
    this.num_materials = Object.keys(materials).length;

    this.state.materials = new Materials( materials );
    this.state.samplers.set("texture_array", this.state.materials.texture_array );
    this.state.materials.set("gold", { textured_roughness_amount: .8 });

    this.state.shader = new defs.PBR_Shader (2, Materials.NUM_MATERIALS, {has_shadows: false, has_textures: true});
    this.state.lightArray = new defs.LightArray({ambient: .01, lights:[
           {direction_or_position: matvec([-3.0, 10.0, 0.0, 0.0]),
             color: matvec([1.0, 0.7, 0.7]), diffuse: 1.0, specular: 1.0, attenuation_factor: 0.0001},
           {direction_or_position: matvec([5.0, 10.0, 0.0, 0.0]),
             color: matvec([1.0, 1.0, 1.0]), diffuse: 1.0, specular: 1.0, attenuation_factor: 0.0001}
         ]});

    this.passes = [];
    this.passes.push( Object.create( this.state ) );

    Array(this.num_objects).fill(0).forEach( (x,j) => {
        const matrix = matvec().translate( 20*(Math.random()* 2 - 1), 2-4*(j%2), 20*(Math.random()*2 - 1) )
                                     .rotate(Math.PI, ...matvec().random().normalize().data )
                                     .scale(.5, .5, .5)

        const color = matvec().random().multiply(.5).add( matvec([.5,.5,.5]));
        this.submit( ( (j%2) ? this.shapes.box : this.shapes.ball), matrix, color, this.state.materials.random() );
    });

/*   TURTLE
    this.state.materials.set("turtle", {
          fallback_roughness: 1,
          fallback_metallicity: .2,
          textured_roughness_amount: .5,
          textured_metallicity_amount: .5,
    });
    const item = new RenderListItem(this.passes[0], this.shapes.turtle, 0);
      item.instance_vars.push( { model_transform:
              Mat4.translation(...vec3(0, .25, .5).times_pairwise(vec3(20, 10, 20)))
                              , color: vec3(.7,.7,.7).randomized(.5), material_index: 11 } );
    this.renderList.insert( item );
*/

}
render_frame () {
    if( !this.controls )  {
      const camera = { camera_inverse: matvec().look_at( matvec([0.0, 5.0, 20.0]), matvec([0,0,0]), matvec([0,1,0]) ),
                          projection: matvec().perspective(Math.PI/2, this.width/this.height, 0.01, 500) };
      this.state.camera = new defs.Camera( camera );
      this.controls = new defs.Movement_Controls( { state: this.state } );
      this.controls.add_mouse_controls( this.canvas );
      this.animated_children.push( this.controls );
    }
    this.renderList.traverse( (item) => this.draw( item ) );
  }
};
