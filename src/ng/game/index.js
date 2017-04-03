/**
 * The Game module defines behavior for the game client
 * @author Greg Rozmarynowycz <greg@thunderlab.net>
 */

const ADT = require('../app.dependency-tree.js').ADT;

ADT.game = {
    Player: 'game.Player',
    ClientMatch: 'game.ClientMatch',
    PlayCtrl: 'game.PlayCtrl',
    ResultsCtrl: 'game.ResultsCtrl',
    WarpCtrl: 'game.WarpCtrl',
    ClientAvatar: 'game.ClientAvatar',
    WarpGame: 'game.WarpGame',
    LobbyCtrl: 'game.LobbyCtrl',
    LerpedEntity: 'game.LerpedEntity',
};

const game = require('angular')
    .module('game', [
        require('../network').name,
    ]);

game.factory(ADT.game.LerpedEntity, require('./lerped-entity').resolve(ADT));
game.controller(ADT.game.LobbyCtrl, require('./lobby-ctrl').resolve(ADT));
game.factory(ADT.game.ClientMatch, require('./client-match').resolve(ADT));
game.controller(ADT.game.PlayCtrl, require('./play-ctrl').resolve(ADT));
game.controller(ADT.game.WarpCtrl, require('./flux-ctrl').resolve(ADT));
game.factory(ADT.game.ClientAvatar, require('./client-avatar').resolve(ADT));
game.factory(ADT.game.Player, require('./player').resolve(ADT));
game.factory(ADT.game.WarpGame, require('./gravity-game').resolve(ADT));


module.exports = game;
