/**
 * TODO: [Description]
 * @author Greg Rozmarynowycz <greg@thunderlab.net>
 */

module.exports = {clockFactory,
resolve: () => [clockFactory]};

function clockFactory() {
    /**
     * @method getNow
     */
    class Clock {
        constructor() {
            this.startTime = (new Date()).getTime() - (~~performance.now());
        }

        getNow() {
            return this.startTime + (~~performance.now());
        }
    }

    return new Clock();
}
