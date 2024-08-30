import { deepEqual, throws } from "node:assert"
import { describe, it } from "node:test"
import { UplcConst, UplcInt, UplcProgramV2 } from "@helios-lang/uplc"
import { PubKeyHash } from "./PubKeyHash.js"
import { StakingHash } from "./StakingHash.js"
import { StakingValidatorHash } from "./StakingValidatorHash.js"

describe(StakingHash.name, () => {
    it("typechecks", () => {
        const unwitnessedPkh = PubKeyHash.dummy()

        /**
         * unwitnessed
         * @satisfies {StakingHash<"PubKey", null>}
         */
        const unwitnessed = StakingHash.new(unwitnessedPkh)

        const dummyBytes = StakingValidatorHash.dummy().bytes

        const unwitnessedVh = new StakingValidatorHash(dummyBytes, null)

        /**
         * witnessed by NativeScript
         * @satisfies {StakingHash<"Validator", null>}
         */
        const witnessedByNative = StakingHash.new(unwitnessedVh)

        const witnessedOrUnwitnessedVh = new StakingValidatorHash(dummyBytes)

        /**
         * default, unwitnessed or witnessed
         * @satisfies {StakingHash<"Validator", unknown>}
         */
        const witnessedOrUnwitnessed = StakingHash.new(witnessedOrUnwitnessedVh)

        const dummyProgram = new UplcProgramV2(new UplcConst(new UplcInt(0)))
        const witnessedVh = new StakingValidatorHash(dummyBytes, {
            program: dummyProgram
        })

        /**
         * StakingHash<{...}> (witnessed by UplcProgram)
         * @type {StakingHash<"Validator", {program: UplcProgramV2}>}
         */
        const witnessed = StakingHash.new(witnessedVh)
    })

    it("StakingHash.dummy() returns PubKeyHash with all 0s for default arg", () => {
        deepEqual(StakingHash.dummy().bytes, new Array(28).fill(0))
    })

    it("StakingHash.dummy() doesn't return PubKeyHash with all 0s for non-zero seed arg", () => {
        throws(() => {
            deepEqual(StakingHash.dummy(1).bytes, new Array(28).fill(0))
        })
    })
})
