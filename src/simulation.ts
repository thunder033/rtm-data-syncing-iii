/**
 * Created by gjrwcs on 3/8/2017.
 */

import {ServerComponent, SyncServer} from './sync-server';
import {Client, ClientComponent} from './client';
import {INetworkEntity, INetworkEntityCtor, NetworkEntity, NetworkIndex} from './network-index';
import {GameEvent} from 'event-types';
import {PriorityQueue} from './priority-queue';
import Timer = NodeJS.Timer;
import {Connection} from './connection';
import {Match} from './match';
import {Clock} from './clock';
import {DataFormat} from 'game-params';
import {Composite} from './component';
import {state, StateMachine} from './state-machine';
import {bind} from 'bind-decorator';
import {Avatar} from './avatar';

class Command {
    protected timestamp: number;
    protected avatar: Avatar;

    constructor(params: {avatar: Avatar, timestamp: number}) {
        this.timestamp = params.timestamp;
        this.avatar = params.avatar;
    }

    public execute(dt: number) {
        return undefined;
    }
}

class MoveCommand extends Command {
    private direction: number;

    constructor(params: {direction: number, avatar: Avatar, timestamp: number}) {
        super(params);
        this.direction = params.direction;
    }

    public execute(dt: number) {
        this.avatar.move(this.direction, Date.now() - this.timestamp);
    }
}

class JumpCommand extends Command {
    constructor(params: {avatar: Avatar, timestamp: number}) {
        super(params);
    }

    public execute(dt: number) {
        this.avatar.jump(Date.now() - this.timestamp);
    }
}

export class AvatarControl extends ClientComponent {
    private avatar: Avatar;
    private commandQueue: PriorityQueue;
    private connection: Connection;
    private match: Match;
    private simulation: Simulation;

    private readonly SYNC_INTERVAL: number = 50;
    private syncElapsed: number = 0;

    public onInit() {
        this.connection = this.user.getComponent(Connection);
        this.commandQueue = new PriorityQueue();
    }

    public attachMatch(match: Match): void {
        this.match = match;

        // attach command events
        this.socket.on(GameEvent.command, (data) => this.queueCommand(data));

        const simulation = this.server.getComponent(Simulator).getSimulation(this.match);
        simulation.schedule(this.update);

        this.avatar = new Avatar();
        simulation.schedule(this.avatar.update);
        simulation.schedule(this.syncClients, 10);
        this.simulation = simulation;

        this.syncElapsed = 0;
    }

    public getAvatar(): Avatar {
        return this.avatar;
    }

    @bind
    private update(dt: number): void {
        while (this.commandQueue.peek() !== null) {
            (this.commandQueue.dequeue() as Command).execute(dt);
        }
    }

    @bind
    private syncClients(dt: number): void {
        this.syncElapsed += dt;
        if (this.syncElapsed > this.SYNC_INTERVAL) {
            this.avatar.sync(null, this.match.getName());
            this.syncElapsed = 0;
        }
    }

    private queueCommand(data) {
        let cmd = null;
        const timestamp: number = Date.now() - (this.connection.getPing() || 0);
        // calculate the timestamp
        switch (data.method) {
            case 'jump':
                cmd = new JumpCommand({avatar: this.avatar, timestamp});
                break;
            case 'move':
                const direction = parseInt(data.direction, 10);
                cmd = new MoveCommand({direction, avatar: this.avatar, timestamp});
                break;
            default:
                throw new ReferenceError(`Unrecognized avatar command ${data.method}`);
        }

        this.commandQueue.enqueue(timestamp, cmd);
    }
}

export class Player extends ClientComponent implements INetworkEntity {

    private score: number;
    private match: Match;
    private hue: number;

    constructor(parent: Composite) {
        super(parent);
    }

    public onInit(): void {
        const networkIndex = this.server.getComponent(NetworkIndex);
        networkIndex.registerType(this.getType());
        networkIndex.putNetworkEntity(this.getType(), this);
    }

    public attachMatch(match: Match): void {
        this.match = match;
        this.score = 0;

        const simulation = this.server.getComponent(Simulator).getSimulation(match);
        this.hue = simulation.getNewPlayerHue();
    }

    public getSerializable(): Object {
        return {
            hue: this.hue,
            id: this.getId(),
            score: this.score,
        };
    }

    public getHue(): number {
        return this.hue;
    }

    public getId(): string {
        return this.user.getId();
    }

    public sync(socket?: SocketIO.Socket): void {
        NetworkEntity.prototype.sync.apply(this, socket);
    }

    public getType(): INetworkEntityCtor {
        return this.constructor as INetworkEntityCtor;
    }
}

type SimulationOperation = (dt: number) => void;

export class Simulator extends ServerComponent {

    private games: Map<string, Simulation>;

    constructor(syncServer: SyncServer) {
        super(syncServer, [AvatarControl, Player]);
        this.games = new Map();
    }

    public createSimulation(match: Match): Simulation {
        const game = new Simulation(match);
        this.games.set(match.getId(), game);

        match.getUsers().forEach((user) => {
            user.getComponent(AvatarControl).attachMatch(match);
            user.getComponent(Player).attachMatch(match);
        });

        return game;
    }

    public getSimulation(match: Match): Simulation {
        return this.games.get(match.getId());
    }

    public endSimulation(match: Match): void {
        this.games.get(match.getId()).end();
        this.games.delete(match.getId());
    }
}

export class GameState extends StateMachine {
    @state public Playing;
    @state public Paused;
    @state public LevelComplete;
    @state public Loading;
}

export class Simulation extends NetworkEntity {

    private state: GameState;

    private targetFPS: number;
    private operations: PriorityQueue;

    private stepInterval: Timer;
    private lastStepTime: number;
    private match: Match;
    private clock: Clock;

    private usedHues: number[] = [];

    constructor(match: Match) {
        super(Simulation);
        this.operations = new PriorityQueue();
        this.match = match;
        this.clock = new Clock();

        this.state = new GameState();
        this.state.setState(this.state.Loading);
    }

    /**
     * Get the current game time in ms
     * @returns {number}
     */
    public getTime(): number {
        return this.clock.now();
    }

    public getSerializable() {
        const makeIdPair = (user: Client) => Buffer.from(user.getId() + user.getComponent(AvatarControl).getAvatar().getId());
        const avatarIds = Buffer.concat(this.match.getUsers().map(makeIdPair));
        console.log(avatarIds.toString('utf8'));
        return Object.assign(super.getSerializable(), {
            matchId: this.match.getId(),
            avatarIds,
        });
    }

    /**
     * Add an operation to run each step of the simulation
     * @param operation {SimulationOperation}
     * @param [priority] {number}
     */
    public schedule(operation: SimulationOperation, priority?: number) {
        this.operations.enqueue(priority || 0, operation);
    }

    public getState(): GameState {
        return this.state;
    }

    /**
     * Begin running the game
     */
    public start() {
        this.lastStepTime = Date.now();
        this.stepInterval = setInterval(() => this.step(), 1000 / this.targetFPS);
        this.state.setState(this.state.Playing);
    }

    public suspend() {
        this.state.setState(this.state.Paused);
    }

    /**
     * End the simulation
     */
    public end() {
        clearInterval(this.stepInterval);
    }

    /**
     * Generate a unique hue (HSL) value for a player in this game
     * @returns {number} the hue value for an hsl color, 0 - 255
     */
    public getNewPlayerHue(): number {
        let hue = 0;
        let count = 0;
        do {
            hue = ~~(Math.random() * 255);
            if (count++ > 255) {
                throw new Error('No new player hues available within constraints');
            }
        } while (this.isUsedHue(hue));

        this.usedHues.push(hue);
        return hue;
    }

    /**
     * Execute the next step in the simulation
     */
    protected step(): void {
        if (this.state.is(this.state.Paused)) {
            return;
        }

        const stepTime = Date.now();
        const dt = stepTime - this.lastStepTime;
        this.lastStepTime = stepTime;

        const it = this.operations.getIterator();

        while (!it.isEnd()) {
            (it.next() as SimulationOperation).call(null, dt);
        }
    }

    public releaseHue(hue: number): void {
        const hueIndex = this.usedHues.indexOf(hue);
        if (hueIndex > -1) {
            this.usedHues.slice(hueIndex, 1);
        }
    }

    /**
     * Indicates if the given value is used by a player already (within value constraint)
     * @param hue {number}: HSL hue value, 0 - 255
     * @returns {boolean}
     */
    private isUsedHue(hue: number): boolean {
        const THRESHOLD = 10;
        return this.usedHues.some((usedHue) => {
            return Math.abs(usedHue - hue) < THRESHOLD;
        });
    }
}
