import {
    decodeBytes,
    decodeConstr,
    encodeBytes,
    encodeConstr
} from "@helios-lang/cbor"
import {
    ByteStream,
    bytesToHex,
    compareBytes,
    equalsBytes,
    toBytes
} from "@helios-lang/codec-utils"
import { blake2b, encodeBech32 } from "@helios-lang/crypto"
import { ByteArrayData, ConstrData, decodeUplcData } from "@helios-lang/uplc"
import { MintingPolicyHash } from "../hashes/index.js"

/**
 * @typedef {import("@helios-lang/codec-utils").ByteArrayLike} ByteArrayLike
 * @typedef {import("@helios-lang/codec-utils").IntLike} IntLike
 * @typedef {import("@helios-lang/uplc").UplcData} UplcData
 * @typedef {import("../hashes/index.js").MintingPolicyHashLike} MintingPolicyHashLike
 */

/**
 * @typedef {string | [
 *   MintingPolicyHashLike,
 *   ByteArrayLike
 * ] | {
 *   mph: MintingPolicyHashLike,
 *   tokenName: ByteArrayLike
 * }} AssetClassLike
 */

/**
 * Represents a `MintingPolicyHash` combined with a token name.
 * @template [C=unknown]
 */
export class AssetClass {
    /**
     * @type {MintingPolicyHash<C>}
     */
    mph

    /**
     * @type {number[]}
     */
    tokenName

    /**
     * @readonly
     * @type {C}
     */
    context

    /**
     * @param {MintingPolicyHash<C>} mph - policy with optional context
     * @param {ByteArrayLike} tokenName
     */
    constructor(mph, tokenName) {
        this.mph = mph
        this.tokenName = toBytes(tokenName)

        if (mph.context) {
            this.context = mph.context
        }
    }

    /**
     * @type {AssetClass}
     */
    static get ADA() {
        return AssetClass.new(".")
    }

    /**
     * @template {AssetClassLike} T
     * @param {T} arg
     * @returns {T extends [MintingPolicyHash<infer C>, ByteArrayLike] ? AssetClass<C> : T extends AssetClass<infer C> ?  AssetClass<C> : AssetClass}
     */
    static new(arg) {
        return /** @type {any} */ (
            arg instanceof AssetClass
                ? arg
                : typeof arg == "string"
                  ? AssetClass.fromString(arg)
                  : Array.isArray(arg)
                    ? new AssetClass(MintingPolicyHash.new(arg[0]), arg[1])
                    : new AssetClass(
                          MintingPolicyHash.new(arg.mph),
                          arg.tokenName
                      )
        )
    }

    /**
     * @param {number} seed
     * @param {ByteArrayLike} tokenName
     * @returns {AssetClass}
     */
    static dummy(seed = 0, tokenName = []) {
        return new AssetClass(MintingPolicyHash.dummy(seed), tokenName)
    }

    /**
     * Deserializes bytes into an `AssetClass`.
     * @param {ByteArrayLike} bytes
     * @returns {AssetClass}
     */
    static fromCbor(bytes) {
        const stream = ByteStream.from(bytes)

        const [tag, [mph, tokenName]] = decodeConstr(stream, [
            MintingPolicyHash,
            decodeBytes
        ])

        if (tag != 0) {
            throw new Error(
                `expected tag 0 for AssetClass ConstrData, got ${tag}`
            )
        }

        return new AssetClass(mph, tokenName)
    }

    /**
     * @param {string} s
     * @returns {AssetClass}
     */
    static fromString(s) {
        const parts = s.split(".")

        if (parts.length != 2) {
            throw new Error(
                `expected <mph>.<tokenName> in hex encoded AssetClass, got ${s}`
            )
        }

        return new AssetClass(MintingPolicyHash.new(parts[0]), parts[1])
    }

    /**
     * @param {string | number[]} bytes
     * @returns {AssetClass}
     */
    static fromUplcCbor(bytes) {
        return AssetClass.fromUplcData(decodeUplcData(bytes))
    }

    /**
     *
     * @param {UplcData} data
     * @returns {AssetClass}
     */
    static fromUplcData(data) {
        ConstrData.assert(data, 0, 2)

        const mph = MintingPolicyHash.fromUplcData(data.fields[0])
        const tokenName = ByteArrayData.expect(data.fields[1]).bytes

        return new AssetClass(mph, tokenName)
    }

    /**
     *
     * @param {AssetClass} a
     * @param {AssetClass} b
     */
    static compare(a, b) {
        const i = MintingPolicyHash.compare(a.mph, b.mph)

        if (i != 0) {
            return i
        }

        return compareBytes(a.tokenName, b.tokenName)
    }

    /**
     * @param {AssetClass} other
     * @returns {boolean}
     */
    isEqual(other) {
        return (
            this.mph.isEqual(other.mph) &&
            equalsBytes(this.tokenName, other.tokenName)
        )
    }

    /**
     * @param {AssetClass} other
     * @returns {boolean}
     */
    isGreaterThan(other) {
        return AssetClass.compare(this, other) > 0
    }

    /**
     * Converts an `AssetClass` instance into its CBOR representation.
     * @returns {number[]}
     */
    toCbor() {
        return encodeConstr(0, [this.mph.toCbor(), encodeBytes(this.tokenName)])
    }

    /**
     * Cip14 fingerprint
     * This involves a hash, so you can't use a fingerprint to calculate the underlying policy/tokenName.
     * @returns {string}
     */
    toFingerprint() {
        return encodeBech32(
            "asset",
            blake2b(this.mph.bytes.concat(this.tokenName), 20)
        )
    }

    /**
     * @returns {string}
     */
    toString() {
        return `${this.mph.toHex()}.${bytesToHex(this.tokenName)}`
    }

    /**
     * Used when generating script contexts for running programs
     * @returns {ConstrData}
     */
    toUplcData() {
        return new ConstrData(0, [
            this.mph.toUplcData(),
            new ByteArrayData(this.tokenName)
        ])
    }
}

/**
 * @param {[AssetClassLike] | [MintingPolicyHashLike, ByteArrayLike]} args
 * @returns {[MintingPolicyHash, number[]]}
 */
export function handleAssetClassArgs(...args) {
    if (args.length == 1) {
        const ac = AssetClass.new(args[0])
        return [ac.mph, ac.tokenName]
    } else {
        return [MintingPolicyHash.new(args[0]), toBytes(args[1])]
    }
}

/**
 * @param {[AssetClassLike, IntLike] | [MintingPolicyHashLike, ByteArrayLike, IntLike]} args
 * @returns {[MintingPolicyHash, number[], bigint]}
 */
export function handleAssetClassArgsWithQty(...args) {
    if (args.length == 2) {
        const ac = AssetClass.new(args[0])
        return [ac.mph, ac.tokenName, BigInt(args[1])]
    } else {
        return [
            MintingPolicyHash.new(args[0]),
            toBytes(args[1]),
            BigInt(args[2])
        ]
    }
}
