import { deepEqual, strictEqual, throws } from "node:assert"
import { describe, it } from "node:test"
import { dummyBytes } from "@helios-lang/codec-utils"
import { ByteArrayData, ConstrData, IntData } from "@helios-lang/uplc"
import { TxOutputDatum } from "./TxOutputDatum.js"

describe(TxOutputDatum.name, () => {
    describe("fromUplcData", () => {
        it("handles None correctly", () => {
            const datum = TxOutputDatum.fromUplcData(new ConstrData(0, []))

            strictEqual(datum, undefined)
        })

        it("handles Hash correctly", () => {
            const bytes = dummyBytes(32)
            const datum = TxOutputDatum.fromUplcData(
                new ConstrData(1, [new ByteArrayData(bytes)])
            )

            deepEqual(datum?.hash.bytes, bytes)
            throws(() => {
                datum?.data
            })
        })

        it("handles Inline correctly", () => {
            const payload = new IntData(0)
            const datum = TxOutputDatum.fromUplcData(
                new ConstrData(2, [payload])
            )

            strictEqual(datum?.data.toSchemaJson(), payload.toSchemaJson())
        })

        it("fails if more than zero None fields", () => {
            throws(() => {
                TxOutputDatum.fromUplcData(new ConstrData(0, [new IntData(0)]))
            })
        })

        it("fails if no Hash fields", () => {
            throws(() => {
                TxOutputDatum.fromUplcData(new ConstrData(1, []))
            })
        })

        it("fails if too many Hash fields", () => {
            throws(() => {
                TxOutputDatum.fromUplcData(
                    new ConstrData(1, [new IntData(0), new IntData(0)])
                )
            })
        })

        it("fails if no Inline fields", () => {
            throws(() => {
                TxOutputDatum.fromUplcData(new ConstrData(2, []))
            })
        })

        it("fails if too many Inline fields", () => {
            throws(() => {
                TxOutputDatum.fromUplcData(
                    new ConstrData(2, [new IntData(0), new IntData(0)])
                )
            })
        })
    })
})
