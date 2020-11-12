import {tiny} from '../tiny-graphics.js';
import {defs as shapes} from './common-shapes.js';
import {defs as shaders} from './common-shaders.js';
import {defs as components} from './common-components.js';

const defs = { ...shapes, ...shaders, ...components };

export {tiny, defs};
