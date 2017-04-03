/**
 * Created by gjr8050 on 3/9/2017.
 */

const GameEvent = require('event-types').GameEvent;
const EntityType = require('entity-types').EntityType;
const DataFormat = require('game-params').DataFormat;
const MDT = require('../mallet/mallet.dependency-tree').MDT;

module.exports = {avatarFactory,
resolve: ADT => [
    ADT.network.NetworkEntity,
    ADT.network.Connection,
    MDT.Geometry,
    MDT.Scheduler,
    MDT.Math,
    ADT.game.LerpedEntity,
    avatarFactory]};

/**
 *
 * @param NetworkEntity
 * @param Connection
 * @param Geometry
 * @param Scheduler
 * @param MM
 * @param LerpedEntity
 * @returns {ClientAvatar}
 */
function avatarFactory(NetworkEntity, Connection, Geometry, Scheduler, MM, LerpedEntity) {
    class ClientAvatar extends LerpedEntity {
        constructor(params, id) {
            super(id, DataFormat.POSITION);

            this.disp = MM.vec3(0);

            this.tPrev = new Geometry.Transform();
            this.tDest = new Geometry.Transform();
            this.tRender = new Geometry.Transform()
                .translate(0, 0, -5)
                .scaleBy(0.75, 0.5, 0.75);

            Object.defineProperties(this, {
                /* eslint-disable */
                positionX: {set: x => this.tDest.position.x = x},
                positionY: {set: y => this.tDest.position.y = y},
                positionZ: {set: z => this.tDest.position.z = z},
                /* eslint-enable */
            });

            this.color = MM.vec3(255, 255, 255);

            Scheduler.schedule(this.update.bind(this));
        }

        getColor() {
            return this.color;
        }

        sync(buffer, bufferString) {
            super.sync(buffer, bufferString, () => {
                this.tPrev.position.set(this.tDest.position);
            });

            this.disp = MM.Vector3.subtract(this.tDest.position, this.tPrev.position);
        }

        getUpdateTime() {
            return this.syncTime;
        }

        jump() {
            Connection.getSocket().get().emit(GameEvent.command, {method: 'jump'});
        }

        move(direction) {
            Connection.getSocket().get().emit(GameEvent.command, {method: 'move', direction});
        }
        
        update(dt) {
            super.update(dt);
            this.tRender.position.set(LerpedEntity.lerpVector(this.tPrev.position, this.disp, this.lerpPct));
        }

        getTransform() {
            return this.tRender;
        }
    }

    NetworkEntity.registerType(ClientAvatar, EntityType.Avatar);

    return ClientAvatar;
}
