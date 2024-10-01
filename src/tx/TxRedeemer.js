import {
    decodeInt,
    decodeTagged,
    encodeInt,
    encodeTuple
} from "@helios-lang/cbor"
import { bytesToHex, toInt } from "@helios-lang/codec-utils"
import { decodeCost, decodeUplcData, encodeCost } from "@helios-lang/uplc"
import { NetworkParamsHelper } from "../params/NetworkParamsHelper.js"
import { Tx } from "./Tx.js"
import { UplcProgramV1 } from "@helios-lang/uplc"
import { UplcProgramV2 } from "@helios-lang/uplc"
import { expectSome } from "@helios-lang/type-utils"
import { ScriptContextV2 } from "./ScriptContextV2.js"
import { ScriptPurpose } from "./ScriptPurpose.js"
import { UplcDataValue } from "@helios-lang/uplc"

/**
 * @typedef {import("@helios-lang/codec-utils").ByteArrayLike} ByteArrayLike
 * @typedef {import("@helios-lang/codec-utils").IntLike} IntLike
 * @typedef {import("@helios-lang/uplc").UplcData} UplcData
 * @typedef {import("@helios-lang/uplc").Cost} Cost
 * @typedef {import("../params/index.js").NetworkParams} NetworkParams
 * @typedef {import("./TxInfo.js").TxInfo} TxInfo
 */

/**
 * @typedef {"Minting" | "Spending" | "Rewarding"} TxRedeemerKind
 */

/**
 * TODO: verify the Rewarding TxRedeemer payload is the withdrawal index
 * @template {TxRedeemerKind} T
 * @typedef {T extends "Spending" ? {
 *   inputIndex: number
 *   data: UplcData
 *   cost: Cost
 * } : T extends "Minting" ? {
 *   policyIndex: number
 *   data: UplcData
 *   cost: Cost
 * } : T extends "Rewarding" ? {
 *   withdrawalIndex: number
 *   data: UplcData
 *   cost: Cost
 * } : never} TxRedeemerProps
 */

/**
 * @template {TxRedeemerKind} [T=TxRedeemerKind]
 */
export class TxRedeemer {
    /**
     * @readonly
     * @type {T}
     */
    kind

    /**
     * @private
     * @readonly
     * @type {TxRedeemerProps<T>}
     */
    props

    /**
     * @private
     * @param {T} kind
     * @param {TxRedeemerProps<T>} props
     */
    constructor(kind, props) {
        this.kind = kind
        this.props = props
    }

    /**
     * @param {IntLike} inputIndex
     * @param {UplcData} data
     * @param {Cost} cost - defaults to zero so cost can be calculated after construction
     * @returns {TxRedeemer<"Spending">}
     */
    static Spending(inputIndex, data, cost = { mem: 0n, cpu: 0n }) {
        const index = toInt(inputIndex)

        if (index < 0) {
            throw new Error("negative TxRedeemer spending index not allowed")
        }

        return new TxRedeemer("Spending", {
            inputIndex: index,
            data,
            cost
        })
    }

    /**
     * @param {IntLike} policyIndex
     * @param {UplcData} data
     * @param {Cost} cost - defaults to zero so cost can be calculated after construction
     * @returns {TxRedeemer<"Minting">}
     */
    static Minting(policyIndex, data, cost = { mem: 0n, cpu: 0n }) {
        const index = toInt(policyIndex)

        if (index < 0) {
            throw new Error("negative TxRedeemer minting index not allowed")
        }

        return new TxRedeemer("Minting", {
            policyIndex: index,
            data,
            cost
        })
    }

    /**
     * @param {IntLike} withdrawalIndex
     * @param {UplcData} data
     * @param {Cost} cost
     * @returns {TxRedeemer<"Rewarding">}
     */
    static Rewarding(withdrawalIndex, data, cost = { mem: 0n, cpu: 0n }) {
        const index = toInt(withdrawalIndex)

        if (index < 0) {
            throw new Error(
                "negative TxRedeemer reward withdrawal index not allowed"
            )
        }

        return new TxRedeemer("Rewarding", {
            withdrawalIndex: index,
            data,
            cost
        })
    }

    /**
     * @param {ByteArrayLike} bytes
     * @returns {TxRedeemer}
     */
    static fromCbor(bytes) {
        const [tag, decodeItem] = decodeTagged(bytes)

        switch (tag) {
            case 0: {
                const inputIndex = decodeItem(decodeInt)
                const data = decodeItem(decodeUplcData)
                const cost = decodeItem(decodeCost)

                return TxRedeemer.Spending(inputIndex, data, cost)
            }
            case 1: {
                const policyIndex = decodeItem(decodeInt)
                const data = decodeItem(decodeUplcData)
                const cost = decodeItem(decodeCost)

                return TxRedeemer.Minting(policyIndex, data, cost)
            }
            case 2:
                throw new Error(`TxRedeemer.Certifying unhandled`)
            case 3: {
                const withdrawalIndex = decodeItem(decodeInt)
                const data = decodeItem(decodeUplcData)
                const cost = decodeItem(decodeCost)

                return TxRedeemer.Rewarding(withdrawalIndex, data, cost)
            }
            default:
                throw new Error(`unhandled TxRedeemer tag ${tag}`)
        }
    }

    /**
     *
     * @param {TxRedeemer} a
     * @param {TxRedeemer} b
     * @returns {number}
     */
    static compare(a, b) {
        if (a.isMinting() && b.isMinting()) {
            return a.props.policyIndex - b.props.policyIndex
        } else if (a.isSpending() && b.isSpending()) {
            return a.props.inputIndex - b.props.inputIndex
        } else if (a.isRewarding() && b.isRewarding()) {
            return a.props.withdrawalIndex - b.props.withdrawalIndex
        } else if (a.kind == b.kind) {
            throw new Error(`unhandled TxRedeemer kind ${a.kind}`)
        } else {
            return a.tag - b.tag
        }
    }

    /**
     * @type {Cost}
     */
    get cost() {
        return this.props.cost
    }

    /**
     * @type {UplcData}
     */
    get data() {
        return this.props.data
    }

    /**
     * @type {number}
     */
    get index() {
        if (this.isMinting()) {
            return this.props.policyIndex
        } else if (this.isSpending()) {
            return this.props.inputIndex
        } else if (this.isRewarding()) {
            return this.props.withdrawalIndex
        } else {
            throw new Error(`unhandled TxRedeemer kind ${this.kind}`)
        }
    }

    /**
     * On-chain ConstrData tag
     * @type {number}
     */
    get tag() {
        if (this.isMinting()) {
            return 0
        } else if (this.isSpending()) {
            return 1
        } else if (this.isRewarding()) {
            return 2
        } else {
            throw new Error(`unhandled TxRedeemer kind ${this.kind}`)
        }
    }

    /**
     * @param {NetworkParams} params
     * @returns {bigint}
     */
    calcExFee(params) {
        const helper = new NetworkParamsHelper(params)

        const { mem, cpu } = this.props.cost
        const [memFee, cpuFee] = helper.exFeeParams

        return BigInt(Math.ceil(Number(mem) * memFee + Number(cpu) * cpuFee))
    }

    /**
     * @returns {Object}
     */
    dump() {
        if (this.isSpending()) {
            return {
                redeemerType: "Spending",
                inputIndex: this.props.inputIndex,
                json: this.data.toSchemaJson(),
                cbor: bytesToHex(this.data.toCbor()),
                exUnits: {
                    mem: this.cost.mem.toString(),
                    cpu: this.cost.cpu.toString()
                }
            }
        } else if (this.isMinting()) {
            return {
                redeemerType: "Minting",
                policyIndex: this.props.policyIndex,
                json: this.data.toSchemaJson(),
                cbor: bytesToHex(this.data.toCbor()),
                exUnits: {
                    mem: this.cost.mem.toString(),
                    cpu: this.cost.cpu.toString()
                }
            }
        } else if (this.isRewarding()) {
            return {
                redeemerType: "Rewarding",
                withdrawalIndex: this.props.withdrawalIndex,
                json: this.data.toSchemaJson(),
                cbor: bytesToHex(this.data.toCbor()),
                exUnits: {
                    mem: this.cost.mem.toString(),
                    cpu: this.cost.cpu.toString()
                }
            }
        } else {
            throw new Error("unhandled TxRedeemer kind")
        }
    }

    /**
     * @typedef {Object} RedeemerDetailsWithoutArgs
     * @property {string} summary - a short label indicating the part of the txn unlocked by the redeemer
     * @property {string} description - a more complete specifier of the redeemer
     * @property {UplcProgramV1 | UplcProgramV2} script - the UplcProgram validating the redeemer
     */
    /**
     * @typedef {Object} RedeemerDetailsWithArgs
     * @property {string} summary - a short label indicating the part of the txn unlocked by the redeemer
     * @property {string} description - a more complete specifier of the redeemer
     * @property {UplcProgramV2} script - the UplcProgram{V2, V3} validating the redeemer
     * @property {UplcDataValue[]} args - the arguments to the script, included if `txInfo` is provided
     */
    /**
     * Extracts script details for a specific redeemer on a transaction.
     * @remarks
     * With the optional `txInfo` argument, the
     * `args` for evaluating the redeemer are also included in the result.
     * @overload
     * @param {Tx} tx
     * @returns {RedeemerDetailsWithoutArgs}
     */
    /**
     * Extracts script-evaluation details for a specific redeemer from the transaction
     * @overload
     * @param {Tx} tx
     * @param {TxInfo} txInfo
     * @returns {RedeemerDetailsWithArgs}
     */
    /**
     * @param {Tx} tx
     * @param {TxInfo} [txInfo]
     * @returns {{
     *   summary: string
     *   description: string
     *   script: UplcProgramV1 | UplcProgramV2
     *   args: UplcDataValue[] | undefined
     * }}
     */
    getRedeemerDetails(tx, txInfo = undefined) {
        if (this.isSpending()) {
            const utxo = expectSome(tx.body.inputs[this.index])

            const datumData = expectSome(utxo.datum?.data)
            const summary = `input @${this.index}`
            return {
                summary,
                description: `spending tx.inputs[${this.index}] (from UTxO ${utxo.id.toString()})`,
                script: expectSome(
                    tx.witnesses.findUplcProgram(
                        expectSome(utxo.address.validatorHash)
                    )
                ),
                args: !txInfo
                    ? undefined
                    : [
                          datumData,
                          this.data,
                          new ScriptContextV2(
                              txInfo,
                              ScriptPurpose.Spending(this, utxo.id)
                          ).toUplcData()
                      ].map((a) => new UplcDataValue(a))
            }
        } else if (this.isMinting()) {
            const mph = expectSome(tx.body.minted.getPolicies()[this.index])
            const summary = `mint @${this.index}`
            return {
                summary,
                description: `minting policy ${this.index} (${mph.toHex()})`,
                script: expectSome(tx.witnesses.findUplcProgram(mph)),
                args: !txInfo
                    ? undefined
                    : [
                          this.data,
                          new ScriptContextV2(
                              txInfo,
                              ScriptPurpose.Minting(this, mph)
                          ).toUplcData()
                      ].map((a) => new UplcDataValue(a))
            }
        } else if (this.isRewarding()) {
            const credential = expectSome(
                tx.body.withdrawals[this.index]
            )[0].toCredential()
            const stakingHash = credential.expectStakingHash()
            const svh = expectSome(stakingHash.stakingValidatorHash)
            const summary = `rewards @${this.index}`
            return {
                summary,
                description: `withdrawing ${summary} (${svh.toHex()})`,
                script: expectSome(tx.witnesses.findUplcProgram(svh)),
                args: !txInfo
                    ? undefined
                    : [
                          this.data,
                          new ScriptContextV2(
                              txInfo,
                              ScriptPurpose.Rewarding(this, credential)
                          ).toUplcData()
                      ].map((a) => new UplcDataValue(a))
            }
        } else {
            throw new Error("unhandled TxRedeemer kind")
        }
    }

    /**
     * @returns {this is TxRedeemer<"Spending">}
     */
    isSpending() {
        return this.kind == "Spending"
    }

    /**
     * @returns {this is TxRedeemer<"Minting">}
     */
    isMinting() {
        return this.kind == "Minting"
    }

    /**
     * @returns {this is TxRedeemer<"Rewarding">}
     */
    isRewarding() {
        return this.kind == "Rewarding"
    }

    /**
     * @returns {number[]}
     */
    toCbor() {
        /**
         * tags:
         *   0 -> spending
         *   1 -> minting
         *   2 -> certifying (TODO)
         *   3 -> rewarding
         */
        if (this.isSpending()) {
            const props = this.props

            return encodeTuple([
                encodeInt(0),
                encodeInt(props.inputIndex),
                props.data.toCbor(),
                encodeCost(props.cost)
            ])
        } else if (this.isMinting()) {
            const props = this.props

            return encodeTuple([
                encodeInt(1),
                encodeInt(props.policyIndex),
                props.data.toCbor(),
                encodeCost(props.cost)
            ])
        } else if (this.isRewarding()) {
            const props = this.props

            return encodeTuple([
                encodeInt(3),
                encodeInt(props.withdrawalIndex),
                props.data.toCbor(),
                encodeCost(props.cost)
            ])
        } else {
            throw new Error("unhandled TxRedeemer kind")
        }
    }
}
