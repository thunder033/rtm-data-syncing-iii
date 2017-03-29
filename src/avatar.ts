/**
 * Created by gjr8050 on 3/29/2017.
 */
import {NetworkEntity} from "./network-index";
import {bind} from "bind-decorator";

export class Avatar extends NetworkEntity {

    constructor() {
        super(Avatar);
    }

    @bind
    public update(dt) {

    }

    public jump(pingDelay: number) {

    }

    public move(direction: number, pingDelay: number) {

    }
}