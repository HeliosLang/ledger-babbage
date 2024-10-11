import {
    decodeInt,
    decodeTuple,
    encodeInt,
    encodeTuple
} from "@helios-lang/cbor"
import { ByteStream, toInt } from "@helios-lang/codec-utils"
import {
    ByteArrayData,
    ConstrData,
    IntData,
    decodeUplcData
} from "@helios-lang/uplc"
import { TxId } from "./TxId.js"

/**
 * @typedef {import("@helios-lang/codec-utils").BytesLike} BytesLike
 * @typedef {import("@helios-lang/codec-utils").IntLike} IntLike
 * @typedef {import("@helios-lang/uplc").UplcData} UplcData
 * @typedef {import("./TxId.js").TxIdLike} TxIdLike
 */

/**
 * @typedef {TxOutputId | string | [TxId | BytesLike, IntLike] | {txId: TxId | BytesLike, utxoIdx: IntLike}} TxOutputIdLike
 */
/**
 * Id of a Utxo
 */
export class TxOutputId {
    /**
     * @readonly
     * @type {TxId}
     */
    txId

    /**
     * @readonly
     * @type {number}
     */
    utxoIdx

    /**
     * @param {TxIdLike} txId
     * @param {IntLike} utxoIdx
     */
    constructor(txId, utxoIdx) {
        this.txId = TxId.new(txId)
        this.utxoIdx = toInt(utxoIdx)
    }

    /**
     * @param {number} seed - defaults to -1, which means all TxId bytes are 255 (largest possible execution budget for operations involving an unknown TxId)
     * @param {number} utxoIdx
     * @returns {TxOutputId}
     */
    static dummy(seed = -1, utxoIdx = 0) {
        return new TxOutputId(TxId.dummy(seed), utxoIdx)
    }

    /**
     * @param {TxOutputIdLike} arg
     * @returns {TxOutputId}
     */
    static new(arg) {
        if (arg instanceof TxOutputId) {
            return arg
        } else if (typeof arg == "string") {
            return TxOutputId.fromString(arg)
        } else if (Array.isArray(arg)) {
            const n = arg.length
            if (n != 2) {
                throw new Error(
                    `expected two entries in arg array of TxOutputId, got ${n}`
                )
            }

            return new TxOutputId(arg[0], arg[1])
        } else if (
            typeof arg == "object" &&
            "txId" in arg &&
            "utxoIdx" in arg
        ) {
            return new TxOutputId(arg.txId, arg.utxoIdx)
        } else {
            throw new Error(
                `unhandled TxOutputId.new arguments ${JSON.stringify(arg)}`
            )
        }
    }

    /**
     * @param {BytesLike} bytes
     * @returns {TxOutputId}
     */
    static fromCbor(bytes) {
        const stream = ByteStream.from(bytes)

        const [txId, utxoIdx] = decodeTuple(stream, [TxId, decodeInt])

        return new TxOutputId(txId, utxoIdx)
    }

    /**
     * @param {string} s
     * @returns {TxOutputId}
     */
    static fromString(s) {
        const parts = s.trim().split("#")

        if (parts.length != 2) {
            throw new Error(`expected <txId>#<utxoIdx>, got ${s}`)
        }

        const utxoIdx = parseInt(parts[1])

        if (utxoIdx.toString() != parts[1]) {
            throw new Error(`bad utxoIdx in ${s}`)
        }

        return new TxOutputId(new TxId(parts[0]), utxoIdx)
    }

    /**
     * @param {BytesLike} bytes
     * @returns {TxOutputId}
     */
    static fromUplcCbor(bytes) {
        return TxOutputId.fromUplcData(decodeUplcData(bytes))
    }

    /**
     * @param {UplcData} data
     * @returns {TxOutputId}
     */
    static fromUplcData(data) {
        ConstrData.assert(data, 0, 2)

        return new TxOutputId(
            TxId.fromUplcData(data.fields[0]),
            IntData.expect(data.fields[1]).value
        )
    }

    /**
     * @param {TxOutputId} a
     * @param {TxOutputId} b
     * @returns {number}
     */
    static compare(a, b) {
        const res = ByteArrayData.compare(a.txId.bytes, b.txId.bytes)

        if (res == 0) {
            return a.utxoIdx - b.utxoIdx
        } else {
            return res
        }
    }

    /**
     * @param {TxOutputIdLike} arg
     * @returns {boolean}
     */
    static isValid(arg) {
        try {
            TxOutputId.new(arg)
            return true
        } catch (e) {
            return false
        }
    }

    /**
     * @param {TxOutputId} other
     * @returns {boolean}
     */
    isEqual(other) {
        return this.txId.isEqual(other.txId) && this.utxoIdx == other.utxoIdx
    }

    /**
     * @returns {number[]}
     */
    toCbor() {
        return encodeTuple([this.txId.toCbor(), encodeInt(this.utxoIdx)])
    }

    /**
     * @returns {string}
     */
    toString() {
        return `${this.txId.toHex()}#${this.utxoIdx.toString()}`
    }

    /**
     * @returns {ConstrData}
     */
    toUplcData() {
        return new ConstrData(0, [
            this.txId.toUplcData(),
            new IntData(this.utxoIdx)
        ])
    }
}
