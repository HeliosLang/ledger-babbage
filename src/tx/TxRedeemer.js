import {
    decodeInt,
    decodeTagged,
    encodeInt,
    encodeTuple
} from "@helios-lang/cbor"
import { bytesToHex, toInt } from "@helios-lang/codec-utils"
import { decodeCost, decodeUplcData, encodeCost } from "@helios-lang/uplc"
import { NetworkParamsHelper } from "../params/NetworkParamsHelper.js"

/**
 * @typedef {import("@helios-lang/codec-utils").ByteArrayLike} ByteArrayLike
 * @typedef {import("@helios-lang/codec-utils").IntLike} IntLike
 * @typedef {import("@helios-lang/uplc").UplcData} UplcData
 * @typedef {import("@helios-lang/uplc").Cost} Cost
 * @typedef {import("../params/index.js").NetworkParams} NetworkParams
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
