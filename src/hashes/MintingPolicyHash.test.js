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
})
