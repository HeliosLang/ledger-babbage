export {}

/**
 * Number representations are always milliseconds since 1970
 * @typedef {number | bigint | Date}  TimeLike
 */

/**
 * More permissive than toInt, as it allows -Infinity and +Infinity
 *  and rounds non-whole numbers
 * @param {TimeLike} arg
 * @returns {number} - use number instead of Date for time, because Date doesn't make any sense for the emulator
 */
export function toTime(arg) {
    if (arg instanceof Date) {
        return arg.getTime()
    } else if (typeof arg == "bigint") {
        return Number(arg)
    } else if (
        arg == Number.POSITIVE_INFINITY ||
        arg == Number.NEGATIVE_INFINITY
    ) {
        return arg
    } else if (Number.isNaN(arg)) {
        throw new Error("NaN")
    } else {
        return Math.round(arg)
    }
}
