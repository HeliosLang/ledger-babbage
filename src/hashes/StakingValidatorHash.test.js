import { describe, it } from "node:test"
import { UplcConst, UplcInt, UplcProgramV2 } from "@helios-lang/uplc"
import { StakingValidatorHash } from "./StakingValidatorHash.js"

describe(StakingValidatorHash.name, () => {
    it("typechecks", () => {
        const dummyBytes = StakingValidatorHash.dummy().bytes
        /**
         * witnessed by NativeScript
         * @satisfies {StakingValidatorHash<null>}
         */
        const unwitnessed = new StakingValidatorHash(dummyBytes, null)

        /**
         * witnessed by NativeScript
         * @satisfies {StakingValidatorHash<null>}
         */
        const unwitnessedCopy = StakingValidatorHash.new(unwitnessed)

        /**
         * default, witnessed or unwitnessed
         * @satisfies {StakingValidatorHash<unknown>}
         */
        const witnessedOrUnwitnessed = new StakingValidatorHash(dummyBytes)

        const dummyProgram = new UplcProgramV2(new UplcConst(new UplcInt(0)))
        /**
         * witnessed by UplcProgram
         * @satisfies {StakingValidatorHash<{program: UplcProgramV2}>}
         */
        const witnessed = new StakingValidatorHash(dummyBytes, {
            program: dummyProgram
        })
    })
})
