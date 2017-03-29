import {ServerComponent, SyncServer} from './sync-server';
import {Room} from './room';
import {Client, ClientComponent} from './client';
import {IOEvent} from 'event-types';
/**
 * Created by gjrwcs on 3/6/2017.
 */

export class Occupant extends ClientComponent {
    public onInit() {
        this.socket.on('requestRooms', this.getRooms.bind(this));
    }

    private getRooms(data) {
        const req = data.body;
        // const errorKey = `${IOEvent.serverError}-${data.reqId}`;

        const rooms = this.server.getComponent(Building).getClientRooms(this.user);
        this.socket.emit(`${'requestRooms'}-${data.reqId}`, rooms.map((room) => room.getId()));
    }
}

export class Building extends ServerComponent {

    private rooms: Map<string, Room>;
    private defaultRoom: Room;

    constructor(syncServer: SyncServer) {
        super(syncServer, [Occupant]);

        this.rooms = new Map<string, Room>();
        this.defaultRoom = null;
    }

    /**
     * Add a room to this server. If there are no rooms the room becomes the default
     * @param room {Room}: the room to add
     */
    public addRoom(room: Room): void {
        if (this.rooms.has(room.getName())) {
            throw new Error(`Room with name ${name} already exists on this server! Room names must unique`);
        }

        // Rooms are indexed here by name because socket-io emits messages by room name
        this.rooms.set(room.getName(), room);

        if (this.defaultRoom === null) {
            this.defaultRoom = room;
        }
    };

    /**
     * Factory function to create and add a room
     * @param name {string}: the name of the room
     * @returns {Room}: the created room
     */
    public createRoom(name: string): Room {
        const room = new Room(name);
        this.addRoom(room);
        this.server.broadcast(IOEvent.roomCreated, room.getId());
        return room;
    }

    /**
     * Get the default room that new clients will be added to
     * @returns {Room}
     */
    public getDefaultRoom(): Room {
        return this.defaultRoom;
    }

    public onClientTerminated(user: Client): void {
        this.rooms.forEach((room) => {
            room.remove(user);
        });
    }

    /**
     * Retrive the the list of rooms a given client is in
     * @param user
     * @returns {Array}
     */
    public getClientRooms(user: Client): Room[] {
        const clientRooms: Room[] = [];
        this.rooms.forEach((room) => {
            if (room.contains(user)) {
                clientRooms.push(room);
            }
        });
        return clientRooms;
    }

    public syncClient(socket: SocketIO.Socket): void {
        this.rooms.forEach((room) => {
            if (room.constructor === Room) {
                socket.emit(IOEvent.roomCreated, room.getId());
            }
        });
    }
}
