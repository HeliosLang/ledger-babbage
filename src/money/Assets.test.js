import { deepEqual, strictEqual } from "node:assert"
import { describe, it } from "node:test"
import { MintingPolicyHash } from "../hashes/index.js"
import { Assets } from "./Assets.js"

describe(Assets.name, () => {
    it("compare test", () => {
        const mphA = new MintingPolicyHash(
            "00000000000000000000000000000000000000000000000000000000"
        )
        const mphB = new MintingPolicyHash(
            "00000000000000000000000000000000000000000000000000000001"
        )
        const mphC = new MintingPolicyHash(
            "00000000000000000000000000000000000000000000000000000002"
        )
        const mphD = new MintingPolicyHash(
            "00000000000000000000000000000000000000000000000000000003"
        )
        const mphE = new MintingPolicyHash(
            "00000000000000000000000000000000000000000000000000000004"
        )

        const assets1 = new Assets([
            [mphA, [["", 1n]]],
            [mphB, [["", 1n]]],
            [mphC, [["", 1n]]],
            [mphD, [["", 1n]]],
            [mphE, [["", 1n]]]
        ])

        const assets2 = new Assets([[mphA, [["", 1n]]]])

        strictEqual(assets1.isGreaterOrEqual(assets2), true)
    })

    it("decodes cip68 tokenName correctly in dump()", () => {
        const policy =
            "c48cbb3d5e57ed56e276bc45f99ab39abe94e6cd7ac39fb402da47ad"
        const tokenName = "0014df105553444d"
        const assets = new Assets({
            [policy]: {
                [tokenName]: 100
            }
        })

        deepEqual(assets.dump(), {
            [policy]: { [tokenName]: { name: "USDM", quantity: 100n } }
        })
    })
})
