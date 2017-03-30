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
    ADT.ng.$state,
    ADT.network.Client,
    ADT.network.Clock,
    ADT.game.WarpGame,
    ADT.mallet.Log,
    PlayCtrl]};

/**
 *
 * @param $stateParams
 * @param NetworkEntity {NetworkEntity}
 * @param $scope
 * @param $timeout
 * @param $state
 * @param Client {Client}
 * @param Clock {Clock}
 * @param WarpGame {WarpGame}
 * @param Log
 * @constructor
 */
function PlayCtrl($stateParams, NetworkEntity, $scope, $timeout, $state, Client, Clock, WarpGame, Log) {
    if (Client.getUser() === null) {
       return $state.go('lobby');
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

    function startGame() {
        $scope.state = gameState.PLAYING;
        $timeout(() => $scope.$broadcast(GameEvent.playStarted));

        const startTime = Clock.getNow();
        Log.out(`start play at ${startTime}`);
    }

    $scope.endGame =  function endGame() {
        $scope.state = gameState.ENDED;
        Client.emit(MatchEvent.requestEnd);
    };

    Client.addEventListener(MatchEvent.matchEnded, () => {
        $state.go('results', {matchId: $scope.match.getId()});
    });

    NetworkEntity.getById(WarpGame, $stateParams.gameId)
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
        $state.go('lobby');
    });
}
