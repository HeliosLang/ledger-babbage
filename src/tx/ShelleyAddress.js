import { decodeBytes, encodeBytes } from "@helios-lang/cbor"
import { bytesToHex, makeByteStream, toBytes } from "@helios-lang/codec-utils"
import { decodeBech32, encodeBech32 } from "@helios-lang/crypto"
import { decodeByronAddress, makeByronAddress } from "@helios-lang/ledger-byron"
import { ByteArrayData, ConstrData, encodeOptionData } from "@helios-lang/uplc"
import {
    PubKeyHash,
    StakingValidatorHash,
    ValidatorHash
} from "../hashes/index.js"
import { SpendingCredential } from "./SpendingCredential.js"
import { StakingCredential } from "./StakingCredential.js"
import {} from "@helios-lang/codec-utils"

/**
 * @import { BytesLike } from "@helios-lang/codec-utils"
 * @import { ByronAddress } from "@helios-lang/ledger-byron"
 * @import { UplcData } from "@helios-lang/uplc"
 * @import { StakingHashI } from "../hashes/index.js"
 * @import { SpendingCredentialKind } from "./SpendingCredential.js"
 */

/**
 * @template [CSpending=unknown]
 * @template [CStaking=unknown]
 * @typedef {object} ShelleyAddress
 * @prop {"Address"} kind
 * @prop {"Shelley"} era
 * @prop {number[]} bytes
 * @prop {PubKeyHash | undefined} pubKeyHash
 * @prop {CSpending} spendingContext
 * @prop {SpendingCredential<SpendingCredentialKind, CSpending>} spendingCredential
 * @prop {CStaking} stakingContext
 * @prop {StakingCredential<CStaking> | undefined} stakingCredential
 * @prop {StakingHashI<CStaking> | undefined} stakingHash
 * @prop {ValidatorHash<CSpending> | undefined} validatorHash
 * @prop {() => ShelleyAddress<CSpending, CStaking>} copy
 * @prop {() => object} dump
 * @prop {(other: Address) => boolean} isEqual
 * @prop {() => boolean} isForMainnet
 * @prop {() => string} toBech32
 * @prop {() => number[]} toCbor
 * @prop {() => string} toHex
 *
 * @prop {() => string} toString
 * Alias for toBech32()
 *
 * @prop {() => UplcData} toUplcData
 */

/**
 * @template [SpendingContext=unknown]
 * @template [StakingContext=unknown]
 * @typedef {ByronAddress | ShelleyAddress<SpendingContext, StakingContext>} Address
 */

/**
 * @typedef {ShelleyAddress | BytesLike} ShelleyAddressLike
 */

/**
 * Returns a dummy address (based on a PubKeyHash with all null bytes)
 * @param {boolean} isMainnet
 * @param {number} seed
 * @returns {ShelleyAddress<null, unknown>}
 */
export function makeDummyAddress(isMainnet, seed = 0) {
    return /** @type {any} */ (
        makeAddressFromPubKeyHash(isMainnet, PubKeyHash.dummy(seed), undefined)
    )
}

/**
 * @overload
 * @param {string} bech32
 * @returns {ShelleyAddress}
 */
/**
 * @overload
 * @param {ShelleyAddressLike} addr
 * @returns {ShelleyAddress}
 */
/**
 * @template [TSpending=(PubKeyHash | ValidatorHash)]
 * @template [TStaking=(PubKeyHash | StakingValidatorHash)]
 * @overload
 * @param {{
 *   isMainnet: boolean
 *   spendingHash: TSpending
 *   stakingHash?: StakingHashI<TStaking>
 * }} hashes
 * @returns {ShelleyAddress}
 */
/**
 * @overload
 * @param {{
 *   isMainnet: boolean
 *   spendingCredential: SpendingCredential
 *   stakingCredential?: StakingCredential
 * }} credentials
 * @returns {ShelleyAddress}
 */
/**
 * @template [TStaking=(PubKeyHash | StakingValidatorHash)]
 * @param {(
 *   [string]
 *   | [ShelleyAddressLike]
 *   | [{isMainnet: boolean, spendingHash: PubKeyHash | ValidatorHash, stakingHash?: StakingHashI<TStaking>}]
 *   | [{isMainnet: boolean, spendingCredential: SpendingCredential, stakingCredential?: StakingCredential}]
 * )} args
 * @returns {ShelleyAddress}
 */
export function makeAddress(...args) {
    if (args.length == 1) {
        const arg = args[0]

        if (typeof arg == "string") {
            // ignore the prefix (encoded in the bytes anyway)
            let [prefix, bytes] = decodeBech32(arg)

            let result = new ShelleyAddressImpl(bytes)

            if (prefix != result.bech32Prefix) {
                throw new Error("invalid Address prefix")
            }

            return result
        } else if ("isMainnet" in arg) {
            const isMainnet = arg.isMainnet

            if ("spendingHash" in arg) {
                const pubKeyHash = arg.spendingHash
                const stakingHash = arg.stakingHash

                if (stakingHash) {
                    if (stakingHash instanceof PubKeyHash) {
                        return /** @type {any} */ (
                            new ShelleyAddressImpl(
                                [isMainnet ? 0x01 : 0x00]
                                    .concat(pubKeyHash.bytes)
                                    .concat(stakingHash.bytes),
                                undefined,
                                undefined
                            )
                        )
                    } else if (stakingHash instanceof StakingValidatorHash) {
                        return /** @type {any} */ (
                            new ShelleyAddressImpl(
                                [isMainnet ? 0x21 : 0x20]
                                    .concat(pubKeyHash.bytes)
                                    .concat(stakingHash.bytes),
                                undefined,
                                stakingHash.context
                            )
                        )
                    } else {
                        throw new Error("invalid Staking hash")
                    }
                } else {
                    return /** @type {any} */ (
                        new ShelleyAddressImpl(
                            [isMainnet ? 0x61 : 0x60].concat(pubKeyHash.bytes),
                            undefined,
                            undefined
                        )
                    )
                }
            } else if ("spendingCredential" in arg) {
                return /** @type {any} */ (
                    makeAddressFromHashes(
                        isMainnet,
                        arg.spendingCredential.hash,
                        arg.stakingCredential?.hash?.hash
                    )
                )
            } else {
                throw new Error("invalid arguments")
            }
        } else {
            return arg instanceof ShelleyAddressImpl
                ? arg
                : new ShelleyAddressImpl(arg)
        }
    } else {
        throw new Error("invalid number of arguments")
    }
}

/**
 * @param {boolean} isMainnet
 * @param {SpendingCredential} paymentCredential
 * @param {StakingCredential | undefined} stakingCredential
 * @return {ShelleyAddress}
 */
export function makeAddressFromCredentials(
    isMainnet,
    paymentCredential,
    stakingCredential = undefined
) {
    return /** @type {any} */ (
        makeAddressFromHashes(
            isMainnet,
            paymentCredential.hash,
            stakingCredential?.hash?.hash
        )
    )
}

/**
 * Constructs an Address using either a `PubKeyHash` (i.e. simple payment address)
 * or `ValidatorHash` (i.e. script address),
 * in combination with an optional staking hash (`PubKeyHash` or `StakingValidatorHash`).
 * @template {PubKeyHash | ValidatorHash} [TSpending=PubKeyHash | ValidatorHash]
 * @template {PubKeyHash | StakingValidatorHash} [TStaking=PubKeyHash | StakingValidatorHash]
 * @param {boolean} isMainnet
 * @param {TSpending} spendingHash
 * @param {TStaking | undefined} stakingHash
 * @returns {(
 *   TSpending extends PubKeyHash ? (
 *     TStaking extends PubKeyHash ?
 *       ShelleyAddress<null, null> :
 *     TStaking extends StakingValidatorHash<infer CStaking> ?
 *       ShelleyAddress<null, CStaking> :
 *       ShelleyAddress<null, unknown>
 *   ) :
 *   TSpending extends ValidatorHash<infer CSpending> ? (
 *     TStaking extends PubKeyHash ?
 *       ShelleyAddress<CSpending, null> :
 *     TStaking extends StakingValidatorHash<infer CStaking> ?
 *       ShelleyAddress<CSpending, CStaking> :
 *       ShelleyAddress<CSpending, unknown>
 *   ) :
 *     Address
 * )}
 */
export function makeAddressFromHashes(
    isMainnet,
    spendingHash,
    stakingHash = undefined
) {
    if (spendingHash instanceof PubKeyHash) {
        return /** @type {any} */ (
            makeAddressFromPubKeyHash(isMainnet, spendingHash, stakingHash)
        )
    } else if (spendingHash instanceof ValidatorHash) {
        return /** @type {any} */ (
            makeAddressFromValidatorHash(isMainnet, spendingHash, stakingHash)
        )
    } else {
        throw new Error("invalid Spending hash")
    }
}

/**
 * Simple payment address with an optional staking hash (`PubKeyHash` or `StakingValidatorHash`).
 * @template {PubKeyHash | StakingValidatorHash} [TStaking=PubKeyHash | StakingValidatorHash]
 * @param {boolean} isMainnet
 * @param {PubKeyHash} paymentHash
 * @param {TStaking | undefined} stakingHash
 * @returns {(
 *   TStaking extends PubKeyHash ? ShelleyAddress<null, null> :
 *   TStaking extends StakingValidatorHash<infer C> ? ShelleyAddress<null, C> :
 *   ShelleyAddress<unknown, unknown>
 * )}
 */
function makeAddressFromPubKeyHash(
    isMainnet,
    paymentHash,
    stakingHash = undefined
) {
    if (stakingHash) {
        if (stakingHash instanceof PubKeyHash) {
            return /** @type {any} */ (
                new ShelleyAddressImpl(
                    [isMainnet ? 0x01 : 0x00]
                        .concat(paymentHash.bytes)
                        .concat(stakingHash.bytes),
                    null,
                    null
                )
            )
        } else if (stakingHash instanceof StakingValidatorHash) {
            return /** @type {any} */ (
                new ShelleyAddressImpl(
                    [isMainnet ? 0x21 : 0x20]
                        .concat(paymentHash.bytes)
                        .concat(stakingHash.bytes),
                    null,
                    stakingHash.context
                )
            )
        } else {
            throw new Error("invalid Staking hash")
        }
    } else {
        return /** @type {any} */ (
            new ShelleyAddressImpl(
                [isMainnet ? 0x61 : 0x60].concat(paymentHash.bytes),
                undefined,
                undefined
            )
        )
    }
}

/**
 * Simple script address with an optional staking hash (`PubKeyHash` or `StakingValidatorHash`).
 * @private
 * @template [CSpending=unknown]
 * @template {PubKeyHash | StakingValidatorHash} [TStaking=PubKeyHash | StakingValidatorHash]pytho
 * @param {boolean} isMainnet
 * @param {ValidatorHash<CSpending>} spendingHash
 * @param {TStaking | undefined} stakingHash
 * @returns {(
 *   TStaking extends (null | undefined | PubKeyHash) ? ShelleyAddress<CSpending, null> :
 *   TStaking extends StakingValidatorHash<infer CStaking> ? ShelleyAddress<CSpending, CStaking> :
 *   ShelleyAddress<CSpending, unknown>
 * )}
 */
function makeAddressFromValidatorHash(isMainnet, spendingHash, stakingHash) {
    if (stakingHash) {
        if (stakingHash instanceof PubKeyHash) {
            return /** @type {any} */ (
                new ShelleyAddressImpl(
                    [isMainnet ? 0x11 : 0x10]
                        .concat(spendingHash.bytes)
                        .concat(stakingHash.bytes),
                    spendingHash.context,
                    null
                )
            )
        } else if (stakingHash instanceof StakingValidatorHash) {
            return /** @type {any} */ (
                new ShelleyAddressImpl(
                    [isMainnet ? 0x31 : 0x30]
                        .concat(spendingHash.bytes)
                        .concat(stakingHash.bytes),
                    spendingHash.context,
                    stakingHash.context
                )
            )
        } else {
            throw new Error("invalid StakingHash type")
        }
    } else {
        return /** @type {any} */ (
            new ShelleyAddressImpl(
                [isMainnet ? 0x71 : 0x70].concat(spendingHash.bytes),
                spendingHash.context,
                null
            )
        )
    }
}

/**
 * @param {boolean} isMainnet
 * @param {UplcData} data
 * @returns {ShelleyAddress}
 */
export function convertUplcDataToAddress(isMainnet, data) {
    ConstrData.assert(data, 0, 2)

    const paymentCredential = SpendingCredential.fromUplcData(data.fields[0])
    const stakingCredentialData = ConstrData.expect(
        data.fields[1],
        "invalid StakingCredential option within Address"
    )

    /**
     * @type {StakingCredential | undefined}
     */
    let stakingCredential = undefined

    // for some weird reason Option::None has index 1
    if (stakingCredentialData.tag == 1) {
        stakingCredential = undefined
    } else if (stakingCredentialData.tag == 0) {
        stakingCredentialData.expectFields(1)

        stakingCredential = StakingCredential.fromUplcData(
            stakingCredentialData.fields[0]
        )
    } else {
        throw new Error("unexpected")
    }

    return makeAddressFromCredentials(
        isMainnet,
        paymentCredential,
        stakingCredential
    )
}

/**
 * @overload
 * @param {string} bech32OrBase58
 * @returns {Address}
 *
 * @overload
 * @param {BytesLike} cbor
 * @returns {Address}
 *
 * @param {string | BytesLike} arg
 * @returns {Address}
 */
export function decodeAddress(arg) {
    if (typeof arg == "string") {
        if (arg.startsWith("addr")) {
            return makeAddress(arg)
        } else {
            return makeByronAddress(arg)
        }
    } else {
        const bytes = makeByteStream({ bytes: arg })

        const isByron = (bytes.peekOne() & 0b11110000) == 0b10000000

        if (isByron) {
            return decodeShelleyAddress(bytes)
            console.log("decoding as byron address")
            return decodeByronAddress(bytes)
        } else {
            return decodeShelleyAddress(bytes)
        }
    }
}

/**
 * @param {BytesLike} bytes
 * @returns {ShelleyAddress}
 */
export function decodeShelleyAddress(bytes) {
    return new ShelleyAddressImpl(decodeBytes(bytes))
}

/**
 * Used to sort txbody withdrawals.
 * @param {ShelleyAddress} a
 * @param {ShelleyAddress} b
 * @param {boolean} stakingHashesOnly
 * @return {number}
 */
export function compareShelleyAddresses(a, b, stakingHashesOnly = false) {
    if (stakingHashesOnly) {
        if (a.stakingHash && b.stakingHash) {
            return ByteArrayData.compare(
                a.stakingHash.bytes,
                b.stakingHash.bytes
            )
        } else {
            throw new Error("can't compare undefined stakingHashes")
        }
    } else {
        throw new Error("not yet implemented")
    }
}

/**
 * @param {string} str
 * @returns {boolean}
 */
export function isValidBech32ADdress(str) {
    try {
        makeAddress(str)
        return true
    } catch (_e) {
        return false
    }
}

/**
 * Wrapper for Cardano address bytes. An `Address` consists of three parts internally:
 *   * Header (1 byte, see [CIP 19](https://cips.cardano.org/cips/cip19/))
 *   * Witness hash (28 bytes that represent the `PubKeyHash` or `ValidatorHash`)
 *   * Optional staking credential (0 or 28 bytes)
 * @template [CSpending=unknown] - spending can have a context
 * @template [CStaking=unknown] - staking can have a separate context
 * @implements {ShelleyAddress<CSpending, CStaking>}
 */
class ShelleyAddressImpl {
    /**
     * @readonly
     * @type {number[]}
     */
    bytes

    /**
     * @readonly
     * @type {CSpending}
     */
    spendingContext

    /**
     * @readonly
     * @type {CStaking}
     */
    stakingContext

    /**
     * @param {BytesLike} bytes
     * @param {CSpending | undefined} spendingContext
     * @param {CStaking | undefined} stakingContext
     */
    constructor(
        bytes,
        spendingContext = undefined,
        stakingContext = undefined
    ) {
        this.bytes = toBytes(bytes)

        if (!(this.bytes.length == 29 || this.bytes.length == 57)) {
            throw new Error(
                `expected 29 or 57 bytes for Address, got ${this.bytes.length}`
            )
        }

        if (spendingContext) {
            this.spendingContext = spendingContext
        }

        if (stakingContext) {
            this.stakingContext = stakingContext
        }
    }

    /**
     * @type {"Address"}
     */
    get kind() {
        return "Address"
    }

    /**
     * @type {"Shelley"}
     */
    get era() {
        return "Shelley"
    }

    /**
     * @type {string}
     */
    get bech32Prefix() {
        return this.isForMainnet() ? "addr" : "addr_test"
    }

    /**
     * Returns the underlying `PubKeyHash` of a simple payment address, or `null` for a script address.
     * @type {PubKeyHash | undefined}
     */
    get pubKeyHash() {
        return this.spendingCredential.pubKeyHash ?? undefined
    }

    /**
     * @type {SpendingCredential<SpendingCredentialKind, CSpending>}
     */
    get spendingCredential() {
        return SpendingCredential.fromAddressBytes(
            this.bytes,
            this.spendingContext
        )
    }

    /**
     * @type {StakingCredential<CStaking> | undefined}
     */
    get stakingCredential() {
        return (
            StakingCredential.fromAddressBytes(
                this.bytes,
                this.stakingContext
            ) ?? undefined
        )
    }

    /**
     * @type {StakingHashI<CStaking> | undefined}
     */
    get stakingHash() {
        return this.stakingCredential ? this.stakingCredential.hash : undefined
    }

    /**
     * Returns the underlying `ValidatorHash` of a script address, or `null` for a regular payment address.
     * @type {ValidatorHash<CSpending> | undefined}
     */
    get validatorHash() {
        return this.spendingCredential.validatorHash ?? undefined
    }

    /**
     * @returns {ShelleyAddress<CSpending, CStaking>}
     */
    copy() {
        return new ShelleyAddressImpl(
            this.bytes,
            this.spendingContext,
            this.stakingContext
        )
    }

    /**
     * @returns {object}
     */
    dump() {
        return {
            hex: this.toHex(),
            bech32: this.toBech32()
        }
    }

    /**
     * @param {Address} other
     * @returns {boolean}
     */
    isEqual(other) {
        if (other.era == "Shelley") {
            return ByteArrayData.compare(this.bytes, other.bytes) == 0
        } else {
            return false
        }
    }

    /**
     * Returns `true` if the given `Address` is a mainnet address.
     * @returns {boolean}
     */
    isForMainnet() {
        let type = this.bytes[0] & 0b00001111

        return type != 0
    }

    /**
     * Converts an `Address` into its Bech32 representation.
     * @returns {string}
     */
    toBech32() {
        return encodeBech32(this.bech32Prefix, this.bytes)
    }

    /**
     * Converts an `Address` into its CBOR representation.
     * @returns {number[]}
     */
    toCbor() {
        return encodeBytes(this.bytes)
    }

    /**
     * Converts a `Address` into its hexadecimal representation.
     * @returns {string}
     */
    toHex() {
        return bytesToHex(this.bytes)
    }

    /**
     * @returns {UplcData}
     */
    toUplcData() {
        return new ConstrData(0, [
            this.spendingCredential.toUplcData(),
            encodeOptionData(this.stakingCredential?.toUplcData())
        ])
    }
}
