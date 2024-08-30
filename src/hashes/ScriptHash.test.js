import { deepEqual, throws } from "node:assert"
import { describe, it } from "node:test"
import { ScriptHash } from "./ScriptHash.js"

describe(ScriptHash.name, () => {
    it("ScriptHash.dummy() returns all 0s for default arg", () => {
        deepEqual(ScriptHash.dummy().bytes, new Array(28).fill(0))
    })

    it("ScriptHash.dummy() doesn't returns all 0s for non-zero seed arg", () => {
        throws(() => {
            deepEqual(ScriptHash.dummy(1).bytes, new Array(28).fill(0))
        })
    })
})
