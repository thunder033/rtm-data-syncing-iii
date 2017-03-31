/**
 * Created by Greg on 12/10/2016.
 */
const ADT = require('./app.dependency-tree').ADT;

ADT.config = {
    Env: 'config.Env',
    Path: 'config.Path',
};

const config = require('angular')
    .module('config', []);

config.constant(ADT.config.Env, (() => {
    const host = location.href;
    if(host.indexOf('localhost') > -1) {
        return 'dev';
    } else if(host.indexOf('stage') > -1) {
        return 'stage';
    } else {
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
 *  @property warpApi
 *  @property protocol
 */
config.provider(ADT.config.Path, [
    ADT.config.Env,
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

    const protocol = Env === 'dev' ? 'http://' : 'https://';
    function getWarpApiPath(env) {
        switch (env) {
            case 'dev': return  `${protocol}localhost:3000`;
            case 'stage': return `${protocol}pulsar-api-stage.herokuapp.com`;
            case 'prod': return `${protocol}pulsar-api.herokuapp.com`;
        }
    }

    const paths = {
        protocol: protocol,
        host: Env === 'dev' ? `${protocol}localhost:63342` : `${protocol}thunderlab.net`,
        appPath: getPathBase(Env),
        api: `${protocol}thunderlab.net/pulsar-media/api`,
        scriptModifier: getScriptModifier(Env),
        relativeBase: '../',
        warpApi: getWarpApiPath(Env),

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