import { None } from "@helios-lang/type-utils"
import { ConstrData } from "@helios-lang/uplc"
import {
    PubKeyHash,
    StakingHash,
    StakingValidatorHash,
    ValidatorHash
} from "../hashes/index.js"

/**
 * @typedef {import("@helios-lang/uplc").UplcData} UplcData
 * @typedef {import("../hashes/index.js").StakingHashKind} StakingHashKind
 * @typedef {import("../hashes/index.js").StakingHashLike} StakingHashLike
 */

/**
 * @typedef {StakingCredential | StakingHashLike} StakingCredentialLike
 */

/**
 * TODO: implement support for staking pointers
 * @template {StakingHashKind} [K=StakingHashKind]
 * @template [C=unknown] - optional context
 */
export class StakingCredential {
    /**
     * @readonly
     * @type {StakingHash<K, C>}
     */
    hash

    /**
     * @param {StakingHash<K, C>} hash
     */
    constructor(hash) {
        this.hash = hash
    }

    /**
     * @template {StakingCredentialLike} T
     * @param {T} arg
     * @returns {(
     *   T extends StakingCredential<infer K, infer C> ? StakingCredential<K, C> :
     *   T extends StakingHash<infer K, infer C> ? StakingCredential<K, C> :
     *   T extends PubKeyHash ? StakingCredential<"PubKey", null> :
     *   T extends ValidatorHash<infer C> ? StakingCredential<"Validator", C> :
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
     * @returns {Option<StakingCredential>}
     */
    static fromAddressBytes(bytes, context = None) {
        if (bytes.length > 29) {
            const head = bytes[0]
            const body = bytes.slice(29, 57)
            const type = head >> 4

            switch (type) {
                case 0:
                case 1:
                    return new StakingCredential(
                        StakingHash.PubKey(new PubKeyHash(body))
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
     * @returns {StakingHash<K, C>}
     */
    expectStakingHash() {
        return this.hash
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
