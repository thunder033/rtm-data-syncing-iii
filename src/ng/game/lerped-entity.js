/**
 * Created by gjr8050 on 3/27/2017.
 */

const MDT = require('../mallet/mallet.dependency-tree').MDT;

module.exports = {lerpedEntityFactory,
    resolve: ADT => [
        ADT.network.NetworkEntity,
        MDT.Scheduler,
        ADT.network.Clock,
        MDT.Math,
        lerpedEntityFactory]};

/**
 *
 * @param NetworkEntity
 * @param Scheduler
 * @param Clock {Clock}
 * @param MM
 * @returns {LerpedEntity}
 */
function lerpedEntityFactory(NetworkEntity, Scheduler, Clock, MM) {
    class LerpedEntity extends NetworkEntity {
        constructor(id, format) {
            super(id, format);

            this.lerpPct = 0;
            this.syncElapsed = 0;
            this.lastUpdate = Clock.getNow();

            Scheduler.schedule(this.update.bind(this));
        }

        sync(buffer, bufferString, storesValuesCB) {
            super.sync(buffer, bufferString, storesValuesCB);

            const updateTime = Clock.getNow();
            this.syncElapsed = updateTime - this.lastUpdate;
            this.lastUpdate = updateTime;

            this.lerpPct = 0;
        }

        update(dt) {
            this.lerpPct += this.syncElapsed > 0 ? dt / this.syncElapsed : 0;
        }

        static lerpVector(a, disp, p) {
            return MM.Vector3.scale(disp, p).add(a);
        }

        static lerpScalar(a, disp, p) {
            return a + disp * p;
        }
    }

    return LerpedEntity;
}