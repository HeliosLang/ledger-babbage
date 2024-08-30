import { decodeTagged, encodeInt, encodeTuple } from "@helios-lang/cbor"
import { ByteStream } from "@helios-lang/codec-utils"
import { None, isSome } from "@helios-lang/type-utils"
import { ConstrData } from "@helios-lang/uplc"
import { PubKeyHash } from "./PubKeyHash.js"
import { StakingValidatorHash } from "./StakingValidatorHash.js"
import { ValidatorHash } from "./ValidatorHash.js"

/**
 * @typedef {import("@helios-lang/codec-utils").ByteArrayLike} ByteArrayLike
 * @typedef {import("@helios-lang/uplc").UplcData} UplcData
 * @typedef {import("../hashes/index.js").PubKeyHashLike} PubKeyHashLike
 * @typedef {import("../hashes/index.js").StakingValidatorHashLike} StakingValidatorHashLike
 */

/**
 * @typedef {"PubKey" | "Validator"} StakingHashKind
 */

/**
 * @template {StakingHashKind} T
 * @typedef {T extends "PubKey" ? {
 *   hash: PubKeyHash
 * } : {
 *   hash: StakingValidatorHash
 * }} StakingHashProps
 */

/**
 * @typedef {StakingHash | PubKeyHash | StakingValidatorHash} StakingHashLike
 */

/**
 * Similar to Credential, wrapper for StakingValidatorHash | PubKeyHash
 * @template {StakingHashKind} [T=StakingHashKind]
 * @template [C=unknown]
 */
export class StakingHash {
    /**
     * @private
     * @readonly
     * @type {T}
     */
    kind

    /**
     * @private
     * @readonly
     * @type {StakingHashProps<T>}
     */
    props

    /**
     * @readonly
     * @type {C}
     */
    context

    /**
     * @private
     * @param {T} kind
     * @param {StakingHashProps<T>} props
     * @param {Option<C>} context
     */
    constructor(kind, props, context = None) {
        this.kind = kind
        this.props = props

        if (isSome(context)) {
            this.context = context
        }
    }

    /**
     * @param {number} seed
     * @returns {StakingHash<"PubKey", null>}
     */
    static dummy(seed = 0) {
        return new StakingHash("PubKey", { hash: PubKeyHash.dummy(seed) })
    }

    /**
     * @param {PubKeyHashLike} hash
     * @returns {StakingHash<"PubKey", null>}
     */
    static PubKey(hash) {
        return new StakingHash("PubKey", { hash: PubKeyHash.new(hash) })
    }

    /**
     * @template {StakingValidatorHashLike} T
     * @param {T} hash
     * @returns {T extends StakingValidatorHash<infer C> ? StakingHash<"Validator", C> : StakingHash<"Validator">}
     */
    static Validator(hash) {
        return /** @type {any} */ (
            new StakingHash(
                "Validator",
                {
                    hash: StakingValidatorHash.new(hash)
                },
                hash instanceof StakingValidatorHash ? hash.context : None
            )
        )
    }

    /**
     * @template {StakingHashLike} T
     * @param {T} arg
     * @returns {(
     *   T extends PubKeyHash ? StakingHash<"PubKey", null> :
     *   T extends StakingValidatorHash<infer C> ? StakingHash<"Validator", C> :
     *   T extends StakingHash<infer K, infer C> ? StakingHash<K, C> :
     *   StakingHash
     * )}
     */
    static new(arg) {
        return /** @type {any} */ (
            arg instanceof PubKeyHash
                ? StakingHash.PubKey(arg)
                : arg instanceof StakingValidatorHash
                  ? StakingHash.Validator(arg)
                  : arg
        )
    }

    /**
     * @param {ByteArrayLike} bytes
     * @returns {StakingHash}
     */
    static fromCbor(bytes) {
        const stream = ByteStream.from(bytes)

        const [tag, decodeItem] = decodeTagged(stream)

        switch (tag) {
            case 0:
                return StakingHash.PubKey(decodeItem(PubKeyHash))
            case 1:
                return StakingHash.Validator(decodeItem(ValidatorHash))
            default:
                throw new Error(
                    `expected 0 or 1 StakingHash cbor tag, got ${tag}`
                )
        }
    }

    /**
     * @param {UplcData} data
     * @returns {StakingHash}
     */
    static fromUplcData(data) {
        ConstrData.assert(data, None, 1)

        switch (data.tag) {
            case 0:
                return StakingHash.PubKey(
                    PubKeyHash.fromUplcData(data.fields[0])
                )
            case 1:
                return StakingHash.Validator(
                    StakingValidatorHash.fromUplcData(data.fields[0])
                )
            default:
                throw new Error(
                    `expected 0 or 1 StakingHash ConstrData tag, got ${data.tag}`
                )
        }
    }

    /**
     * @type {number[]}
     */
    get bytes() {
        return this.hash.bytes
    }

    /**
     * @type {T extends "PubKey" ? PubKeyHash : T extends "Validator" ? StakingValidatorHash<C> : (PubKeyHash | StakingValidatorHash<C>)}
     */
    get hash() {
        return /** @type {any} */ (this.props.hash)
    }

    /**
     * @type {T extends "PubKey" ? PubKeyHash : T extends "Validator" ? typeof None : Option<PubKeyHash>}
     */
    get pubKeyHash() {
        return /** @type {any} */ (this.isPubKey() ? this.props.hash : None)
    }

    /**
     * @type {T extends "Validator" ? StakingValidatorHash<C> : T extends "PubKey" ? typeof None : Option<StakingValidatorHash<C>>}
     */
    get stakingValidatorHash() {
        return /** @type {any} */ (this.isValidator() ? this.props.hash : None)
    }

    /**
     * @returns {this is StakingHash<"PubKey", null>}
     */
    isPubKey() {
        return "PubKey" == this.kind
    }

    /**
     * @returns {this is StakingHash<"Validator", C>}
     */
    isValidator() {
        return "Validator" == this.kind
    }

    /**
     * @returns {number[]}
     */
    toCbor() {
        return encodeTuple([
            encodeInt(this.isPubKey() ? 0 : 1),
            this.props.hash.toCbor()
        ])
    }

    /**
     * @returns {ConstrData}
     */
    toUplcData() {
        return new ConstrData(this.isPubKey() ? 0 : 1, [
            this.props.hash.toUplcData()
        ])
    }
}
