'use strict';
/**
 * Created by gjr8050 on 2/23/2017.
 */

import * as uuid from 'uuid/v4';
import {IOEvent} from 'event-types';
import {isNullOrUndefined} from 'util';
import Socket = SocketIO.Socket;
import {Component, Composite} from './component';
import {ByteSizes, DataFormat, DataType} from 'game-params';
import {Clock} from './clock';
import {EntityType} from 'entity-type';

export interface INetworkEntity {
    /**
     * Returns a serializable copy of the data on an entity
     */
    getSerializable(): Object;

    getId(): string;

    sync(socket?: Socket): void;

    getType(): INetworkEntityCtor;
}

/**
 * Constructor that generates a network entity
 */
export interface INetworkEntityCtor {
    new(...args: any[]): INetworkEntity;
}

/**
 * Represents a response to sync an entity with a client
 */
export class SyncResponse {
    public id: string;
    public params: Object;
    public type: number;

    public static create(entity: INetworkEntity): SyncResponse | Buffer {
        return entity instanceof BinaryNetworkEntity ?
            entity.getSerializable() :
            new SyncResponse(entity);
    }

    constructor(entity: INetworkEntity) {
        this.id = entity.getId(); // the client must be able to id the entity
        this.params = entity.getSerializable(); // include serializable fields
        this.type = EntityType[entity.getType().name]; // the type is present so a client-side instance can be constructed
    }
}

export abstract class NetworkEntity implements INetworkEntity {

    // The number of characters in a Network Entity Id
    public static readonly ID_LENGTH: number = 36;

    private static networkIndex: NetworkIndex;

    protected id: string;

    public static init(networkIndex: NetworkIndex): void {
        NetworkEntity.networkIndex = networkIndex;
        BinaryNetworkEntity.init();
    }

    constructor(type: INetworkEntityCtor) {
        this.id = uuid();
        NetworkEntity.networkIndex.registerType(type);
        NetworkEntity.networkIndex.putNetworkEntity(type, this);
    }

    /**
     * Get the entity uuid4-generated id
     * @returns {string}
     */
    public getId(): string {
        return this.id;
    }

    public getType(): INetworkEntityCtor {
        return this.constructor as INetworkEntityCtor;
    }

    /**
     * Sync this entity with all clients or the client associated with the provided socket
     * @param [socket {Socket}]: a specific socket to sync with
     * @param [roomName {Room}]: the room to sync in
     */
    public sync(socket?: Socket, roomName?: string) {
        if (!isNullOrUndefined(socket)) {
            socket.emit(IOEvent.syncNetworkEntity, new SyncResponse(this));
        } else {
            NetworkEntity.networkIndex.sync(this, roomName);
        }
    }

    /**
     * Create a JSON-safe representation of this entity
     * @returns {{id: string}}
     */
    public getSerializable(): Object {
        return {id: this.id};
    }
}

export abstract class BinaryNetworkEntity extends NetworkEntity {

    private static readonly writeMethods: Map<DataType, string> = new Map<DataType, string>([
        [DataType.String, 'write'],
        [DataType.Float, 'writeFloatBE'],
        [DataType.Double, 'writeDoubleBE'],
        [DataType.Int8, 'writeInt8'],
        [DataType.Int16, 'writeInt16BE'],
        [DataType.Int32, 'writeInt32BE'],
    ]);

    private static clock: Clock = new Clock();
    private static BNEFormat: Map<string, DataType> = DataFormat.NETWORK_ENTITY;
    private static BNESizes: Map<string, number>;
    private static entityOffset: number;

    private buffer: Buffer;
    private format: Map<string, DataType>;
    private timestamp: number; // the last time the buffer was updated

    private fieldSizes: Map<string, number>;

    public static init() {
        BinaryNetworkEntity.BNESizes = new Map<string, number>();
        BinaryNetworkEntity.parseFieldSizes(
            BinaryNetworkEntity.BNEFormat,
            BinaryNetworkEntity.BNESizes);
        BinaryNetworkEntity.entityOffset = BinaryNetworkEntity.BNESizes.get('id') +
            BinaryNetworkEntity.BNESizes.get('type');
    }

    /**
     * Update the size map using the format map. Replaces any override size keys
     * ("key:size") in the format map with just the size (ex. id:36 -> id)
     * @param format {Map}
     * @param sizes {Map}
     */
    private static parseFieldSizes(format, sizes) {
        // fields to delete at the end
        const overriddenFields = [];

        format.forEach((type, field) => {
            if (field.indexOf(':') > 0) {
                overriddenFields.push(field);
                const [fieldName, size] = field.split(':');
                sizes.set(fieldName, parseInt(size, 10));
                format.set(fieldName, type);
            } else if (!sizes.has(field)) {
                sizes.set(field, ByteSizes.get(type));
            }
        });

        overriddenFields.forEach((field) => format.delete(field));
    }

    constructor(type: INetworkEntityCtor, format: Map<string, DataType>) {
        super(type);
        this.format = format;
        this.fieldSizes = new Map<string, number>();
        BinaryNetworkEntity.parseFieldSizes(this.format, this.fieldSizes);

        const formatSize = this.getFormatSize(this.format);
        this.buffer = Buffer.alloc(formatSize);
        this.buffer.write(this.getId(), 0);
        const bufferType: number = EntityType[this.getType().name];
        this.buffer.writeInt8(bufferType, NetworkEntity.ID_LENGTH);
    }

    /**
     * Calculate the total number of bytes required to store the format map
     * @param format {Map}
     * @returns {number} the size of the format
     */
    public getFormatSize(format: Map<string, DataType>): number {
        let size = BinaryNetworkEntity.entityOffset;
        format.forEach((type, field) => {
            size += this.fieldSizes.get(field);
        });

        return size;
    }

    /**
     * Iterate through all fields in the BNE format and write the current value to
     * the buffer
     */
    protected updateBuffer() {
        this.timestamp = BinaryNetworkEntity.clock.now() || 0;
        let position: number = BinaryNetworkEntity.entityOffset;
        this.format.forEach((type, field) => {
            const method = BinaryNetworkEntity.writeMethods.get(type);
            const size = this.fieldSizes.get(field);
            this.buffer[method](this[field], position);
            position += size;
        });
    }

    public getSerializable() {
        return this.buffer;
    }
}

/**
 * A component-based implementation of the NetworkEntity where inheritance isn't possible
 */
export class Networkable extends Component implements INetworkEntity {

    private static networkIndex: NetworkIndex;

    protected id: string;
    protected parent: Composite & INetworkEntity;
    protected type: INetworkEntityCtor;

    public static init(networkIndex: NetworkIndex): void {
        Networkable.networkIndex = networkIndex;
    }

    constructor(parent: Composite & INetworkEntity) {
        super(parent);
        this.id = uuid();

        // The network db needs to any entry of each type of entity
        this.type = Object.getPrototypeOf(parent).constructor;
        Networkable.networkIndex.registerType(this.type);
    }

    /**
     * Returns the unique id for this network entity
     * @returns {string}
     */
    public getId(): string {
        return this.id;
    }

    public init() {
        // this is done in init and not in the ctor so the parent can call methods of this component
        Networkable.networkIndex.putNetworkEntity(this.type, this.parent);
    }

    public getSerializable(): Object {
        return Object.assign(this.parent.getSerializable(), {id: this.id});
    }

    public getType(): INetworkEntityCtor {
        return this.type;
    }

    /**
     * Pushes data to all clients or the client associated with the provided socket
     * [@param socket {Socket}]: an individual socket to sync this entity with
     * [@param roomName {string}]: the room to broadcast the sync to
     */
    public sync(socket?: Socket, roomName?: string) {
        if (!isNullOrUndefined(socket)) {
            socket.emit(IOEvent.syncNetworkEntity, SyncResponse.create(this));
        } else {
            Networkable.networkIndex.sync(this, roomName);
        }
    }
}

import {ServerComponent, SyncServer} from './sync-server';

/**
 * Provides arbitrary access to entities that are needed by clients
 */
export class NetworkIndex extends ServerComponent {

    public types: Map<number, INetworkEntityCtor>;
    public entities: Map<number, Map<string, INetworkEntity>>;

    constructor(syncServer: SyncServer) {
        super(syncServer, [Networkable]);

        this.entities = new Map();
        this.types = new Map();

        Networkable.init(this);
        NetworkEntity.init(this);
    }

    /**
     * Add an entity to the network index
     * @param type: the type of the entity
     * @param entity {INetworkEntity}: the entity to add
     */
    public putNetworkEntity(type: INetworkEntityCtor, entity: INetworkEntity): void {
        const keyType = this.resolveNetworkEntityType(type);

        if (keyType === null) {
            throw new TypeError(`Could not resolve ${type} to a valid key type`);
        }

        this.entities.get(EntityType[keyType.name]).set(entity.getId(), entity);
    }

    /**
     * Attempt to resolve a given type to a base type used in the network index
     * @param type
     * @returns {any}
     */
    public resolveNetworkEntityType(type: INetworkEntityCtor): INetworkEntityCtor {
        // If the network type is in the index, we're all good
        if (this.entities.has(EntityType[type.name])) {
            return type;
        } else {
            // If not, it might be a derived type, so attempt to find a matching base type
            let resolvedType: any = null;
            this.types.forEach((candidateType) => {
                // compare the provided type with with each type in the network index
                if (type.prototype instanceof candidateType) {
                    resolvedType = candidateType;
                }
            });

            // If a matching base type isn't found, we just return null
            return resolvedType;
        }
    }

    /**
     * Register an entity type in the network entity index
     * @param type
     */
    public registerType(type: INetworkEntityCtor) {
        if (typeof EntityType[type.name] === 'undefined') {
            throw new ReferenceError(`Unknown Network Entity Type ${type.name}. Type must present in pulsar-lib type code map.`);
        }

        if (!this.types.has(EntityType[type.name])) {
            console.log(`Register type ${type.name} as ${EntityType[type.name]}`);
            this.types.set(EntityType[type.name], type);
            this.entities.set(EntityType[type.name], new Map());
        }
    }

    /**
     * Get the type associated with a given type name
     * @param name
     * @returns {undefined|INetworkEntityCtor}
     */
    public getType(name: string | number): INetworkEntityCtor {
        return this.types.get(typeof name === 'string' ? EntityType[name] : name);
    }

    /**
     * Retrieve a network entity by it's type and id
     * @param type {T}
     * @param id {string}
     * @returns {T}
     */
    public getById<T extends INetworkEntity>(type: INetworkEntityCtor, id: string): T {
        const keyType = this.resolveNetworkEntityType(type);

        if (keyType === null) {
            throw new TypeError(`Could not resolve ${type} to a valid key type`);
        }

        return this.entities.get(EntityType[keyType.name]).get(id) as T;
    }

    public sync(entity: INetworkEntity, roomName: string): void {
        this.server.broadcast(IOEvent.syncNetworkEntity, SyncResponse.create(entity), roomName);
    }
}
