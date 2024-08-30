import { deepEqual, throws } from "node:assert"
import { describe, it } from "node:test"
import { PubKey } from "./PubKey.js"

describe(PubKey.name, () => {
    it("PubKey.dummy() returns all 0s for default args", () => {
        deepEqual(PubKey.dummy().bytes, new Array(32).fill(0))
    })

    it("PubKey.dummy() doesn't return all 0s for non-zero seed arg", () => {
        throws(() => {
            deepEqual(PubKey.dummy(1).bytes, new Array(32).fill(0))
        })
    })
})
