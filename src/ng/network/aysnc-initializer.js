'use strict';
/**
 * @author Greg Rozmarynowycz <greg@thunderlab.net>
 */
const EventTarget = require('eventtarget');

module.exports = {asyncInitializerFactory,
resolve: ADT => [
    ADT.ng.$q,
    asyncInitializerFactory]};

function asyncInitializerFactory($q) {
    class AsyncInitializer extends EventTarget {
        constructor(baseOps = []) {
            super();
            this.readyAwait = baseOps;

            this.readyHandle = $q.defer();
            this.readyChain = this.readyHandle.promise;
            $q.all(this.readyAwait).then(this.readyHandle.resolve);
        }

        /**
         * Add an operation to be resolved before the connection is ready to be used
         * @param promise
         */
        deferReady(promise) {
            this.readyAwait.push(promise);
            // short circuit the ready chain and replace it with a new promise
            this.readyHandle.resolve($q.all(this.readyAwait));
        }

        /**
         * Wait for any operations to complete that allow the connection to be used
         * @returns {Promise<void|T>|Promise<U>|*|Promise.<T>|Promise<void>}
         */
        ready() {
            return this.readyChain
                .then(() => this.socket)
                .catch(e => console.error(`Failed to initialize ${this.constructor.name}: `, e));
        }
    }

    return AsyncInitializer;
}