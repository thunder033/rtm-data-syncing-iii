/**
 * The intent of Application Dependency Tree is to provide easy (auto-completed!) access
 * to full module dependency names. This speeds typing and ensures accuracy.
 * @author Greg Rozmarynowycz <greg@thunderlab.net>
 */
'use strict';

const ADT = {
    ng: {
        $scope: '$scope',
        $rootScope: '$rootScope',
        $q: '$q',
        $state: '$state',
        $socket: 'socketFactory',
        $stateParams: '$stateParams',
        $timeout: '$timeout',
        $stateProvider: '$stateProvider',
        $locationProvider: '$locationProvider',
        $urlRouterProvider: '$urlRouterProvider',
    }
};

/** @type MDT **/
ADT.mallet = require('./mallet/mallet.dependency-tree').MDT;

module.exports = {ADT};