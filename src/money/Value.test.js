import { strictEqual } from "node:assert"
import { describe, it } from "node:test"
import { bytesToHex } from "@helios-lang/codec-utils"
import { makeDummyAddress } from "../tx/ShelleyAddress.js"
import { TxInput } from "../tx/TxInput.js"
import { TxOutput } from "../tx/TxOutput.js"
import { TxOutputId } from "../tx/TxOutputId.js"
import { Value } from "./Value.js"

const IS_MAINNET = false

describe(Value.name, () => {
    it("adds values of TxInput[] together correctly", () => {
        /**
         * @param {Value} value
         * @returns {TxInput}
         */
        const makeInput = (value) => {
            return new TxInput(
                TxOutputId.dummy(),
                new TxOutput(makeDummyAddress(IS_MAINNET), value)
            )
        }

        const policy =
            "b143fb8b156eb62cb5240b02d55e580a56b7864064d2ee374536ca0b"
        const tokenName = ""
        const qty = 10n

        const inputs = [
            makeInput(new Value(1_000_000n)),
            makeInput(new Value(10_000_000n)),
            makeInput(new Value(2_000_000n, { [policy]: { [tokenName]: qty } }))
        ]

        const sum = Value.sum(inputs)
        const summedTokens = sum.assets.getPolicyTokens(policy)

        strictEqual(sum.lovelace, 13_000_000n)
        strictEqual(sum.assets.assets.length, 1)
        strictEqual(summedTokens.length, 1)
        strictEqual(bytesToHex(summedTokens[0][0]), tokenName)
        strictEqual(summedTokens[0][1], qty)
    })
})
