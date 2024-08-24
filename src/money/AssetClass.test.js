import { describe, it } from "node:test"
import { UplcConst, UplcInt, UplcProgramV2 } from "@helios-lang/uplc"
import { MintingPolicyHash } from "../hashes/index.js"
import { AssetClass } from "./AssetClass.js"

describe(AssetClass.name, () => {
    it("typechecks", () => {
        const unwitnessedMph = new MintingPolicyHash([], null)

        /**
         * AssetClass<null> (witnessed by NativeScript)
         * @satisfies {AssetClass<null>}
         */
        const unwitnessed = new AssetClass(unwitnessedMph, [])

        const witnessedOrUnwitnessedMph = new MintingPolicyHash([])

        /**
         * AssetClass<unknown> (default, witnessed or unwitnessed)
         * @satisfies {AssetClass<unknown>}
         */
        const witnessedOrUnwitnessed = new AssetClass(
            witnessedOrUnwitnessedMph,
            []
        )

        const dummyProgram = new UplcProgramV2(new UplcConst(new UplcInt(0)))
        const witnessedMph = new MintingPolicyHash([], {
            program: dummyProgram
        })

        /**
         * AssetClass<{...}> (witnessed by UplcProgram)
         * @satisfies {AssetClass<{program: UplcProgramV2}>}
         */
        const witnessed = new AssetClass(witnessedMph, [])
    })
})
