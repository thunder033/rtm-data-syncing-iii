'use strict';
/**
 * @author Greg Rozmarynowycz <greg@thunderlab.net>
 */

const GameEvent = require('event-types').GameEvent;
const MatchEvent = require('event-types').MatchEvent;

module.exports = {PlayCtrl,
resolve: ADT => [
    ADT.ng.$stateParams,
    ADT.network.NetworkEntity,
    ADT.ng.$scope,
    ADT.ng.$timeout,
    ADT.network.Client,
    ADT.network.Clock,
    ADT.game.WarpGame,
    ADT.mallet.Log,
    ADT.network.Connection,
    ADT.game.ClientMatch,
    PlayCtrl]};

/**
 *
 * @param $stateParams
 * @param NetworkEntity {NetworkEntity}
 * @param $scope
 * @param $timeout
 * @param Client {Client}
 * @param Clock {Clock}
 * @param WarpGame {WarpGame}
 * @param Log
 * @param Connection
 * @param ClientMatch
 * @constructor
 */
function PlayCtrl($stateParams, NetworkEntity, $scope, $timeout, Client, Clock, WarpGame, Log, Connection, ClientMatch) {
    if (Client.getUser() === null) {
       $scope.errMessage = 'User not connected to server';
    }

    const gameState = {
        LOADING: 0,
        SYNCING: 1,
        PLAYING: 2,
        ENDED: 4,
    };

    $scope.states = gameState;
    $scope.state = gameState.LOADING;
    $scope.secondsToStart = NaN;
    $scope.clientUser = null;
    $scope.match = ClientMatch;

    function startGame() {
        $scope.state = gameState.PLAYING;
        $timeout(() => $scope.$broadcast(GameEvent.playStarted));

        const startTime = Clock.getNow();
        Log.out(`start play at ${startTime}`);
    }

    function loadGame(gameId) {
        return NetworkEntity.getById(WarpGame, gameId)
            .then((game) => {
                if (!game) {
                    const err = `No game was found with game id: ${$stateParams.gameId}`;
                    Log.error(err);
                    $scope.errMessage = err;
                    return;
                }

                $scope.warpGame = game;
                $scope.clientUser = Client.getUser();
                $scope.state = gameState.PLAYING;
                startGame();
            }).catch((e) => {
            Log.error(e);
            $scope.errMessage = e.message || e;
        });
    }

    Connection.ready().then(() => {
        Connection.getSocket().get().on(MatchEvent.matchStarted, (data) => { loadGame(data.gameId); });
    });
}
