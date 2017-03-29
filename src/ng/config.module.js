'use strict';
/**
 * Created by Greg on 12/10/2016.
 */
var config = require('angular')
    .module('config', []);

config.constant('config.Env', (()=>{
    var host = location.href;
    if(host.indexOf('localhost') > -1){
        return 'dev';
    }
    else if(host.indexOf('stage') > -1){
        return 'stage';
    }
    else {
        return 'prod';
    }
})());

/**
 * @description provides configured path values for different resources
 * @class config.Path
 *  @property api - base api for pulsar media api endpoints
 *  @property appPath
 *  @property scriptModifier
 *  @property relativeBase
 */
config.provider('config.Path', [
    'config.Env',
    PathProvider
]);

function PathProvider(Env) {

    function getPathBase(env){
        switch(env){
            case 'dev': return '/RMWA/pulsar';
            case 'stage': return '/IGME-330-stage/pulsar';
            case 'prod': return '/IGME-330/pulsar';
        }
    }

    function getScriptModifier(env){
        switch(env){
            case 'dev': return '';
            case 'stage':
            case 'prod': return '.min';
        }
    }

    var protocol = Env === 'dev' ? 'http://' : 'https://'; 
    var paths = {
        protocol: protocol,
        host: Env === 'dev' ? `${protocol}localhost:63342` : `${protocol}thunderlab.net`,
        appPath: getPathBase(Env),
        api: `${protocol}thunderlab.net/pulsar-media/api`,
        scriptModifier: getScriptModifier(Env),
        relativeBase: '../',

        forScript(name){return `${this.dist}/${name}${this.scriptModifier}.js`;},
        get base(){return this.host + this.appPath;},
        get dist(){return this.base + '/dist';}
    };

    this.addPath = function(name, value){
        paths[name] = value;
    };

    this.$get = [function pathFactory(){
        return paths;
    }];

}

module.exports = config;