import { decodeBytes, encodeBytes } from "@helios-lang/cbor"
import {
    bytesToHex,
    compareBytes,
    equalsBytes,
    toBytes
} from "@helios-lang/codec-utils"
import { decodeBech32, encodeBech32 } from "@helios-lang/crypto"
import { ConstrData } from "@helios-lang/uplc"
import {
    PubKeyHash,
    StakingHash,
    StakingValidatorHash,
    ValidatorHash
} from "../hashes/index.js"
import { makeAddress } from "./ShelleyAddress.js"
import { StakingCredential } from "./StakingCredential.js"

/**
 * @import { BytesLike } from "@helios-lang/codec-utils"
 * @import { ConstrDataI, UplcData } from "@helios-lang/uplc"
 * @import { StakingHashLike } from "../hashes/index.js"
 * @import { ShelleyAddress } from "./ShelleyAddress.js"
 * @import { StakingCredentialLike } from "./StakingCredential.js"
 */

/**
 * @template C
 * @template P
 * @template V
 * @typedef {import("../hashes/index.js").StakingPubKeyOrValidator<C, P, V>} StakingPubKeyOrValidator
 */

/**
 * @template [Context=unknown]
 * @typedef {import("../hashes/index.js").StakingHashI<Context>} StakingHashI
 */

/**
 * @typedef {StakingAddress | BytesLike | ShelleyAddress | StakingCredential | PubKeyHash | ValidatorHash} StakingAddressLike
 */

/**
 * @template [Context=unknown]
 * @typedef {{
 *   kind: "StakingAddress"
 *   bytes: number[]
 *   context: Context
 *   stakingHash: StakingHashI<Context>
 *   isEqual(other: StakingAddress): boolean
 *   isForMainnet(): boolean
 *   toBech32(): string
 *   toCbor(): number[]
 *   toHex(): string
 *   toUplcData(): ConstrDataI
 * }} StakingAddressI
 */

/**
 * Wrapper for Cardano stake address bytes. An StakingAddress consists of two parts internally:
 *   - Header (1 byte, see CIP 8)
 *   - Staking witness hash (28 bytes that represent the `PubKeyHash` or `StakingValidatorHash`)
 *
 * Staking addresses are used to query the assets held by given staking credentials.
 *
 * TODO: handle staking pointers?
 * @template [Context=unknown] - staking can have a context with a program and a redeemer
 * @implements {StakingAddressI<Context>}
 */
export class StakingAddress {
    /**
     * @readonly
     * @type {number[]}
     */
    bytes

    /**
     * @readonly
     * @type {Context}
     */
    context

    /**
     * @param {BytesLike} bytes
     * @param {Context | undefined} context
     */
    constructor(bytes, context = undefined) {
        this.bytes = toBytes(bytes)

        if (this.bytes.length != 29) {
            throw new Error(
                `expected 29 bytes for StakingAddress, got ${this.bytes.length} bytes`
            )
        }

        if (context) {
            this.context = context
        }
    }

    /**
     * @param {boolean} isMainnet
     * @param {StakingAddressLike} arg
     * @returns {StakingAddress}
     */
    static new(isMainnet, arg) {
        return arg instanceof StakingAddress
            ? arg
            : arg instanceof StakingCredential
              ? StakingAddress.fromCredential(isMainnet, arg)
              : arg instanceof PubKeyHash
                ? StakingAddress.fromPubKeyHash(isMainnet, arg)
                : arg instanceof ValidatorHash
                  ? StakingAddress.fromStakingValidatorHash(isMainnet, arg)
                  : typeof arg == "string"
                    ? new StakingAddress(arg)
                    : "kind" in arg && arg.kind == "Address"
                      ? StakingAddress.fromAddress(arg)
                      : new StakingAddress(arg)
    }

    /**
     * @param {boolean} isMainnet
     * @param {number} seed
     * @returns {StakingAddress}
     */
    static dummy(isMainnet, seed = 0) {
        return StakingAddress.fromPubKeyHash(isMainnet, PubKeyHash.dummy(seed))
    }

    /**
     * Convert a regular `Address` into a `StakingAddress`.
     * Throws an error if the Address doesn't have a staking credential.
     * @template C
     * @param {ShelleyAddress<any, C>} addr
     * @returns {StakingAddress<C>}
     */
    static fromAddress(addr) {
        const sh = addr.stakingHash

        if (sh) {
            return /** @type {any} */ (
                StakingAddress.fromHash(
                    addr.isForMainnet(),
                    /** @type {any} */ (sh)
                )
            )
        } else {
            throw new Error("address doesn't have a staking part")
        }
    }

    /**
     * @param {string} str
     * @returns {StakingAddress}
     */
    static fromBech32(str) {
        const [prefix, bytes] = decodeBech32(str)

        const result = new StakingAddress(bytes)

        if (prefix != result.bech32Prefix) {
            throw new Error("invalid StakingAddress prefix")
        }

        return result
    }

    /**
     * @param {BytesLike} bytes
     * @returns {StakingAddress}
     */
    static fromCbor(bytes) {
        return new StakingAddress(decodeBytes(bytes))
    }

    /**
     * @template {StakingCredentialLike} [TCredential=StakingCredentialLike]
     * @param {boolean} isMainnet
     * @param {TCredential} stakingCredential
     * @returns {(
     *   TCredential extends StakingCredential<any, infer CStaking> ?
     *     StakingAddress<CStaking> :
     *   TCredential extends PubKeyHash ?
     *     StakingAddress<null> :
     *   TCredential extends StakingHash<any, infer CStaking> ?
     *     StakingAddress<CStaking> :
     *   TCredential extends StakingValidatorHash<infer CStaking> ?
     *     StakingAddress<CStaking> :
     *     StakingAddress
     * )}
     */
    static fromCredential(isMainnet, stakingCredential) {
        const sh = StakingCredential.new(stakingCredential).expectStakingHash()
        return /** @type {any} */ (StakingAddress.fromHash(isMainnet, sh))
    }

    /**
     * Converts a `PubKeyHash` or `StakingValidatorHash` into `StakingAddress`.
     * @template {StakingHashLike} [TStaking=StakingHashLike]
     * @param {boolean} isMainnet
     * @param {StakingHashLike} hash
     * @returns {(
     *   TStaking extends PubKeyHash ?
     *     StakingAddress<null> :
     *   TStaking extends StakingHash<any, infer CStaking> ?
     *     StakingAddress<CStaking> :
     *   TStaking extends StakingValidatorHash<infer CStaking> ?
     *     StakingAddress<CStaking> :
     *     StakingAddress<unknown>
     * )}
     */
    static fromHash(isMainnet, hash) {
        const hash_ = StakingHash.new(hash).hash

        if (hash_ instanceof PubKeyHash) {
            return /** @type {any} */ (
                StakingAddress.fromPubKeyHash(isMainnet, hash_)
            )
        } else {
            return /** @type {any} */ (
                StakingAddress.fromStakingValidatorHash(isMainnet, hash_)
            )
        }
    }

    /**
     * Address with only staking part (regular PubKeyHash)
     * @private
     * @param {boolean} isMainnet
     * @param {PubKeyHash} hash
     * @returns {StakingAddress<null>}
     */
    static fromPubKeyHash(isMainnet, hash) {
        return new StakingAddress([isMainnet ? 0xe1 : 0xe0].concat(hash.bytes))
    }

    /**
     * Address with only staking part (script StakingValidatorHash)
     * @private
     * @template [C=unknown]
     * @param {boolean} isMainnet
     * @param {StakingValidatorHash<C>} hash
     * @returns {StakingAddress<C>}
     */
    static fromStakingValidatorHash(isMainnet, hash) {
        return new StakingAddress(
            [isMainnet ? 0xf1 : 0xf0].concat(hash.bytes),
            hash.context
        )
    }

    /**
     * On-chain a StakingAddress is represented as a StakingCredential
     * @param {boolean} isMainnet
     * @param {UplcData} data
     * @returns {StakingAddress}
     */
    static fromUplcData(isMainnet, data) {
        const stakingCredential = StakingCredential.fromUplcData(data)
        return StakingAddress.fromCredential(isMainnet, stakingCredential)
    }

    /**
     * Doesn't take into account the header byte
     * @param {StakingAddress} a
     * @param {StakingAddress} b
     * @returns {number}
     */
    static compare(a, b) {
        return compareBytes(a.stakingHash.bytes, b.stakingHash.bytes)
    }

    /**
     * @param {string} str
     * @returns {boolean}
     */
    static isValidBech32(str) {
        try {
            StakingAddress.fromBech32(str)
            return true
        } catch (_e) {
            return false
        }
    }

    /**
     * @type {string}
     */
    get bech32Prefix() {
        return this.isForMainnet() ? "stake" : "stake_test"
    }

    /**
     * @type {"StakingAddress"}
     */
    get kind() {
        return "StakingAddress"
    }

    /**
     * Returns the underlying `StakingHash`.
     * @type {StakingHash<Context>}
     */
    get stakingHash() {
        const type = this.bytes[0]

        if (type == 0xe0 || type == 0xe1) {
            return /** @type {any} */ (
                StakingHash.PubKey(new PubKeyHash(this.bytes.slice(1)))
            )
        } else if (type == 0xf0 || type == 0xf1) {
            return /** @type {any} */ (
                StakingHash.Validator(
                    new StakingValidatorHash(this.bytes.slice(1), this.context)
                )
            )
        } else {
            throw new Error("bad StakingAddress header")
        }
    }

    /**
     * @param {StakingAddress} other
     * @returns {boolean}
     */
    isEqual(other) {
        return equalsBytes(this.bytes, other.bytes)
    }

    /**
     * Returns `true` if the given `StakingAddress` is a mainnet address.
     * @returns {boolean}
     */
    isForMainnet() {
        return makeAddress(this.bytes).isForMainnet()
    }

    /**
     * Converts a `StakingAddress` into its Bech32 representation.
     * @returns {string}
     */
    toBech32() {
        return encodeBech32(this.bech32Prefix, this.bytes)
    }

    /**
     * Converts a `StakingAddress` into its CBOR representation.
     * @returns {number[]}
     */
    toCbor() {
        return encodeBytes(this.bytes)
    }

    /**
     * StakingAddress is represented as StakingCredential on-chain
     * @returns {StakingCredential<Context>}
     */
    toCredential() {
        return /** @type {any} */ (
            StakingCredential.new(/** @type {any} */ (this.stakingHash))
        )
    }

    /**
     * Converts a `StakingAddress` into its hexadecimal representation.
     * @returns {string}
     */
    toHex() {
        return bytesToHex(this.bytes)
    }

    /**
     * @returns {ConstrData}
     */
    toUplcData() {
        return this.toCredential().toUplcData()
    }
}

/**
 * @template [Context=unknown]
 * @overload
 * @param {{
 *   bytes: BytesLike
 *   context?: Context
 * }} args
 * @returns {StakingAddressI<Context>}
 */
/**
 * @template [Context=unknown]
 * @overload
 * @param {{
 *   address: ShelleyAddress<any, Context>
 * }} args
 * @returns {StakingAddressI<Context>}
 */
/**
 * @template [Context=unknown]
 * @overload
 * @param {{
 *   credential: StakingCredential<Context>
 *   isMainnet: boolean
 * }} args
 * @returns {StakingAddressI<Context>}
 */
/**
 * @overload
 * @param {{
 *   hash: PubKeyHash
 *   isMainnet: boolean
 * }} args
 * @returns {StakingAddressI<null>}
 */
/**
 * @template [Context=unknown]
 * @overload
 * @param {{
 *   hash: StakingValidatorHash<Context>
 *   isMainnet: boolean
 * }} args
 * @returns {StakingAddressI<Context>}
 */
/**
 * @template [Context=unknown]
 * @overload
 * @param {{
 *   hash: StakingHashI<Context>
 *   isMainnet: boolean
 * }} args
 * @returns {StakingAddressI<Context>}
 */
/**
 * A dummy StakingAddress is always for testnet
 * @overload
 * @param {{
 *   dummy: number
 * }} args
 * @returns {StakingAddressI<null>}
 */
/**
 * @tempate [Context=unknown]
 * @overload
 * @param {{
 *   bech32: string
 *   context?: Context
 * }} args
 * @returns {StakingAddressI<Context>}
 */
/**
 * @template [Context=unknown]
 * @overload
 * @param {{
 *   cbor: BytesLike
 *   context?: Context
 * }} args
 * @returns {StakingAddressI<Context>}
 */
/**
 * @template [Context=unknown]
 * @overload
 * @param {{
 *   uplcData: UplcData
 *   context?: Context
 *   isMainnet: boolean
 * }} args
 * @returns {StakingAddressI<Context>}
 */
/**
 * @template [CStaking=unknown]
 * @param {({
 *   bytes: BytesLike
 *   context?: CStaking
 * } | {
 *   address: ShelleyAddress<any, CStaking>
 * } | {
 *   credential: StakingCredential<CStaking>
 *   isMainnet: boolean
 * } | {
 *   hash: StakingHashI<CStaking> | StakingPubKeyOrValidator<CStaking, PubKeyHash, StakingValidatorHash<CStaking>>
 *   isMainnet: boolean
 * } | {
 *   dummy: number
 * } | {
 *   bech32: string
 *   context?: CStaking
 * } | {
 *   cbor: BytesLike
 *   context?: CStaking
 * } | {
 *   uplcData: UplcData
 *   isMainnet: boolean
 * })} args
 * @returns {StakingAddressI<CStaking>}
 */
export function makeStakingAddress(args) {
    if ("bytes" in args) {
        return new StakingAddress(args.bytes, args.context)
    } else if ("address" in args) {
        const hash = args.address.stakingHash

        if (!hash) {
            throw new Error("Address doesn't have a staking part")
        }

        return /** @type {any} */ (
            makeStakingAddress({
                isMainnet: args.address.isForMainnet(),
                hash
            })
        )
    } else if ("credential" in args) {
        return makeStakingAddress({
            isMainnet: args.isMainnet,
            hash: args.credential.hash
        })
    } else if ("hash" in args) {
        const h = args.hash

        if (h instanceof PubKeyHash) {
            return new StakingAddress(
                [args.isMainnet ? 0xe1 : 0xe0].concat(h.bytes)
            )
        } else if (h instanceof StakingValidatorHash) {
            return new StakingAddress(
                [args.isMainnet ? 0xf1 : 0xf0].concat(h.bytes),
                h.context
            )
        } else if (h instanceof StakingHash) {
            return /** @type {any} */ (
                makeStakingAddress({
                    isMainnet: args.isMainnet,
                    hash: /** @type {any} */ (h.hash)
                })
            )
        } else {
            throw new Error("unexpected Staking hash type")
        }
    } else if ("dummy" in args) {
        return /** @type {any} */ (
            makeStakingAddress({
                hash: /** @type {any} */ (PubKeyHash.dummy(args.dummy)),
                isMainnet: false
            })
        )
    } else if ("bech32" in args) {
        const [prefix, bytes] = decodeBech32(args.bech32)

        const result = new StakingAddress(bytes, args.context)

        if (prefix != result.bech32Prefix) {
            throw new Error("invalid StakingAddress prefix")
        }

        return /** @type {any} */ (result)
    } else if ("cbor" in args) {
        return decodeStakingAddressCbor(args.cbor, args.context)
    } else if ("uplcData" in args) {
        return decodeStakingAddressUplcData(args.isMainnet, args.uplcData)
    } else {
        throw new Error("invalid makeStakingAddress() arguments")
    }
}

/**
 * @template [Context=unknown]
 * @param {BytesLike} bytes
 * @param {Context | undefined} context
 * @returns {StakingAddressI<Context>}
 */
export function decodeStakingAddressCbor(bytes, context = undefined) {
    return new StakingAddress(decodeBytes(bytes), context)
}

/**
 * @template [Context=unknown]
 * @param {boolean} isMainnet
 * @param {UplcData} data
 * @returns {StakingAddressI<Context>}
 */
function decodeStakingAddressUplcData(isMainnet, data) {
    const stakingCredential = StakingCredential.fromUplcData(data)
    const sh = stakingCredential.expectStakingHash()
    return makeStakingAddress({ isMainnet: isMainnet, hash: sh })
}
