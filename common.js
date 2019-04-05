import {tiny} from './tiny-graphics.js';
const { Vec, Mat, Mat4, Color, Shape, Shader, Overridable, Scene } = tiny;           // Pull these names into this module's scope for convenience.

import {widgets} from './tiny-graphics-widgets.js';
Object.assign( tiny, widgets );

const defs = {};

export { tiny, defs };



