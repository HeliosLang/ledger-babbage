import { deepEqual, throws } from "node:assert"
import { describe, it } from "node:test"
import { makeDummyAddress } from "./ShelleyAddress.js"

describe("ShelleyAddress", () => {
    it("Address.dummy() returns all 0s for default args", () => {
        deepEqual(
            makeDummyAddress(false).pubKeyHash?.bytes,
            new Array(28).fill(0)
        )
    })

    it("Address.dummy() doesn't return all 0s for non-zero seed args", () => {
        throws(() => {
            deepEqual(
                makeDummyAddress(false, 1).pubKeyHash?.bytes,
                new Array(28).fill(0)
            )
        })
    })
})
