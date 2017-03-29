/**
 * Created by gjr8050 on 3/9/2017.
 */

export class Clock {
    private start = process.hrtime();

    /**
     * Returns the number of milliseconds since the clock was created
     * @returns {number}
     */
    public now(): number {
        const end = process.hrtime(this.start);
        return Math.round((end[0] * 1000) + end[1] / 1000000);
    }
}
