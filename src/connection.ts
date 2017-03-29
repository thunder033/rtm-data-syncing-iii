/**
 * Created by gjrwcs on 3/1/2017.
 */

import {ClientComponent} from './client';
import {IOEvent} from 'event-types';
import {INetworkEntity, NetworkIndex, SyncResponse} from './network-index';
import Timer = NodeJS.Timer;
import {Building} from './building';
import {Clock} from './clock';

/**
 * Maintains the connect for a single client
 */
export class Connection extends ClientComponent {

    // We need more server functionality to support re-connection
    public static DISCONNECT_TIMEOUT_DURATION: number = 0;
    public static PING_INTERVAL_DURATION: number = 1000;

    // the connection will terminate when this timer expires
    protected disconnectTimer: Timer = null;
    // indicates if the connection has been terminated
    private terminated: boolean = false;

    private ping: number;
    private pingInterval: Timer;
    private pingBuffer: ArrayBuffer;
    private pingView: DataView;
    private clock: Clock;

    public onInit() {
        // Handle requests from the client for data synchronization
        this.socket.on(IOEvent.syncNetworkEntity, this.syncNetworkEntity.bind(this));
        // Setup the connection when the client request to join
        this.socket.on(IOEvent.joinServer, () => {
            this.server.getComponent(Building).getDefaultRoom().add(this.user);
            this.server.syncClient(this.socket);
            this.user.sync(this.socket);
        });

        this.socket.on(IOEvent.clientPing, (timestamp) => this.socket.emit(IOEvent.clientPong, timestamp));

        this.clock = new Clock();
        this.pingBuffer = new ArrayBuffer(8);
        this.pingView = new DataView(this.pingBuffer);
        this.pingInterval = setInterval(() => this.sendPing(), Connection.PING_INTERVAL_DURATION);
        this.socket.on(IOEvent.serverPong, (buffer) => this.calculatePing(buffer));
    }

    public getPing(): number {
        return this.ping;
    }

    public isTerminated(): boolean {
        return this.terminated;
    }

    public onDisconnect() {
        if (!this.terminated) {
            this.disconnectTimer = setTimeout(() => this.terminate(), Connection.DISCONNECT_TIMEOUT_DURATION);
        }

        // this.user.onDisconnect();
    }

    private sendPing() {
        this.pingView.setFloat64(0, this.clock.now());
        this.socket.emit(IOEvent.serverPing, this.pingBuffer);
    }

    private calculatePing(buffer) {
        if (buffer instanceof ArrayBuffer) {
            const timestamp = new DataView(buffer).getFloat64(0);
            this.ping = this.clock.now() - timestamp;
        }
    }

    /**
     * Respond to request to sync a network entity
     * @param data
     */
    private syncNetworkEntity(data): void {
        const req = data.body;
        const errorKey = `${IOEvent.serverError}-${data.reqId}`;
        const networkIndex = this.server.getComponent(NetworkIndex);
        console.log(`${data.reqId}: ${req.type} ${req.id}`);

        if (typeof req.type === 'number' && req.id) {
            const type = networkIndex.getType(parseInt(req.type, 10));
            if (!type) {
                this.socket.emit(errorKey, `SyncError: Invalid ${IOEvent.syncNetworkEntity} request type: ${req.type}`);
                return;
            }

            const entity: INetworkEntity = networkIndex.getById(type, req.id);
            if (!entity) {
                this.socket.emit(errorKey, `SyncError: No ${type.name} was found with id ${req.id}`);
                return;
            }

            this.socket.emit(`${IOEvent.syncNetworkEntity}-${data.reqId}`, new SyncResponse(entity));
        } else {
            this.socket.emit(errorKey, `SyncError: Invalid ${IOEvent.syncNetworkEntity} request`);
        }

    }

    private terminate() {
        console.log(`terminate session for ${this.user.getName()}`);
        this.terminated = true;
        clearInterval(this.pingInterval);

        if (!this.server.removeClient(this.user)) {
            console.warn(`Failed to remove user [${this.user.getName()}] from the server`);
        }
    }
}
