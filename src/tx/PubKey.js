import { decodeBytes, encodeBytes } from "@helios-lang/cbor"
import { bytesToHex, toBytes } from "@helios-lang/codec-utils"
import { blake2b } from "@helios-lang/crypto"
import { ByteArrayData, decodeUplcData } from "@helios-lang/uplc"
import { PubKeyHash } from "../hashes/index.js"

/**
 * @typedef {import("@helios-lang/codec-utils").ByteArrayLike} ByteArrayLike
 * @typedef {import("@helios-lang/uplc").UplcData} UplcData
 */

/**
 * @typedef {PubKey | ByteArrayLike} PubKeyLike
 */

export class PubKey {
    /**
     * @readonly
     * @type {number[]}
     */
    bytes

    /**
     * @param {ByteArrayLike} props
     */
    constructor(props) {
        this.bytes = toBytes(props)

        if (this.bytes.length != 32) {
            throw new Error(`expected 32 for PubKey, got ${this.bytes.length}`)
        }
    }

    /**
     * @param {PubKeyLike} arg
     * @returns {PubKey}
     */
    static new(arg) {
        return arg instanceof PubKey ? arg : new PubKey(arg)
    }

    /**
     * @returns {PubKey}
     */
    static dummy() {
        return new PubKey(new Array(32).fill(0))
    }

    /**
     * @param {ByteArrayLike} bytes
     * @returns {PubKey}
     */
    static fromCbor(bytes) {
        return new PubKey(decodeBytes(bytes))
    }

    /**
     * @param {UplcData} data
     * @returns {PubKey}
     */
    static fromUplcData(data) {
        return new PubKey(ByteArrayData.expect(data).bytes)
    }

    /**
     * @param {ByteArrayLike} bytes
     * @returns {PubKey}
     */
    static fromUplcCbor(bytes) {
        return PubKey.fromUplcData(decodeUplcData(bytes))
    }

    /**
     * @returns {string}
     */
    dump() {
        return this.toHex()
    }

    /**
     * @returns {boolean}
     */
    isDummy() {
        return this.bytes.every((b) => b == 0)
    }

    /**
     * @returns {number[]}
     */
    toCbor() {
        return encodeBytes(this.bytes)
    }

    /**
     * @returns {PubKeyHash}
     */
    toHash() {
        return new PubKeyHash(blake2b(this.bytes, 28))
    }

    /**
     * Hexadecimal representation.
     * @returns {string}
     */
    toHex() {
        return bytesToHex(this.bytes)
    }

    /**
     * @returns {ByteArrayData}
     */
    toUplcData() {
        return new ByteArrayData(this.bytes)
    }
}
