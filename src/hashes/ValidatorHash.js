import { decodeBytes } from "@helios-lang/cbor"
import { compareBytes, equalsBytes } from "@helios-lang/codec-utils"
import { None } from "@helios-lang/type-utils"
import { ByteArrayData, decodeUplcData } from "@helios-lang/uplc"
import { ScriptHash } from "./ScriptHash.js"

/**
 * @typedef {import("@helios-lang/codec-utils").ByteArrayLike} ByteArrayLike
 * @typedef {import("@helios-lang/uplc").UplcData} UplcData
 * @typedef {import("./Hash.js").Hash} Hash
 */

/**
 * @typedef {ValidatorHash | ByteArrayLike} ValidatorHashLike
 */

/**
 * Represents a blake2b-224 hash of a spending validator script (first encoded as a CBOR byte-array and prepended by a script version byte).
 * @template [C=unknown]
 * @implements {Hash}
 * @extends {ScriptHash<C>}
 */
export class ValidatorHash extends ScriptHash {
    /**
     * @param {ByteArrayLike} bytes
     * @param {Option<C>} context
     */
    constructor(bytes, context = None) {
        super(bytes, context)

        if (this.bytes.length != 28) {
            throw new Error(
                `expected 28 bytes for ValidatorHash, got ${this.bytes.length}`
            )
        }
    }

    /**
     * @returns {ValidatorHash<unknown>}
     */
    static dummy() {
        return new ValidatorHash(new Array(28).fill(0))
    }

    /**
     * @template {ValidatorHashLike} T
     * @param {T} arg
     * @returns {arg extends ValidatorHash<infer C> ? ValidatorHash<C> : ValidatorHash}
     */
    static new(arg) {
        return /** @type {any} */ (
            arg instanceof ValidatorHash ? arg : new ValidatorHash(arg)
        )
    }

    /**
     * @param {ByteArrayLike} bytes
     * @returns {ValidatorHash}
     */
    static fromCbor(bytes) {
        return new ValidatorHash(decodeBytes(bytes))
    }

    /**
     * @param {UplcData} data
     * @returns {ValidatorHash}
     */
    static fromUplcData(data) {
        return new ValidatorHash(ByteArrayData.expect(data).bytes)
    }

    /**
     * @param {ByteArrayLike} bytes
     * @returns {ValidatorHash}
     */
    static fromUplcCbor(bytes) {
        return ValidatorHash.fromUplcData(decodeUplcData(bytes))
    }

    /**
     * @param {ValidatorHash} a
     * @param {ValidatorHash} b
     * @returns {number}
     */
    static compare(a, b) {
        return compareBytes(a.bytes, b.bytes)
    }

    /**
     * @param {ValidatorHashLike} arg
     * @returns {boolean}
     */
    static isValid(arg) {
        try {
            ValidatorHash.new(arg)
            return true
        } catch (e) {
            return false
        }
    }

    /**
     * @param {ValidatorHash} other
     * @returns {boolean}
     */
    isEqual(other) {
        return equalsBytes(this.bytes, other.bytes)
    }
}
