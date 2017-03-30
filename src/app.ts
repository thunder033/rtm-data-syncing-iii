'use strict';
/// <reference path='../node_modules/@types/node/index.d.ts' />
/**
 * Created by gjrwcs on 2/16/2017.
 */

import { setAliases } from './configure-aliases';
setAliases();

import {ExpressServer} from './express-server';
import {SyncServer} from './sync-server';
import {NetworkIndex} from './network-index';
import {Building} from './building';
import {Simulator} from './simulation';
import {RPG} from './rpg';
import {MatchMaker} from './match-maker';

const HTTP_ROUTES = {
    '/': 'public/index.html',
    '/assets/theme.css': 'public/assets/theme.css',
    '/dist/bundle.js': 'public/dist/bundle.js',
};

// init the application
const httpServer = new ExpressServer(HTTP_ROUTES);
// Create a new sync server
const syncServer = new SyncServer(httpServer.getServer());

// Add Components that define server functionality
syncServer.addComponent(Building);
syncServer.addComponent(NetworkIndex);
syncServer.addComponent(MatchMaker);
syncServer.addComponent(Simulator);
syncServer.addComponent(RPG);
