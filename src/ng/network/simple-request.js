/**
 * Created by Greg on 11/20/2016.
 */
'use strict';

/**
 * Utility for making AJAX requests
 * @module simple-request
 */
const simpleRequest = require('angular').module('simple-request', []);

simpleRequest
    .service('simple-request.SimpleHttp', ['$http', '$q', SimpleHttp])
    .factory('simple-request.HttpConfig', [httpConfigFactory])
    .service('simple-request.SimpleSocket', ['$q', SimpleSocket]);

/**
 * Utilities for working with web sockets
 * @param $q
 * @constructor
 */
function SimpleSocket($q) {

    /**
     *
     * @param socket
     * @param event
     * @param message
     * @returns {Promise}
     */
    this.request = function(socket, event, message) {
        return $q((resolve, reject) => {
            const id = (Math.random() * 100000) % 100000;
            socket.emit(event, {_req_id: id, data: {message}});

            const timeout = setTimeout(()=>reject('Request Timed Out'), 3000);
            const responseKey = `${event}-${id}`;
            socket.on(responseKey, (data)=>{
                clearTimeout(timeout);
                socket.off(responseKey);
                resolve(data);
            });
        });
    };
}

/**
 * @returns {HttpConfig}
 */
function httpConfigFactory(){
    return HttpConfig;
}

/**
 * @property {string} method
 * @property {string} url
 * @property {XMLHttpRequest.responseType} responseType
 *
 * @param {Object} params
 * @param {string} params.url the url to request
 * @param {string} [params.method="get"] a request method
 * @param {string} [params.responseType=""] a valid XMLHttpRequest response type
 * @param {Object} [params.queryParams] a set of parameters to attach to the url
 * @constructor
 */
function HttpConfig(params)
{
    if(typeof params.url !== 'string'){
        throw new TypeError('URL must be a string');
    }

    this.method = params.method || 'get';

    var queryString = '';
    if(typeof params.queryParams === 'object' && params.queryParams !== null){
        queryString = params.url.indexOf('?') > -1 ? '&' : '?';
        queryString += HttpConfig.getQueryString(params.queryParams);
    }

    this.url = params.url + queryString;
    this.responseType = params.responseType || XMLHttpRequest.responseType;
}

/**
 * Encode a map into a query string
 * @param {Object} params
 * @returns {string} URI query string
 */
HttpConfig.getQueryString = function(params){
    return Object.keys(params).map(key => {
        return `${key}=${encodeURIComponent(params[key])}`;
    }).join('&');
};

/**
 * Execute a GET request on the URL
 * @param {string} url
 * @returns {HttpConfig}
 */
HttpConfig.get = function(url){
    return new HttpConfig({url: url});
};

function SimpleHttp($http, $q)
{
    function doRequest(config)
    {
        return $http(config).then(response => {
            return typeof response.data !== 'undefined' ? response.data : response;
        }, error => {
            return $q.reject(`${error.status || error.statusCode} ${JSON.stringify(error.message || error.statusText || error.data || error)}`);
        });
    }

    this.request = (params) => {
        var config = (params instanceof HttpConfig) ? params : new HttpConfig(params);
        return doRequest(config);
    };

    /**
     * Execute a GET request
     * @param {string} url
     * @param {Object|HttpConfig} params
     * @returns {*}
     */
    this.get = (url, params) => {

        params = params || {};
        params.url = url;

        var config = (params instanceof HttpConfig) ? params : new HttpConfig(params);

        return doRequest(config);
    };
}

module.exports = simpleRequest;