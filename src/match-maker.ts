/**
 * Created by gjr8050 on 2/23/2017.
 */
import {Match} from './match';
import {ServerComponent, SyncServer} from './sync-server';
import Socket = SocketIO.Socket;
import {Client, ClientComponent} from './client';
import {Room} from './room';
import {IOEvent, MatchEvent} from 'event-types';
import {Building} from './building';
import {Simulator} from './simulation';

/**
 * Providers users the ability to join and leave matches
 */
export class MatchMember extends ClientComponent {

    private match: Match = null;

    public onInit() {
        // Register event handlers
        this.socket.on(MatchEvent.requestMatch, (data) => this.requestMatch(data));
        this.socket.on(MatchEvent.requestJoin, (data) => this.requestJoin(data));
        this.socket.on(MatchEvent.requestLeave, (data) => this.leaveMatch(data));
        this.socket.on(MatchEvent.requestStart, (data) => this.startMatch(data));
        this.socket.on(MatchEvent.requestEnd, (data) => this.endMatch(data));
    }

    public startMatch(data) {
        if (this.match instanceof Match) {
            if (!this.isHost()) {
                const errMsg = `${this.user.getName()} is not host of ${this.match.getLabel()}.` +
                    `Client cannot start a match they are not the host of.`;

                this.socket.emit(IOEvent.serverError, errMsg);
                return;
            }

            this.server.getComponent(MatchMaker).startMatch(this.match);
        } else {
            this.socket.emit(IOEvent.serverError, `Client is not a member of match to start`);
        }
    }

    public unsetMatch() {
        this.match = null;
    }

    public endMatch(data) {
        if (this.match instanceof Match) {
            this.match.end();
        } else {
            this.socket.emit(IOEvent.serverError, `Client is not a member of match to end`);
        }
    }

    public leaveMatch(data) {
        if (this.match instanceof Match) {
            const matchId = this.match.getId();
            this.match.remove(this.user);

            this.server.broadcast(IOEvent.leftRoom, {roomId: matchId, userId: this.user.getId()});
            this.unsetMatch();
        } else {
            this.socket.emit(IOEvent.serverError, `Client is not member of match to leave`);
        }
    }

    /**
     * Attempt to create a new match with the given parameters
     * @param data
     */
    public requestMatch(data) {
        if (!(this.match instanceof Match)) {
            const match = this.server.getComponent(MatchMaker)
                .createMatch({label: data.label, host: this});

            if (match instanceof Match) {
                this.match = match;
                this.server.broadcast(MatchEvent.matchCreated, {matchId: match.getId()});
                match.add(this.user);
            } else {
                const errMsg =  'A new match could not be created because the server has reached it\'s capacity';
                this.socket.emit(IOEvent.serverError, {message: errMsg});
            }
        } else {
            const errMsg = 'A new match could not be created because you are already in a match';
            this.socket.emit(IOEvent.serverError, {message: errMsg});
        }

    }

    public getId(): string {
        return this.user.getId();
    }

    public isHost(): boolean {
        if (!this.match) {
            return false;
        }

        return this.match.getHost() === this;
    }

    /**
     * Attempts to join the match specified by name
     * @param data
     */
    public requestJoin(data) {
        if (!(this.match instanceof Match)) {
            try {
                this.match = this.server.getComponent(MatchMaker).joinMatch(this.user, data.name);
            } catch (e) {
                this.socket.emit(IOEvent.serverError, e.message || e);
            }
        } else {
            const errMsg = 'You can only be in one match at a time';
            this.socket.emit(IOEvent.serverError, {message: errMsg});
        }
    }
}

/**
 * Coordinates the creation and destruction of matches and allowing users to join them
 */
export class MatchMaker extends ServerComponent {

    // private static MAX_MATCHES: number = parseInt(process.env.WARP_MAX_MATCHES, 10) || 5;

    private lobby: Room;
    private matches: Match[];

    constructor(syncServer: SyncServer) {
        super(syncServer, [MatchMember]);
        this.matches = [];
    }

    public onInit(): void {
        this.lobby = this.server.getComponent(Building).createRoom('lobby');
    }

    public syncClient(socket: Socket): void {
        this.lobby.sync(socket);
        socket.emit(MatchEvent.matchListUpdate, this.matches.map((m) => m.getId()));
    }

    /**
     * Creates a new match on the server unless the match limit has been reached
     * @param params: {host, name}: parameters to create the match with
     * @returns {any}
     */
    public createMatch(params): Match {
        const match: Match = new Match(params.host, this);
        this.server.getComponent(Building).addRoom(match);
        match.setLabel(params.label);
        this.matches.push(match);
        return match;
    }

    /**
     * Attempts to add the user to the match specified by name
     * @param user {Client}: the user to add to the match
     * @param name {string}: the match to find by name
     * @returns {Match}
     */
    public joinMatch(user: Client, name: string): Match {
        const match = this.getMatch(name);

        if (!(match instanceof Match)) {
            throw new Error(`Match was not found with name ${name}`);
        }

        if (match.isOpen()) {
            match.add(user);
            this.startMatch(match);
            return match;
        } else {
            throw new Error(`Cannot join match ${name}. The match is closed.`);
        }
    }

    /**
     * Remove a match and notify users
     * @param match
     */
    public removeMatch(match: Match): void {
        const matchIndex = this.matches.indexOf(match);
        if (matchIndex > -1) {
            if (match.hasStarted()) {
                this.server.getComponent(Simulator).endSimulation(match);
            }

            console.log(`removed match ${match.getName()}`);
            this.matches.splice(matchIndex, 1);
            this.server.broadcast(MatchEvent.matchListUpdate, this.matches.map((m) => m.getId()));
        }
    }

    public startMatch(match: Match): void {
        const game = this.server.getComponent(Simulator).createSimulation(match);
        match.start(game.getId());

        const remainingStart =  match.getStartTime() - Date.now();
        setTimeout(() => game.start(), remainingStart);
    }

    public getMatches(): Match[] {
        return this.matches;
    }

    public getLobby(): Room {
        return this.lobby;
    }

    /**
     * Searches for a match by name and return it if it found, or null if not
     * @param name {string}: the unique name of the match (room)
     * @returns {Match|null}
     */
    private getMatch(name: string): Match {
        // ensure the key were searching by is a string
        if (typeof name !== 'string') {
            throw new TypeError(`Message name ${name} is not a string`);
        }

        let match: Match = null;
        this.matches.some((m: Match) => {
            if (m.getName() === name) {
                match = m;
                return true;
            }
            return false;
        });

        return match;
    }
}
