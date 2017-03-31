/**
 * Created by gjr8050 on 3/10/2017.
 */

const EntityType = require('entity-types').EntityType;
const IOEvent = require('event-types').IOEvent;

module.exports = {warpGameFactory,
resolve: ADT => [
    ADT.game.Player,
    ADT.network.NetworkEntity,
    ADT.game.ClientAvatar,
    ADT.network.User,
    ADT.ng.$q,
    ADT.network.ClientRoom,
    ADT.ng.$rootScope,
    warpGameFactory]};

function warpGameFactory(Player, NetworkEntity, ClientAvatar, User, $q, ClientRoom, $rootScope) {
    const utf8Decoder = new TextDecoder('utf-8');
    function createPlayers(buffer, match) {
        const players = [];

        const view = new DataView(buffer);
        const bufferString = utf8Decoder.decode(view);

        for (let i = 0; i * NetworkEntity.ID_LENGTH < bufferString.length; i += 2) {
            const userId = bufferString.substr(i * NetworkEntity.ID_LENGTH, NetworkEntity.ID_LENGTH);
            const avatarId = bufferString.substr((i + 1) * NetworkEntity.ID_LENGTH, NetworkEntity.ID_LENGTH);
            console.log(`create player for ship ${avatarId} and user ${userId}`);
            players.push($q.all([
                // Resolve the entities associated with the player
                NetworkEntity.getById(User, userId),
                NetworkEntity.getById(ClientAvatar, avatarId),
            ]).spread((user, avatar) => {
                const player = new Player(user, match, avatar);
                // The player is identified by the user id, so get player data from the server
                return player.requestSync();
            }));
        }

        return $q.all(players);
    }

    /**
     * @type WarpGame
     */
    class ClientSimulation extends NetworkEntity {
        /**
         * @constructor
         */
        constructor(params) {
            super(params.id);
            this.match = null;
            this.players = [];

            $rootScope.$on(IOEvent.leftRoom, () => this.requestSync());
            $rootScope.$on(IOEvent.joinedRoom, () => this.requestSync());
        }

        /**
         * @param params {{matchId, shipIds}}
         * @returns {*}
         */
        sync(params) {
            return NetworkEntity.getById(ClientRoom, params.matchId).then((match) => {
                this.match = match;
                return createPlayers(params.avatarIds, match).then((players) => {
                    this.players.length = 0;
                    Array.prototype.push.apply(this.players, players);
                });
            }).finally(() => {
                delete params.matchId;
                delete params.avatarIds;
                super.sync(params);
            });
        }

        getPlayers() {
            return this.players;
        }

        getMatch() {
            return this.match;
        }
    }

    NetworkEntity.registerType(ClientSimulation, EntityType.Simulation);

    return ClientSimulation;
}
