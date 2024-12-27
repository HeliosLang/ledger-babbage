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
 * @template [C=unknown]
 * @typedef {StakingValidatorHash<C> | BytesLike} StakingValidatorHashLike
 */

/**
 * Represents a blake2b-224 hash of a staking script.
 *
 * **Note**: before hashing, the staking script is first encoded as a CBOR byte-array and then prepended by a script version byte.
 * @template [C=unknown]
 * @implements {Hash}
 * @extends {ScriptHash<C>}
 */
export class StakingValidatorHash extends ScriptHash {
    /**
     * @param {BytesLike} bytes
     * @param {C | undefined} context
     */
    constructor(bytes, context = undefined) {
        super(bytes, context)

        if (this.bytes.length != 28) {
            throw new Error(
                `expected 28 bytes for StakingValidatorHash, got ${this.bytes.length}`
            )
        }
    }

    /**
     * @param {number} seed
     * @returns {StakingValidatorHash<unknown>}
     */
    static dummy(seed = 0) {
        return new StakingValidatorHash(dummyBytes(28, seed))
    }

    /**
     * @template {StakingValidatorHashLike} T
     * @param {T} arg
     * @returns {T extends StakingValidatorHash<infer C> ? StakingValidatorHash<C> : StakingValidatorHash}
     */
    static new(arg) {
        return /** @type {any} */ (
            arg instanceof StakingValidatorHash
                ? arg
                : new StakingValidatorHash(arg)
        )
    }

    /**
     * @param {BytesLike} bytes
     * @returns {StakingValidatorHash}
     */
    static fromCbor(bytes) {
        return new StakingValidatorHash(decodeBytes(bytes))
    }

    /**
     * @param {UplcData} data
     * @returns {StakingValidatorHash}
     */
    static fromUplcData(data) {
        return new StakingValidatorHash(ByteArrayData.expect(data).bytes)
    }

    /**
     * @param {BytesLike} bytes
     * @returns {StakingValidatorHash}
     */
    static fromUplcCbor(bytes) {
        return StakingValidatorHash.fromUplcData(decodeUplcData(bytes))
    }

    /**
     * @param {StakingValidatorHash} a
     * @param {StakingValidatorHash} b
     * @returns {number}
     */
    static compare(a, b) {
        return compareBytes(a.bytes, b.bytes)
    }

    /**
     * @param {StakingValidatorHashLike} arg
     * @returns {boolean}
     */
    static isValid(arg) {
        try {
            StakingValidatorHash.new(arg)
            return true
        } catch (e) {
            return false
        }
    }

    /**
     * @param {StakingValidatorHash} other
     * @returns {boolean}
     */
    isEqual(other) {
        return equalsBytes(this.bytes, other.bytes)
    }
}
