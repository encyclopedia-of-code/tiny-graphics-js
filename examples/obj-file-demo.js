import * as defs from './common.js';
import { MatVec, matvec, Texture, RenderListItem, Renderer } from './common.js';
import { Camera, LightArray, Materials } from './common.js';

export class Instanced_Cubes_Demo extends Renderer {
  init () {
    super.init();

    // Don't create any DOM elements to control this scene:
    this.widget_options = { make_controls: false };

    this.num_objects = 100;
    this.shapes = { teapot: new defs.Shape_From_File("assets/teapot.obj"),
                    turtle: new defs.Shape_From_File("assets/13103_pearlturtle_v1_l2.obj"),
                   };

    function blender_pbr_filenames(name) {
      return ["albedo", "roughness", "metallic", "ao", "normal-ogl", "height"]
          .map(s => "assets/" + name + "-bl/" + name + "_" + s + ".png");
    }
    const materials = {
            "gold":      blender_pbr_filenames("gold-scuffed"),
            "leather":   blender_pbr_filenames("older-padded-leather"),
            "turtle":    "assets/13103_pearlturtle_diffuse.jpg",
            "solid":      undefined
    };
    this.num_materials = Object.keys(materials).length;

    this.state.materials = new Materials( materials );
    this.state.samplers.set("texture_array", this.state.materials.texture_array );

    this.state.materials.set("turtle", {
          fallback_roughness: 1,
          fallback_metallicity: .2,
          textured_roughness_amount: .5,
          textured_metallicity_amount: .5,
    });

    this.state.materials.set("gold", { textured_roughness_amount: .8 });

    this.state.shader = new defs.PBR_Shader (2, Materials.NUM_MATERIALS, {has_shadows: false, has_textures: true});

    this.passes = [];
    this.passes.push( Object.create( this.state ) );

    const items = [ new RenderListItem(this.passes[0], this.shapes.teapot, 0),
                    new RenderListItem(this.passes[0], this.shapes.turtle, 0) ];

    for( let i=0; i<2; i++ ) {
      items[i].instance_vars.push(
        ...Array(this.num_objects).fill(0).map( (x,j) =>
              matvec().set_identity().translate( ...matvec([ Math.random()* 2 - 1, 2*i+1,  Math.random()*2 - 1 ])
                                                   .multiply( matvec([20, 2, 20]) ).data )
                                     .rotate(Math.PI, ...matvec().random().normalize().data )
                                     .scale(.5, .5, .5)
        ).map( (m,j) => { return {
          model_transform: m, color: matvec().random().multiply(.3).add( matvec([.7,.7,.7])),
          material_index: j%this.num_materials } } ) );
      this.renderList.insert( items[i] );
    }
/*
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
      const camera = { camera_inverse: matvec().look_at( matvec([0.0, 5.0, 20.0]), matvec([0,0,0]), matvec([0,1,0]) ),
                          projection: matvec().perspective(Math.PI/2, this.width/this.height, 0.01, 500) };
      this.state.camera = new defs.Camera( camera );
      this.controls = new defs.Movement_Controls( { state: this.state } );
      this.controls.add_mouse_controls( this.canvas );
      this.animated_children.push( this.controls );
    }

    this.state.lightArray = new defs.LightArray({ambient: .025, lights:[
           {direction_or_position: matvec([-3.0, 10.0, 0.0, 0.0]),
             color: matvec([1.0, 0.7, 0.7]), diffuse: 1.0, specular: 1.0, attenuation_factor: 0.0001},
           {direction_or_position: matvec([5.0, 10.0, 0.0, 0.0]),
             color: matvec([1.0, 1.0, 1.0]), diffuse: 1.0, specular: 1.0, attenuation_factor: 0.0001}
         ]});
/*
    this.renderList.get(this.passes[0], this.shapes.box, 1).clear();
    for( let i=0; i<this.num_objects; i++) {
      const item = new RenderListItem(this.passes[0], this.shapes.box, 1);
      item.hint = "STREAM_DRAW";
      item.instance_vars.push( { model_transform:
              Mat4.translation(...vec3(Math.random()* 2 - 1, 1,  Math.random()*2 - 1)
                                  .times_pairwise(vec3(20, 10, 20))).times(Mat4.scale(.5,.5,.5))
                              , color: vec3(.5,.5,.5).randomized(.5), material_index: i%this.num_materials } );
      this.renderList.insert( item );
    }
    this.renderList.get(this.passes[0], this.shapes.box, 1).update_per_instance_buffer();
*/
    this.renderList.traverse( (item) => this.draw( item ), {prune: true} );
  }
}import {tiny, defs} from './common.js';
                                                  // Pull these names into this module's scope for convenience:
const { vec3, vec4, vec, color, Mat4, Shape, Material, Shader, Texture, Component } = tiny;

export class Obj_File_Demo extends Component
  {                           // **Obj_File_Demo** show how to load a single 3D model from an OBJ file.
                              // Detailed model files can be used in place of simpler primitive-based
                              // shapes to add complexity to a scene.  Simpler primitives in your scene
                              // can just be thought of as placeholders until you find a model file
                              // that fits well.  This demo shows the teapot model twice, with one
                              // teapot showing off the Fake_Bump_Map effect while the other has a
                              // regular texture and Phong lighting.
    init()
      {                               // Load the model file:
        this.shapes = { "teapot": new Shape_From_File( "assets/teapot.obj" ) };

                                      // Don't create any DOM elements to control this scene:
        this.widget_options = { make_controls: false };
                                                          // Non bump mapped:
        this.stars = { shader: new defs.Textured_Phong( 1 ), color: color( .5,.5,.5,1 ),
          ambient: .3, diffusivity: .5, specularity: .5, texture: new Texture( "assets/stars.png" ) };
                                                           // Bump mapped:
        this.bumps = { shader: new defs.Fake_Bump_Map(  1 ), color: color( .5,.5,.5,1 ),
          ambient: .3, diffusivity: .5, specularity: .5, texture: new Texture( "assets/stars.png" ) };
      }
    render_frame( caller )
      { const t = this.uniforms.animation_time;

        Shader.assign_camera( Mat4.translation( 0,0,-5 ), this.uniforms );    // Locate the camera here (inverted matrix).
        this.uniforms.projection_transform = Mat4.perspective( Math.PI/4, caller.width/caller.height, 1, 500 );
                                                // A spinning light to show off the bump map:
        this.uniforms.lights = [ defs.Phong_Shader.light_source(
                                   Mat4.rotation( t/300,   1,0,0 ).times( vec4( 3,2,10,1 ) ),
                                             color( 1,.7,.7,1 ), 100000 ) ];

        for( let i of [ -1, 1 ] )
        {                                       // Spin the 3D model shapes as well.
          const model_transform = Mat4.rotation( t/2000,   0,2,1 )
                          .times( Mat4.translation( 2*i, 0, 0 ) )
                          .times( Mat4.rotation( t/1500,   -1,2,0 ) )
                          .times( Mat4.rotation( -Math.PI/2,   1,0,0 ) );
          this.shapes.teapot.draw( caller, this.uniforms, model_transform, i == 1 ? this.stars : this.bumps );
        }
      }
  render_explanation()
    { this.document_region.innerHTML +=
        `<p>This demo loads an external 3D model file of a teapot.  It uses a condensed version of the "webgl-obj-loader.js"
         open source library, though this version is not guaranteed to be complete and may not handle some .OBJ files.  It is
         contained in the class "Shape_From_File".
         </p><p>One of these teapots is lit with bump mapping.  Can you tell which one?</p>`;
    }
  }
