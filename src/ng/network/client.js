/**
 * @author Greg Rozmarynowycz <greg@thunderlab.net>
 */

const MDT = require('../mallet/mallet.dependency-tree').MDT;
const IOEvent = require('event-types').IOEvent;
const MatchEvent = require('event-types').MatchEvent;

module.exports = {clientFactory,
resolve: ADT => [
    ADT.network.Connection,
    ADT.ng.$rootScope,
    ADT.network.AsyncInitializer,
    MDT.Log,
    clientFactory]};

function clientFactory(Connection, $rootScope, AsyncInitializer, Log) {
    class Client extends AsyncInitializer {

        constructor() {
            super();
            this.user = null;
            this.connection = Connection;
            const forward = this.forwardClientEvent.bind(this);

            [ // Forward Client Events
                IOEvent.joinedRoom,
                IOEvent.leftRoom,
                MatchEvent.matchStarted,
                MatchEvent.matchEnded,
            ].forEach(e => $rootScope.$on(e, forward));
        }

        getUser() {
            return this.user;
        }

        emit(name, data) {
            this.connection.getSocket().get().emit(name, data);
        }

        forwardClientEvent(evt, args) {
            Log.out('client recieved evt ', evt.name);
            Log.out(args);
            if ((args.user && args.user === this.user) || args.clientEvent === true) {
                const e = new Event(evt.name);
                Object.assign(e, args);
                this.dispatchEvent(e);
            }
        }

        authenticate(credentials) {
            return Connection.authenticate(credentials).then((user) => {
                this.user = user;
                this.emit(IOEvent.joinServer);
                return user;
            });
        }
    }

    return new Client();
}
