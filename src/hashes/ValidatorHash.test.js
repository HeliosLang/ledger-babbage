import { deepEqual, throws } from "node:assert"
import { describe, it } from "node:test"
import { UplcConst, UplcInt, UplcProgramV2 } from "@helios-lang/uplc"
import { ValidatorHash } from "./ValidatorHash.js"

describe(ValidatorHash.name, () => {
    it("typechecks", () => {
        const dummyBytes = ValidatorHash.dummy().bytes
        /**
         * witnessed by NativeScript
         * @satisfies {ValidatorHash<null>}
         */
        const unwitnessed = new ValidatorHash(dummyBytes, null)

        /**
         * @satisfies {ValidatorHash<null>}
         */
        const unwitnessedCopy = ValidatorHash.new(unwitnessed)

        /**
         * default, witnessed or unwitnessed
         * @satisfies {ValidatorHash<unknown>}
         */
        const witnessedOrUnwitnessed = new ValidatorHash(dummyBytes)

        const dummyProgram = new UplcProgramV2(new UplcConst(new UplcInt(0)))
        /**
         * witnessed by UplcProgram
         * @satisfies {ValidatorHash<{program: UplcProgramV2}>}
         */
        const witnessed = new ValidatorHash(dummyBytes, {
            program: dummyProgram
        })
    })

    it("ValidatorHash.dummy() returns all 0s for default args", () => {
        deepEqual(ValidatorHash.dummy().bytes, new Array(28).fill(0))
    })

    it("ValidatorHash.dummy() doesn't return all 0s for non-zero seed args", () => {
        throws(() => {
            deepEqual(ValidatorHash.dummy(1).bytes, new Array(28).fill(0))
        })
    })
})
