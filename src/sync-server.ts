'use strict';
/**
 * Created by Greg on 2/17/2017.
 */
import Socket = SocketIO.Socket;

import * as http from 'http';
import * as socketio from 'socket.io';
import {Component, Composite, IComponent} from './component';

export interface IServerComponent {
    init(io: SocketIO.Server, server: SyncServer): void;
    onInit(): void;
    getName(): string;
    getUserComponents(): IComponent[];
}

/**
 * Server components define various server behaviors. They have references to the IO Server and their SyncServer. They
 * also define what peer behaviors are defined for users on the server
 */
export abstract class ServerComponent extends Component implements IServerComponent {
    protected io: SocketIO.Server;
    protected userComponents: IComponent[];
    protected server: SyncServer;

    private name: string;

    /**
     * @param syncServer:
     * @param userComponents: Components that should be initialized on each user created on the server
     */
    constructor(syncServer: SyncServer, userComponents: IComponent[] = []) {
        super(syncServer);
        this.name = this.constructor.name;
        this.userComponents = userComponents;
    }

    public init(io: SocketIO.Server, server: SyncServer): Component {
        this.io = io;
        this.server = server;
        this.onInit();
        return this;
    }

    public onInit(): void {
        return undefined;
    }

    public onClientTerminated(args: any): void {
        return undefined;
    }

    public syncClient(socket: Socket): void {
        return undefined;
    }

    public getName(): string {
        return this.name;
    }

    public getUserComponents(): IComponent[] {
        return this.userComponents;
    }
}

// This is hacky af, but we're not moving users to their own component yet
import {Connection} from './connection';
import {Client} from './client';

/**
 * Maintains client connections
 */
export class SyncServer extends Composite {

    private io: SocketIO.Server;
    private users: Client[];

    constructor(httpServer: http.Server) {
        super();
        this.users = [];

        this.io = socketio(httpServer, {transports: ['websocket', 'jsonp-polling']});
        this.io.origins('*:*');
        this.io.use((socket: Socket, next) => {
            this.registerConnection(socket);
            next();
        });
    }

    public getUsers(): Client[] {
        return this.users;
    }

    /**
     * Add a component of the given type to the server
     * @param component: a component constructor
     * @returns {Component}
     */
    public addComponent(component: IComponent): Component {
        console.log('add server component: ', component.name);
        return (super.addComponent(component) as ServerComponent).init(this.io, this);
    }

    /**
     * Register a new client connection on the server
     * @param socket {Socket}: the socket connecting
     */
    public registerConnection(socket: Socket) {
        const user = new Client(socket, this, this.getUserComponents());
        user.setName(socket.handshake.query.name);
        this.users.push(user);
    };

    /**
     * Push out server data to the client associated with the socket
     * @param socket {Socket}: the socket to emit message to
     */
    public syncClient(socket: Socket): void {
        this.invokeComponentEvents('syncClient', socket);
    };

    /**
     * Broadcasts an event to users on the server, either in the specified room or the server default
     * @param evt {string}: the name of the event
     * @param data {any}: data to send to handlers
     * @param [room=Server Default] {Room}: the room to broadcast to
     */
    public broadcast(evt: string, data: any, room?: string) {
        if (typeof !room !== 'string') {
            this.io.sockets.emit(evt, data);
        } else {
            this.io.sockets.in(room).emit(evt, data);
        }
    }

    /**
     * Removes a user from the room and indicates if there were successfully removed
     * @param targetUser
     * @returns {boolean}
     */
    public removeClient(targetUser: Client): boolean {
        return this.users.some((user: Client, i: number) => {
            if (targetUser === user) {
                this.users.splice(i, 1);
                this.invokeComponentEvents('onClientTerminated', targetUser);
                return true;
            }

            return false;
        });
    }

    /**
     * Generates an flat array of all user components required by server components
     * @returns {IComponent[]}
     */
    private getUserComponents(): IComponent[] {
        const userComponents: any = (this.getComponents() as ServerComponent[]).map((c) => c.getUserComponents());
        return [].concat.apply([Connection], userComponents);
    }
}
