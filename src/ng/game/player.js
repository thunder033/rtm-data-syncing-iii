/**
 * TODO: [Description]
 * @author Greg Rozmarynowycz <greg@thunderlab.net>
 */
const MDT = require('../mallet/mallet.dependency-tree').MDT;
const EntityType = require('entity-types').EntityType;

module.exports = {playerFactory,
resolve: ADT => [
    ADT.network.NetworkEntity,
    MDT.Color,
    playerFactory]};

function playerFactory(NetworkEntity, Color) {
    class Player extends NetworkEntity {

        constructor(user, match, avatar) {
            super(user.getId());
            console.log(`create player for ${user.getId()}`);
            this.user = user;
            this.avatar = avatar;
            this.match = match;

            this.hue = 0;
            this.score = 0;

            this.color = Color.hslToRgb(this.hue, 80, 85);
        }

        sync(params) {
            this.color = Color.hslToRgb(params.hue, 80, 85);
            super.sync(params);
        }

        /**
         * Returns the color of this player
         * @return {Vector3}
         */
        getColor() {
            return this.color;
        }

        getScore() {
            return this.score;
        }

        getMatch() {
            return this.match;
        }

        getAvatar() {
            return this.avatar;
        }

        getUser() {
            return this.user;
        }
    }

    NetworkEntity.registerType(Player, EntityType.Player);

    return Player;
}
