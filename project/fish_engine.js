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

   duplicate() {  // add points
      let p = new PVector(0,0,0);
      p.x = this.x;
      p.y = this.y;
      p.z = this.z;
      return p;
   }

   add(other) {  // add points
      let p = new PVector(0,0,0);
      this.x = this.x + other.x;
      this.y = this.y + other.y;
      this.z = this.z + other.z;
      return this;
   }

   sub(other) {  // add points
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


export function do_math_test() {
   console.log("Math test");
/*
   let a = new PVector(2,2,2);
   let b = new PVector(3,0,0);
   let c = new PVector(4,0,-.3);
   let d = new PVector(0,5,0);
   let e = new PVector(-6,-6,-6);

  // let f = new PVector(0,0,0);

   //functions

  // f = pv_add(a,c);

   console.log("Start values:")
   console.log("a=" + JSON.stringify(a));
   console.log("b=" + JSON.stringify(b));
   console.log("c=" + JSON.stringify(c));
   console.log("d=" + JSON.stringify(d));
   console.log("e=" + JSON.stringify(e));

   console.log("Testing static fuctions");

   console.log("f=pv_add(a,b)");

   console.log("a+a=" + JSON.stringify(pv_add(a,a)));
   console.log("a+b=" + JSON.stringify(pv_add(a,b)));
   console.log("d+e=" + JSON.stringify(pv_add(d,e)));
   console.log("e+e=" + JSON.stringify(pv_add(e,e)));
   console.log("a+c=" + JSON.stringify(pv_add(a,c)));

   console.log("f=pv_sub(a,b)");

   console.log("a-a=" + JSON.stringify(pv_sub(a,a)));
   console.log("a-b=" + JSON.stringify(pv_sub(a,b)));
   console.log("d-e=" + JSON.stringify(pv_sub(d,e)));
   console.log("e-e=" + JSON.stringify(pv_sub(e,e)));
   console.log("a-c=" + JSON.stringify(pv_sub(a,c)));

   console.log("f=pv_dist(a,b)");

   console.log("dist(a,a)=" + JSON.stringify(pv_dist(a,a)));
   console.log("dist(a,b)=" + JSON.stringify(pv_dist(a,b)));
   console.log("dist(a,e)=" + JSON.stringify(pv_dist(d,e)));
   console.log("dist(e,e)=" + JSON.stringify(pv_dist(e,e)));
   console.log("dist(a,c)=" + JSON.stringify(pv_dist(a,c)));

   console.log("Test static functions.");
   console.log("a.add(a)" + JSON.stringify(a.add(a)));
   console.log("a.add(b)" + JSON.stringify(a.add(b)));
   console.log("a.add(c)" + JSON.stringify(a.add(c)));
   console.log("a.add(d)" + JSON.stringify(a.add(d)));
   console.log("a.add(e)" + JSON.stringify(a.add(e)));

   console.log("a.sub(a)" + JSON.stringify(a.sub(a)));
   console.log("a.sub(b)" + JSON.stringify(a.sub(b)));
   console.log("a.sub(c)" + JSON.stringify(a.sub(c)));
   console.log("a.sub(d)" + JSON.stringify(a.sub(d)));
   console.log("a.sub(e)" + JSON.stringify(a.sub(e)));

   let x=3;
   a=new PVector(2,2,2);
   console.log("x=3");
   console.log("a.mult(x)=" + JSON.stringify(a.mult(x)));
   console.log("b.mult(x)=" + JSON.stringify(b.mult(x)));
   console.log("c.mult(x)=" + JSON.stringify(c.mult(x)));
   console.log("d.mult(x)=" + JSON.stringify(d.mult(x)));
   console.log("e.mult(x)=" + JSON.stringify(e.mult(x)));

   console.log("a.div(x)=" + JSON.stringify(a.div(x)));
   console.log("b.div(x)=" + JSON.stringify(b.div(x)));
   console.log("c.div(x)=" + JSON.stringify(c.div(x)));
   console.log("d.div(x)=" + JSON.stringify(d.div(x)));
   console.log("e.div(x)=" + JSON.stringify(e.div(x)));

   console.log("a.mag()=" + JSON.stringify(a.mag()));
   console.log("b.mag()=" + JSON.stringify(b.mag()));
   console.log("c.mag()=" + JSON.stringify(c.mag()));
   console.log("d.mag()=" + JSON.stringify(d.mag()));
   console.log("e.mag()=" + JSON.stringify(e.mag()));

   console.log("a.normalize()=" + JSON.stringify(a.normalize()));
   console.log("b.normalize()=" + JSON.stringify(b.normalize()));
   console.log("c.normalize()=" + JSON.stringify(c.normalize()));
   console.log("d.normalize()=" + JSON.stringify(d.normalize()));
   console.log("e.normalize()=" + JSON.stringify(e.normalize()));


   console.log("Testing angle");
   let f = PVector(1,0,0);
   let g = PVector(0,1,0);
   let h = PVector(0,0,1);

   console.log("a.angle()=" + JSON.stringify(a.angle()));
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
      // This is going to require a bunch of fixes to accomodate sharkes and fish that have been eaten.
      // dead fish do not school.
      // dead fish do not attract sharks.
      // dead fish should not be drawn.

      this.acceleration = new PVector(0,0,0);
      this.velocity =  new PVector(vx, vy, vz);
      this.position = new PVector(x,y,z);
      this.r=2.0;
      this.maxspeed = 1; // 2;
      this.maxforce = 0.03;
      this.desired_separation = 25;
      this.food_seekdistance = 0.0;
      this.previous_position = new PVector(x,y,z);

      fish_count++;
   }

   theta () {
      let theta=this.velocity.angle();
      return theta;
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




// debugging - is foodlist defined?



      this.flock(fish_list, obstacle_list, food_list);  // not dt

      // update velocities and positions
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


// I suspect that the foodlist is not getting passed here.
// seekFood is choking on bad foodlist

      if(this.type == "fish") {
         let sep = this.separate(fish_list);   // Separation - do not collide with nearby fish
         let ali = this.align(fish_list);      // Alignment - align with nearby fish
         let coh = this.cohesion(fish_list);   // Cohesion - find other fish
         let fod = this.seekFood(food_list);   // Chase food
         let fle = this.flee(fish_list);       // Flee from sharks
         let avo = this.avoid(obstacle_list);  // Do not collide with obstacles

         // Arbitrarily weight these forces
         sep.mult(1.5);
         ali.mult(1.0);
         coh.mult(1.0);
         fod.mult(2.0);
         fle.mult(3.0);
         avo.mult(3.0);

         // Add the force vectors to acceleration
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
         console.log(this.name + "  loking for food.")
         let food = this.look_for_food(fish_list);
         this.applyForce(food);
         let avo = this.avoid(obstacle_list);  // Do not collide with obstacles
         this.applyForce(avo);
      }
   }

   // Method to seek and eat food
   seekFood(food_list) {

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




   // Method to update position, acceleration and velocity

   update(dt) {
      // Update velocity
      let scale = .2;
      if(dt>scale)dt=scale;

      let a = this.acceleration.duplicate()
      a.mult(dt/scale);

      //this.velocity.add(this.acceleration);
      this.velocity.add(a);
      // Limit speed
      this.velocity.limit(this.maxspeed);

      let v = this.velocity.duplicate();
      v.mult(dt/scale);


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
            console.log("Warning: fish is sitting on an object dsitance=0.  Numerically this is a problem.")
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
               // console.log("We will collide.  Distance of closests approach = " + distance_of_closest_approach +
               //    "\nMinimum acceptable distance = " + minimum_acceptable_distance + ".  \nWe will attempt to evade.");

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

   separate (fishes) {
      var desiredseparation = 4;  // 25.0;
      var steer = new PVector(0, 0, 0);
      var count = 0;

      // For every fish in the system, check if it's too close
      // This applies to all fish, I think
      // except sharks

      for (let other of fishes) {
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
export var food_seekdistance = 0.0;
export class Shark extends Fish {

   constructor(x, y, z, vx, vy, vz) {
      console.log("Creating shark: " + x + ", " + y + ", " + z);
      super(x, y, z, vx, vy, vz) ;
      this.name="Shark_" + (fish_count-1);
      this.type="shark";
      this.mouth_state="shark_CM";
      this.r = 5;
      this.previous_position = new PVector(x,y,z);
   }

   look_for_food(fish_list) {   // go through the list and see if we can find anything to eat
      // debugger;
      console.log("Checking distances of potential food.")
      let food_distance = 1000;   // arbitrary far away distance
      let vision_distance = 50;    // shark can't see very far
      let bite_distance = 5;  // how close to food we are eating.
      let food_direction = new PVector(0, 0, 0);
      let food = 0;
      this.mouth_state="shark_CM";
      let food_seekdistance_threshold = 40.0;
      let food_wander_weight = 10.0;

      console.log(food_seekdistance)
      var tmp_dif = pv_sub(this.position, this.previous_position);
      food_seekdistance = food_seekdistance + tmp_dif.mag();
      this.previous_position = this.position.duplicate();

      if(food_seekdistance > food_seekdistance_threshold){
         var random_x = Math.random() * 2 - 1;
         var random_y = Math.random() * 2 - 1;
         var random_z = Math.random() * 2 - 1;
         food_direction = new PVector(random_x, random_y, random_z)
         food_direction.normalize()
         food_direction.mult(food_wander_weight)
         console.log("Direction test!!")
         console.log(food_direction)
         food_seekdistance = 0.0;
      }

      // Find the nearest edible and live fish
      for (let other of fish_list) {
         if(other.live == true) {
            if(other != this) {
               let d = this.position.dist(other.position);
               if (d < food_distance) {
                  if (other.type == "fish") {  // self is excluded, right?
                     food = other;  // We have found an edible fish within vision range
                     food_distance = d
                     this.food_seekdistance = 0.0;
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

   add_fish(b) {
      this.fish_list.push(b);
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
var NUMBER_OF_FISH = 10; // for testing purposes we will have just a few fish
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


      //let o2 = new Cylinder(-20,0,0, 2, 10);
      //this.school.add_obstacle(02);

      let f = 0;
      var i=0;
      for (i = 0; i<NUMBER_OF_FISH; i++) {

         this.angle = Math.random() * 2 * Math.PI;  // choose a random angle for this new fish (xz plane)
         this.anglez = -Math.PI/2 + (Math.random() * Math.PI);  // about -1.6 to 1.6 (xy angle up)

         // x is left, y is up, z is towards us

         f = new Fish(10, 0, 0,     // all fish will start at the same location
            Math.cos(this.angle),
            Math.sin(this.anglez),    // they will point in some random direction
            Math.sin(this.angle)  );

         this.school.add_fish(f);
         console.log("New fish: " + JSON.stringify(f));
      }
      console.log("We have created " + i + " fish.");

      for (i=0; i<NUMBER_OF_SHARKS; i++) {           // note that sharks are added to the fish list

         this.angle = Math.random() * 2 * Math.PI;
         this.anglez = -Math.PI/2 + (Math.random() * Math.PI);  // about -1.6 to 1.6

         // x is left, y is up, z is towards us

         f = new Shark(-10, 1, 0,
            Math.cos(this.angle),
            Math.sin(this.anglez),
            Math.sin(this.angle)  );

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

