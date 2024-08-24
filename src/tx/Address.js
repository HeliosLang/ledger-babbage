import { decodeBytes, encodeBytes } from "@helios-lang/cbor"
import { bytesToHex, toBytes } from "@helios-lang/codec-utils"
import { decodeBech32, encodeBech32 } from "@helios-lang/crypto"
import { isSome, None } from "@helios-lang/type-utils"
import { ByteArrayData, ConstrData, encodeOptionData } from "@helios-lang/uplc"
import {
    PubKeyHash,
    StakingHash,
    StakingValidatorHash,
    ValidatorHash
} from "../hashes/index.js"
import { SpendingCredential } from "./SpendingCredential.js"
import { StakingCredential } from "./StakingCredential.js"

/**
 * @typedef {import("@helios-lang/codec-utils").ByteArrayLike} ByteArrayLike
 * @typedef {import("@helios-lang/uplc").UplcData} UplcData
 * @typedef {import("../hashes/index.js").StakingHashKind} StakingHashKind
 * @typedef {import("./SpendingCredential.js").SpendingCredentialKind} SpendingCredentialKind
 */

/**
 * @typedef {Address | ByteArrayLike} AddressLike
 */

/**
 * Wrapper for Cardano address bytes. An `Address` consists of three parts internally:
 *   * Header (1 byte, see [CIP 19](https://cips.cardano.org/cips/cip19/))
 *   * Witness hash (28 bytes that represent the `PubKeyHash` or `ValidatorHash`)
 *   * Optional staking credential (0 or 28 bytes)
 * @template [CSpending=unknown] - spending can have a context
 * @template [CStaking=unknown] - staking can have a separate context
 */
export class Address {
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
     * @param {ByteArrayLike} bytes
     * @param {Option<CSpending>} spendingContext
     * @param {Option<CStaking>} stakingContext
     */
    constructor(bytes, spendingContext = None, stakingContext = None) {
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
     * Returns a dummy address (based on a PubKeyHash with all null bytes)
     * @param {boolean} isMainnet
     * @returns {Address}
     */
    static dummy(isMainnet) {
        return Address.fromPubKeyHash(isMainnet, PubKeyHash.dummy(), None)
    }

    /**
     * @param {AddressLike} arg
     * @returns {Address}
     */
    static new(arg) {
        return arg instanceof Address
            ? arg
            : typeof arg == "string" && arg.startsWith("addr")
              ? Address.fromBech32(arg)
              : new Address(arg)
    }

    /**
     * Converts a Bech32 string into an `Address`.
     * @param {string} str
     * @returns {Address}
     */
    static fromBech32(str) {
        // ignore the prefix (encoded in the bytes anyway)
        let [prefix, bytes] = decodeBech32(str)

        let result = new Address(bytes)

        if (prefix != result.bech32Prefix) {
            throw new Error("invalid Address prefix")
        }

        return result
    }

    /**
     * Deserializes bytes into an `Address`.
     * @param {ByteArrayLike} bytes
     * @returns {Address}
     */
    static fromCbor(bytes) {
        return new Address(decodeBytes(bytes))
    }

    /**
     * @param {boolean} isMainnet
     * @param {SpendingCredential} paymentCredential
     * @param {Option<StakingCredential>} stakingCredential
     * @return {Address}
     */
    static fromCredentials(isMainnet, paymentCredential, stakingCredential) {
        return this.fromHashes(
            isMainnet,
            paymentCredential.hash,
            stakingCredential?.hash?.hash ?? None
        )
    }

    /**
     * Constructs an Address using either a `PubKeyHash` (i.e. simple payment address)
     * or `ValidatorHash` (i.e. script address),
     * without a staking hash.
     * @template {PubKeyHash | ValidatorHash} [TSpending=PubKeyHash | ValidatorHash]
     * @param {boolean} isMainnet
     * @param {TSpending} hash
     * @returns {(
     *   TSpending extends PubKeyHash ? Address<null, null> :
     *   TSpending extends ValidatorHash<infer CSpending> ? Address<CSpending, null> :
     *   Address<unknown, null>
     * )}
     */
    static fromHash(isMainnet, hash) {
        return Address.fromHashes(isMainnet, hash, null)
    }

    /**
     * Constructs an Address using either a `PubKeyHash` (i.e. simple payment address)
     * or `ValidatorHash` (i.e. script address),
     * in combination with an optional staking hash (`PubKeyHash` or `StakingValidatorHash`).
     * @template {PubKeyHash | ValidatorHash} [TSpending=PubKeyHash | ValidatorHash]
     * @template {PubKeyHash | StakingValidatorHash} [TStaking=PubKeyHash | StakingValidatorHash]
     * @param {boolean} isMainnet
     * @param {TSpending} spendingHash
     * @param {Option<TStaking>} stakingHash
     * @returns {(
     *   TSpending extends PubKeyHash ? (
     *     TStaking extends PubKeyHash ? Address<null, null> :
     *     TStaking extends StakingValidatorHash<infer CStaking> ? Address<null, CStaking> :
     *     Address<null, unknown>
     *   ) : TSpending extends ValidatorHash<infer CSpending> ? (
     *     TStaking extends PubKeyHash ? Address<CSpending, null> :
     *     TStaking extends StakingValidatorHash<infer CStaking> ? Address<CSpending, CStaking> :
     *     Address<CSpending, unknown>
     *   ) : Address
     * )}
     */
    static fromHashes(isMainnet, spendingHash, stakingHash) {
        if (spendingHash instanceof PubKeyHash) {
            return /** @type {any} */ (
                Address.fromPubKeyHash(isMainnet, spendingHash, stakingHash)
            )
        } else if (spendingHash instanceof ValidatorHash) {
            return /** @type {any} */ (
                Address.fromValidatorHash(isMainnet, spendingHash, stakingHash)
            )
        } else {
            throw new Error("invalid Spending hash")
        }
    }

    /**
     * Simple payment address with an optional staking hash (`PubKeyHash` or `StakingValidatorHash`).
     * @private
     * @template {PubKeyHash | StakingValidatorHash} [TStaking=PubKeyHash | StakingValidatorHash]
     * @param {boolean} isMainnet
     * @param {PubKeyHash} paymentHash
     * @param {Option<TStaking>} stakingHash
     * @returns {(
     *   TStaking extends PubKeyHash ? Address<null, null> :
     *   TStaking extends StakingValidatorHash<infer C> ? Address<null, C> :
     *   Address<null, unknown>
     * )}
     */
    static fromPubKeyHash(isMainnet, paymentHash, stakingHash) {
        if (stakingHash) {
            if (stakingHash instanceof PubKeyHash) {
                return /** @type {any} */ (
                    new Address(
                        [isMainnet ? 0x01 : 0x00]
                            .concat(paymentHash.bytes)
                            .concat(stakingHash.bytes),
                        None,
                        None
                    )
                )
            } else if (stakingHash instanceof StakingValidatorHash) {
                return /** @type {any} */ (
                    new Address(
                        [isMainnet ? 0x21 : 0x20]
                            .concat(paymentHash.bytes)
                            .concat(stakingHash.bytes),
                        None,
                        stakingHash.context
                    )
                )
            } else {
                throw new Error("invalid Staking hash")
            }
        } else {
            return /** @type {any} */ (
                new Address(
                    [isMainnet ? 0x61 : 0x60].concat(paymentHash.bytes),
                    None,
                    None
                )
            )
        }
    }

    /**
     * @param {boolean} isMainnet
     * @param {UplcData} data
     * @returns {Address}
     */
    static fromUplcData(isMainnet, data) {
        ConstrData.assert(data, 0, 2)

        const paymentCredential = SpendingCredential.fromUplcData(
            data.fields[0]
        )
        const stakingCredentialData = ConstrData.expect(
            data.fields[1],
            "invalid StakingCredential option within Address"
        )

        /**
         * @type {Option<StakingCredential>}
         */
        let stakingCredential = None

        // for some weird reason Option::None has index 1
        if (stakingCredentialData.tag == 1) {
            stakingCredential = None
        } else if (stakingCredentialData.tag == 0) {
            stakingCredentialData.expectFields(
                1,
                "invalid StakingCredential option content within Address"
            )

            stakingCredential = StakingCredential.fromUplcData(
                stakingCredentialData.fields[0]
            )
        } else {
            throw new Error("unexpected")
        }

        return Address.fromCredentials(
            isMainnet,
            paymentCredential,
            stakingCredential
        )
    }

    /**
     * Simple script address with an optional staking hash (`PubKeyHash` or `StakingValidatorHash`).
     * @private
     * @template [CSpending=unknown]
     * @param {boolean} isMainnet
     * @param {ValidatorHash<CSpending>} spendingHash
     * @template {PubKeyHash | StakingValidatorHash} [TStaking=PubKeyHash | StakingValidatorHash]pytho
     * @param {Option<TStaking>} stakingHash
     * @returns {(
     *   TStaking extends (null | undefined | PubKeyHash) ? Address<CSpending, null> :
     *   TStaking extends StakingValidatorHash<infer CStaking> ? Address<CSpending, CStaking> :
     *   Address<CSpending, unknown>
     * )}
     */
    static fromValidatorHash(isMainnet, spendingHash, stakingHash) {
        if (isSome(stakingHash)) {
            if (stakingHash instanceof PubKeyHash) {
                return /** @type {any} */ (
                    new Address(
                        [isMainnet ? 0x11 : 0x10]
                            .concat(spendingHash.bytes)
                            .concat(stakingHash.bytes),
                        spendingHash.context,
                        null
                    )
                )
            } else if (stakingHash instanceof StakingValidatorHash) {
                return /** @type {any} */ (
                    new Address(
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
                new Address(
                    [isMainnet ? 0x71 : 0x70].concat(spendingHash.bytes),
                    spendingHash.context,
                    null
                )
            )
        }
    }

    /**
     * Used to sort txbody withdrawals.
     * @param {Address} a
     * @param {Address} b
     * @param {boolean} stakingHashesOnly
     * @return {number}
     */
    static compare(a, b, stakingHashesOnly = false) {
        if (stakingHashesOnly) {
            if (isSome(a.stakingHash) && isSome(b.stakingHash)) {
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
    static isValidBech32(str) {
        try {
            Address.fromBech32(str)
            return true
        } catch (_e) {
            return false
        }
    }

    /**
     * @type {string}
     */
    get bech32Prefix() {
        return this.isForMainnet() ? "addr" : "addr_test"
    }

    /**
     * Returns the underlying `PubKeyHash` of a simple payment address, or `null` for a script address.
     * @type {Option<PubKeyHash>}
     */
    get pubKeyHash() {
        return this.spendingCredential.pubKeyHash
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
     * @type {Option<StakingCredential<StakingHashKind, CStaking>>}
     */
    get stakingCredential() {
        return StakingCredential.fromAddressBytes(
            this.bytes,
            this.stakingContext
        )
    }

    /**
     * @type {Option<StakingHash<StakingHashKind, CStaking>>}
     */
    get stakingHash() {
        return this.stakingCredential ? this.stakingCredential.hash : None
    }

    /**
     * Returns the underlying `ValidatorHash` of a script address, or `null` for a regular payment address.
     * @type {Option<ValidatorHash<CSpending>>}
     */
    get validatorHash() {
        return this.spendingCredential.validatorHash
    }

    /**
     * @returns {Address<CSpending, CStaking>}
     */
    copy() {
        return new Address(
            this.bytes,
            this.spendingContext,
            this.stakingContext
        )
    }

    /**
     * @returns {Object}
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
        return ByteArrayData.compare(this.bytes, other.bytes) == 0
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
