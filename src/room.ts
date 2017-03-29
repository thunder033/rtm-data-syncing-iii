/**
 * Created by gjr8050 on 2/23/2017.
 */

import {IOEvent} from 'event-types';
import {NetworkEntity} from './network-index';
import {Client} from './client';

/**
 * Encapsulates and defines behaviors for SocketIO rooms
 */
export class Room extends NetworkEntity {
    public name: string;

    protected users: Client[];
    // How many users the rooms can contain
    private capacity: number = NaN;

    constructor(name: string) {
        super(Room);
        this.name = name;
        this.users = [];
    }

    /**
     * Return a collection of users in the room
     * @returns {Client[]}
     */
    public getUsers(): Client[] {
        return this.users;
    }

    /**
     * Indicates if a given user is in the room
     * @param user {Client}: user to locate
     * @returns {boolean}
     */
    public contains(user: Client): boolean {
        return this.users.indexOf(user) > -1;
    }

    /**
     * Add a user to this room and notify clients
     * @param user {Client}: the user to add
     */
    public add(user: Client): void {
        if (isNaN(this.capacity) || this.users.length < this.capacity) {
            if (!this.contains(user)) { // users can't be in the room twice
                console.log(`${this.name} add user ${user.getName()}`);
                this.users.push(user);

                const message = {userId: user.getId(), roomId: this.getId()};
                // notify clients a user was added to this room
                user.getSocket().join(this.name);
                this.broadcast(IOEvent.joinedRoom, message);
                this.sync(user.getSocket());
            }
        } else {
            throw new Error(`Room is full and cannot accept any more users`);
        }
    }

    /**
     * Remove a user from the room and notify clients
     * @param user {Client}: the user to remove
     */
    public remove(user: Client): boolean {
        const userIndex = this.users.indexOf(user);
        if (userIndex > -1) {
            console.log(`${this.name} remove user ${user.getName()}`);
            this.users.splice(userIndex, 1);

            const message = {userId: user.getId(), roomId: this.getId()};
            this.broadcast(IOEvent.leftRoom, message);
            user.getSocket().leave(this.name);
            this.sync();
            return true;
        }

        return false;
    }

    /**
     * Gets the unique name of this room
     * @returns {string}
     */
    public getName(): string {
        return this.name;
    }

    protected setCapacity(capacity: number): void {
        this.capacity = capacity;
    }

    public getCapacity(): number {
        return this.capacity;
    }

    public getSerializable(): Object {
        return Object.assign(super.getSerializable(), {
            capacity: this.capacity,
            name: this.name,
            users: this.users.map((user) => user.getId()),
        });
    }

    public broadcast(evt: string, data?: any): void {
        if (this.users.length > 0) {
            this.users[0].getSocket().broadcast.in(this.getName()).emit(evt, data);
            this.users[0].getSocket().emit(evt, data);
        }
    }
}
