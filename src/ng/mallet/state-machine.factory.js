'use strict';
/**
* @author Greg Rozmarynowycz <greg@thunderlab.net>
*/

const MDT = require('./mallet.dependency-tree').MDT;

require('angular')
    .module('mallet')
    .factory(MDT.StateMachine, [
        stateMachineFactory
    ]);

function stateMachineFactory(){
    
    /**
     * Invokes callbacks for events listening for the given state
     * @param {number} state
     * @param {number} prevState
     * @param {Object[]|Array} listeners
     */
    function invokeStateListeners(state, prevState, listeners) {
        for(var i = 0, l = listeners.length; i < l; i++){
            if((listeners[i].state | state) === state){
                listeners[i].callback(state, prevState);
            }
        }
    }
    
    class StateMachine {
        /**
         * @param {string[]} states
         */
        constructor(states){
            if(!(states instanceof Array)){
                throw new TypeError('State Machine must be created with an array of states');
            }
            
            //We don't want these properties to be enumerable (so the states can be assigned)
            Object.defineProperties(this, {
                _state: { //The current state of the state machine
                    value: 0,
                    writable: true
                },
                /** @type {Object[]|Array<} */
                _stateListeners: { //listeners to excute on specific states
                    value: []
                }
            });
            
            states.forEach((state, i) => {
                Object.defineProperty(this, state, {value: Math.pow(2, i), enumerable: true});
            });
        }
        
        /**
         * Indicates if a given state is active
         * @param state
         * @returns {boolean}
         */
        is(state){
             return (state | this._state) === this._state;
        }
        
        getState(){
            return this._state;
        }
        
        /**
         * Creates an event listener for the given state
         * @param state
         * @param callback
         */
        onState(state, callback){
            this._stateListeners.push({
                state: state,
                callback: callback
            });
        }
        
        setState(state){
            var prevState = this._state;
            this._state = state;
            if(prevState !== this._state){
                invokeStateListeners(this._state, prevState, this._stateListeners);    
            }
        }

        addState(state){
            var prevState = this._state;
            this._state |= state;
            if(prevState !== this._state){
                invokeStateListeners(this._state, prevState, this._stateListeners);    
            }
        }
        
        reset(){
            this._state = 0;
        }
        
        removeState(state){
            var prevState = this._state;
            this._state ^= state;
            if(prevState !== this._state){
                invokeStateListeners(this._state, prevState, this._stateListeners);    
            }
        }
    }
    
    return StateMachine;
}