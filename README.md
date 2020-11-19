# tiny-graphics.js

# tiny-graphics-js

The tiny-graphics-js library refactors common WebGL steps, demonstrating how you can organize a complex graphics
program.  Use this library to learn graphics and WebGL, and to reduce clutter that tends to fill up beginner WebGL
projects.  This library is object oriented and mostly contained in a single small file.  Other files supply utilities
for common math operations in graphics, useful GUI tools, and demos.

Tiny-graphics-js mainly excels in an educational setting by showing a compact but effective usage of WebGL commands.
This project bridges the difficult gap that occurs once you've learned WebGL commands but still struggle with excessive
setup code between steps. Tiny-graphics shows how to organize WebGL calls into a flexible program with reusable parts.
With setup code out of the way, you can see your math more clearly, and focus on creativity.

Currently, the main limitations of tiny-graphics-js to be aware of are:

- Compared to crowd-sourced frameworks like three.js, not as many examples exist yet of how to make various graphics
effects. Not all tiny-graphics-js demos are updated/available (such as for ray tracing).
- tiny-graphics uses a draw() function to draw a single shape. Modern graphics frameworks, however, handle shapes and
materials a better way. To reduce the total number of calls to the GPU, they draw as much of the scene at once as
possible in a few "rendering passes". Frameworks like three.js sort your program into a scene graph in an optimized way
to minimize GPU state changes. Although it's possible to design such a framework in tiny-graphics.js yourself out of
Components, this functionality is not built in.
- Parts of tiny-graphics are inspired by React, a popular JavaScript framework. Both feature a tree of Component objects
that design a document. In tiny-graphics the Component tree nodes also do double duty for 3D graphics creation. However,
unlike React, tiny-graphics is not intended for creating high-performance all-purpose documents. Our engine is simpler,
so expect to follow a more fixed document layout that isn't made to track/sync complex UI changes.
- Various still-pending fixes and API enhancements.

## tiny-graphics.js

The main file (tiny-graphics.js) defines just four class definitions useful for a graphics program -- Shape, Shader,
Texture, and Component.

Shape: Explains to the GPU the layout of one type of 3D shape.
Shader: Loads a GLSL shader program onto your graphics card, ultimately converting raw shape data into a final 2D image.
Texture: Manages a 2D image on the GPU that can color (or exert other influence) along a shape's surface.
Component: One piece of your overall program.

In addition, tiny-graphics-js comes with a tiny math library (tiny-graphics-math.js) for common vector and matrix
operations found in computer graphics. It also comes with a file full of helper objects (tiny-graphics-gui.js) for
adding interactive document areas so the user can affect the nearby 3D drawing area. Lastly, tiny-graphics-js comes with
several files containing useful code examples of Shapes, Shaders, and Components, the latter of which are live demos.

## Components

A Component is one piece of your overall program. Each Component both represents some (or all) of a 3D scene, plus some
(or all) of the interactive HTML document surrounding the scene. Components nest inside one another in a hierarchy. Your
web document may contain several 3D canvas drawing areas. Any graphics canvas area on the page can display the combined
3D result of any number of Components, some of which might even be shared across multiple canvas drawing areas.

For an example of how to use Components to draw to several 3D WebGL canvas areas at once, see the demo in "parametric-surfaces.js".

Component is the base class for any scene you might want to design. For simple scenes, your small code snippet will go
in a Component. To use, make your own subclass(es) of Component and override a few of the special functions that affect
how it renders. Depending on which function you override, "rendering" can mean different things:

-render-animation(): Contributing to the 3D animation displayed in a canvas area
-render-layout(): Contributing interactive features and layout changes to the web document
-render-documentation(): Contributing text to the web document, such as a caption above a 3D drawing area explaining it.
-render-controls(): Contributing HTML buttons that specifically control this Component, and live readouts of its values.

Children of a Component might provide some additional tool to the end user -- such as via contributing more 3D shapes
for visualization, or via drawing additional control panel buttons or live text readouts. The root component manages the
whole web document and graphics program by requesting WebGL contexts from the browser and storing active
tiny-graphics-js objects.

## Documentation

Code documentation for this library (plus additional WebGL lessons) can be found in the Wiki for this Github project:
https://github.com/encyclopedia-of-code/tiny-graphics-js/wiki

## Wiki

See the above link to the Wiki for this project.

## Installing tiny-graphics.js

To run a sample using tiny-graphics.js, visit its GitHub Pages link:
https://encyclopedia-of-code.github.io/tiny-graphics-js/

To see all the demos:  Open the included "host.py" file.  Next, open your web browser and direct it to your localhost
address, with the correct port number reported by the "host.py" step.  (For many people this is: http://localhost:8000)

To select a demo, open and edit main-scene.js.  Assign your choice to the Main_Scene variable.  Your choices for scenes are:

* Minimal_Webgl_Demo
* Transforms_Sandbox
* Axes_Viewer_Test_Scene
* Inertia_Demo
* Collision_Demo
* Many_Lights_Demo
* Obj_File_Demo
* Text_Demo
* Scene_To_Texture_Demo
* Surfaces_Demo

The code comments in each file should help, especially if you look at the definition of Transforms_Sandbox.  So should the explanations that some demos print on the page.  Enjoy!

## About tiny-graphics.js

The tiny-graphics.js software library by Garett Ridge has accompanied UCLA Computer Science's 174a course (Intro to Computer Graphics) since 2016.

This code library accompanies and supports a web project by the same author called "The Encyclopedia of Code", a crowd-sourced repository of WebGL demos and educational tutorials that uses an online editor.
