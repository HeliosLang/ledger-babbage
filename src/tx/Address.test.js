import { deepEqual, throws } from "node:assert"
import { describe, it } from "node:test"
import { Address } from "./Address.js"

describe(Address.name, () => {
    it("Address.dummy() returns all 0s for default args", () => {
        deepEqual(Address.dummy(false).pubKeyHash?.bytes, new Array(28).fill(0))
    })

    it("Address.dummy() doesn't return all 0s for non-zero seed args", () => {
        throws(() => {
            deepEqual(
                Address.dummy(false, 1).pubKeyHash?.bytes,
                new Array(28).fill(0)
            )
        })
    })
})
