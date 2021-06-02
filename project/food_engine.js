import {PVector} from './fish_engine.js'

export class Food {

  constructor(x, y, z, a) {
    this.position = new PVector(x, y ,x);
    this.eaten = false;
    this.jump = false;
    this.lastJumpTime = 0;
    this.angle = a;
  }

    get_position() {
        return this.position;
    }

    eat() {
        this.eaten = true;
    }
}

