/**
 * TODO: [Description]
 * @author Greg Rozmarynowycz <greg@thunderlab.net>
 */

const IOEvent = require('event-types').IOEvent;

module.exports = {connectionFactory,
resolve: ADT => [
    ADT.ng.$q,
    ADT.network.Socket,
    ADT.network.AsyncInitializer,
    ADT.network.Clock,
    connectionFactory]};

/**
 * Provides a connection entity
 * @param $q
 * @param Socket
 * @param AsyncInitializer
 * @param Clock {Clock}
 * @returns {ClientConnection}
 */
function connectionFactory($q, Socket, AsyncInitializer, Clock) {
    const deferConnected = $q.defer();
    const deferJoined = $q.defer();

    /**
     * Maintains a connection to the server
     */
    class ClientConnection extends AsyncInitializer {

        constructor() {
            const joinEvt = new Event(IOEvent.joinServer);
            const joined = deferJoined.promise.then((data) => {
                joinEvt.userId = data.userId;
                this.timeDifference = Clock.getNow() - parseFloat(data.serverTime) || 0;
                this.dispatchEvent(joinEvt);
            });

            super([deferConnected.promise, joined]);
            this.user         = null;
            this.ping         = NaN;
            this.pingInterval = null;
            this.pingIntervalTime = 1000;

            this.pingBuffer = new ArrayBuffer(64);
            this.pingView = new DataView(this.pingBuffer);

            this.timeDifference = 0;
        }

        pong(timestamp) {
            this.socket.get().emit(IOEvent.serverPong, timestamp);
        }

        sendPing() {
            this.pingView.setFloat64(0, Clock.getNow());
            this.socket.get().emit(IOEvent.clientPing, this.pingBuffer);
        }

        calculatePing(buffer) {
            if(buffer instanceof ArrayBuffer) {
                const timestamp = new DataView(buffer).getFloat64(0);
                this.ping = Clock.getNow() - timestamp;
            }
        }

        getTimeDifference() {
            return this.timeDifference;
        }

        getPing() {
            return this.ping;
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
            console.log(`await ${this.readyAwait.length} operations...`);
            return this.readyChain
                .then(() => this.socket)
                .catch(e => console.error('Failed to establish Connection: ', e));
        }

        /**
         * Authenticates with the given credientials and retrieves the user
         * @param credentials
         */
        authenticate(credentials) {
            this.socket = new Socket(credentials);

            // Set up events
            this.socket.get().on(IOEvent.connect, deferConnected.resolve);
            this.socket.get().on(IOEvent.joinServer, deferJoined.resolve);

            this.socket.get().on(IOEvent.serverPing, (timestamp) => this.pong(timestamp));
            this.socket.get().on(IOEvent.clientPong, (timestamp) => this.calculatePing(timestamp));

            return this.ready().then(() => {
                this.pingInterval = setInterval(() => this.sendPing(), this.pingIntervalTime);
                return this.user;
            });
        }

        getSocket() {
            if (this.socket === null) {
                throw new Error('Cannot access connection before authentication');
            }

            return this.socket;
        }

        getUser() {
            return this.user;
        }
    }

    return new ClientConnection();
}