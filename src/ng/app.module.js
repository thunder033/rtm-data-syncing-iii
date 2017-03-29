'use strict';
/**
 * Created by gjr8050 on 2/24/2017.
 */

window.PriorityQueue = require('../priority-queue').PriorityQueue;
const lobby = require('./lobby');
const network = require('./network');
const game = require('./game');
const mallet = require('./mallet');

const MDT = require('./mallet/mallet.dependency-tree').MDT;
const ADT = require('./app.dependency-tree').ADT;

const angular = require('angular');
require('angular-q-spread');

angular.module('warp-test-client', [
    network.name,
    lobby.name,
    game.name,
    mallet.name,
    require('angular-ui-router'),
    '$q-spread',
]).config([
    ADT.ng.$stateProvider,
    ADT.ng.$urlRouterProvider,
    ADT.ng.$locationProvider,
($stateProvider, $urlRouterProvider, $locationProvider) => {
    $urlRouterProvider.otherwise('/lobby');
    $locationProvider.hashPrefix('');

    $stateProvider.state('lobby', {
        url: '/lobby',
        templateUrl: 'views/lobby.html',
        controller: ADT.lobby.LobbyCtrl,
    }).state('play', {
        url: '/play/:gameId',
        templateUrl: 'views/play.html',
        controller: ADT.game.PlayCtrl,
    }).state('results', {
        url: '/results/:matchId',
        templateUrl: 'views/results.html',
        controller: ADT.game.ResultsCtrl,
    });
}]).run([MDT.Scheduler, MDT.Log, function(MScheduler, Log){
    Log.config({level: Log.Info});
    MScheduler.startMainLoop();
}]);
