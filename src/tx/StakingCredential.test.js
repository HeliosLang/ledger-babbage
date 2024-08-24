import { describe, it } from "node:test"
import { UplcConst, UplcInt, UplcProgramV2 } from "@helios-lang/uplc"
import { PubKeyHash, StakingValidatorHash } from "../hashes/index.js"
import { StakingCredential } from "./StakingCredential.js"

describe(StakingCredential.name, () => {
    it("typechecks", () => {
        const unwitnessedPkh = PubKeyHash.dummy()

        /**
         * unwitnessed
         * @satisfies {StakingCredential<"PubKey", null>}
         */
        const unwitnessed = StakingCredential.new(unwitnessedPkh)

        const dummyBytes = StakingValidatorHash.dummy().bytes
        const unwitnessedVh = new StakingValidatorHash(dummyBytes, null)

        /**
         * witnessed by NativeScript
         * @satisfies {StakingCredential<"Validator", null>}
         */
        const witnessedByNative = StakingCredential.new(unwitnessedVh)

        const witnessedOrUnwitnessedVh = new StakingValidatorHash(dummyBytes)

        /**
         * default, unwitnessed or witnessed
         * @satisfies {StakingCredential<"Validator", unknown>}
         */
        const witnessedOrUnwitnessed = StakingCredential.new(
            witnessedOrUnwitnessedVh
        )

        const dummyProgram = new UplcProgramV2(new UplcConst(new UplcInt(0)))
        const witnessedVh = new StakingValidatorHash(dummyBytes, {
            program: dummyProgram
        })

        /**
         * StakingCredential<{...}> (witnessed by UplcProgram)
         * @satisfies {StakingCredential<"Validator", {program: UplcProgramV2}>}
         */
        const witnessed = StakingCredential.new(witnessedVh)
    })
})
