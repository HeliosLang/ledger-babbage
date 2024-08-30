import { deepEqual, throws } from "node:assert"
import { describe, it } from "node:test"
import { Signature } from "./Signature.js"

describe(Signature.name, () => {
    it("Signature.dummy() returns PubKey and bytes with all 0s for default arg", () => {
        const s = Signature.dummy()

        deepEqual(s.pubKey.bytes, new Array(32).fill(0))
        deepEqual(s.bytes, new Array(64).fill(0))
    })

    it("Signature.dummy() doesn't return PubKey and bytes with all 0s for non-zero seed arg", () => {
        const s = Signature.dummy(1)

        throws(() => {
            deepEqual(s.pubKey.bytes, new Array(32).fill(0))
        })

        throws(() => {
            deepEqual(s.bytes, new Array(64).fill(0))
        })
    })
})
