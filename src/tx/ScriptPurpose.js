import { ConstrData } from "@helios-lang/uplc"
import { MintingPolicyHash } from "../hashes/index.js"
import { TxOutputId } from "./TxOutputId.js"
import { TxRedeemer } from "./TxRedeemer.js"

/**
 * @typedef {import("@helios-lang/uplc").UplcData} UplcData
 * @typedef {import("../hashes/index.js").MintingPolicyHashLike} MintingPolicyHashLike
 * @typedef {import("./TxOutputId.js").TxOutputIdLike} TxOutputIdLike
 * @typedef {import("./TxRedeemer.js").TxRedeemerKind} TxRedeemerKind
 */

/**
 * @typedef {TxRedeemerKind} ScriptPurposeKind
 */

/**
 * @template {ScriptPurposeKind} T
 * @typedef {T extends "Minting" ? {
 *   policy: MintingPolicyHash
 * } : T extends "Spending" ? {
 *   outputId: TxOutputId
 * } : never} ScriptPurposeProps
 */

/**
 * Doesn't include functionality to make Tx UplcData as that is done external
 * @template {ScriptPurposeKind} [T=ScriptPurposeKind]
 */
export class ScriptPurpose {
    /**
     * @readonly
     * @type {TxRedeemer<T>}
     */
    redeemer

    /**
     * @readonly
     * @type {ScriptPurposeProps<T>}
     */
    props

    /**
     * @private
     * @param {TxRedeemer<T>} redeemer
     * @param {ScriptPurposeProps<T>} props
     */
    constructor(redeemer, props) {
        this.redeemer = redeemer
        this.props = props
    }

    /**
     *
     * @param {TxRedeemer<"Minting">} redeemer
     * @param {MintingPolicyHashLike} policy
     * @returns {ScriptPurpose<"Minting">}
     */
    static Minting(redeemer, policy) {
        return new ScriptPurpose(redeemer, {
            policy: MintingPolicyHash.new(policy)
        })
    }

    /**
     * @param {TxRedeemer<"Spending">} redeemer
     * @param {TxOutputIdLike} outputId
     * @returns {ScriptPurpose<"Spending">}
     */
    static Spending(redeemer, outputId) {
        return new ScriptPurpose(redeemer, {
            outputId: TxOutputId.new(outputId)
        })
    }

    /**
     * @returns {this is ScriptPurpose<"Minting">}
     */
    isMinting() {
        return this.redeemer.isMinting()
    }

    /**
     * @returns {this is ScriptPurpose<"Spending">}
     */
    isSpending() {
        return this.redeemer.isSpending()
    }

    /**
     * @returns {ConstrData}
     */
    toUplcData() {
        if (this.isMinting()) {
            return new ConstrData(0, [this.props.policy.toUplcData()])
        } else if (this.isSpending()) {
            return new ConstrData(1, [this.props.outputId.toUplcData()])
        } else {
            throw new Error(
                `unhandled ScriptPurpose kind ${this.redeemer.kind}`
            )
        }
    }

    /**
     * @param {UplcData} txData
     * @returns {UplcData}
     */
    toScriptContextUplcData(txData) {
        return new ConstrData(0, [txData, this.toUplcData()])
    }
}
