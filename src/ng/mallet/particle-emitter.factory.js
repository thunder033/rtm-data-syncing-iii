/**
 * Created by gjr8050 on 11/9/2016.
 */
const MDT = require('./mallet.dependency-tree').MDT;

require('angular').module('mallet').factory(MDT.ParticleEmitter, [
    MDT.Math,
    MDT.Camera,
    MDT.Geometry,
    MDT.Scheduler,
    ParticleEmitter]);

function ParticleEmitter(MM, MCamera, Geometry, MScheduler){
    'use strict';

    //Adjust the speed of all particles so input values can be reasonable
    var particleSpeed = 0.001;

    /**
     *
     * @param {Object} params
     * @param {number} [params.energy=0] how long the particle will live
     * @param {Vector3} [params.startVelocity]
     * @param {number} [params.sizeDecay=0] the rate at which the particle will shrink
     * @param {number} [params.speed=1] how fast the particle moves
     * @param {Vector3} [params.spread] vector determining the overall shape of the system
     * @constructor
     */
    function Particle(params){
        this.transform = new Geometry.Transform();
        this.velocity = MM.vec3(0);
        this.acceleration = MM.vec3(0);
        this.active = true;

        this.startEnergy = params.energy || 0;
        this.startVelocity = params.startVelocity;
        this.sizeDecay = params.sizeDecay || 0;
        this.speed = params.speed || 1;
        this.spread = params.spread;
    }

    /**
     * Hide the particle and deactivate it
     */
    Particle.prototype.die = function(){
        this.active = false;
        this.transform.scale.scale(0);
    };

    /**
     * Spawns the particle at the given location with a random velocity
     * @param {Vector3} spawnPosition
     */
    Particle.prototype.spawn = function(spawnPosition){
        this.active = true;
        this.energy = this.startEnergy;
        this.transform.position.set(spawnPosition);
        this.transform.scale.set(1);

        this.velocity.set(
            0.5 - Math.random(),
            0.5 - Math.random(),
            0.5 - Math.random())
            .mult(this.spread)
            .scale(particleSpeed * this.speed)
            .add(this.startVelocity);
    };

    Particle.prototype.update = function (dt) {
        this.velocity.add(MM.Vector3.scale(this.acceleration, dt));
        this.transform.position.add(MM.Vector3.scale(this.velocity, dt));
        this.transform.scale.scale(1 - this.sizeDecay);

        this.energy -= dt;
    };

    /**
     *
     * @param {Object} params
     * @param {number} [params.energy=100]
     * @param {Image|Array<Image>} params.image
     * @param {number} [params.maxParticleCount=100]
     * @param {number} [params.priority=0]
     * @param {number} [params.rate] default emission rate
     * @param {number} [params.sizeDecay=0] rate at which particle will decay in size
     * @param {number} [params.speed=1] speed of particles
     * @param {Vector3} [params.spread] the relative speeds of particles in each heading (determines shape)
     * @param {Vector3} [params.startVelocity] velocity to add to all particles when they spawn
     * @param {Transform} params.transform
     * @constructor
     */
    function Emitter(params) {
        this.transform = params.transform || new Geometry.Transform();

        this.maxParticleCount = params.maxParticleCount || 100;
        this.particles = new Array(this.maxParticleCount);
        this.particles.fill(null);

        this.transforms = new Array(this.maxParticleCount);
        this.transforms.fill(null);

        this.emitPosition = 1;
        this.endPosition = 0;
        this.image = params.image instanceof Array ? params.image : [params.image];

        //A uniform emitter will use all available particles at constant rate
        this.rate = (params.rate === Emitter.Uniform) ? 1000 / (params.energy / params.maxParticleCount) : params.rate || 0;

        this.emittedElapsed = 0;
        this.emissionTrigger = 1000 / this.rate;

        this.paritcleParams = {
            energy: params.energy || 100,
            sizeDecay: params.sizeDecay || 0,
            speed: params.speed || 1,
            startVelocity: params.startVelocity || MM.vec3(0),
            spread: params.spread || MM.vec3(1)
        };

        this.priority = params.priority;
        MScheduler.schedule((dt) => {
            this.update(dt);
        }, params.priority);
    }

    /**
     * Indicates if the emitter has available particles
     * @returns {boolean}
     */
    Emitter.prototype.canEmit = function(){
        return this.emitPosition !== this.endPosition;
    };

    /**
     * Spawns an inactive particle
     */
    Emitter.prototype.emit = function(){
        if(this.canEmit()){
            var p = this.emitPosition;
            if(this.particles[p] === null){
                this.particles[p] = new Particle(this.paritcleParams);
                this.transforms[p] = this.particles[p].transform;
            }

            this.particles[p].spawn(this.transform.position);
            this.transforms[p] = this.particles[p].transform;

            if(++this.emitPosition >= this.particles.length){
                this.emitPosition = 0;
            }
        }
    };

    /**
     * Draws all particles in the system
     */
    Emitter.prototype.draw = function() {
        MCamera.billboardRender(this.image, this.transforms, this.transform);
    };

    /**
     * Trigger updates of all particles in the system
     * @param {float} dt
     */
    Emitter.prototype.update = function (dt) {

        //If this emitter automatically emits
        if(this.rate > 0){
            this.emittedElapsed += dt;
            if(this.emittedElapsed > this.emissionTrigger){
                this.emittedElapsed = 0;
                this.emit();
            }
        }

        //console.log(this.endPosition + ' ' + this.emitPosition);
        var count = this.particles.length;
        for(var p = this.endPosition, c = 0; c < count; p++, c++){
            if(p >= this.particles.length){
                p = 0;
            }

            if(this.particles[p] === null){
                continue;
            }

            this.particles[p].update(dt);
            // Kill any particle with out energy
            // This is triggered here so the system can track it's particles
            if(this.particles[p].energy <= 0 && this.particles[p].active === true){
                this.particles[p].die();
                this.transforms[p] = null;

                if(++this.endPosition >= this.particles.length){
                    this.endPosition = 0;
                }

            }
        }

        MScheduler.draw(dt => {
            this.draw(dt);
        }, this.priority);
    };

    Emitter.Uniform = -1;

    return {
        Emitter: Emitter
    };
}