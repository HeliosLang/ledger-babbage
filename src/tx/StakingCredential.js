import { None } from "@helios-lang/type-utils"
import { ConstrData } from "@helios-lang/uplc"
import {
    PubKeyHash,
    StakingHash,
    StakingValidatorHash
} from "../hashes/index.js"

/**
 * @typedef {import("@helios-lang/uplc").UplcData} UplcData
 * @typedef {import("@helios-lang/uplc").ConstrDataI} ConstrDataI
 * @typedef {import("../hashes/index.js").StakingHashLike} StakingHashLike
 */

/**
 * @template [Context=unknown]
 * @typedef {import("../hashes/index.js").StakingHashI<Context>} StakingHashI
 */

/**
 * @typedef {StakingCredential | StakingHashLike} StakingCredentialLike
 */

/**
 * @template [Context=unknown]
 * @typedef {{
 *   bytes: number[]
 *   context: Context
 *   hash: StakingHashI<Context>
 *   toCbor(): number[]
 *   toUplcData(): ConstrDataI
 * }} StakingCredentialI
 */

/**
 * TODO: implement support for staking pointers
 * @template [C=unknown] - optional context
 * @implements {StakingCredentialI<C>}
 */
export class StakingCredential {
    /**
     * @readonly
     * @type {StakingHashI<C>}
     */
    hash

    /**
     * @param {StakingHashI<C>} hash
     */
    constructor(hash) {
        this.hash = hash
    }

    /**
     * @template {StakingCredentialLike} T
     * @param {T} arg
     * @returns {(
     *   T extends StakingCredential<infer C> ?
     *     StakingCredential<C> :
     *   T extends StakingHash<infer C> ?
     *     StakingCredential<C> :
     *   T extends PubKeyHash ?
     *     StakingCredential<null> :
     *   T extends StakingValidatorHash<infer C> ?
     *     StakingCredential<C> :
     *   StakingCredential
     * )}
     */
    static new(arg) {
        return /** @type {any} */ (
            arg instanceof StakingCredential
                ? arg
                : new StakingCredential(StakingHash.new(arg))
        )
    }

    /**
     * @param {number} seed
     * @returns {StakingCredential}
     */
    static dummy(seed = 0) {
        return new StakingCredential(StakingHash.dummy(seed))
    }

    /**
     * @template [C=unknown]
     * @param {number[]} bytes
     * @param {Option<C>} context
     * @returns {Option<StakingCredential<C>>}
     */
    static fromAddressBytes(bytes, context = None) {
        if (bytes.length > 29) {
            const head = bytes[0]
            const body = bytes.slice(29, 57)
            const type = head >> 4

            switch (type) {
                case 0:
                case 1:
                    if (context !== null) {
                        throw new Error("expected null context for PubKey")
                    }

                    return /** @type {any} */ (
                        new StakingCredential(
                            StakingHash.PubKey(new PubKeyHash(body))
                        )
                    )
                case 2:
                case 3:
                    return new StakingCredential(
                        StakingHash.Validator(
                            new StakingValidatorHash(body, context)
                        )
                    )
                default:
                    throw new Error(`unhandled StakingCredential type ${type}`)
            }
        } else {
            return None
        }
    }

    /**
     * @param {UplcData} data
     */
    static fromUplcData(data) {
        ConstrData.assert(data, 0, 1)

        return new StakingCredential(StakingHash.fromUplcData(data.fields[0]))
    }

    /**
     * @type {number[]}
     */
    get bytes() {
        return this.hash.bytes
    }

    /**
     * @type {C}
     */
    get context() {
        return this.hash.context
    }

    /**
     * TODO: get rid of this method
     * @returns {StakingHash<C>}
     */
    expectStakingHash() {
        if (this.hash instanceof StakingHash) {
            return this.hash
        } else {
            throw new Error("not an instance of StakingHash")
        }
    }

    /**
     * Only valid for Staking hashes
     * XXX: this is quite confusing, if only staking hashes are serialized into transactions, how can staking pointers be available inside the scriptcontext in validators?
     * @returns {number[]}
     */
    toCbor() {
        return this.hash.toCbor()
    }

    /**
     * @returns {ConstrData}
     */
    toUplcData() {
        return new ConstrData(0, [this.hash.toUplcData()])
    }
}

/**
 * @template [Context=unknown]
 * @overload
 * @param {{
 *   hash: StakingHashI<Context>
 * }} args
 * @returns {StakingCredentialI<Context>}
 */
/**
 * @template [Context=unknown]
 * @overload
 * @param {{
 *   bytes: number[]
 *   context?: Context
 * }} args
 * @returns {Option<StakingCredentialI<Context>>}
 */
/**
 * @template [Context=unknown]
 * @overload
 * @param {{
 *   uplcData: UplcData
 *   context?: Context
 * }} args
 * @returns {StakingCredentialI<Context>}
 */
/**
 * @template [Context=unknown]
 * @param {({
 *   hash: StakingHashI<Context>
 * } | {
 *   bytes: number[]
 *   context?: Context
 * } | {
 *   uplcData: UplcData
 *   context?: Context
 * })} args
 * @returns {Option<StakingCredentialI<Context>>}
 */
export function makeStakingCredential(args) {
    if ("hash" in args) {
        return new StakingCredential(args.hash)
    } else if ("bytes" in args) {
        const bytes = args.bytes
        const context = args.context

        if (bytes.length > 29) {
            const head = bytes[0]
            const body = bytes.slice(29, 57)
            const type = head >> 4

            switch (type) {
                case 0:
                case 1:
                    if (context !== null) {
                        throw new Error("expected null context for PubKey")
                    }

                    return /** @type {any} */ (
                        new StakingCredential(
                            StakingHash.PubKey(new PubKeyHash(body))
                        )
                    )
                case 2:
                case 3:
                    return new StakingCredential(
                        StakingHash.Validator(
                            new StakingValidatorHash(body, context)
                        )
                    )
                default:
                    throw new Error(`unhandled StakingCredential type ${type}`)
            }
        } else {
            return None
        }
    } else if ("uplcData" in args) {
        const data = args.uplcData
        ConstrData.assert(data, 0, 1)

        return new StakingCredential(StakingHash.fromUplcData(data.fields[0]))
    }
}
