/**
 * Created by gjr8050 on 2/23/2017.
 */

import * as uuid from 'uuid/v4';
import {INetworkEntity} from './network-index';
import {MatchMaker, MatchMember} from './match-maker';
import {Room} from './room';
import {Client} from './client';
import {MatchEvent} from 'event-types';
import {Connection} from './connection';

/**
 * Specialized Room for staging new play sessions between users
 */
export class Match extends Room implements INetworkEntity {

    private static MAX_MATCH_SIZE: number = NaN;
    private static MATCH_START_SYNC_TIME: number = 0;

    private label: string;
    private matchMaker: MatchMaker;
    private host: MatchMember;
    private started: boolean;
    private startTime: number;

    constructor(user: MatchMember, matchMaker: MatchMaker) {
        super(`match-${uuid()}`);
        this.host = user;
        this.setCapacity(Match.MAX_MATCH_SIZE);
        this.matchMaker = matchMaker;
        this.started = false;
        this.startTime = NaN;
    }

    public remove(user: Client): boolean {
        const removed = super.remove(user);
        if (removed && this.started === true && !user.getComponent(Connection).isTerminated()) {
            this.matchMaker.getLobby().add(user);
        }

        // If there's no users left in the match, destroy it
        if (this.users.length === 0) {
            // this.end();
            // this.destroy();
        } else if ((user as Client).getComponent(MatchMember).isHost()) {
            this.host = this.users[0].getComponent(MatchMember);
            this.sync(null, this.getName());
        }

        user.getComponent(MatchMember).unsetMatch();

        return removed;
    }

    /**
     * Terminate any ongoing functions associated with the match
     * @returns {undefined}
     */
    public end(): void {
        console.log('ended match ', this.name);

        this.broadcast(MatchEvent.matchEnded, {matchId: this.getId()});
        // Return users to the lobby at the end of the match
        while (this.users.length > 0) {
            this.remove(this.users[0]);
        }
    }

    /**
     * Remove this match from the server
     */
    public destroy(): void {
        this.matchMaker.removeMatch(this);
    }

    public setLabel(label: string): void {
        this.label = label;
    }

    public getLabel(): string {
        return this.label;
    }

    public isOpen(): boolean {
        return this.users.length < this.getCapacity() && this.started === false;
    }

    public hasStarted(): boolean {
        return this.started;
    }

    public getHost(): MatchMember {
        return this.host;
    }

    public start(gameId: string): void {
        if (this.started === true) {
            throw new Error(`Attempted to start match ${this.name} that has already been started!`);
        }

        this.started = true;

        // Players leave the lobby when the match begins
        this.users.forEach((user) => {
            this.matchMaker.getLobby().remove(user);
        });

        const startTime = Date.now() + Match.MATCH_START_SYNC_TIME;
        this.broadcast(MatchEvent.matchStarted, {matchId: this.getId(), gameId, startTime});
    }

    public getStartTime(): number {
        return this.startTime;
    }

    public getSerializable(): Object {
        return Object.assign(super.getSerializable(), {
            host: this.host === null ? null : this.host.getId(),
            label: this.getLabel(),
            startTime: this.startTime,
            started: this.started,
        });
    }
}
