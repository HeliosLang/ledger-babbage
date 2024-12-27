import { decodeBytes } from "@helios-lang/cbor"
import { compareBytes, dummyBytes, equalsBytes } from "@helios-lang/codec-utils"
import { ByteArrayData, decodeUplcData } from "@helios-lang/uplc"
import { ScriptHash } from "./ScriptHash.js"

/**
 * @import { BytesLike } from "@helios-lang/codec-utils"
 * @import { UplcData } from "@helios-lang/uplc"
 * @typedef {import("./Hash.js").Hash} Hash
 */

/**
 * @typedef {ValidatorHash | BytesLike} ValidatorHashLike
 */

/**
 * Represents a blake2b-224 hash of a spending validator script (first encoded as a CBOR byte-array and prepended by a script version byte).
 * @template [C=unknown]
 * @implements {Hash}
 * @extends {ScriptHash<C>}
 */
export class ValidatorHash extends ScriptHash {
    /**
     * @param {BytesLike} bytes
     * @param {C | undefined} context
     */
    constructor(bytes, context = undefined) {
        super(bytes, context)

        if (this.bytes.length != 28) {
            throw new Error(
                `expected 28 bytes for ValidatorHash, got ${this.bytes.length}`
            )
        }
    }

    /**
     * @param {number} seed - can't be negative
     * @returns {ValidatorHash<unknown>}
     */
    static dummy(seed = 0) {
        return new ValidatorHash(dummyBytes(28, seed))
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
     * @param {BytesLike} bytes
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
     * @param {BytesLike} bytes
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
