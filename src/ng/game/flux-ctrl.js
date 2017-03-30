/**
 * TODO: [Description]
 * @author Greg Rozmarynowycz <greg@thunderlab.net>
 */
const MDT = require('../mallet/mallet.dependency-tree').MDT;
const GameEvent = require('event-types').GameEvent;

module.exports = {FluxCtrl,
resolve: ADT => [
    ADT.ng.$scope,
    MDT.Scheduler,
    MDT.Camera,
    MDT.Geometry,
    MDT.Math,
    MDT.Easel,
    MDT.Keyboard,
    MDT.const.Keys,
    MDT.Log,
    FluxCtrl]};

function FluxCtrl($scope, MScheduler, MCamera, Geometry, MM, Keyboard, Keys, Log) {
    function init() {
        const tCube = new Geometry.Transform();
        tCube.scale.scale(0.5);

        const players = $scope.warpGame.getPlayers();
        let clientAvatar = null;
        Log.out($scope.clientUser);
        const avatars = players.map((player) => {
            Log.out('check user', player.getUser());
            if (player.getUser() === $scope.clientUser) {
                clientAvatar = player.getAvatar();
            }
            return player.getAvatar();
        });

        Log.out(avatars);
        Log.out(clientAvatar);
        $scope.posX = 0;

        function sendKeysReleased() {
            if (!Keyboard.isKeyDown(Keys.Left) && !Keyboard.isKeyDown(Keys.Right)) {
                clientAvatar.move(0);
            }
        }

        Keyboard.onKeyDown(Keys.Left, () => clientAvatar.move(-1));
        Keyboard.onKeyDown(Keys.Right, () => clientAvatar.move(1));
        Keyboard.onKeyDown(Keys.Space, () => clientAvatar.jump());

        Keyboard.onKeyUp(Keys.Left, sendKeysReleased);
        Keyboard.onKeyUp(Keys.Right, sendKeysReleased);

        MScheduler.schedule(() => {
            $scope.posX = clientAvatar.getTransform().position.x.toFixed(3);
            $scope.lossPct = ~~(clientAvatar.getDataLoss() * 100);
            $scope.updateTime = clientAvatar.getUpdateTime();

            MScheduler.draw(() => {
                players.forEach(player => MCamera.render(
                    Geometry.meshes.Cube,
                    player.getAvatar().getTransform(),
                    player.getColor()));

                MCamera.render(Geometry.meshes.Cube, [tCube], MM.vec3(255, 0, 0));
                MCamera.present();
            });
        });
    }

    $scope.$on('$destroy', () => {
        MScheduler.reset();
    });

    $scope.$on(GameEvent.playStarted, init);
}
