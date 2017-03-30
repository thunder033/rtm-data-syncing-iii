/**
 * Created by gjr8050 on 2/24/2017.
 */

window.PriorityQueue = require('../priority-queue').PriorityQueue;
const network = require('./network');
const game = require('./game');
const mallet = require('./mallet');

const MDT = require('./mallet/mallet.dependency-tree').MDT;
const ADT = require('./app.dependency-tree').ADT;

const angular = require('angular');
require('angular-q-spread');

angular.module('gravity-client', [
    network.name,
    game.name,
    mallet.name,
    require('angular-ui-router'),
    '$q-spread',
]).config([
    ADT.ng.$stateProvider,
    ADT.ng.$urlRouterProvider,
    ADT.ng.$locationProvider,
($stateProvider, $urlRouterProvider, $locationProvider) => {
    $urlRouterProvider.otherwise('/game');
    $locationProvider.hashPrefix('');

    $stateProvider.state('game', {
        url: '/game',
        templateUrl: 'views/lobby.html',
        controller: ADT.game.LobbyCtrl,
    });
}]).run([MDT.Scheduler, MDT.Log, (MScheduler, Log) => {
    Log.config({level: Log.Info});
    MScheduler.startMainLoop();
}]);
