/**
 * Created by gjrwcs on 10/27/2016.
 */
const MDT = require('./mallet.dependency-tree').MDT;

'use strict';
const math = require('angular').module('mallet-math', []).service(MDT.Math, [MathService]);

function MathService(){

    /**
     * A simple vector class
     * @param x
     * @param y
     * @param z
     * @constructor
     */
    function Vector3(x, y, z){
        this.x = x;
        this.y = typeof y !== 'undefined' ? y : x;
        this.z = typeof z !== 'undefined' ? z : x;
        Object.seal(this);
    }

    /**
     * Creates a shallow copy of the vector
     * @returns {Vector3}
     */
    Vector3.prototype.clone = function () {
        return new Vector3(this.x, this.y, this.z);
    };

    /**
     * Set the vector components to those provided
     * @param {number|Vector3} x
     * @param {number} [y]
     * @param {number} [z]
     * @returns {Vector3}
     */
    Vector3.prototype.set = function(x, y, z){
        if(x instanceof Vector3){
            this.x = x.x;
            this.y = x.y;
            this.z = x.z;
        }
        else {
            this.x = x;
            this.y = typeof y === 'number' ? y : x;
            this.z = typeof z === 'number' ? z : x;
        }
        return this;
    };

    /**
     * Add the given vector to this one
     * @param addend {Vector3}
     */
    Vector3.prototype.add = function(addend) {
        this.x += addend.x;
        this.y += addend.y;
        this.z += addend.z;
        return this;
    };

    /**
     * Subtract the given vector to this one
     * @param addend {Vector3}
     */
    Vector3.prototype.subtract = function(addend) {
        this.x -= addend.x;
        this.y -= addend.y;
        this.z -= addend.z;
        return this;
    };

    /**
     * Scale the vector by the scalar
     * @param scalar
     * @returns {*}
     */
    Vector3.prototype.scale = function(scalar) {
        this.x *= scalar;
        this.y *= scalar;
        this.z *= scalar;
        return this;
    };

    /**
     * Multiplies each component of the 2 vectors
     * @param factor
     * @returns {*}
     */
    Vector3.prototype.mult = function (factor) {
        this.x *= factor.x;
        this.y *= factor.y;
        this.z *= factor.z;
        return this;
    };

    /**
     * Calculates the cross produce of the vector and b
     * @param b {Vector3}
     * @returns {Vector3}
     */
    Vector3.prototype.cross = function(b) {
        return new Vector3(
            this.y * b.z - this.z * b.y,
            this.z * b.x - this.x * b.z,
            this.x * b.y - this.y * b.x
        );
    };

    /**
     * Calcuate the dot product of the vector and b
     * @param b {Vector3}
     * @returns {number}
     */
    Vector3.prototype.dot = function(b) {
        return this.x * b.x + this.y * b.y + this.z * b.z;
    };

    /**
     * Get the length of the vector
     * @returns {number}
     */
    Vector3.prototype.len = function () {
        return Math.sqrt(this.len2());
    };

    /**
     * Get the lengths squared of the vector
     * @returns {number}
     */
    Vector3.prototype.len2 = function(){
        return this.x * this.x + this.y * this.y + this.z * this.z;
    };

    /**
     * Normalize the vector
     * @returns {Vector3}
     */
    Vector3.prototype.normalize = function(){
        var len = this.len() || 1;
        return new Vector3(
            this.x / len,
            this.y / len,
            this.z / len);
    };

    /**
     * Create a unit vector from this vector (normalized and positive)
     * @returns {Vector3}
     */
    Vector3.prototype.unit = function(){
        var len = this.len();
        return new Vector3(
            Math.abs(this.x / len),
            Math.abs(this.y / len),
            Math.abs(this.z / len));
    };

    /**
     * Create a string representation of the vector
     * @returns {string}
     */
    Vector3.prototype.toString = function(){
        return '{' + this.x + ', ' + this.y + ', ' + this.z + '}';
    };

    Vector3.prototype.toBuffer = function(){
        return [this.x, this.y, this.z];
    };

    /**
     * Add the 2 vectors
     * @param a {Vector3}
     * @param b {Vector3}
     * @returns {Vector3}
     */
    Vector3.add = (a, b) => {
        return new Vector3(a.x + b.x, a.y + b.y, a.z + b.z);
    };

    /**
     * Subtract b from a
     * @param a {Vector3}
     * @param b {Vector3}
     * @returns {Vector3}
     */
    Vector3.subtract = (a, b) => {
        return new Vector3(a.x - b.x, a.y - b.y, a.z - b.z);
    };

    /**
     * Creates a new vector by multiplying a and b
     * @param a {Vector3}
     * @param b {Vector3}
     * @returns {Vector3}
     */
    Vector3.mult = (a, b) => {
        return new Vector3(a.x * b.x, a.y * b.y, a.z * b.z);
    };

    /**
     * Creates a new vector by scaling a by scalar
     * @param a {Vector3}
     * @param scalar {number}
     * @returns {Vector3}
     */
    Vector3.scale = (a, scalar) => {
        return new Vector3(a.x * scalar, a.y * scalar, a.z * scalar);
    };

    Vector3.Zero = Object.freeze(new Vector3(0));
    Vector3.One = Object.freeze(new Vector3(1));

    this.Vector3 = Vector3;

    /**
     * A simple vector class
     * @param x {number}
     * @param y {number}
     * @constructor
     */
    function Vector2(x, y){
        this.x = x;
        this.y = typeof y !== 'undefined' ? y : x;
        Object.seal(this);
    }

    /**
     * Adds the given Vector2
     * @param addend {Vector2}
     */
    Vector2.prototype.add = function(addend) {
        this.x += addend.x;
        this.y += addend.y;
        return this;
    };

    /**
     * Scales the vector by the scalar
     * @param scalar
     * @returns {*}
     */
    Vector2.prototype.scale = function(scalar) {
        this.x *= scalar;
        this.y *= scalar;
        return this;
    };

    /**
     * Multiplies each component of the 2 vectors
     * @param factor
     * @returns {*}
     */
    Vector2.prototype.mult = function (factor) {
        this.x *= factor.x;
        this.y *= factor.y;
        return this;
    };

    /**
     *
     * @param a {Vector2}
     * @param b {Vector2}
     * @returns {Vector2}
     */
    Vector2.add = (a, b) => {
        return new Vector2(a.x + b.x, a.y + b.y);
    };

    this.Vector2 = Vector2;

    this.vec2 = (x, y) => {
        return new Vector2(x, y);
    };

    this.vec3 = (x, y, z) => {
        return new Vector3(x, y, z);
    };

    /**
     * Clamps the value between the min and max
     * @param {number} value
     * @param {number} min
     * @param {number} max
     * @returns {number} the clamped value
     */
    this.clamp = (value, min, max) => {
        return Math.min(Math.max(value, min), max);
    };

    /**
     * Returns the sign (1, 0, or -1) of the value
     * @param {number} value
     * @returns {*|number}
     */
    this.sign = (value) => {
        return value && value / Math.abs(value);
    };

    /**
     * Finds the mean of the values and returns the result
     * @param {number[]} values
     */
    this.average = (values) => {
        return values.reduce((avg, value) => avg + value / values.length, 0);
    };
}

module.exports = math;