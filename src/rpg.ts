
/**
 * Created by gjrwcs on 3/30/2017.
 */

import {ServerComponent, SyncServer} from './sync-server';
import {Client, ClientComponent} from './client';
import {Avatar} from './avatar';
import {AvatarControl, Player, Simulation, Simulator} from './simulation';
import {MatchMaker} from './match-maker';
import {Match} from './match';
import {MatchEvent} from 'pulsar-lib/dist/src/event-types';

export class RPGAutoJoin extends ClientComponent {

    public onInit(): void {
        this.server.getComponent(RPG).addClient(this.user);
    }

    public onDisconnect(): void {
        this.server.getComponent(RPG).releaseClient(this.user);
    }
}

export class RPG extends ServerComponent {

    private avatars: Map<string, Avatar>;
    private match: Match;
    private game: Simulation;

    constructor(syncServer: SyncServer) {
        super(syncServer, [RPGAutoJoin]);
    }

    public onInit(): void {
        this.avatars = new Map<string, Avatar>();

        // Create one game that all participants will join
        const params = {host: null, label: 'rpg'};
        this.match = this.server.getComponent(MatchMaker).createMatch(params);
        const simulator = this.server.getComponent(Simulator);
        this.game = simulator.createSimulation(this.match);
        this.match.start(this.game.getId());
        this.game.start();
    }

    public addClient(client: Client) {
        this.match.add(client);
        client.getComponent(AvatarControl).attachMatch(this.match);
        client.getComponent(Player).attachMatch(this.match);
    }

    public releaseClient(client: Client) {
        this.game.releaseHue(client.getComponent(Player).getHue());
    }

    public syncClient(socket: SocketIO.Socket): void {
        socket.emit(MatchEvent.matchStarted, {gameId: this.game.getId(), matchId: this.match.getId()});
    }
}
