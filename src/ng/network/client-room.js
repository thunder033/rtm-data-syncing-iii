/**
 * TODO: [Description]
 * @author Greg Rozmarynowycz <greg@thunderlab.net>
 */
const IOEvent = require('event-types').IOEvent;

module.exports = {roomFactory,
resolve: ADT => [
    ADT.network.Connection,
    ADT.network.NetworkEntity,
    ADT.network.User,
    ADT.ng.$rootScope,
    ADT.ng.$q,
    roomFactory]};

function roomFactory(Connection, NetworkEntity, User, $rootScope, $q) {
    const rooms = {};

    class ClientRoom extends NetworkEntity {

        constructor(params) {
            super(params.id);
            rooms[params.name] = this;

            this.users = new Map();
            this.userList = [];
            this.capacity = NaN;
        }

        add(user) {
            if (this.users.has(user.getId()) === true) {
                return;
            }

            if (isNaN(this.capacity) || this.users.size < this.capacity) {
                this.users.set(user.getId(), user);
                NetworkEntity.syncValueList(this.users, this.userList);

                const evt = new Event(IOEvent.joinedRoom);
                evt.user = user;
                this.dispatchEvent(evt);
            } else {
                throw new Error('Room is full and cannot accept any more users');
            }
        }

        remove(user) {
            if (this.users.has(user.getId())) {
                this.users.delete(user.getId());
                NetworkEntity.syncValueList(this.users, this.userList);

                const evt = new Event(IOEvent.leftRoom);
                evt.user = user;
                this.dispatchEvent(evt);
            }
        }

        getName() {
            return this.name;
        }

        setCapacity(capacity) {
            this.capacity = capacity;
        }

        getCapacity() {
            return this.capacity;
        }

        sync(params) {
            params.capacity = typeof params.capacity === 'number' ? params.capacity : NaN;

            this.users.clear();
            params.users.forEach(userId => NetworkEntity
                .getById(User, userId)
                .then(user => this.add(user)));

            delete params.users;
            super.sync(params);
        }

        static getByName(name) {
            return rooms[name];
        }

        getUsers() {
            return this.userList;
        }
    }

    NetworkEntity.registerType(ClientRoom);
    Connection.ready().then((socket) => {
        socket.get().on(IOEvent.joinedRoom, (data) => {
            $q.all([
                NetworkEntity.getById(User, data.userId),
                NetworkEntity.getById(ClientRoom, data.roomId),
            ]).spread((user, room) => {
                room.add(user);
                $rootScope.$broadcast(IOEvent.joinedRoom, {user, room});
            });
        });

        socket.get().on(IOEvent.leftRoom, (data) => {
            $q.all([
                NetworkEntity.getById(User, data.userId),
                NetworkEntity.getById(ClientRoom, data.roomId),
            ]).spread((user, room) => {
                room.remove(user);
                $rootScope.$broadcast(IOEvent.leftRoom, {user, room});
            });
        });
    });

    return ClientRoom;
}
