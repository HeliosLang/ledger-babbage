import { deepEqual, throws } from "node:assert"
import { describe, it } from "node:test"
import { UplcConst, UplcInt, UplcProgramV2 } from "@helios-lang/uplc"
import { PubKeyHash, ValidatorHash } from "../hashes/index.js"
import { SpendingCredential } from "./SpendingCredential.js"

describe(SpendingCredential.name, () => {
    it("typechecks", () => {
        const unwitnessedPkh = PubKeyHash.dummy()

        /**
         * unwitnessed
         * @satisfies {SpendingCredential<"PubKey", null>}
         */
        const unwitnessed = SpendingCredential.new(unwitnessedPkh)

        const dummyBytes = ValidatorHash.dummy().bytes
        const unwitnessedVh = new ValidatorHash(dummyBytes, null)

        /**
         * witnessed by NativeScript
         * @satisfies {SpendingCredential<"Validator", null>}
         */
        const witnessedByNative = SpendingCredential.new(unwitnessedVh)

        const witnessedOrUnwitnessedVh = new ValidatorHash(dummyBytes)

        /**
         * default, unwitnessed or witnessed
         * @satisfies {SpendingCredential<"Validator", unknown>}
         */
        const witnessedOrUnwitnessed = SpendingCredential.new(
            witnessedOrUnwitnessedVh
        )

        const dummyProgram = new UplcProgramV2(new UplcConst(new UplcInt(0)))
        const witnessedVh = new ValidatorHash(dummyBytes, {
            program: dummyProgram
        })

        /**
         * SpendingCredential<{...}> (witnessed by UplcProgram)
         * @satisfies {SpendingCredential<"Validator", {program: UplcProgramV2}>}
         */
        const witnessed = SpendingCredential.new(witnessedVh)

        /**
         * @satisfies {SpendingCredential<"Validator", {program: UplcProgramV2}>}
         */
        const witnessedCopy = SpendingCredential.new(witnessed)
    })

    it("SpendingCredential.dummy() returns all 0s for default arg", () => {
        deepEqual(SpendingCredential.dummy().bytes, new Array(28).fill(0))
    })

    it("SpendingCredential.dummy() doesn't return all 0s for non-zero seed arg", () => {
        throws(() => {
            deepEqual(SpendingCredential.dummy(1).bytes, new Array(28).fill(0))
        })
    })
})
