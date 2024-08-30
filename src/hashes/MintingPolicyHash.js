import { decodeBytes } from "@helios-lang/cbor"
import { compareBytes, dummyBytes, equalsBytes } from "@helios-lang/codec-utils"
import { blake2b, encodeBech32 } from "@helios-lang/crypto"
import { None } from "@helios-lang/type-utils"
import { ByteArrayData, decodeUplcData } from "@helios-lang/uplc"
import { ScriptHash } from "./ScriptHash.js"

/**
 * @typedef {import("@helios-lang/codec-utils").ByteArrayLike} ByteArrayLike
 * @typedef {import("@helios-lang/uplc").UplcData} UplcData
 * @typedef {import("./Hash.js").Hash} Hash
 */

/**
 * @typedef {MintingPolicyHash | ByteArrayLike} MintingPolicyHashLike
 */

/**
 * Represents a blake2b-224 hash of a minting policy script
 *
 * **Note**: to calculate this hash the script is first encoded as a CBOR byte-array and then prepended by a script version byte.
 *
 * `C` is some optional context:
 *   null: unwitnessed or witnessed by NativeScript
 *   unknown: witnessed or unwitnessed (default)
 *   {program: ..., redeemer: ...}: witnessed by UplcProgram
 * @template [C=unknown]
 * @implements {Hash}
 * @extends {ScriptHash<C>}
 */
export class MintingPolicyHash extends ScriptHash {
    /**
     * Can be 0 bytes in case of Ada
     * @param {ByteArrayLike} bytes
     * @param {Option<C>} context - not recommended to set this manually
     */
    constructor(bytes, context = None) {
        super(bytes, context)

        if (!(this.bytes.length == 28 || this.bytes.length == 0)) {
            throw new Error(
                `expected 0 or 28 bytes for MintingPolicyHash, got ${this.bytes.length}`
            )
        }
    }

    /**
     * @template {MintingPolicyHashLike} T
     * @param {T} arg
     * @returns {T extends MintingPolicyHash<infer C> ? MintingPolicyHash<C> : MintingPolicyHash}
     */
    static new(arg) {
        return /** @type {any} */ (
            arg instanceof MintingPolicyHash ? arg : new MintingPolicyHash(arg)
        )
    }

    /**
     * @param {number} seed
     * @returns {MintingPolicyHash}
     */
    static dummy(seed = 0) {
        return new MintingPolicyHash(dummyBytes(28, seed))
    }

    /**
     * @param {ByteArrayLike} bytes
     * @returns {MintingPolicyHash}
     */
    static fromCbor(bytes) {
        return new MintingPolicyHash(decodeBytes(bytes))
    }

    /**
     * @template C
     * @param {ScriptHash<C>} sh
     * @returns {MintingPolicyHash<C>}
     */
    static fromScriptHash(sh) {
        return new MintingPolicyHash(sh.bytes, sh.context)
    }

    /**
     * @param {UplcData} data
     * @returns {MintingPolicyHash}
     */
    static fromUplcData(data) {
        return new MintingPolicyHash(ByteArrayData.expect(data).bytes)
    }

    /**
     * @param {ByteArrayLike} bytes
     * @returns {MintingPolicyHash}
     */
    static fromUplcCbor(bytes) {
        return MintingPolicyHash.fromUplcData(decodeUplcData(bytes))
    }

    /**
     * @param {MintingPolicyHash} a
     * @param {MintingPolicyHash} b
     * @returns {number}
     */
    static compare(a, b) {
        return compareBytes(a.bytes, b.bytes)
    }

    /**
     * @param {MintingPolicyHashLike} arg
     * @returns {boolean}
     */
    static isValid(arg) {
        try {
            MintingPolicyHash.new(arg)
            return true
        } catch (e) {
            return false
        }
    }

    /**
     * @param {MintingPolicyHash} other
     * @returns {boolean}
     */
    isEqual(other) {
        return equalsBytes(this.bytes, other.bytes)
    }

    /**
     * Encodes as bech32 string using 'asset' as human readable part
     * @returns {string}
     */
    toBech32() {
        return encodeBech32("asset", blake2b(this.bytes, 20))
    }
}
