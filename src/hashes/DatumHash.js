import { decodeBytes, encodeBytes } from "@helios-lang/cbor"
import {
    bytesToHex,
    compareBytes,
    equalsBytes,
    toBytes
} from "@helios-lang/codec-utils"
import { blake2b } from "@helios-lang/crypto"
import { ByteArrayData, decodeUplcData } from "@helios-lang/uplc"

/**
 * @typedef {import("@helios-lang/codec-utils").BytesLike} BytesLike
 * @typedef {import("@helios-lang/uplc").UplcData} UplcData
 * @typedef {import("./Hash.js").Hash} Hash
 */

/**
 * @typedef {DatumHash | BytesLike} DatumHashLike
 */

/**
 * Represents a blake2b-256 hash of datum data.
 * @implements {Hash}
 */
export class DatumHash {
    /**
     * @readonly
     * @type {number[]}
     */
    bytes

    /**
     * @param {Exclude<DatumHashLike, DatumHash>} bytes
     */
    constructor(bytes) {
        this.bytes = toBytes(bytes)

        if (this.bytes.length != 32) {
            throw new Error(
                `expected 32 bytes for DatumHash, got ${this.bytes.length} bytes`
            )
        }
    }

    /**
     * @param {DatumHashLike} arg
     * @returns {DatumHash}
     */
    static new(arg) {
        return arg instanceof DatumHash ? arg : new DatumHash(arg)
    }

    /**
     * @param {BytesLike} bytes
     * @returns {DatumHash}
     */
    static fromCbor(bytes) {
        return new DatumHash(decodeBytes(bytes))
    }

    /**
     * @param {UplcData} data
     * @returns {DatumHash}
     */
    static fromUplcData(data) {
        return new DatumHash(ByteArrayData.expect(data).bytes)
    }

    /**
     * @param {BytesLike} bytes
     * @returns {DatumHash}
     */
    static fromUplcCbor(bytes) {
        return DatumHash.fromUplcData(decodeUplcData(bytes))
    }

    /**
     * @param {UplcData} data
     * @returns {DatumHash}
     */
    static hashUplcData(data) {
        return new DatumHash(blake2b(data.toCbor()))
    }

    /**
     * @param {DatumHash} a
     * @param {DatumHash} b
     * @returns {number}
     */
    static compare(a, b) {
        return compareBytes(a.bytes, b.bytes)
    }

    /**
     * @returns {string}
     */
    dump() {
        return bytesToHex(this.bytes)
    }

    /**
     * @param {DatumHash} other
     */
    isEqual(other) {
        return equalsBytes(this.bytes, other.bytes)
    }

    /**
     * @returns {number[]}
     */
    toCbor() {
        return encodeBytes(this.bytes)
    }

    /**
     * @returns {string}
     */
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
     * @returns {ByteArrayData}
     */
    toUplcData() {
        return new ByteArrayData(this.bytes)
    }
}
