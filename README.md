# tiny-graphics.js

This is a small, single file JavaScript utility.  It organizes WebGL programs to be object-oriented and minimally cluttered.  

Writing code with raw JavaScript and WebGL is very repetitive and tedious, whereas using frameworks like three.js creates too much separation between you and learning JavaScript and WebGL.  Unlike other frameworks, tiny-graphics.js is purpose-buit for education and teaches you how it is made.

This tiny library gives your WebGL program access to linear algebra routines, useful UI controls and readouts, and the drawing utilities needed by modern shader-based graphics.  It factors away the repetitive logic of GPU communication into re-usable objects.  The objects can be seamlessly shared between multiple WebGL contexts (drawing regions) on a web page.

The tiny-graphics.js software library has accompanied UCLA Computer Science's 174a course (Intro to Computer Graphics) since 2016, replacing Edward Angel's supplemental code from his textbook "Interactive Computer Graphics: A Top-Down Approach with WebGL".  Compared to Angel's library, tiny-graphics.js offers more organization and functionality.

This code library accompanies and supports a web project by the same author called "The Encyclopedia of Code", a crowd-sourced repository of WebGL demos and educational tutorials that uses an online editor.

To run a sample using tiny-graphics.js, visit its GitHub Pages link: https://encyclopedia-of-code.github.io/tiny-graphics-js/

To see all the demos and edit them:  Open the included "host.bat" or "host.command" file, then open localhost in your browser.  Open Developer Tools and create a workspace for your new folder.  Now you can edit the files, which is necessary to view the different demos.

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

The code comments in each file should help, especially if you look at the definition of Transforms_Sandbox.  So should the explanations that the demos print on the page.  Enjoy!
