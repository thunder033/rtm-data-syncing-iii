/**
 * Created by gjrwcs on 11/3/2016.
 */
const MDT = require('./mallet.dependency-tree').MDT;

'use strict';
require('angular').module('mallet') .factory(MDT.Geometry, [
    MDT.Math,
    Geometry]);

function Geometry(MM){

    /**
     * Stores and manipulates _position, scale, and rotation data for an object
     * @param {Transform} [parent=null]
     *
     * @property {Vector3} position
     * @property {Vector3} scale
     * @property {Vector3} rotation
     *
     * @constructor
     */
    function Transform(parent){
        this.position = new MM.Vector3(0);
        this.scale = new MM.Vector3(1);
        this.rotation = new MM.Vector3(0);
        this.origin = new MM.Vector3(0);
        this.parent = parent || null;
        Object.seal(this);
    }

    /**
     * Translate the transform using the velocity scaled by deltaTime
     * @param velocity
     * @param deltaTime
     * @returns {Transform}
     */
    Transform.prototype.timeTranslate = function(velocity, deltaTime){
        this.position.x += velocity.x * deltaTime;
        this.position.y += velocity.y * deltaTime;
        this.position.z += velocity.z * deltaTime;

        return this;
    };

    /**
     * move the transform by the given amount
     * @param {number|Vector3} x
     * @param {number} [y]
     * @param {number} [z]
     * @returns {Transform}
     */
    Transform.prototype.translate = function(x, y, z){
        if(x instanceof MM.Vector3){
            this.position.add(x);
        }
        else {
            this.position.x += x;
            this.position.y += y;
            this.position.z += z;
        }
        return this;
    };

    /**
     * scale the transform by the given amount
     * @param {number|Vector3} x
     * @param {number} [y]
     * @param {number} [z]
     * @returns {Transform}
     */
    Transform.prototype.scaleBy = function(x, y, z){

        if(x instanceof MM.Vector3){
            this.scale.scale(x);
        }
        else {
            this.scale.x *= x;
            this.scale.y *= typeof y === 'number' ? y : x;
            this.scale.z *= typeof z === 'number' ? z : x;
        }
        return this;
    };

    /**
     * rotate the transform by the given amount
     * @param {number|Vector3} x
     * @param {number} [y]
     * @param {number} [z]
     * @returns {Transform}
     */
    Transform.prototype.rotateBy = function (x, y, z) {
        if(x instanceof MM.Vector3){
            this.scale.scale(x);
        }
        else {
            this.rotation.x += x;
            this.rotation.y += typeof y === 'number' ? y : x;
            this.rotation.z += typeof z === 'number' ? z : x;
        }
        return this;
    };

    /**
     * Defines a set of points in space and how they form a 3D object
     * @param {Vector3[]} verts
     * @param {number[]} indices
     * @constructor
     */
    function Mesh(verts, indices){
        this.verts = verts;
        this.indices = indices;
        this.size = Mesh.getSize(verts);
        this.normals = Mesh.buildNormals(this.verts, this.indices) || [];
        Object.seal(this);
    }

    Mesh.VERT_SIZE = 3;

    Mesh.prototype.getVertexBuffer = function(){
        var buffer = new Float32Array(this.verts.length * Mesh.VERT_SIZE);
        this.verts.forEach((vert, i) => {
            var vertIndex = i * Mesh.VERT_SIZE;
            buffer[vertIndex] = vert.x;
            buffer[vertIndex + 1] = vert.y;
            buffer[vertIndex + 2] = vert.z;
        });

        return buffer;
    };

    /**
     * Creates the normals for each face
     * @param {Vector3[]} verts
     * @param {number[]} indices
     * @returns {Vector3[]}
     */
    Mesh.buildNormals = function(verts, indices){
        if(indices.length % 3 !== 0){
            return;
        }

        var faceNormals = new Array(Math.floor(indices.length / 3));
        for(var i = 0; i < indices.length; i += 3){
            var a = verts[indices[i]], b = verts[indices[i + 1]], c = verts[indices[i + 2]];
            var ab = MM.Vector3.subtract(b, a),
                ac = MM.Vector3.subtract(c, a),
                normal = ab.cross(ac).normalize();
                //unitNormal = normal.unit(),
                //toCircumcenter = (normal.cross(ab).scale(ac.len2()) + ac.cross(normal).scale(ab.len2())),
                //circumcenter = MM.Vector3.add(a, toCircumcenter);
                //aAB = Math.acos(a.normalize().dot(b.normalize())) * Math.sign(a.cross(b).dot(normal)),
                //aAC = Math.acos(a.normalize().dot(c.normalize())) * Math.sign(a.cross(c).dot(normal));
                //angle = Math.acos(ab.normalize().dot(ac.normalize())) * Math.sign(ab.cross(ac).dot(unitNormal));

            var faceIndex = i / 3;
            faceNormals[faceIndex] = normal;
            //console.log(`Face ${faceIndex}: ${angle} ${normal} ${unitNormal}`);
        }

        return faceNormals;
    };

    /**
     * Get the dimensions of the mesh buffer
     * @param verts
     */
    Mesh.getSize = (verts) => {
        if(verts.length === 0){
            return;
        }

        var min = verts[0].clone();
        var max = verts[0].clone();

        verts.forEach(v => {
            if(v.x < min.x) {
                min.x = v.x;
            } else if(v.x > max.x) {
                max.x = v.x;
            }


            if(v.y < min.y) {
                min.y = v.y;
            } else if(v.y > max.y) {
                max.y = v.y;
            }


            if(v.z < min.z) {
                min.z = v.z;
            } else if(v.z > max.z) {
                max.z = v.z;
            }
        });

        return MM.Vector3.subtract(max, min);
    };

    var meshes = {
        XYQuad: new Mesh([
                MM.vec3(-0.5, -0.5, 0),
                MM.vec3(-0.5, +0.5, 0),
                MM.vec3(+0.5, +0.5, 0),
                MM.vec3(+0.5, -0.5, 0)], [
                0, 1, 2,  0, 2, 3,
                0, 2, 1,  0, 3, 2]), //We don't want the quad to disappear when it rotates
        XZQuad: new Mesh([
                /**  1  +---+ 2
                 *    /   /
                 * 0 +---+ 3
                 */
                MM.vec3(-0.5, 0, -0.5),
                MM.vec3(-0.5, 0, +0.5),
                MM.vec3(+0.5, 0, +0.5),
                MM.vec3(+0.5, 0, -0.5)], [
                0, 2, 1,  0, 3, 2,
                0, 1, 2,  0, 2, 3]), //We don't want the quad to disappear when it rotates
        Ship: new Mesh([
            /**
             *      2 +
             *      / | \
             *    /   +  \
             * 0 + '  1 ` + 3
             */
            MM.vec3(-0.5, +0.15, +0.50),
            MM.vec3(+0.0, +0.35, +0.35),
            MM.vec3(+0.0, +0.00, -0.50),
            MM.vec3(+0.5, +0.15, +0.50),
            MM.vec3(+0.0, -0.35, +0.35)
        ], [
            0, 2, 1, //Duplicate so certain rotations render

            1, 2, 3,

            0, 1, 4,
            4, 1, 3,
            0, 4, 2,
            4, 3, 2
        ]),
        Cube: new Mesh([
                /**  5  +---+ 6
                 *    /   / |
                 * 1 +---+2 + 7
                 *   |   | /
                 * 0 +---+ 3
                 */
                MM.vec3(-0.5, -0.5, +0.5), //LBF 0
                MM.vec3(-0.5, +0.5, +0.5), //LTF 1
                MM.vec3(+0.5, +0.5, +0.5), //RTF 2
                MM.vec3(+0.5, -0.5, +0.5), //RBF 3

                MM.vec3(-0.5, -0.5, -0.5), //LBB 4
                MM.vec3(-0.5, +0.5, -0.5), //LTB 5
                MM.vec3(+0.5, +0.5, -0.5), //RTB 6
                MM.vec3(+0.5, -0.5, -0.5)],//RBB 7
            [
                0, 1, 2,  0, 2, 3, //F
                2, 6, 3,  3, 6, 7, //R
                1, 5, 6,  1, 6, 2, //T

                4, 6, 5,  4, 7, 6, //Back
                0, 5, 1,  0, 4, 5, //L
                0, 3, 7,  0, 7, 4  //Bottom
            ]),
        Spike: new Mesh([
            MM.vec3(-0.12, -0.12, +0.12), //LBF 0
            MM.vec3(-0.12, +0.12, +0.12), //LTF 1
            MM.vec3(+0.12, +0.12, +0.12), //RTF 2
            MM.vec3(+0.12, -0.12, +0.12), //RBF 3

            MM.vec3(-0.12, -0.12, -0.12), //LBB 4
            MM.vec3(-0.12, +0.12, -0.12), //LTB 5
            MM.vec3(+0.12, +0.12, -0.12), //RTB 6
            MM.vec3(+0.12, -0.12, -0.12), //RBB 7

            MM.vec3(+0.0, +0.5, +0.0), //TC 8
            MM.vec3(+0.0, -0.5, +0.0), //BC 9
            MM.vec3(+0.5, +0.0, +0.0), //RC 10
            MM.vec3(-0.5, +0.0, +0.0), //LC 11
            MM.vec3(+0.0, +0.0, +0.5), //FC 12
            MM.vec3(+0.0, +0.0, -0.5)], //BaC 13
        [  //Top      Right      Front
            1, 8, 2,  3, 2, 10,  1, 2, 12,
            2, 8, 6,  2, 6, 10,  2, 3, 12,
            5, 6, 8,  6, 7, 10,  3, 0, 12,
            1, 5, 8,  7, 3, 10,  0, 1, 12,

            //Bottom  Left       Back
            0, 3, 9,  1, 0, 11,  6, 5, 13,
            3, 7, 9,  0, 4, 11,  5, 4, 13,
            7, 4, 9,  4, 5, 11,  4, 7, 13,
            4, 0, 9,  5, 1, 11,  7, 6, 13
        ])
    };

    return {
        Transform: Transform,
        Mesh: Mesh,

        meshes: meshes
    };
}