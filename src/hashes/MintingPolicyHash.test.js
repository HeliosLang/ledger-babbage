import { deepEqual, throws } from "assert"
import { describe, it } from "node:test"
import { UplcConst, UplcInt, UplcProgramV2 } from "@helios-lang/uplc"
import { MintingPolicyHash } from "./MintingPolicyHash.js"

describe(MintingPolicyHash.name, () => {
    it("typechecks", () => {
        /**
         * witnessed by NativeScript
         * @type {MintingPolicyHash<null>}
         */
        const unwitnessed = new MintingPolicyHash([], null)

        /**
         * default, witnessed or unwitnessed
         * @type {MintingPolicyHash<unknown>}
         */
        const witnessedOrUnwitnessed = new MintingPolicyHash([])

        const dummyProgram = new UplcProgramV2(new UplcConst(new UplcInt(0)))
        /**
         * witnessed by UplcProgram
         * @type {MintingPolicyHash<{program: UplcProgramV2}>}
         */
        const witnessed = new MintingPolicyHash([], { program: dummyProgram })
    })

    it("MintingPolicyHash.dummy() returns all 0s with default args", () => {
        deepEqual(MintingPolicyHash.dummy().bytes, new Array(28).fill(0))
    })

    it("MintingPolicyHash.dummy() doesn't returns all 0s with non-zero seed arg", () => {
        throws(() => {
            deepEqual(MintingPolicyHash.dummy(1).bytes, new Array(28).fill(0))
        })
    })
})
