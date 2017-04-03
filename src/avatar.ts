/**
 * Created by gjr8050 on 3/29/2017.
 */
import {BinaryNetworkEntity} from './network-index';
import {bind} from 'bind-decorator';
import {Vector3} from './math';
import {DataFormat, Direction} from 'pulsar-lib/dist/src/game-params';
import {Clock} from './clock';

export class Level {
    public static readonly FLOOR: number = -1;
    public static readonly LEFT_WALL: number = -4;
    public static readonly RIGHT_WALL: number = 4;
}

export class Avatar extends BinaryNetworkEntity {

    private static readonly GRAVITY = -9.8 / 1000000;
    private static readonly JUMP_MAGNITUDE = 5 / 1000;
    private static readonly MOVE_SPEED = 3 / 1000;

    private position: Vector3;
    private velocity: Vector3;
    private acceleration: Vector3;
    private clock: Clock;

    private activeCmd: number; // the current command the ship is executing
    private lastCmd: number; // the last command given to the ship

    constructor() {
        super(Avatar, DataFormat.POSITION);
        this.clock = new Clock();
        this.position = new Vector3(0, 5, -5);
        this.velocity = new Vector3();
        this.acceleration = new Vector3();

        Object.defineProperties(this, {
            positionX: {get: () => this.position.x},
            positionY: {get: () => this.position.y},
            positionZ: {get: () => this.position.z},
        });

        this.activeCmd = Direction.NONE;
        this.lastCmd = Direction.NONE;
    }

    @bind
    public update(dt) {
        /**
         * Move the ship if
         *  - there's an active control
         *  - and the control is still pressed
         *  - and the target position in lane bounds
         */
        if (this.activeCmd !== Direction.NONE &&
            this.lastCmd === this.activeCmd &&
            this.isInBounds(this.activeCmd * Avatar.MOVE_SPEED * dt)) {

            this.velocity.x = Avatar.MOVE_SPEED * this.activeCmd;
        } else {
            this.velocity.x = 0;
        }

        this.velocity.add(Vector3.scale(this.acceleration, dt));
        this.position.add(Vector3.scale(this.velocity, dt));

        if (this.position.y < Level.FLOOR) {
            this.position.y = Level.FLOOR;
        }

        if (this.position.x > Level.RIGHT_WALL) {
            this.position.x = Level.RIGHT_WALL;
        } else if (this.position.x < Level.LEFT_WALL) {
            this.position.x = Level.LEFT_WALL;
        }

        this.acceleration.set(0, Avatar.GRAVITY, 0);

        this.updateBuffer();
    }

    public jump(pingDelay: number) {
        if (this.position.y < Level.FLOOR + 0.25) {
            this.velocity.y = Avatar.JUMP_MAGNITUDE - Avatar.GRAVITY * pingDelay;
            this.position.y += this.velocity.y * pingDelay;
        }
    }

    /**
     * Move the avatar to the left or right
     * @param direction
     * @param pingDelay
     */
    public move(direction: number, pingDelay: number) {

        if (direction !== Direction.NONE && direction !== this.lastCmd) {
            this.lastCmd = direction;
            this.activeCmd = direction;
            this.position.x += pingDelay * Avatar.MOVE_SPEED;
        }

        this.lastCmd = direction;
    }

    /**
     * Determines if the destination position is in lane bounds
     * @param {number} displacement
     * @returns {boolean}
     */
    public isInBounds(displacement: number = 0): boolean {
        const minBound = Level.LEFT_WALL;
        const maxBound = Level.RIGHT_WALL;
        const destPosition = this.position.x + displacement;
        // console.log(`${minBound.toFixed(2)} < ${destPosition.toFixed(2)} < ${maxBound.toFixed(2)}`);
        return destPosition <= maxBound && destPosition >= minBound;
    }
}
