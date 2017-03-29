/**
 * @author Greg Rozmarynowycz<greg@thunderlab.net>
 */
const MDT = require('./mallet.dependency-tree').MDT;
// const convert = require('convert-source-map');

require('angular').module('mallet')
    .service(MDT.Log, [MDT.StateMachine, '$http', Log]);

// const currentScript = document.currentScript.src;

/**
 *
 * @param StateMachine
 * @method debug
 * @method error
 * @method warn
 * @method verbose
 * @method out
 * @method info
 * @constructor
 */
function Log(StateMachine) {
    const levels = [
        'None',
        'Error',
        'Warning',
        'Info',
        'Debug',
        'Verbose',
    ];

    // $http.get(currentScript).then((c) => {
    //     const sourceMap = convert.fromSource(c.data);
    //     console.log(sourceMap);
    // });

    const loggers = [console];
    
    const logState = new StateMachine(levels);
    let level = logState.Info;
    /* eslint no-restricted-properties: "off" */
    const allStates = Math.pow(2, levels.length - 1) - 1;
    // for faster access, store the state locally
    logState.onState(allStates, (newState) => {
        level = newState;
    });
    
    // Expose logging levels
    this.levels = {};
    Object.assign(this.levels, logState);
    
    this.config = (params) => {
        logState.setState(typeof (params.level) !== 'undefined' ? params.level : logState.Error);
    };
    
    /**
     * @param {string} stack
     * @param {number} [calls=0]
     */
    function getTrace(stack, calls = 0) {
        const call = stack
            .split('\n')[calls + 3]
            .split(' at ').pop();
        // we have to trace back to 2 calls because of calls from the logger
        const file = call.split('/').pop();
        const method = call.split(' (').shift();

        return `(${method}:${file}`;
    }
    
    function logOut(args, msgLevel, func) {
        const stack = Error().stack;
        const trace = getTrace(stack);

        if (msgLevel > level) {
            return;
        }

        // args[0] = `${trace} ${args[0]}`;
        args.unshift(trace);
        for (let i = 0, l = loggers.length; i < l; i++) {
            loggers[i][func](...args);
        }
    }
    
    this.error = (...args) => {
        if (level < logState.Error) {
            return;
        }
        
        logOut(Array.prototype.slice.call(args), logState.Error, 'error');
    };
    
    this.warn = (...args) => {
        if (level < logState.Warning) {
            return;
        }
        
        logOut(Array.prototype.slice.call(args), logState.Warning, 'warn');
    };

    this.info = (...args) => {
        if (level < logState.Info) {
            return;
        }
        logOut(Array.prototype.slice.call(args), logState.Info, 'info');
    };
    
    this.out = (...args) => {
        if (level < logState.Info) {
            return;
        }
        logOut(Array.prototype.slice.call(args), logState.Info, 'info');
    };
    
    this.debug = (...args) => {
        if (level < logState.Debug) {
            return;
        }

        logOut(Array.prototype.slice.call(args), logState.Debug, 'debug');
    };

    this.verbose = (...args) => {
        if (level < logState.Verbose) {
            return;
        }

        logOut(Array.prototype.slice.call(args), logState.Verbose, 'debug');
    };
}
