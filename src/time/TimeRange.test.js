import { strictEqual } from "node:assert"
import { describe, it } from "node:test"
import { TimeRange } from "./TimeRange.js"

describe(TimeRange.name, () => {
    it("correct formatting of [100, 1000]", () => {
        strictEqual(new TimeRange(100, 1000).toString(), "[100, 1000]")
    })

    it("correct formatting of [-inf, +inf]", () => {
        strictEqual(
            new TimeRange(
                Number.NEGATIVE_INFINITY,
                Number.POSITIVE_INFINITY
            ).toString(),
            "[-inf, +inf]"
        )
    })

    it("correct formatting of [-100, 1000)", () => {
        strictEqual(
            new TimeRange(-100, 1000, { excludeEnd: true }).toString(),
            "[-100, 1000)"
        )
    })

    it("correct formatting of [-100, 1000) if the specified end is not a whole number (1000.1)", () => {
        strictEqual(
            new TimeRange(-100, 1000.1, { excludeEnd: true }).toString(),
            "[-100, 1000)"
        )
    })
})
