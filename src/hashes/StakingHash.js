import { decodeTagged, encodeInt, encodeTuple } from "@helios-lang/cbor"
import { makeByteStream } from "@helios-lang/codec-utils"
import { ConstrData } from "@helios-lang/uplc"
import { PubKeyHash } from "./PubKeyHash.js"
import { StakingValidatorHash } from "./StakingValidatorHash.js"
import { ValidatorHash } from "./ValidatorHash.js"

/**
 * @import { BytesLike } from "@helios-lang/codec-utils"
 * @import { ConstrDataI, UplcData } from "@helios-lang/uplc"
 * @import { PubKeyHashLike, StakingValidatorHashLike } from "../hashes/index.js"
 */

/**
 * @template C
 * @template P
 * @template V
 * @typedef {C extends null ? P : unknown extends C ? (P | V) : V} StakingPubKeyOrValidator
 */

/**
 * @template C
 * @typedef {StakingPubKeyOrValidator<C, {
 *   hash: PubKeyHash
 * }, {
 *   hash: StakingValidatorHash
 * }>} StakingHashProps
 */

/**
 * @typedef {StakingHash | PubKeyHash | StakingValidatorHash} StakingHashLike
 */

/**
 * @template [Context=unknown]
 * @typedef {object} StakingHashI
 * @prop {number[]} bytes
 * @prop {Context} context
 * @prop {"StakingHash"} kind
 * @prop {StakingPubKeyOrValidator<Context, PubKeyHash, StakingValidatorHash<Context>>} hash
 * @prop {StakingPubKeyOrValidator<Context, PubKeyHash, null>} pubKeyHash
 * @prop {StakingPubKeyOrValidator<Context, null, StakingValidatorHash<Context>>} stakingValidatorHash
 * @prop {() => number[]} toCbor
 * @prop {() => ConstrDataI} toUplcData
 */

/**
 * Similar to Credential, wrapper for StakingValidatorHash | PubKeyHash
 * @template [C=unknown]
 * @implements {StakingHashI<C>}
 */
export class StakingHash {
    /**
     * @private
     * @readonly
     * @type {StakingHashProps<C>}
     */
    props

    /**
     * @readonly
     * @type {C}
     */
    context

    /**
     * @param {{hash: PubKeyHash} | {hash: StakingValidatorHash<C>}} props
     * @param {C | undefined} context
     */
    constructor(props, context = undefined) {
        this.props = /** @type {any} */ (props)

        if (context !== undefined) {
            this.context = context
        }
    }

    /**
     * @param {number} seed
     * @returns {StakingHash<null>}
     */
    static dummy(seed = 0) {
        return new StakingHash({ hash: PubKeyHash.dummy(seed) })
    }

    /**
     * @param {PubKeyHashLike} hash
     * @returns {StakingHash<null>}
     */
    static PubKey(hash) {
        return new StakingHash({ hash: PubKeyHash.new(hash) })
    }

    /**
     * @template {StakingValidatorHashLike} T
     * @param {T} hash
     * @returns {T extends StakingValidatorHash<infer C> ? StakingHash<C> : StakingHash<unknown>}
     */
    static Validator(hash) {
        return /** @type {any} */ (
            new StakingHash(
                {
                    hash: StakingValidatorHash.new(hash)
                },
                hash instanceof StakingValidatorHash ? hash.context : undefined
            )
        )
    }

    /**
     * @template {StakingHashLike} T
     * @param {T} arg
     * @returns {(
     *   T extends PubKeyHash ?
     *     StakingHash<null> :
     *   T extends StakingValidatorHash<infer C> ?
     *     StakingHash<C> :
     *   T extends StakingHash<infer C> ?
     *     StakingHash<C> :
     *     StakingHash
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
     * @param {BytesLike} bytes
     * @returns {StakingHash}
     */
    static fromCbor(bytes) {
        const stream = makeByteStream({ bytes })

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
        ConstrData.assert(data, undefined, 1)

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
     * @type {StakingPubKeyOrValidator<C, PubKeyHash, StakingValidatorHash<C>>}
     */
    get hash() {
        return /** @type {any} */ (this.props.hash)
    }

    /**
     * @type {"StakingHash"}
     */
    get kind() {
        return "StakingHash"
    }

    /**
     * @type {StakingPubKeyOrValidator<C, PubKeyHash, null>}
     */
    get pubKeyHash() {
        return /** @type {any} */ (
            this.isPubKey() ? this.props.hash : undefined
        )
    }

    /**
     * @type {StakingPubKeyOrValidator<C, null, StakingValidatorHash<C>>}
     */
    get stakingValidatorHash() {
        return /** @type {any} */ (
            this.isValidator() ? this.props.hash : undefined
        )
    }

    /**
     * @returns {this is StakingHash<null>}
     */
    isPubKey() {
        return this.hash instanceof PubKeyHash
    }

    /**
     * @returns {this is StakingHash<C>}
     */
    isValidator() {
        return this.hash instanceof StakingValidatorHash
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

/**
 * @overload
 * @param {{
 *   hash: PubKeyHash
 * }} args
 * @returns {StakingHash<null>}
 */
/**
 * @template [Context=unknown]
 * @overload
 * @param {{
 *   hash: StakingValidatorHash<Context>
 * }} args
 * @returns {StakingHash<Context>}
 */
/**
 * @overload
 * @param {{
 *   dummy: number
 * }} args
 * @returns {StakingHash<null>}
 */
/**
 * @template [Context=unknown]
 * @overload
 * @param {{
 *   cbor: BytesLike
 *   context?: Context
 * }} args
 * @returns {StakingHash<Context>}
 */
/**
 * @template [Context=unknown]
 * @overload
 * @param {{
 *   uplcData: UplcData
 *   context?: Context
 * }} args
 * @returns {StakingHash<Context>}
 */
/**
 * @template [Context=unknown]
 * @param {({
 *   hash: PubKeyHash | StakingValidatorHash<Context>
 * } | {
 *   dummy: number
 * } | {
 *   cbor: BytesLike
 *   context?: Context
 * } | {
 *   uplcData: UplcData
 *   context?: Context
 * })} args
 * @returns {StakingHashI<Context>}
 */
export function makeStakingHash(args) {
    if ("hash" in args) {
        const h = args.hash

        if (h instanceof PubKeyHash) {
            return new StakingHash({ hash: h })
        } else if (h instanceof StakingValidatorHash) {
            return /** @type {any} */ (
                new StakingHash(
                    {
                        hash: StakingValidatorHash.new(h)
                    },
                    h instanceof StakingValidatorHash ? h.context : undefined
                )
            )
        } else {
            throw new Error("expected PubKeyHash or StakingValidatorHash")
        }
    } else if ("dummy" in args) {
        return new StakingHash({ hash: PubKeyHash.dummy(args.dummy) })
    } else if ("cbor" in args) {
        return decodeStakingHashCbor(args.cbor, args.context)
    } else if ("uplcData" in args) {
        return decodeStakingHashUplcData(args.uplcData, args.context)
    } else {
        throw new Error("invalid makeStakingHash() arguments")
    }
}

/**
 * @template [Context=unknown]
 * @param {BytesLike} bytes
 * @param {Context | undefined} context
 * @returns {StakingHashI<Context>}
 */
export function decodeStakingHashCbor(bytes, context = undefined) {
    const stream = makeByteStream({ bytes })

    const [tag, decodeItem] = decodeTagged(stream)

    switch (tag) {
        case 0:
            return /** @type {any} */ (
                makeStakingHash({ hash: decodeItem(PubKeyHash) })
            )
        case 1:
            const v = decodeItem(StakingValidatorHash)
            return /** @type {any} */ (
                makeStakingHash({
                    hash: new StakingValidatorHash(v.bytes, context)
                })
            )
        default:
            throw new Error(`expected 0 or 1 StakingHash cbor tag, got ${tag}`)
    }
}

/**
 * @template [Context=unknown]
 * @param {UplcData} data
 * @param {Context | undefined} context
 * @returns {StakingHashI<Context>}
 */
export function decodeStakingHashUplcData(data, context = undefined) {
    ConstrData.assert(data, undefined, 1)

    switch (data.tag) {
        case 0:
            return /** @type {any} */ (
                makeStakingHash({
                    hash: PubKeyHash.fromUplcData(data.fields[0])
                })
            )
        case 1: {
            const v = StakingValidatorHash.fromUplcData(data.fields[0])
            return /** @type {any} */ (
                makeStakingHash({
                    hash: new StakingValidatorHash(v.bytes, context)
                })
            )
        }
        default:
            throw new Error(
                `expected 0 or 1 StakingHash ConstrData tag, got ${data.tag}`
            )
    }
}
