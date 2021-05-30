//    Jim Pickrell    CS275

import {Food} from './food_engine.js'

//============================ PVector ===========================
// static functions

export function pv_sub(a,b) { // subtract vectors and assign to new object
   let c = new PVector(a.x, a.y, a.z);
   c.x = a.x - b.x;
   c.y = a.y - b.y;
   c.z = a.z - b.z;
   return c;
}

export function pv_add(a,b) { // add vectors and assign to new object
   let c = new PVector(a.x, a.y, a.z);
   c.add(b);
   return c;
}

export function pv_dist(a,b) { // distance between points
   let x = a.dist(b);
   return x;
}

export function pv_dot(a,b) {  // dot product
   let x = a.x * b.x + a.y * b.y + a.z * b.z;
   return x;
}

// Define the PVector object

export class PVector {
   constructor(x, y, z) {
      this.x = x;
      this.y = y;
      this.z = z;
   }

   duplicate() {  // copy points
      let p = new PVector(0,0,0);
      p.x = this.x;
      p.y = this.y;
      p.z = this.z;
      return p;
   }

   add_to(other) {  // vector add points
      let p = new PVector(0,0,0);
      p.x = this.x + other.x;
      p.y = this.y + other.y;
      p.z = this.z + other.z;
      return p;
   }

   add(other) {  // vector add points
      this.x = this.x + other.x;
      this.y = this.y + other.y;
      this.z = this.z + other.z;
      return this;
   }

   sub(other) {  // vector subtract points
      this.x = this.x - other.x;
      this.y = this.y - other.y;
      this.z = this.z - other.z;
      return this;
   }

   div(z) {  // divide point
      this.x = this.x / z;
      this.y = this.y / z;
      this.z = this.z / z;
      return this;
   }

   mult(z) { // scale point
      this.x = this.x * z;
      this.y = this.y * z;
      this.z = this.z * z;
      return this;
   }

   mag() { // magnitude (length)
     var r = this.x * this.x + this.y * this.y + this.z * this.z;
     r = Math.sqrt(r);
     return r;
   }

   normalize() { // normalize to length = 1
     var r = this.x * this.x + this.y * this.y + this.z * this.z;
     r = Math.sqrt(r);
     this.x = this.x / r;
     this.y = this.y / r;
     this.z = this.z / r;
     return this;
   }

   limit(v) { // limit length/magnitude
      var r = this.x * this.x + this.y * this.y + this.z * this.z;
      r = Math.sqrt(r);
      if(r <= v) {
        return;
      }
      var s = v/r;
      this.x *= s;
      this.y *= s;
      this.z *= s;
   }

   set_magnitude(v) { // set length/magnitude - might be longer or shorter
      // compare to limit, which only makes it shorter.
      let r = this.x * this.x + this.y * this.y + this.z * this.z;
      r = Math.sqrt(r);
      //if(r <= v) {
      //  return;
      //}
      let s = v/r;
      this.x *= s;
      this.y *= s;
      this.z *= s;
   }

   dist(other) { // distance between points
      var u = (this.x - other.x) * (this.x - other.x);
      var v = (this.y - other.y) * (this.y - other.y);
      var w = (this.z - other.z) * (this.z - other.z);
      var d = Math.sqrt(u+v+w);
      return d;
   }

   angle() { // find angle to points in x-z plane (around y)
      var PI = 3.14159;
      var a=0;
      if(this.x == 0) {
         a=PI/2;
      }
      else {
         a=Math.atan(this.z / this.x);
      }
      if(this.x <0) {
        a += PI;
      }
      return a;
   }

   anglez () { // find up angle to point
      var PI = 3.14159;
      var a=0;
      if(this.x == 0  && this.z == 0) {
         a=PI/2;
      }
      else {
         a=Math.atan(this.y / Math.sqrt(this.x*this.x + this.z*this.z));
      }
      //  radius is always positive, and z angle is -PI/2 < az < PI/2
      return a;
   }

}

// tests for vector math routines

export function normalize_angle(a) {  // put a in range -pi to pi

   let PI = 3.14159;
   if (a > PI)a = a - 2 * PI;
   if (a > PI)a = a - 2 * PI;
   if (a < -PI)a = a + 2 * PI;
   if (a < -PI)a = a + 2 * PI;
   return a;
}

export function do_math_test() {
   console.log("Math test");
/*
tests have been removed from this version
*/

}



//================================== FISH =========================

// The fish class




export var fish_count = 0;
//export var diminish_speed_rate = 1.0;
export class Fish {  // these are our fish
   // var position;
   // var velocity, acceleration;
   // var r, maxforce, maxspeed;

   constructor(x, y, z, vx, vy, vz) {  // create a fish
      // Fish generally are started at the middle
      // All start with the same velocity but in different directions.
      console.log("Creating fish: " + x + ", " + y + ", " + z);
      let PI = 3.14159;
      this.name = "Fish_" + fish_count;
      this.type = "fish";  // right now the choices are fish or shark but we can add more later.
      this.live = true;    // this will become false if this fish has been eaten.  In that case do not draw it.
      this.mouth_state="fish_CM";
      this.acceleration = new PVector(0, 0, 0);
      this.save_acceleration = new PVector(0, 0, 0);
      this.turning_angle = 0; // xz angle of turn, for drawing turning sharks.
      this.velocity = new PVector(vx, vy, vz);
      this.position = new PVector(x,y,z);
      this.r=2.0;
      this.maxspeed = 1; // 2;
      this.maxforce = 0.03;
      this.desired_separation = 25;

      fish_count++;
   }

   theta () {
      let theta=this.velocity.angle();
      return theta;
   }

//   theta_a () {  // this is not the calculation we need
//      let theta=this.acceleration.angle();
//      this.theta_acceleration = theta;
//      return theta;
//   }

   get_turn_angle() {
      // Is this fish is turning left or right?
      let a = this.velocity.duplicate();
      let b = this.velocity.duplicate();
      b.add(this.save_acceleration);
      let a1 = a.angle();
      a1 = normalize_angle(a1);
      let a2 = b.angle();
      a2 = normalize_angle(a2);
      let a3 = a2-a1;
      a3 = normalize_angle(a3);
      return a3;
   }

   phi () {
      let phi = this.velocity.anglez();
      return phi;
   }

   description() {
       var theta = this.velocity.angle();
       var phi = this.velocity.anglez();
       var s = this.name + " " + this.position.x + ", " + this.position.y + ", " + this.position.z + " angle=" + theta + " anglez=" + phi;
       return s;
   }

   move(fish_list, obstacle_list, food_list, dt) { // move for this fish depends on the whole list

      // calculate accelerations
      // this does not depend on dt

      // obstacles and food are handled within flock

      this.flock(fish_list, obstacle_list, food_list);  // not dt

      // up-date velocities and positions
      // This does depend on dt

      this.update(dt);

      // Make sure the fish stay in the view area

      this.borders();
      this.render();
   }

   applyForce(force) { // modify acceleration for this fish
       this.acceleration.add(force);
   }

   // We accumulate a new acceleration each time based on three rules of flocking
   // plus rules for fleeing predators, eating, and avoiding obstacles


   flock(fish_list, obstacle_list, food_list) {
      // FInd the path for a particular fish
      // Takes into account factors such as schooling,
      // fleeing sharks, and pursuing food
      if(this.type == "fish") {
         let wan = this.wander();              // What the fish does if none of the other forces are active
         let sep = this.separate(fish_list);   // Separation - do not collide with nearby fish
         let ali = this.align(fish_list);      // Alignment - align with nearby fish
         let coh = this.cohesion(fish_list);   // Cohesion - find other fish
         let fod = this.seekFood(food_list);   // Chase food
         let fle = this.flee(fish_list);       // Flee from sharks
         let avo = this.avoid(obstacle_list);  // Do not collide with obstacles

         // Arbitrarily weight these forces
         wan.mult(1.0);
         sep.mult(1.5);
         ali.mult(1.0);
         coh.mult(1.0);
         fod.mult(2.0);
         fle.mult(3.0);
         avo.mult(3.0);

         // Add the force vectors to acceleration
         this.applyForce(wan);  // for the moment this force is zero
         this.applyForce(sep);
         this.applyForce(ali);
         this.applyForce(coh);
         this.applyForce(fod);
         this.applyForce(fle);
         this.applyForce(avo);
      }

      // debugger;

      // this is not really the best way to do it, but for now...
      if(this.type =="shark"){
         let wan = this.wander();              // What the fish does if none of the other forces are active
         let sep = this.separate(fish_list);   // Separation - do not collide with nearby fish

         this.applyForce(wan);  // for the moment this force is zero
         this.applyForce(sep);

         // console.log(this.name + "  looking for food.")
         let food = this.look_for_food(fish_list);
         this.applyForce(food);
         let avo = this.avoid(obstacle_list);  // Do not collide with obstacles
         this.applyForce(avo);
      }

   }

   // Method to seek and eat food
   wander() {
      // Fish have a preference to swim horizontally.
      // scale will control how fast they level out.
      let scale = .1;
      let ay = this.velocity.y;
      ay = - ay * scale;
      var steer = new PVector(0, ay, 0);  // default is do nothing
      return steer;
   }

   seekFood(food_list) {
      // Method to seek and eat food
      var steer = new PVector(0, 0, 0);  // default is do nothing
      let closestFoodCoord = new PVector();   // closet --> closest
      let closestFoodDist = Number.MAX_SAFE_INTEGER;
      for(let food of food_list) {  // we are getting undefined list errors, check calling routine
         let position = food.position;
         if(food.eaten == false) {
            let dist = pv_dist(position, this.position);
            if(dist < 2) {
               food.jump = true;
            }
            if(pv_dist(position, this.position) < 1) {
               food.eaten = true;
            }
            if(pv_dist(position, this.position) < closestFoodDist) {
               closestFoodDist = pv_dist(position, this.position);
               closestFoodCoord = position;
            }
         }
      }

      //threshold for seeing the food
      let seeFoodDist = 30;
      if(closestFoodDist < seeFoodDist) {
         // this.applyForce(this.seek(closetFoodCoord, true));   // changed by jim
//         debugger;
         steer = this.seek(closestFoodCoord, true);
      }
      return steer;
   }

   // Method to up-date position, acceleration and velocity

   update(dt) {

      // console.log("Acceleration received by update: " + JSON.stringify(this.acceleration));

      // Update velocity
      let scale = .2;
      if(dt>scale)dt=scale;

      // preserve direction for the purpose of animating the shark
      //
      this.save_acceleration = this.acceleration.duplicate();  // saves to object

      if(this.type == "shark") {
         // console.log("Acceleration copy: " + JSON.stringify(this.save_acceleration));
         //debugger;  // debugging problems with sharks
      }

      // Make another copy for this calculation
      let a = this.acceleration.duplicate()
      a.mult(dt/scale);

      //this.velocity.add(this.acceleration);
      this.velocity.add(a);

      // Limit speed
      this.velocity.limit(this.maxspeed);

      let v = this.velocity.duplicate();
      v.mult(dt/scale);

      //let f = this.fish_turn_angle();

      //this.position.add(this.velocity);

      // this may not work if it modified the velocity
      this.position.add(v);

      // Reset accelertion to 0 each cycle
      this.acceleration.mult(0);
   }

   // A method that calculates and applies a steering force towards a target
   // STEER = DESIRED MINUS VELOCITY
   seek(target) {
      var desired = pv_sub(target, this.position);  // A vector pointing from the position to the target
      // Scale to maximum speed
      desired.normalize();
      desired.mult(this.maxspeed);

      // Steering = Desired minus Velocity
      var steer = pv_sub(desired, this.velocity);
      steer.limit(this.maxforce);  // Limit to maximum steering force
      return steer;
   }

   render() {

      let theta = this.velocity.angle();
      let phi = this.velocity.anglez();  ////>>>>>???????

/*
      console.log("Rendering object: " + this.position.x + ", "
                                       + this.position.y + ", "
                                       + this.position.z

                                       + " v="
                                       + this.velocity.x + ", "
                                       + this.velocity.y + ", "
                                       + this.velocity.z + " "

                                       + " a=" + theta + " az=" + phi);
*/
   }

   // Wraparound
   //
   // Keep the fish in our test area
   // game area is width x height x depth

   borders() {
      var r = this.r;  // r=2    size of the fish
      if (this.position.x < -game_width-r) this.position.x = game_width+r;
      if (this.position.y < -game_height-r) this.position.y = game_height+r;
      if (this.position.z < -game_depth-r) this.position.z = game_depth+r;
      if (this.position.x > game_width+r)  this.position.x = -game_width-r;
      if (this.position.y > game_height+r) this.position.y = -game_height-r;
      if (this.position.z > game_depth+r)  this.position.z = -game_depth-r;
   }

   avoid(obstacle_list) {
      // console.log(this.name + ": Avoid method called to dodge obstacles.")
      var sum = new PVector(0, 0, 0);
      let d = 0;
      let nearest_d = 1000;
      let nearest_obstacle = 0;
      let max_vision_range = 10;
      let v = this.velocity.mag();

      //debugger;

      for (let obstacle of obstacle_list) {
         d = pv_dist(this.position, obstacle.position);

         let r = this.r + obstacle.r;  // allow for radius of obstacle and fish

         if(d==0){
            console.log("Warning: fish is sitting on an object distance=0.  Numerically this is a problem.")
            sum.add(1,0,0);  // default behavior.  This is completely arbitrary
            // but will prevent our fish from sitting on an obstacle and not moving.
         }
         else  if(d < (2*v + r)) { // we are too close
            // console.log("Fish distance to blocking obstacle is " + d);
            let scaled_velocity = this.velocity.duplicate();
            scaled_velocity.set_magnitude(d);
            let point_of_closest_approach = pv_add(this.position, scaled_velocity);
            let vector_of_closest_approach = pv_sub(point_of_closest_approach, obstacle.position);
            let distance_of_closest_approach = vector_of_closest_approach.mag();
            // console.log("Distance of closest approach on current path is " + distance_of_closest_approach);
            let minimum_acceptable_distance = 2*v + r;
            if(distance_of_closest_approach > minimum_acceptable_distance) {
               // console.log("No collision.  Distance of closests approach = " + distance_of_closest_approach +
               //   " > min disk " + minimum_acceptable_distance + ".   No action taken");
            }
            else {
               // console.log("We will collide.  Distance of closests approach = " +
               //distance_of_closest_approach +
               //    "\nMinimum acceptable distance = " + minimum_acceptable_distance +
               // ".  \nWe will attempt to evade.");

               // if we are headed directly to the center, choose an arbitrary perpendiclar vector
               //let p = PVector(0,0,0);
               if(distance_of_closest_approach == 0) { // handle by hand
                  // create perpendicular
                  vector_of_closest_approach = new PVector(this.velocity.y, -this.velocity.x, this. velocity.z);
                  distance_of_closest_approach = vector_of_closest_approach.mag();
                  // console.log("vector of closest approach reset to " + JSON.stringify(vector_of_closest_approach));
               }
               // Vector of closest approach is the vector we want to add to our current velocity
               // however, we need to scale it.
               vector_of_closest_approach.set_magnitude(minimum_acceptable_distance);
               // console.log("Nudge=" + JSON.stringify(vector_of_closest_approach));
               // actually we should also subtract the original vector of closest approachb but I'll do that later.

               sum.add(vector_of_closest_approach);
            }
         }
      }
      return sum;
   }  // end of function


   // Separation
   //
   // Method checks for nearby fish and steers away from them

   // I am modifying this to prevent sharks from colliding too  --Jim

   separate (fishes) {
      var desired_separation = 6;  // 25.0;
      // we might want to make this different for sharks
      if(this.type=="shark") desired_separation = 25;

      var steer = new PVector(0, 0, 0);
      var count = 0;

      // For every fish in the system, check if it's too close
      // This applies to all fish, I think
      // except sharks

      for (let other of fishes) {

         // we might want to check the type of the fish
         // fish avoid everyone
         // sharks avoid each other but do not avoid fish

         var d = pv_dist(this.position, other.position);
         // If the distance is greater than 0 and less than an
         // arbitrary amount (0 when you are yourself)

         if ((d > 0) && (d < desired_separation) && this.type == other.type) {
            // Calculate vector pointing away from neighbor
            var diff = pv_sub(this.position, other.position);
            diff.normalize();
            diff.div(d);        // Weight by distance
            steer.add(diff);
            count++;            // Keep track of how many
         }
      }
      // Average -- divide by how many
      if (count > 0) {
         steer.div(count);
      }

      // As long as the vector is greater than 0
      if (steer.mag() > 0) {

         // Implement Reynolds: Steering = Desired - Velocity
         steer.normalize();
         steer.mult(this.maxspeed);
         steer.sub(this.velocity);
         steer.limit(this.maxforce);
      }
      return steer;
   }

   flee (fishes) {  // run away from sharks
      var desiredseparation = 25.0;
      var steer = new PVector(0, 0, 0);
      var count = 0;

      // if there is a shark run away

      for (let other of fishes) {

         if(other.type == 'shark') {
            var d = pv_dist(this.position, other.position);
            // If the distance is greater than 0 and less than an
            // arbitrary amount (0 when you are yourself)

            if ((d > 0) && (d < desiredseparation)) {
               // Calculate vector pointing away from neighbor
               var diff = pv_sub(this.position, other.position);
               diff.normalize();
               diff.div(d);        // Weight by distance
               steer.add(diff);
               count++;            // Keep track of how many
            }
         }

      }
      // divide by how many to get the average
      if (count > 0) {
         steer.div(count);
      }

      // As long as the vector is greater than 0
      if (steer.mag() > 0) {

         // Implement Reynolds: Steering = Desired - Velocity
         steer.normalize();
         steer.mult(this.maxspeed);
         steer.sub(this.velocity);
         steer.limit(this.maxforce);
      }
      return steer;
   }

   // Alignment
   //
   // For every nearby fish in the system, calculate the average velocity
   align (fish_list) {
      var neighbordist = 50;
      var sum = new PVector(0, 0, 0);
      var count = 0;
      for (let other of fish_list) {
         var d = pv_dist(this.position, other.position);
         if (other.type == 'fish' && other.live == true && (d > 0) && (d < neighbordist)) {
            sum.add(other.velocity);
            count++;
         }
       }

      if (count > 0) {
         sum.div(count);

         // Implement Reynolds: Steering = Desired - Velocity

         sum.normalize();
         sum.mult(this.maxspeed);
         var steer = pv_sub(sum, this.velocity);
         steer.limit(this.maxforce);
         return steer;
      }
      else {
         return new PVector(0, 0, 0);
      }
   }

   // Cohesion method
   //
   // For the average position (i.e. center) of all nearby fish, calculate steering vector towards that position

   cohesion (fish_list) {
      var neighbordist = 50;
      var sum = new PVector(0, 0, 0);   // Start with empty vector to accumulate all positions
      var count = 0;

      for (let other of fish_list) {
         var d = this.position.dist(other.position);
         if (other.type == 'fish' && other.live == true && (d > 0) && (d < neighbordist)) {
            sum.add(other.position); // Add position
            count++;
         }
       }
       if (count > 0) {
          sum.div(count);
          return this.seek(sum);  // Steer towards the position
       }
       else {
          return new PVector(0, 0, 0);
       }
   }
}


//------------------------------ SHARK ----------------------------------

export class Shark extends Fish {

   constructor(x, y, z, vx, vy, vz) {
      console.log("Creating shark: " + x + ", " + y + ", " + z);
      super(x, y, z, vx, vy, vz) ;
      this.name="Shark_" + (fish_count-1);
      this.type="shark";
      this.mouth_state="shark_CM";
      this.r = 5;
   }

   look_for_food(fish_list) {   // go through the list and see if we can find anything to eat
      // debugger;
      // console.log("Checking distances of potential food.")
      let food_distance = 1000;   // arbitrary far away distance
      let vision_distance = 35;    // shark can't see very far
      let bite_distance = 5;  // how close to food we are eating.
      let food_direction = new PVector(0, 0, 0);
      let food = 0;
      this.mouth_state="shark_CM";

      // Find the nearest edible and live fish
      for (let other of fish_list) {
         if(other.live == true) {
            if(other != this) {
               let d = this.position.dist(other.position);
               if (d < food_distance) {
                  if (other.type == "fish") {  // self is excluded, right?
                     food = other;  // We have found an edible fish within vision range
                     food_distance = d
                  }
               }
            }
         }
      }

      // Is the edible fish in vision distance?
      if(food_distance <= vision_distance) {  // food found, aim for it
         // debugger;
         food_direction = this.seek(food.position);
         // console.log("Food located: " + food.name);
         this.mouth_state="shark_OM";
      }

      if(food_distance <= bite_distance) {  // food found, aim for it
         // debugger;
         ///food_direction = this.seek(food.position);
         console.log("Food eaten: " + food.name);
         let bleep_sound = new Audio("sounds/blip.mp3");
         bleep_sound.play();
         // Playing the sound does not work.  The command is correct, but
         // we get an error that the "play failed because user didn't interact with document first.""
         // I am not sure what the best fix for this is.

         food.live = false;  // this removes this fish from play.o
         //debugger;
      }

      return food_direction;
   }
}

//=============================== OBSTACLES ===============================

var n_obstacles = 0;
export class Obstacle {
   constructor(x, y, z, r) {
      console.log("Creating obstacle");
      this.position = new PVector(x,y,z);
      this.r = r;
      this.h = 0;
      this.name = "Obstacle_" + n_obstacles;
      this.type = "obstacle";
      n_obstacles++;
   }
}

export class Ball extends Obstacle {
   constructor (x, y, z, r) {
      super(x,y,z,r);
      this.type = "ball";
      this.name = "Ball_" + n_obstacles;
      n_obstacles ++;
   }
}

export class Cylinder extends Obstacle {
   constructor (x, y, z, r, h) {
      super(x,y,z,r);
      this.type = "cylinder";
      this.name = "Cylinder_" + n_obstacles;
      this.h = h;
      n_obstacles ++;
   }
}





//=================================== SCHOOL ===================================

export class School {

   // I don't know if SCHOOL is a good name for this object, because it
   // contains all the fish and obstacles.

   constructor() {
      console.log("Creating a School");
      this.fish_list=[];
      this.obstacle_list=[];

      //      this.food_list=[];  //  this should be moved here

      // debugger;
   }





   run(food_list, dt) {
      for(let fish of this.fish_list) {

         // eventually we will want to move this to the school
         // object so it is handeld the same as obstacles and fishes

         fish.move(this.fish_list, this.obstacle_list, food_list, dt);
      }
   }

   on_obstacles(food_coord) {  //Brooke
       let smallest_dist = Number.MAX_SAFE_INTEGER;
       let max_range = 2;
       //console.log("Caculate distance");
       for (let obstacle of this.obstacle_list) {
           let dist = pv_dist(food_coord, obstacle.position);
           dist = dist - (1.5 * obstacle.r);
           if (dist <0) dist = 0; //  a rough approximation of distance
           if(dist < smallest_dist) {
               smallest_dist = dist;
           }
       }
       if(smallest_dist < max_range) {
           return true;
       }
       return false;
   }

   get_open_location() {  // Brooke
       // We want a location that is not blocked by an obstacle
       // This can be used when creating food or fish

       let play_area = .8 * game_size;
       if(play_area < 10) play_area = 10;  // just in case

       let x = Math.floor(Math.random() * play_area * 2.0) - play_area;
       let y = Math.floor(Math.random() * play_area * 2.0) - play_area;
       let z = Math.floor(Math.random() * play_area * 2.0) - play_area;

       let food_coord = new PVector(x, y, z);
       while(this.on_obstacles(food_coord)) {
           // console.log("Keep trying");
           x = Math.floor(Math.random() * play_area * 2.0) - play_area;
           y = Math.floor(Math.random() * play_area * 2.0) - play_area;
           z = Math.floor(Math.random() * play_area * 2.0) - play_area;
           food_coord = new PVector(x, y, z);
       }
       return food_coord;
   }

   add_fish(b) {
      this.fish_list.push(b);
   }


   add_a_shark() {
      // Choose a random direction and location
      let angle = Math.random() * 2 * Math.PI;
      let anglez = -Math.PI/2 + (Math.random() * Math.PI);  // about -1.6 to 1.6
      // x is left, y is up, z is towards us
      let l = this.get_open_location();
      let f = new Shark(l.x, l.y, l.z,
         Math.cos(angle),
         Math.sin(anglez),
         Math.sin(angle)  );
      this.add_fish(f);
      return f;
   }


   add_a_fish() {
      // Choose a random location
      let l = this.get_open_location();

      // choose a random direction
      let angle = Math.random() * 2 * Math.PI;
      let anglez = -Math.PI/2 + (Math.random() * Math.PI);  // about -1.6 to 1.6
      let f = new Fish(l.x, l.y, l.z,
         Math.cos(angle),
         Math.sin(anglez),
         Math.sin(angle)  );
      this.add_fish(f);

      return f;
   }


   add_school_fish() {
      // Createa a school of fish
      let nfish = 10;

      // Choose a random location
      let l = this.get_open_location();
      let i = 0;

      for(i = 0; i < nfish; i++) {
         // choose a random direction
         let angle = Math.random() * 2 * Math.PI;
         let anglez = -Math.PI/2 + (Math.random() * Math.PI);  // about -1.6 to 1.6
         let f = new Fish(l.x, l.y, l.z,
            Math.cos(angle),
            Math.sin(anglez),
            Math.sin(angle)  );
         this.add_fish(f);

      }
   }





   clear_all_fish() {
      // restart the simulation by deleting all the fish and sharks.
      this.fish_list.length = 0;
   }





   add_obstacle(b) {
      this.obstacle_list.push(b);
   }

   display(i) {

      let vx=0;
      let vy=0;
      let vz=0;
      let fishcount = 0;

      var my_text = "Turn " + i + "<br /><pre>";
      for(let f of this.fish_list) {
         my_text += f.description();
         vx += f.velocity.x;
         vy += f.velocity.y;
         vz += f.velocity.z;
         fishcount++;
         my_text += "<br />";
         fishcount++;

      }
      vx = vx / fishcount;
      vy = vy / fishcount;
      vz = vz / fishcount;

      my_text += "Avg V = " + vx + ", " + vy + ", " + vz ;
      my_text +="</pre>";
      document.getElementById("line3").innerHTML = my_text;
   }
}

//========================= GAME =====================

var game_size = 40;
var NUMBER_OF_FISH = 40; // for testing purposes we will have just a few fish
var NUMBER_OF_SHARKS = 1;
var game_height = game_size;
var game_width = game_size*2.0;
var game_depth = game_size;

export class Game {
   constructor() {
      console.log("Creating a Game");

     // debugger;

      this.school = new School();

      //   CORAL
      //
      // Draw Coral as a random stack of balls.
      // The size varies.  They will overlap a little with random offsets.

      let n_coral_balls = 6;
      let max_coral_size = 20;
      let base = -60;
      let separation = 35;
      var i=0;
      let x = 0;
      let y = -50;
      let z = 0;

      let j = 0;

      // Create coral obstacles

      for(j = -separation; j <= separation; j = j + separation) {
         x = j;
         y = base;
         for(i = 0; i<n_coral_balls; i++) {
            let r = Math.random()*max_coral_size;
            if(i>0) {
                  x = x + r * .7 * (Math.random() - .5);
                  y = y + .8 * r;
            }

            let o1 = new Ball(x, y, z, r);
            this.school.add_obstacle(o1);
            y = y + .8*r;
         }
      }


      // Add fish

      let f = 0;
      var i=0;

      let u = this.school.get_open_location();

      for (i = 0; i<NUMBER_OF_FISH; i++) {

         this.angle = Math.random() * 2 * Math.PI;  // choose a random angle for this new fish (xz plane)
         this.anglez = -Math.PI/2 + (Math.random() * Math.PI);  // about -1.6 to 1.6 (xy angle up)

         // x is left, y is up, z is towards us

         f = new Fish(u.x, u.y, u.z,     // all fish will start at the same location
            Math.cos(this.angle),
            Math.sin(this.anglez),    // they will point in some random direction
            Math.sin(this.angle)  );

         this.school.add_fish(f);
         console.log("New fish: " + JSON.stringify(f));
      }
      console.log("We have created " + i + " fish.");

      // Add shark

      for (i=0; i<NUMBER_OF_SHARKS; i++) {           // note that sharks are added to the fish list

         this.angle = Math.random() * 2 * Math.PI;
         this.anglez = -Math.PI/2 + (Math.random() * Math.PI);  // about -1.6 to 1.6

         // x is left, y is up, z is towards us

         let l = this.school.get_open_location();

         let f = new Shark(l.x, l.y, l.z,
            Math.cos(this.angle),
            Math.sin(this.anglez),
            Math.sin(this.angle)  );

//         f = new Shark(-10, 1, 0,
//            Math.cos(this.angle),
//            Math.sin(this.anglez),
//            Math.sin(this.angle)  );

         this.school.add_fish(f);  // note we are adding it as a fish not a shark
         console.log("New shark: " + JSON.stringify(f));
      }

      console.log("We have created " + i + " (shark).");

      // For testing collisions we will have one fish at 0,0,0 heading -1 0 0
      // This guarantees that it will collide with obstacle
      // let testfish = new Fish(0, 0, 0, -1, 0, 0);
      // this.school.add_fish(testfish);

   }

   move(food_list,dt) {
       console.log("Game move dt=" + dt);
       this.school.run(food_list, dt);
       return this.school.fish_list;
   }
}

