'use strict';
/**
 * Created by gjr8050 on 2/24/2017.
 */

const ADT = require('../app.dependency-tree.js').ADT;
// this module needs an angular reference
const angular = require('angular');
const simpleRequest = require('./simple-request');
require('angular-socket-io');

const network = angular.module('network', [
    'btford.socket-io',
    simpleRequest.name
]);


ADT.simpleRequest = {
    HttpConfig: 'simple-request.HttpConfig'
};

ADT.network = {
    Clock: 'network.Clock',
    AsyncInitializer: 'network.AsyncInitializer',
    Socket: 'network.Socket',
    NetworkEntity: 'network.NetworkEntity',
    Connection: 'network.Connection',
    User: 'network.User',
    ClientRoom: 'network.ClientRoom',
    Client: 'network.Client',
};

network.factory(ADT.network.Clock, require('./clock').resolve(ADT));
network.factory(ADT.network.Socket, require('./socket-factory').resolve(ADT));
network.factory(ADT.network.AsyncInitializer, require('./aysnc-initializer').resolve(ADT));
network.factory(ADT.network.NetworkEntity, require('./network-entity').resolve(ADT));
network.factory(ADT.network.Connection, require('./connection').resolve(ADT));
network.factory(ADT.network.User, require('./user-factory').resolve(ADT));
network.factory(ADT.network.ClientRoom, require('./client-room').resolve(ADT));
network.factory(ADT.network.Client, require('./client').resolve(ADT));

module.exports = network;
