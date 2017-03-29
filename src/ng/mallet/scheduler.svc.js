/**
 * Created by gjr8050 on 9/16/2016.
 */
const MDT = require('./mallet.dependency-tree').MDT;

require('angular').module('mallet').service(MDT.Scheduler, [
    MDT.const.MaxFrameRate,
    MDT.State,
    MDT.ng.$rootScope,
    MDT.Log,
    Scheduler]);

/**
 *
 * @param MaxFrameRate
 * @param MState
 * @param $rootScope
 * @param Log
 * @constructor
 */
function Scheduler(MaxFrameRate, MState, $rootScope, Log) {
    var self = this,
        updateOperations = new PriorityQueue(),
        drawCommands = new PriorityQueue(),
        postDrawCommands = new PriorityQueue(),

        timestep = 1000 / MaxFrameRate,
        fps = MaxFrameRate,
        lastFPSUpdate = 0,
        framesThisSecond = 0,

        suspendOnBlur = false,
        animationFrame = null,

        startTime = 0,
        deltaTime = 0,
        elapsedTime = 0,
        lastFrameTime = 0;

    /**
     * Execute all update opeartions while preserving the queue
     * @param deltaTime
     * @param elapsedTime
     */
    function update(deltaTime, elapsedTime) {
        // reset draw commands to prevent duplicate frames being rendered
        drawCommands.clear();
        postDrawCommands.clear();

        const opsIterator = updateOperations.getIterator();
        while (!opsIterator.isEnd()) {
            opsIterator.next().call(null, deltaTime, elapsedTime);
        }

        // There might be a better way to do this, but not really slowing things down right now
        $rootScope.$apply();
    }

    /**
     * Execute all draw and post-draw commands, emptying each queue
     * @param deltaTime
     * @param elapsedTime
     */
    function draw(deltaTime, elapsedTime) {
        while (drawCommands.peek() !== null) {
            drawCommands.dequeue().call(null, deltaTime, elapsedTime);
        }

        while (postDrawCommands.peek() !== null) {
            postDrawCommands.dequeue().call(null, deltaTime, elapsedTime);
        }
    }

    /**
     * Update the FPS value
     * @param elapsedTime
     */
    function updateFPS(elapsedTime) {
        framesThisSecond++;
        if (elapsedTime > lastFPSUpdate + 1000){
            const weightFactor = 0.25;
            fps = (weightFactor * framesThisSecond) + ((1 - weightFactor) * fps);
            lastFPSUpdate = elapsedTime;
            framesThisSecond = 0;
        }
    }

    /**
     * Derived From
     * Isaac Sukin
     * http://www.isaacsukin.com/news/2015/01/detailed-explanation-javascript-game-loops-and-timing
     */
    function mainLoop() {
        const frameTime =  (new Date()).getTime();
        deltaTime += frameTime - lastFrameTime;
        lastFrameTime = frameTime;
        elapsedTime = frameTime - startTime;

        updateFPS(elapsedTime);

        let updateSteps = 0;
        while (deltaTime > timestep) {
            update(timestep, elapsedTime);
            deltaTime -= timestep;

            if (++updateSteps > 240) {
                Log.warn('Update Loop Exceeded 240 Calls');
                deltaTime = 0; // don't do a silly # of updates
                break;
            }
        }

        draw(deltaTime, elapsedTime);
        animationFrame = requestAnimationFrame(mainLoop);
    }

    this.suspend = (e) => {
        if ((e && e.type !== 'blur') || suspendOnBlur === true) {
            MState.setState(MState.Suspended);
            cancelAnimationFrame(animationFrame);
            $rootScope.$apply();
        }
    };

    this.resume = () => {
        Log.out('resume');
        if (MState.is(MState.Suspended)){
            MState.setState(MState.Running);
            self.startMainLoop();
        }
    };

    function scheduleCommand(command, priority, queue) {
        if (command instanceof Function) {
            priority = priority || 0;
            queue.enqueue(priority, command);
        } else {
            throw new TypeError('Operation must be a function');
        }
    }

    window.addEventListener('blur', this.suspend);

    Object.defineProperties(this, {
        FPS: {get: () => fps},
    });

    /**
     * Initialize the main app loop
     */
    this.startMainLoop = () => {
        startTime = (new Date()).getTime();
        lastFrameTime = (new Date()).getTime();
        animationFrame = requestAnimationFrame(mainLoop);
        MState.setState(MState.Running);
    };

    /**
     * Schedule an update command to be executed each frame
     * @param operation
     * @param order
     */
    this.schedule = (operation, order) => {
       scheduleCommand(operation, order, updateOperations);
    };

    /**
     * Queue a draw opeartion to be executed once and discarded
     * @param operation
     * @param zIndex
     */
    this.draw = (operation, zIndex) => {
        scheduleCommand(operation, zIndex, drawCommands);
    };

    /**
     * Queue a post process operation to be executed one and discarded
     * @param operation
     * @param zIndex
     */
    this.postProcess = (operation, zIndex) => {
        scheduleCommand(operation, zIndex, postDrawCommands);
    };

    /**
     * Clears the set of registered update operations
     */
    this.reset = () => {
        updateOperations.clear();
    };

    /**
     * Toggles suspension of the main loop when the window is blurred
     * @param flag
     */
    this.suspendOnBlur = (flag) => {
        suspendOnBlur = typeof flag !== 'undefined' ? flag : true;
    };
}