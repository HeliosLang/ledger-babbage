import { decodeBytes, encodeBytes } from "@helios-lang/cbor"
import { bytesToHex, toBytes } from "@helios-lang/codec-utils"
import { ByteArrayData, ConstrData, decodeUplcData } from "@helios-lang/uplc"

/**
 * @typedef {import("@helios-lang/codec-utils").ByteArrayLike} ByteArrayLike
 * @typedef {import("@helios-lang/uplc").UplcData} UplcData
 * @typedef {import("../hashes/index.js").Hash} Hash
 */

/**
 * @typedef {TxId | ByteArrayLike} TxIdLike
 */
/**
 * Represents the hash of a transaction.
 *
 * This is also used to identify an UTxO (along with the index of the UTxO in the list of UTxOs created by the transaction).
 * @implements {Hash}
 */
export class TxId {
    /**
     * @readonly
     * @type {number[]}
     */
    bytes

    /**
     * @param {Exclude<TxIdLike, TxId>} bytes
     */
    constructor(bytes) {
        this.bytes = toBytes(bytes)

        if (this.bytes.length != 32) {
            throw new Error(
                `expected 32 bytes for TxId, got ${this.bytes.length}`
            )
        }
    }

    /**
     * Filled with 255 so that the internal show() function has max execution budget cost
     * @param {number} fill
     * @returns {TxId}
     */
    static dummy(fill = 255) {
        return new TxId(new Array(32).fill(fill))
    }

    /**
     * @param {TxIdLike} arg
     * @returns {TxId}
     */
    static new(arg) {
        return arg instanceof TxId ? arg : new TxId(arg)
    }

    /**
     * @param {ByteArrayLike} bytes
     * @returns {TxId}
     */
    static fromCbor(bytes) {
        return new TxId(decodeBytes(bytes))
    }

    /**
     * @param {ByteArrayLike} bytes
     * @returns {TxId}
     */
    static fromUplcCbor(bytes) {
        return TxId.fromUplcData(decodeUplcData(bytes))
    }

    /**
     * @param {UplcData} data
     * @returns {TxId}
     */
    static fromUplcData(data) {
        ConstrData.assert(data, 0, 1)

        return new TxId(ByteArrayData.expect(data.fields[0]).bytes)
    }

    /**
     * @param {ByteArrayLike} bytes
     * @returns {boolean}
     */
    static isValid(bytes) {
        try {
            TxId.new(bytes)
            return true
        } catch (e) {
            return false
        }
    }

    /**
     * @param {TxId} other
     * @returns {boolean}
     */
    isEqual(other) {
        return ByteArrayData.compare(this.bytes, other.bytes) == 0
    }

    toHex() {
        return bytesToHex(this.bytes)
    }

    /**
     * Hexadecimal representation.
     * @returns {string}
     */
    toString() {
        return this.toHex()
    }

    /**
     * @returns {number[]}
     */
    toCbor() {
        return encodeBytes(this.bytes)
    }

    /**
     * @returns {UplcData}
     */
    toUplcData() {
        return new ConstrData(0, [new ByteArrayData(this.bytes)])
    }
}
