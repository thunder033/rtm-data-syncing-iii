/**
 * Handles synchronizing a given entity with it's server counterpart
 * @author Greg Rozmarynowycz <greg@thunderlab.net>
 */
const MDT = require('../mallet/mallet.dependency-tree').MDT;
const IOEvent = require('event-types').IOEvent;
const DataType = require('game-params').DataType;
const ByteSizes = require('game-params').ByteSizes;
const EventTarget = require('eventtarget');

module.exports = {networkEntityFactory,
    resolve: ADT => [
        ADT.network.Connection,
        ADT.ng.$q,
        ADT.ng.$rootScope,
        MDT.Log,
        networkEntityFactory]};

function networkEntityFactory(Connection, $q, $rootScope, Log) {
    /**
     * Manages synchronization for a entity with the server instance
     */
    class NetworkEntity extends EventTarget {

        /**
         *
         * @param id {string}
         * @param [format] {Map}
         */
        constructor(id, format = null) {
            if (!id) {
                throw new ReferenceError('NetworkEntity must be constructed with an ID');
            }
            super();
            this.id = id.id || id;

            if (typeof this.id !== 'string' && typeof this.id !== 'number') {
                throw new TypeError(`${typeof this.id} is not valid a valid Network ID type. Must be string or number.`);
            }

            this.syncTime = 0;
            this.format = format;

            Object.defineProperty(this, 'timestamp', {
                writeable: true,
                set(value) {this.syncTime = value;}
            });

            if (format instanceof Map) {
                this.parseFieldSizes();
            }

            NetworkEntity.putEntity(this.getType(), this);
        }

        getType() {
            return this.constructor;
        }

        getId() {
            return this.id;
        }

        sync(params, bufferString, storesValuesCB) {
            if (params instanceof ArrayBuffer) {
                if (!(this.format instanceof Map)) {
                    const type = NetworkEntity.getName(this.getType());
                    throw new ReferenceError(`${type} cannot sync a binary response without a format set`);
                }

                const view = new DataView(params);

                const tsReadMethod = NetworkEntity.readMethods.get(DataType.Double);
                const timeStamp = view[tsReadMethod](NetworkEntity.entityOffset);

                // throw out the update if it's older than anything we already got
                if (timeStamp <= this.syncTime) {
                    return;
                }

                // allow the entity to store any values it will need after the update
                if (storesValuesCB instanceof Function) {
                    storesValuesCB();
                }

                // parse the buffer according the format set for this entity
                let position = NetworkEntity.entityOffset;

                this.format.forEach((type, field) => {
                    const size = this.sizes[field];
                    if (type === DataType.String) {
                        this[field] = bufferString.substr(position, size);
                    } else {
                        const method = NetworkEntity.readMethods.get(type);
                        this[field] = view[method](position);
                    }
                    position += size;
                });

                return view;
            } else {
                Object.assign(this, params);
                this.syncTime = ~~performance.now();

                Log.debug(`sync ${this.constructor.name} ${this.id} at ${this.syncTime}`);
                $rootScope.$evalAsync();
            }
        }

        requestSync() {
            const typeName = NetworkEntity.getName(this.getType());
            const serverType = NetworkEntity.getName(NetworkEntity.getLookupType(typeName));
            const request = Connection.getSocket()
                .request(IOEvent.syncNetworkEntity, {type: serverType, id: this.getId()})
                .then(NetworkEntity.reconstruct);
            NetworkEntity.pendingRequests.set(this.getId(), request);

            return request;
        }

        parseFieldSizes() {
            const sizes = {};
            this.format.forEach((type, field) => {
                if (field.indexOf(':') > 0) {
                    const [fieldName, size] = field.split(':');
                    sizes[fieldName] = parseInt(size, 10);
                    this.format.set(fieldName, type);
                    this.format.delete(field);
                } else {
                    sizes[field] = ByteSizes.get(type);
                }
            });

            this.sizes = sizes;
        }

        static putEntity(type, entity) {
            const lookupType = NetworkEntity.getLookupType(NetworkEntity.getName(type));
            Log.verbose(`Put entity ${NetworkEntity.getName(lookupType)} ${entity.getId()}`);
            NetworkEntity.entities.get(NetworkEntity.getName(lookupType)).set(entity.getId(), entity);
        }

        static getName(type) {
            return this.typeNames.get(type);
        }

        static registerType(type, name) {
            let baseType = type;

            // determine if the new type is derived from an existing type
            // inherited types are indexed by their base type
            NetworkEntity.lookupTypes.forEach((candidateType) => {
                if (type.prototype instanceof candidateType) {
                    baseType = candidateType;
                }
            });

            NetworkEntity.typeNames.set(type, name);
            NetworkEntity.constructorTypes.set(name, type);
            NetworkEntity.lookupTypes.set(name, baseType);
            Log.debug(`Register NetworkEntity type ${NetworkEntity.getName(type)} [as ${NetworkEntity.getName(baseType)}]`);
            if (baseType === type) {
                Log.verbose(`Create NetworkEntity index ${NetworkEntity.getName(type)}`);
                NetworkEntity.entities.set(name, new Map());
            }
        }

        static getConstructorType(typeName) {
            let resolvedType = typeName;
            if (NetworkEntity.constructorTypes.has(typeName) === false) {
                if (NetworkEntity.constructorTypes.has(`Client${typeName}`)) {
                    resolvedType = `Client${typeName}`;
                } else {
                    throw new ReferenceError(`Type ${typeName} is not a valid network entity constructor type`);
                }
            }

            return NetworkEntity.constructorTypes.get(resolvedType);
        }

        /**
         * Retrieve a network entity constructor based on name
         * @param typeName
         * @returns {V}
         */
        static getLookupType(typeName) {
            let resolvedType = typeName;
            if (NetworkEntity.lookupTypes.has(typeName) === false) {
                if (NetworkEntity.lookupTypes.has(`Client${typeName}`)) {
                    resolvedType = `Client${typeName}`;
                } else {
                    throw new ReferenceError(`Type ${typeName} is not a valid network entity lookup type`);
                }
            }

            return NetworkEntity.lookupTypes.get(resolvedType);
        }

        /**
         * Returns a network entity identified by type and id
         * @param type {class}
         * @param id {string}
         * @returns {Promise<NetworkEntity>}
         */
        static getById(type, id) {
            if (!type || typeof id !== 'string') {
                throw new Error('Network entities must be identified by both type and name.');
            }

            const lookupType = NetworkEntity.getLookupType(NetworkEntity.getName(type));
            const typeName = NetworkEntity.getName(lookupType);

            if (NetworkEntity.localEntityExists(lookupType, id) === true) {
                // console.log('use local copy ', id);
                return $q.when(NetworkEntity.entities.get(typeName).get(id));
            } else if (NetworkEntity.pendingRequests.has(typeName + id)) {
                Log.debug('use pending ', id);
                return NetworkEntity.pendingRequests.get(typeName + id);
            }

            const serverType = NetworkEntity.getName(type);
            Log.debug(`request ${serverType} ${id}`);
            const request = Connection.getSocket()
                .request(IOEvent.syncNetworkEntity, {type: serverType, id})
                .then(NetworkEntity.reconstruct);
            NetworkEntity.pendingRequests.set(id, request);
            return request;
        }

        /**
         * Indicates if the entity identified by the registered type and name exists locally
         * @param type {Function}
         * @param id {string}
         * @return {boolean}
         */
        static localEntityExists(type, id) {
            const typeName = NetworkEntity.getName(type);
            Log.verbose(`check ${typeName} ${id} exists`);
            try {
                return NetworkEntity.entities.get(typeName).has(id);
            } catch (e) {
                if (NetworkEntity.getLookupType(typeName)) {
                    throw new Error(`Could not complete look up: ${e.message || e}`);
                } else {
                    throw e;
                    // return false;
                }
            }
        }

        /**
         * Syncs the values of a map to the given array
         * @param map {Map}
         * @param arr {Array}
         */
        static syncValueList(map, arr) {
            /* eslint no-param-reassign: off */
            arr.length = 0;
            const it = map.values();
            let item = it.next();
            while (item.done === false) {
                arr.push(item.value);
                item = it.next();
            }

            $rootScope.$evalAsync();
        }

        /**
         * Parses a response to rebuild a network entity
         * @param data
         * @returns {Promise<NetworkEntity>}
         */
        static reconstruct(data) {
            let syncParams = null;
            let entity = null;
            let id = '';
            let serverTypeCode;
            let bufferString = '';

            if(data instanceof ArrayBuffer) {
                const view = new DataView(data);
                bufferString = NetworkEntity.utf8Decoder.decode(view);

                id = bufferString.substr(0, NetworkEntity.ID_LENGTH);
                serverTypeCode = view.getInt8(NetworkEntity.ID_LENGTH);
                syncParams = data;
            } else {
                id = data.id;
                serverTypeCode = data.type;
                syncParams = data.params;
            }

            const type = NetworkEntity.getLookupType(serverTypeCode);
            const typeName = NetworkEntity.getName(type);

            Log.verbose(`Resolved ${serverTypeCode} to ${typeName}`);
            if (NetworkEntity.localEntityExists(type, id) === true) {
                entity = NetworkEntity.entities.get(typeName).get(id);
            } else {
                Log.debug('construct ', id);
                const ctorType = NetworkEntity.getConstructorType(serverTypeCode);
                /* eslint new-cap: off */
                entity = new ctorType(syncParams, id);
            }


            if (NetworkEntity.pendingRequests.has(typeName + entity.id)) {
                NetworkEntity.pendingRequests.delete(typeName + entity.id);
            }

            return $q.when(entity.sync(syncParams, bufferString)).then(() => entity);
        }
    }

    NetworkEntity.lookupTypes      = new Map(); // Mapping of types to use for entity look ups
    NetworkEntity.constructorTypes = new Map(); // Types to use when reconstructing entities
    NetworkEntity.entities         = new Map(); // Collection of all synced entities
    NetworkEntity.pendingRequests  = new Map(); // Map of pending sync requests
    NetworkEntity.typeNames        = new Map(); // Type names are minified so we have to look up references

    // noinspection JSAnnotator
    NetworkEntity.ID_LENGTH = 36;

    NetworkEntity.utf8Decoder = new TextDecoder('utf-8');
    NetworkEntity.entityOffset = NetworkEntity.ID_LENGTH + ByteSizes.get(DataType.Int8);

    NetworkEntity.readMethods = new Map([
        [DataType.Float, 'getFloat32'],
        [DataType.Double, 'getFloat64'],
        [DataType.Int8, 'getInt8'],
        [DataType.Int16, 'getInt16'],
        [DataType.Int32, 'getInt32'],
    ]);

    Connection.ready().then((socket) => {
        socket.get().on(IOEvent.syncNetworkEntity, NetworkEntity.reconstruct);
    });

    return NetworkEntity;
}