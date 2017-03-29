/**
 * Created by Greg on 10/28/2016.
 */
const MDT = require('./mallet.dependency-tree').MDT;

'use strict';
require('angular').module('mallet').service(MDT.Keyboard, [
    MDT.const.Keys,
    Keyboard]);

/**
 * @method onKeyDown
 * @method isKeyDown
 * @method onKeyUp
 * @param MKeys
 * @constructor
 */
function Keyboard(MKeys){
    var keyState = [],
        keyDownEvents = [],
        keyUpEvents = [];

    function invokeListeners(listeners, e){
        listeners.forEach(listener => {
            //this is sort of unreliable but should be good enough for our purposes
            if(listener.key === e.keyCode || listener.key === String.fromCharCode(e.keyCode)){
                listener.callback(e);
            }
        });
    }

    window.addEventListener('keyup', e => {
        keyState[e.keyCode] = false;
        invokeListeners(keyUpEvents, e);
    });
    
    window.addEventListener('keydown', e => {
        keyState[e.keyCode] = true;
        invokeListeners(keyDownEvents, e);
    });
    
    this.isKeyDown = (keyCode) => {
        return keyState[keyCode] === true;
    };

    this.onKeyDown = (key, callback) => {
        keyDownEvents.push({key: key, callback: callback});
    };

    this.onKeyUp = (key, callback) => {
        keyUpEvents.push({key: key, callback: callback});
    };
}