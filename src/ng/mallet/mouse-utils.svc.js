'use strict';
/**
 * Created by gjr8050 on 12/5/2016.
 */
const MDT = require('./mallet.dependency-tree').MDT;

require('angular')
    .module('mallet')
    .service(MDT.MouseUtils, [MouseUtils]);

function MouseUtils(){

    //http://stackoverflow.com/questions/5598743/finding-elements-position-relative-to-the-document
    function getCoords(elem) { // crossbrowser version
        var box = elem.getBoundingClientRect();

        var body = document.body;
        var docEl = document.documentElement;

        var scrollTop = window.pageYOffset || docEl.scrollTop || body.scrollTop;
        var scrollLeft = window.pageXOffset || docEl.scrollLeft || body.scrollLeft;

        var clientTop = docEl.clientTop || body.clientTop || 0;
        var clientLeft = docEl.clientLeft || body.clientLeft || 0;

        var top  = box.top +  scrollTop - clientTop;
        var left = box.left + scrollLeft - clientLeft;

        return { top: Math.round(top), left: Math.round(left) };
    }

    /**
     * Get the relative coordinates of a mouse click
     * @param {Event} e
     * @param {Element} [target=e.target]
     * @returns {{x: {number}, y: {number}}}
     */
    this.getElementCoords = function(e, target){
        target = target || e.target;
        var mouse = {}; // make an object
        var coords = getCoords(target);
        mouse.x = e.pageX - coords.left;
        mouse.y = e.pageY - coords.top;
        return mouse;
    };

}