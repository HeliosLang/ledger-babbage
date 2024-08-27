import { strictEqual } from "node:assert"
import { describe, it } from "node:test"
import { NetworkParamsHelper } from "./NetworkParamsHelper.js"

describe(NetworkParamsHelper.name, () => {
    it("timeToSlot/slotToTime roundtrip", () => {
        const h = NetworkParamsHelper.default()

        const time = Date.now() + 300000

        strictEqual(
            Math.round(h.slotToTime(h.timeToSlot(time)) / 1000),
            Math.round(time / 1000)
        )
    })
})
