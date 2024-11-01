import {
    ByteArrayData,
    ConstrData,
    IntData,
    ListData,
    MapData
} from "@helios-lang/uplc"
import { DatumHash } from "../hashes/index.js"
import { Assets, Value } from "../money/index.js"
import { TimeRange } from "../time/index.js"
import { ScriptPurpose } from "./ScriptPurpose.js"
import { TxId } from "./TxId.js"

/**
 * @typedef {import("@helios-lang/codec-utils").IntLike} IntLike
 * @typedef {import("@helios-lang/uplc").UplcData} UplcData
 * @typedef {import("./TxInfo.js").TxInfo} TxInfo
 */

export class ScriptContextV2 {
    /**
     * @readonly
     * @type {TxInfo}
     */
    txInfo

    /**
     * @readonly
     * @type {ScriptPurpose}
     */
    purpose

    /**
     * @param {TxInfo} txInfo
     * @param {ScriptPurpose} purpose
     */
    constructor(txInfo, purpose) {
        this.txInfo = txInfo
        this.purpose = purpose
    }

    /**
     * @returns {UplcData}
     */
    toUplcData() {
        const inputs = this.txInfo.inputs
        const refInputs = this.txInfo.refInputs ?? []
        const outputs = this.txInfo.outputs
        const fee = this.txInfo.fee ?? 0n
        const minted = this.txInfo.minted ?? new Assets([])
        const dcerts = this.txInfo.dcerts ?? []
        const withdrawals = this.txInfo.withdrawals ?? []
        const validityTimerange =
            this.txInfo.validityTimerange ?? TimeRange.always()
        const signers = this.txInfo.signers ?? []
        const redeemers = this.txInfo.redeemers ?? []
        const datums = this.txInfo.datums ?? []
        const txId = this.txInfo.id ?? TxId.dummy()

        const txData = new ConstrData(0, [
            new ListData(inputs.map((input) => input.toUplcData())),
            new ListData(refInputs.map((input) => input.toUplcData())),
            new ListData(outputs.map((output) => output.toUplcData())),
            new Value(fee).toUplcData(),
            // NOTE: all other Value instances in ScriptContext contain some lovelace, but `minted` can never contain any lovelace, yet cardano-node always prepends 0 lovelace to the `minted` MapData
            new Value(0n, minted).toUplcData(true),
            new ListData(dcerts.map((cert) => cert.toUplcData())),
            new MapData(
                withdrawals.map(([sa, q]) => [sa.toUplcData(), new IntData(q)])
            ),
            validityTimerange.toUplcData(),
            new ListData(signers.map((signer) => signer.toUplcData())),
            new MapData(
                redeemers.map((redeemer) => {
                    if (redeemer.isMinting()) {
                        return [
                            ScriptPurpose.Minting(
                                redeemer,
                                minted.getPolicies()[redeemer.index]
                            ).toUplcData(),
                            redeemer.data
                        ]
                    } else if (redeemer.isSpending()) {
                        return [
                            ScriptPurpose.Spending(
                                redeemer,
                                inputs[redeemer.index].id
                            ).toUplcData(),
                            redeemer.data
                        ]
                    } else if (redeemer.isRewarding()) {
                        return [
                            ScriptPurpose.Rewarding(
                                redeemer,
                                withdrawals[redeemer.index][0].toCredential()
                            ).toUplcData(),
                            redeemer.data
                        ]
                    } else if (redeemer.isCertifying()) {
                        return [
                            ScriptPurpose.Certifying(
                                redeemer,
                                dcerts[redeemer.index]
                            ).toUplcData(),
                            redeemer.data
                        ]
                    } else {
                        throw new Error(
                            `unhandled TxRedeemer kind ${redeemer.kind}`
                        )
                    }
                })
            ),
            new MapData(
                datums.map((d) => [DatumHash.hashUplcData(d).toUplcData(), d])
            ),
            new ConstrData(0, [new ByteArrayData(txId.bytes)])
        ])

        return new ConstrData(0, [txData, this.purpose.toUplcData()])
    }
}
