# tiny-graphics.js

The tiny-graphics-js library refactors common WebGL steps, demonstrating how to organize a complex graphics program.

Use this library to learn graphics and WebGL.  You will reduce the clutter and repetition that tends to plague beginner
WebGL projects.

The tiny-graphics-js library mainly excels in an educational setting by showing a compact but effective usage of WebGL commands. This project bridges the difficult gap that occurs once you've learned WebGL commands but still struggle with excessive setup code between steps. Tiny-graphics shows how to organize WebGL programs to be flexible with reusable parts. With setup code out of the way, you can see your math more clearly, while free to focus on creativity.

This library is object oriented.  The important code is in a single small file of around 500 lines.  The other files
supply utilities for common math operations in graphics, as well as useful GUI tools, and interactive demos of functionality.

Currently, the main limitations of tiny-graphics-js to be aware of are:

- Crowd-sourced frameworks like three.js include a more comprehensive list of examples of how to make various graphics
effects. The tiny-graphics-js example demos are undergoing an overhaul, so certain demos (such as for ray tracing) won't be included in the main branch until that build.
- Parts of tiny-graphics are inspired by React, a popular JavaScript framework. Both feature a tree of `Component` objects
that design a document. In tiny-graphics the `Component` tree nodes also do double duty for 3D graphics creation, which is
extremely powerful. However, unlike React, tiny-graphics is not intended for creating high-performance all-purpose
documents. Our engine is simpler, so expect to follow a more fixed document layout that isn't made to track/sync complex
UI changes.
- tiny-graphics uses a `draw()` function to draw a single shape. Modern graphics frameworks, however, handle shapes and
materials a better way. To reduce the total number of calls to the GPU, they draw as much of the scene at once as
possible in a few "rendering passes". Frameworks like three.js sort your program into a scene graph in an optimized way
to minimize GPU state changes. It's possible to design such a framework in tiny-graphics.js yourself out of
Components, but this scene graph functionality is not immediately built in.
- Various still-pending fixes and API enhancements.

## Overview and Usage

### tiny-graphics.js

The main file (tiny-graphics.js) defines just four class definitions useful for a graphics program -- `Shape`, `Shader`,
`Texture`, and `Component`.

- **`Shape`**: Explains to the graphics card the layout of one type of 3D shape.
- **`Shader`**: Loads a GLSL shader program onto your graphics card; when run, it ultimately converts raw shape data into a final 2D image.
- **`Texture`**: Manages a 2D image on the GPU that can color (or exert other influence) along a shape's surface.
- **`Component`**: Contains code responsible for designing your 3D scene and your web document.

In addition, tiny-graphics-js comes with a tiny math library (tiny-graphics-math.js) for common vector and matrix
operations that are found in computer graphics. It also comes with a file full of helper objects (tiny-graphics-gui.js) for
adding interactive document areas so the user can affect the nearby 3D drawing area. Lastly, tiny-graphics-js comes with
several files containing useful code examples of possible `Shapes`, `Shaders`, and `Components`, the latter of which are live demos.

### Components

A `Component` is one piece of your overall program. Each `Component` both represents some (or all) of a 3D scene, plus some
(or all) of the interactive HTML document surrounding the scene. Components nest inside one another in a hierarchy. By creating several of them, your
web document may contain several 3D canvas drawing areas. Any graphics canvas area on the page can display the combined
3D result of any number of `Component` objects, some of which might even be shared across multiple canvas drawing areas.

For an example of how to use one `Component` to draw to several 3D WebGL canvas areas at once, see the demo in "parametric-surfaces.js".  Observe how state information (such as camera position and shape rotation) stay synced across drawing areas.

`Component` is the base class for any scene you might want to design. For simple 3D scenes, your small code snippet will go
in a `Component`. To use, make your own subclass(es) of `Component` and override a few of the special functions that affect
how it renders.

Depending on which function you override, "rendering" can mean...

- **`render_animation`**(): ...contributing to the 3D animation displayed in a canvas area.
- **`render_layout`**(): ...contributing interactive features and layout changes to the web document.
- **`render_explanation`**(): ...contributing text to the web document, such as the caption above a 3D drawing area explaining it.
- **`render_controls`**(): ...contributing HTML buttons that specifically control this `Component`, plus live readouts of its values.

Children of a `Component` might provide some additional tool to the end user -- perhaps via contributing more 3D shapes
for visualization, or via drawing additional control panel buttons or live text readouts. The root `Component` manages the
whole web document and graphics program by requesting WebGL contexts from the browser and storing active
tiny-graphics-js objects.

## Documentation

Code documentation for this library (plus additional general WebGL lessons) can be found in the Wiki for this Github project:

https://github.com/encyclopedia-of-code/tiny-graphics-js/wiki

## Wiki

https://github.com/encyclopedia-of-code/tiny-graphics-js/wiki

## Installing tiny-graphics.js

To run a sample using tiny-graphics.js, visit its GitHub Pages link:

https://encyclopedia-of-code.github.io/tiny-graphics-js/

To see all the demos:  Open the included "host.py" file.  Next, open your web browser and direct it to your localhost
address, with the correct port number reported by the "host.py" step.  (For many people this is: http://localhost:8000)

To select a demo, open and edit main-scene.js.  Assign your choice to the `main_scene` variable.  Your choices for scenes are:

* `Minimal_Webgl_Demo`
* `Transforms_Sandbox`
* `Axes_Viewer_Test_Scene`
* `Inertia_Demo`
* `Collision_Demo`
* `Many_Lights_Demo`
* `Obj_File_Demo`
* `Text_Demo`
* `Scene_To_Texture_Demo`
* `Surfaces_Demo`

These demos will be replaced soon with updated ones, but for now they demonstrate several features.  The code comments in each file should help, especially if you look at the definition of `Transforms_Sandbox`.  The explanations that some demos print on the page should be helpful too.  Enjoy!

## About tiny-graphics.js

The tiny-graphics.js software library by Garett Ridge has accompanied UCLA Computer Science's 174a course (Intro to Computer Graphics) since 2016.  In Spring 2019, the course used all-new assignments based on tiny-graphics-js.  The library served as a framework for giving students a high-level tour of computer graphics concepts.  You can view the assignments from Spring 2019 at the link below, including their instructions/specification documents, starting code, and animated results:

https://github.com/encyclopedia-of-code/tiny-graphics-assignments

This code library accompanies and supports a web project by the same author called "The Encyclopedia of Code", a crowd-sourced repository of WebGL demos and educational tutorials that uses an online editor.
