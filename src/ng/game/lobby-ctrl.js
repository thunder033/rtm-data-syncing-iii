'use strict';
/**
 * Created by gjr8050 on 2/24/2017.
 */

const IOEvent = require('event-types').IOEvent;

module.exports = {LobbyCtrl,
resolve: ADT => [
    ADT.network.Connection,
    ADT.ng.$scope,
    ADT.network.Client,
    ADT.network.User,
    LobbyCtrl]};

function LobbyCtrl(Connection, $scope, Client, User) {
    const status = {
        LOADING        : 0,
        UNAUTHENTICATED: 1,
        READY          : 2,
        PLAY           : 4,
    };

    $scope.curStatus = status.UNAUTHENTICATED;
    $scope.user = null;
    $scope.status = status;

    $scope.useUser = User; // this is dumb lol

    $scope.getPing = () => Connection.getPing();

    $scope.getStatusName = function getStatusName(index) {
        return Object.keys(status).reduce((name, curName) => {
            return status[curName] === index ? curName : name;
        }, '');
    };

    // creates a callback to assign a value to the scope
    function assignScope(property) {
        return (value) => {
            $scope[property] = value;
        };
    }

    function authenticate(username) {
        if (!username || !username.length) {
            throw new Error('no user name provided');
        }

        return Client.authenticate({name: username})
            .then(assignScope('user'));
    }

    Connection.ready().then(() => {
        $scope.curStatus = status.PLAY;

        Connection.getSocket().get().on(IOEvent.serverError,
            (err) => { $scope.errorMessage = `Error: ${(err.message || err)}`; });
    });

    authenticate('rpgUser');
}
