import { ConstrData } from "@helios-lang/uplc"
import { PubKeyHash, ValidatorHash } from "../hashes/index.js"

/**
 * @typedef {import("@helios-lang/uplc").UplcData} UplcData
 * @typedef {import("../hashes/index.js").PubKeyHashLike} PubKeyHashLike
 * @typedef {import("../hashes/index.js").ValidatorHashLike} ValidatorHashLike
 */

/**
 * @typedef {"PubKey" | "Validator"} SpendingCredentialKind
 */

/**
 * @template {SpendingCredentialKind} T
 * @typedef {T extends "PubKey" ? {
 *   hash: PubKeyHash
 * } : {
 *   hash: ValidatorHash
 * }} SpendingCredentialProps
 */

/**
 * @typedef {SpendingCredential | PubKeyHash | ValidatorHash} SpendingCredentialLike
 */

/**
 * @template {SpendingCredentialKind} [T=SpendingCredentialKind]
 * @template [C=unknown]
 */
export class SpendingCredential {
    /**
     * @private
     * @readonly
     * @type {T}
     */
    kind

    /**
     * @readonly
     * @type {SpendingCredentialProps<T>}
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
     * @param {SpendingCredentialProps<T>} props
     * @param {C | undefined} context
     */
    constructor(kind, props, context = undefined) {
        this.kind = kind
        this.props = props

        if (context !== undefined) {
            this.context = context
        }
    }

    /**
     * @param {number} seed
     * @returns {SpendingCredential<"PubKey", null>}
     */
    static dummy(seed = 0) {
        return SpendingCredential.PubKey(PubKeyHash.dummy(seed))
    }

    /**
     * @param {PubKeyHashLike} hash
     * @returns {SpendingCredential<"PubKey", null>}
     */
    static PubKey(hash) {
        return new SpendingCredential("PubKey", {
            hash: PubKeyHash.new(hash)
        })
    }

    /**
     * @template {ValidatorHashLike} T
     * @param {T} hash
     * @returns {T extends ValidatorHash<infer C> ? SpendingCredential<"Validator", C> : SpendingCredential<"Validator">}
     */
    static Validator(hash) {
        return /** @type {any} */ (
            new SpendingCredential(
                "Validator",
                {
                    hash: ValidatorHash.new(hash)
                },
                hash instanceof ValidatorHash ? hash.context : undefined
            )
        )
    }

    /**
     * @template [C=unknown]
     * @param {number[]} bytes
     * @param {C | undefined} context
     * @returns {SpendingCredential<SpendingCredentialKind, C>}
     */
    static fromAddressBytes(bytes, context = undefined) {
        if (bytes.length < 29) {
            throw new Error(
                `expected at least 29 bytes, got ${bytes.length} bytes`
            )
        }

        const head = bytes[0]
        const paymentPart = bytes.slice(1, 29)

        const type = head >> 4

        return /** @type {any} */ (
            type % 2 == 0
                ? SpendingCredential.PubKey(paymentPart)
                : context
                  ? SpendingCredential.Validator(
                        new ValidatorHash(paymentPart, context)
                    )
                  : SpendingCredential.Validator(paymentPart)
        )
    }

    /**
     * @template {SpendingCredentialLike} T
     * @param {T} arg
     * @returns {(
     *   T extends PubKeyHash ? SpendingCredential<"PubKey", null> :
     *   T extends ValidatorHash<infer C> ? SpendingCredential<"Validator", C> :
     *   T extends SpendingCredential<infer K, infer C> ? SpendingCredential<K, C> :
     *   SpendingCredential
     * )}
     */
    static new(arg) {
        return /** @type {any} */ (
            arg instanceof SpendingCredential
                ? arg
                : arg instanceof PubKeyHash
                  ? SpendingCredential.PubKey(arg)
                  : SpendingCredential.Validator(arg)
        )
    }

    /**
     *
     * @param {UplcData} data
     * @returns {SpendingCredential}
     */
    static fromUplcData(data) {
        ConstrData.assert(data, undefined, 1)

        switch (data.tag) {
            case 0:
                return SpendingCredential.PubKey(
                    PubKeyHash.fromUplcData(data.fields[0])
                )
            case 1:
                return SpendingCredential.Validator(
                    ValidatorHash.fromUplcData(data.fields[0])
                )
            default:
                throw new Error(
                    `unexpected Credential ConstrData tag ${data.tag}`
                )
        }
    }

    /**
     * @type {number[]}
     */
    get bytes() {
        return this.props.hash.bytes
    }

    /**
     * @type {T extends "PubKey" ? PubKeyHash : T extends "Validator" ? ValidatorHash<C> : (PubKeyHash | ValidatorHash<C>)}
     */
    get hash() {
        return /** @type {any} */ (this.props.hash)
    }

    /**
     * @type {T extends "PubKey" ? PubKeyHash : T extends "Validator" ? undefined : (PubKeyHash | undefined)}
     */
    get pubKeyHash() {
        return /** @type {any} */ (
            this.isPubKey() ? this.props.hash : undefined
        )
    }

    /**
     * @type {T extends "Validator" ? ValidatorHash<C> : T extends "PubKey" ? undefined : (ValidatorHash<C> | undefined)}
     */
    get validatorHash() {
        return /** @type {any} */ (
            this.isValidator() ? this.props.hash : undefined
        )
    }

    /**
     * @returns {this is SpendingCredential<"PubKey", null>}
     */
    isPubKey() {
        return this.kind == "PubKey"
    }

    /**
     * @returns {this is SpendingCredential<"Validator", C>}
     */
    isValidator() {
        return this.kind == "Validator"
    }

    /**
     * @returns {UplcData}
     */
    toUplcData() {
        return new ConstrData(this.isValidator() ? 1 : 0, [
            this.hash.toUplcData()
        ])
    }
}
