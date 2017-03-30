
/**
 * Created by gjrwcs on 3/30/2017.
 */

import {ServerComponent, SyncServer} from './sync-server';
import {Client, ClientComponent} from './client';
import {Avatar} from './avatar';
import {AvatarControl, Simulator} from './simulation';
import {MatchMaker} from './match-maker';
import {Match} from './match';

export class RPGAutoJoin extends ClientComponent {

    public onInit(): void {
        this.server.getComponent(RPG).addClient(this.user);
    }
}

export class RPG extends ServerComponent {

    private avatars: Map<string, Avatar>;
    private match: Match;

    constructor(syncServer: SyncServer) {
        super(syncServer, [RPGAutoJoin]);
    }

    public onInit(): void {
        this.avatars = new Map<string, Avatar>();

        // Create one game that all participants will join
        const params = {host: null, label: 'rpg'};
        this.match = this.server.getComponent(MatchMaker).createMatch(params);
        const simulator = this.server.getComponent(Simulator);
        const game = simulator.createSimulation(this.match);
        this.match.start(game.getId());
    }

    public addClient(client: Client) {
        this.match.add(client);
        client.getComponent(AvatarControl).attachMatch(this.match);
    }
}
