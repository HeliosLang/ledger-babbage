import { None } from "@helios-lang/type-utils"
import {
    ConstrData,
    IntData,
    decodeBoolData,
    encodeBoolData
} from "@helios-lang/uplc"
import { toTime } from "./Time.js"

/**
 * @typedef {import("@helios-lang/uplc").UplcData} UplcData
 * @typedef {import("./Time.js").TimeLike} TimeLike
 */

/**
 * Default TimeRange includes both `start` and `end`.
 * @typedef {{
 *   excludeStart?: boolean
 *   excludeEnd?: boolean
 * }} TimeRangeOptions
 */

/**
 * @typedef {TimeRange | [TimeLike, TimeLike] | {
 *     start?: TimeLike
 *     excludeStart?: boolean
 *     end?: TimeLike
 *     excludeEnd?: boolean
 *   }} TimeRangeLike
 */

/**
 * `start` and `end` are stored as numbers so we can use Number.NEGATIVE_INFINITY and Number.POSITIVE_INFINITY
 */
export class TimeRange {
    /**
     * @readonly
     * @type {number}
     */
    start

    /**
     * @readonly
     * @type {boolean}
     */
    includeStart

    /**
     * @readonly
     * @type {number}
     */
    end

    /**
     * @readonly
     * @type {boolean}
     */
    includeEnd

    /**
     * @param {TimeLike} start - milliseconds since 1970
     * @param {TimeLike} end - milliseconds since 1970
     * @param {TimeRangeOptions} options
     */
    constructor(start, end, options = {}) {
        this.start = toTime(start)
        this.end = toTime(end)
        this.includeStart = !(options.excludeStart ?? false)
        this.includeEnd = !(options.excludeEnd ?? false)
    }

    static always() {
        return new TimeRange(Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY)
    }

    /**
     * @param {TimeRangeLike} arg
     * @returns {TimeRange}
     */
    static new(arg) {
        if (arg instanceof TimeRange) {
            return arg
        } else if (Array.isArray(arg)) {
            return new TimeRange(arg[0], arg[1])
        } else {
            return new TimeRange(
                arg?.start ?? Number.NEGATIVE_INFINITY,
                arg?.end ?? Number.POSITIVE_INFINITY,
                {
                    excludeStart: arg?.excludeStart,
                    excludeEnd: arg?.excludeEnd
                }
            )
        }
    }

    /**
     * @param {UplcData} data
     * @returns {TimeRange}
     */
    static fromUplcData(data) {
        ConstrData.assert(data, 0, 2)

        const [startData, endData] = data.fields

        ConstrData.assert(startData, 0, 2)
        ConstrData.assert(endData, 0, 2)

        const [startTimeData, includeStartData] = startData.fields
        const [endTimeData, includeEndData] = endData.fields

        const startTime = decodeTimeRangeTimeData(startTimeData, true)
        const endTime = decodeTimeRangeTimeData(endTimeData, true)
        const includeStart = decodeBoolData(includeStartData, true)
        const includeEnd = decodeBoolData(includeEndData, true)

        return new TimeRange(startTime, endTime, {
            excludeStart: !includeStart,
            excludeEnd: !includeEnd
        })
    }

    static never() {
        return new TimeRange(Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY)
    }

    /**
     * @type {Option<number>}
     */
    get finiteStart() {
        if (
            this.start !== Number.NEGATIVE_INFINITY &&
            this.start !== Number.POSITIVE_INFINITY
        ) {
            return this.start
        } else {
            return None
        }
    }

    /**
     * @type {Option<number>}
     */
    get finiteEnd() {
        if (
            this.end !== Number.NEGATIVE_INFINITY &&
            this.end !== Number.POSITIVE_INFINITY
        ) {
            return this.end
        } else {
            return None
        }
    }

    /**
     * @returns {string}
     */
    toString() {
        if (
            this.end == Number.NEGATIVE_INFINITY ||
            this.start == Number.POSITIVE_INFINITY
        ) {
            return "<never>"
        } else {
            return [
                `${this.includeStart ? "[" : "("}${this.start == Number.NEGATIVE_INFINITY ? "-inf" : this.start.toString()}`,
                `${this.end == Number.POSITIVE_INFINITY ? "+inf" : this.end.toString()}${this.includeEnd ? "]" : ")"}`
            ].join(", ")
        }
    }

    /**
     * @returns {ConstrData}
     */
    toUplcData() {
        return new ConstrData(0, [
            new ConstrData(0, [
                encodeTimeRangeTimeData(this.start),
                encodeBoolData(this.includeStart)
            ]),
            new ConstrData(0, [
                encodeTimeRangeTimeData(this.end),
                encodeBoolData(this.includeEnd)
            ])
        ])
    }
}

/**
 * @param {UplcData} data
 * @param {boolean} strict
 * @returns {number}
 */
function decodeTimeRangeTimeData(data, strict = false) {
    ConstrData.assert(data)

    switch (data.tag) {
        case 0:
            if (strict && data.fields.length != 0) {
                throw new Error(
                    `expected 0 ConstrData fields in TimeRange negative infinity, got ${data.fields.length} fields`
                )
            }

            return Number.NEGATIVE_INFINITY
        case 1:
            if (
                data.fields.length == 0 ||
                (strict && data.fields.length != 1)
            ) {
                throw new Error(
                    `expected 1 ConstrData fields in TimeRange time, got ${data.fields.length} fields`
                )
            }

            return Number(IntData.expect(data.fields[0]).value)
        case 2:
            if (strict && data.fields.length != 0) {
                throw new Error(
                    `expected 0 ConstrData fields in TimeRange positive infinity, got ${data.fields.length} fields`
                )
            }

            return Number.POSITIVE_INFINITY
        default:
            throw new Error(
                `expected tag 0, 1 or 2 for TimeRange time ConstrData, got ${data.tag}`
            )
    }
}

/**
 *
 * @param {number} t
 * @returns {ConstrData}
 */
function encodeTimeRangeTimeData(t) {
    switch (t) {
        case Number.NEGATIVE_INFINITY:
            return new ConstrData(0, [])
        case Number.POSITIVE_INFINITY:
            return new ConstrData(2, [])
        default:
            return new ConstrData(1, [new IntData(Math.round(t))])
    }
}
