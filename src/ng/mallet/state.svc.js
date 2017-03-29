/**
 * Created by Greg on 10/29/2016.
 */
const MDT = require('./mallet.dependency-tree').MDT;

/**
 * For now just handles maintain app state, might change in the future
 * @name MState
 * @memberOf mallet
 * @property Running
 * @property Loading
 * @property Suspended
 * @property Debug
 */
require('angular').module('mallet').service(MDT.State, [
    MDT.ng.$location,
    MDT.Log,
    State]);

function State($location, Log) {
    const self = this;
    const stateListeners = [];
    let appState = 0;

    // Define states - this is probably getting clever code, but is possible setup
    // for a state machine provider
    ['Running', 'Loading', 'Suspended', 'Debug'].forEach((state, i) => {
        /* eslint no-restricted-properties: "off" */
        Object.defineProperty(self, state, {value: Math.pow(2, i), enumerable: true});
    });

    /**
     * Invokes callbacks for events listening for the given state
     * @param state
     */
    function invokeStateListeners(state) {
        stateListeners.forEach((listener) => {
            if ((listener.state | state) === state){
                listener.callback();
            }
        });
    }

    /**
     * Indicates if a given state is active
     * @param state
     * @returns {boolean}
     */
    this.is = state => (state | appState) === appState;

    /**
     * Returns the current state
     * @returns {number}
     */
    this.getState = () => appState;

    /**
     * Creates an event listener for the given state
     * @param state
     * @param callback
     */
    this.onState = (state, callback) => {
        stateListeners.push({callback, state});
    };

    function deactivate(state) {
        appState ^= appState & state;
    }

    /**
     * Activates the given state; some states will automatically deactive others
     * @param state
     */
    this.setState = (state) => {
        appState |= state;
        switch (state) {
            case self.Suspended:
                deactivate(self.Running | self.Loading);
                break;
            case self.Running:
                deactivate(self.Suspended | self.Loading);
                break;
            default:
                break;
        }

        Log.out(`set state: ${state} => ${appState}`);
        invokeStateListeners(state);
    };

    /**
     * Reset the state machine to the default state, clearing all listeners
     */
    this.clearState = () => {
        appState = self.Loading;
        appState |= $location.search().debug === '1' ? self.Debug : 0;
        stateListeners.length = 0;
    };

    /**
     * Deactivate the given state
     * @param state
     */
    this.removeState = (state) => {
        deactivate(state);
    };

    self.clearState();
}
