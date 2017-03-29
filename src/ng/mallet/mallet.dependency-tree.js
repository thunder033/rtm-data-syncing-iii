/**
 * Provide accurate, quick access to full list of mallet dependencies
 * @author Greg Rozmarynowycz <greg@thunderlab.net>
 */
'use strict';

const MDT = {
    ng: {
        $location: '$location',
        $scope: '$scope',
        $rootScope: '$rootScope',
        $q: '$q',
        $state: '$state',
        $socket: 'socketFactory'
    },
    config: {
        Path: 'config.Path'
    },
    const: {
        ScaleFactor: 'mallet.const.ScaleFactor',
        SampleCount: 'mallet.const.SampleCount',
        MaxFrameRate: 'mallet.const.MaxFrameRate',
        Keys: 'mallet.const.Keys',
    },
    AsyncRequest: 'mallet.AsyncRequest',
    Camera: 'mallet.Camera',
    Color: 'mallet.Color',
    mEasel: 'mEasel',
    Easel: 'mallet.Easel',
    Geometry: 'mallet.Geometry',
    Keyboard: 'mallet.Keyboard',
    Log: 'mallet.Log',
    Math: 'mallet.Math',
    MouseUtils: 'mallet.MouseUtils',
    ParticleEmitter: 'mallet.ParticleEmitter',
    ParticleEmitter2D: 'mallet.ParticleEmitter2D',
    Scheduler: 'mallet.Scheduler',
    State: 'mallet.State',
    StateMachine:'mallet.StateMachine',
    Thread: 'mallet.Thread',
};
const mallet = MDT;

module.exports = {MDT};