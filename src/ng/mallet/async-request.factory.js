/**
 * Created by Greg on 11/20/2016.
 */
const MDT = require('./mallet.dependency-tree').MDT;

(()=>{
    'use strict';

    require('angular').module('mallet').service(MDT.AsyncRequest, [
        MDT.Thread,
        MDT.ng.$q,
        MDT.config.Path,
        asyncRequestFactory]);

    /**
     * Provides a simple set of interfaces for making HTTP requests through web workers
     * @param {mallet.Thread} Thread
     * @param $q
     * @param {config.Path} Path
     * @returns {{send: createRequest, createRequestPool: createRequestPool}}
     */
    function asyncRequestFactory(Thread, $q, Path){

        //TODO: make this a variable somehow...maybe mallet config
        var asyncScript = 'asyncHttpRequest';

        /**
         * Finds an idle thread in the pool, if there are any
         * @param {Thread[]} threads
         * @returns {Thread|null}
         */
        function getIdleThread(threads){
            for(var t = 0; t < threads.length; t++)
            {
                if(threads[t].isIdle()){
                    return threads[t];
                }
            }

            return null;
        }

        /**
         * Creates a pool of threads to be distributed among requests
         * @param {number} [size=1]
         * @param {string} [base='']
         * @constructor
         */
        function RequestPool(size, base)
        {
            var threads = [], // Threads available to execute requests
                requestQueue = new PriorityQueue(); // queue of pending requests awaiting threads

            // Create thread pool of specified size
            for(var o = 0; o < (size || 1); o++) {
                threads.push(Thread.create(Path.forScript(asyncScript)));
            }

            /**
             * Provides a thread to the next queue request
             * @param {Thread} thread
             */
            function dispatchThread(thread) {
                if(requestQueue.peek() !== null){
                    requestQueue.dequeue().resolve(thread);
                }
            }

            // Promise to handle finished op notifications
            // This deferred object never actually gets resolved, it just handles notifications
            var requestComplete = $q.defer();
            // When a request completes, hand off the thread to the next waiting request
            requestComplete.promise.then(null, null, dispatchThread);

            /**
             * Queues up a request for an eventually available thread
             * @returns {Promise}
             */
            function waitForIdleThread() {
                var defer = $q.defer();
                requestQueue.enqueue(0, defer);
                return defer.promise;
            }

            /**
             * Gets an available idle thread or waits for one
             * @returns {IPromise<Thread>|Promise}
             */
            function getThread(){
                return $q.when(getIdleThread(threads) || waitForIdleThread());
            }

            /**
             * Sends a request using the next available thread in the pool
             * @param {HttpConfig} config
             * @returns {Promise.<Object>|*}
             */
            this.send = function(config) {

                return getThread().then(thread => {
                    // adjust any relative paths back to the app root
                    // since web workers CWD is the location of the script
                    config.url = (config.url.indexOf('http') === 0) ? config.url : base + config.url;
                    return thread.invoke(config).finally(()=> {
                        requestComplete.notify(thread);
                    });
                });
            };
        }

        /**
         * Create a RequestPool of the specific size
         * @param {number} threadCount
         * @param {string} [base='../']
         * @returns {RequestPool}
         */
        function createRequestPool(threadCount, base){
            return new RequestPool(threadCount, base || Path.relativeBase);
        }

        //Create a default request pool for arbitrary usage
        var defaultPool = createRequestPool(1, Path.relativeBase);

        /**
         * Sends a request using the default async pool
         * @param {HttpConfig} config
         * @returns {Promise}
         */
        function createRequest(config) {
            return defaultPool.send(config);
        }

        return {
            send: createRequest,
            createRequestPool: createRequestPool
        };
    }
})();