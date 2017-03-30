/**
 * Created by gjr8050 on 3/9/2017.
 */

const GameEvent = require('event-types').GameEvent;
const MDT = require('../mallet/mallet.dependency-tree').MDT;

module.exports = {avatarFactory,
resolve: ADT => [
    ADT.network.NetworkEntity,
    ADT.network.Connection,
    MDT.Geometry,
    MDT.Scheduler,
    MDT.Math,
    ADT.network.Clock,
    avatarFactory]};

/**
 *
 * @param NetworkEntity
 * @param Connection
 * @param Geometry
 * @param Scheduler
 * @param MM
 * @param Clock {Clock}
 * @returns {ClientAvatar}
 */
function avatarFactory(NetworkEntity, Connection, Geometry, Scheduler, MM, Clock) {
    let syncCount = 0;
    let tossCount = 0;

    function lerp(a, disp, p) {
        return MM.Vector3.scale(disp, p).add(a);
    }

    class ClientAvatar extends NetworkEntity {
        constructor(params) {
            super(params);

            this.disp = MM.vec3(0);

            this.tPrev = new Geometry.Transform();
            this.tDest = new Geometry.Transform();
            this.tRender = new Geometry.Transform()
                .translate(0, 0, -2)
                .scaleBy(0.75, 0.5, 0.75);

            this.updateTS = 0;
            this.lastUpdate = Clock.getNow();
            this.syncElapsed = 0;
            this.lerpPct = 0;
            this.color = MM.vec3(255, 255, 255);

            Scheduler.schedule(this.update.bind(this));
        }

        getColor() {
            return this.color;
        }

        sync(params) {
            const timeStamp = parseFloat(params.timestamp);
            syncCount++;

            if (timeStamp <= this.updateTS) {
                tossCount++;
                return;
            }

            this.updateTS = timeStamp;
            this.tPrev.position.x = this.tDest.position.x;

            this.tDest.position.x = parseFloat(params.position.x);
            this.tDest.position.y = parseFloat(params.position.y);

            this.disp = MM.Vector3.subtract(this.tDest.position, this.tPrev.position);

            const updateTime = Clock.getNow();
            this.syncElapsed = updateTime - this.lastUpdate;
            this.lastUpdate = updateTime;

            this.lerpPct = 0;

            super.sync({});
        }

        getUpdateTime() {
            return this.updateTS;
        }

        getDataLoss() {
            return tossCount / syncCount;
        }

        jump() {
            Connection.getSocket().get().emit(GameEvent.command, {method: 'jump'});
        }

        move(direction) {
            Connection.getSocket().get().emit(GameEvent.command, {method: 'move', direction});
        }
        
        update(dt) {
            this.lerpPct += this.syncElapsed > 0 ? dt / this.syncElapsed : 0;
            this.tRender.position.set(lerp(this.tPrev.position, this.disp, this.lerpPct));
        }

        getTransform() {
            return this.tRender;
        }
    }

    NetworkEntity.registerType(ClientAvatar);

    return ClientAvatar;
}
