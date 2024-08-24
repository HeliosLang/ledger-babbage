import {
    decodeBytes,
    decodeObjectIKey,
    decodeTag,
    decodeTagged,
    decodeTuple,
    encodeBytes,
    encodeInt,
    encodeObjectIKey,
    encodeTag,
    encodeTuple,
    isObject,
    isTuple
} from "@helios-lang/cbor"
import { ByteStream, bytesToHex } from "@helios-lang/codec-utils"
import { None } from "@helios-lang/type-utils"
import {
    ByteArrayData,
    ConstrData,
    encodeOptionData,
    UplcProgramV1,
    UplcProgramV2
} from "@helios-lang/uplc"
import { DatumHash } from "../hashes/index.js"
import { Value } from "../money/index.js"
import { NetworkParamsHelper } from "../params/index.js"
import { Address } from "./Address.js"
import { TxOutputDatum } from "./TxOutputDatum.js"

/**
 * @typedef {import("@helios-lang/codec-utils").ByteArrayLike} ByteArrayLike
 * @typedef {import("@helios-lang/uplc").UplcData} UplcData
 * @typedef {import("../money/index.js").ValueLike} ValueLike
 * @typedef {import("../params/index.js").NetworkParamsLike} NetworkParamsLike
 * @typedef {import("./Address.js").AddressLike} AddressLike
 * @typedef {import("./TxOutputDatum.js").TxOutputDatumKind} TxOutputDatumKind

/**
 * Sadly the cbor encoding can be done in a variety of ways, for which a config must be passed around `toCbor()` calls
 *   - strictBabbage: if true -> slighly more verbose TxOutput encoding
 * @typedef {{
 *   strictBabbage?: boolean
 * }} TxOutputEncodingConfig
 */

/**
 * @type {TxOutputEncodingConfig}
 */
export const DEFAULT_TX_OUTPUT_ENCODING_CONFIG = {
    strictBabbage: true
}

/**
 * Represents a transaction output that is used when building a transaction.
 * @template [CSpending=unknown]
 * @template [CStaking=unknown]
 */
export class TxOutput {
    /**
     * Mutation is useful when correcting the quantity of lovelace in a utxo
     * @type {Address<CSpending, CStaking>}
     */
    address

    /**
     * Mutation is handy when correcting the quantity of lovelace in a utxo
     * @type {Value}
     */
    value

    /**
     * Mutation is handy when correctin the quantity of lovelace in a utxo
     * @type {Option<TxOutputDatum<TxOutputDatumKind>>}
     */
    datum

    /**
     * @type {Option<UplcProgramV1 | UplcProgramV2>}
     */
    refScript

    /**
     * @type {TxOutputEncodingConfig}
     */
    encodingConfig

    /**
     * Constructs a `TxOutput` instance using an `Address`, a `Value`, an optional `Datum`, and optional `UplcProgram` reference script.
     * @param {Address<CSpending, CStaking> | AddressLike} address
     * @param {ValueLike} value
     * @param {Option<TxOutputDatum>} datum
     * @param {Option<UplcProgramV1 | UplcProgramV2>} refScript - plutus v2 script for now
     */
    constructor(
        address,
        value,
        datum = None,
        refScript = None,
        encodingConfig = DEFAULT_TX_OUTPUT_ENCODING_CONFIG
    ) {
        this.address =
            address instanceof Address ? address : Address.new(address)
        this.value = Value.new(value)
        this.datum = datum
        this.refScript = refScript
        this.encodingConfig = encodingConfig
    }

    /**
     * @param {ByteArrayLike} bytes
     * @returns {TxOutput}
     */
    static fromCbor(bytes) {
        const stream = ByteStream.from(bytes)

        if (isObject(bytes)) {
            const {
                0: address,
                1: value,
                2: datum,
                3: refScriptBytes
            } = decodeObjectIKey(stream, {
                0: Address,
                1: Value,
                2: TxOutputDatum,
                3: (stream) => {
                    if (decodeTag(stream) != 24n) {
                        throw new Error("unexpected reference script tag")
                    }

                    return decodeBytes(stream)
                }
            })

            if (!address || !value) {
                throw new Error("unexpected TxOutput encoding")
            }

            /**
             * @type {Option<UplcProgramV1 | UplcProgramV2>}
             */
            const refScript = (() => {
                if (refScriptBytes) {
                    const [scriptType, decodeScript] =
                        decodeTagged(refScriptBytes)

                    switch (scriptType) {
                        case 0:
                            throw new Error("native refScript not handled")
                        case 1:
                            return decodeScript(UplcProgramV1)
                        case 2:
                            return decodeScript(UplcProgramV2)
                        default:
                            throw new Error(
                                `unhandled scriptType ${scriptType}`
                            )
                    }
                } else {
                    return None
                }
            })()

            return new TxOutput(address, value, datum, refScript, {
                strictBabbage: true
            })
        } else if (isTuple(bytes)) {
            const [address, value, datumHash] = decodeTuple(
                bytes,
                [Address, Value],
                [DatumHash]
            )

            return new TxOutput(
                address,
                value,
                datumHash ? TxOutputDatum.Hash(datumHash) : None
            )
        } else {
            throw new Error("unexpected TxOutput encoding")
        }
    }

    /**
     * @param {boolean} isMainnet
     * @param {UplcData} data
     * @param {TxOutputEncodingConfig} encodingConfig
     * @returns {TxOutput}
     */
    static fromUplcData(
        isMainnet,
        data,
        encodingConfig = DEFAULT_TX_OUTPUT_ENCODING_CONFIG
    ) {
        ConstrData.assert(data, 0, 4)

        return new TxOutput(
            Address.fromUplcData(isMainnet, data.fields[0]),
            Value.fromUplcData(data.fields[1]),
            TxOutputDatum.fromUplcData(data.fields[2]),
            None, // The refScript hash isn't very useful
            encodingConfig
        )
    }

    /**
     * @param {ByteArrayLike} bytes
     * @returns {boolean}
     */
    static isValidCbor(bytes) {
        const stream = ByteStream.from(bytes).copy()

        try {
            TxOutput.fromCbor(stream)
            return true
        } catch (_e) {
            return false
        }
    }

    /**
     * @type {CSpending}
     */
    get spendingContext() {
        return this.address.spendingContext
    }

    /**
     * @type {CStaking}
     */
    get stakingContext() {
        return this.address.stakingContext
    }

    /**
     * Deep copy of the TxInput so that Network interfaces don't allow accidental mutation of the underlying data
     * @returns {TxOutput<CSpending, CStaking>}
     */
    copy() {
        return new TxOutput(
            this.address.copy(),
            this.value.copy(),
            this.datum?.copy(),
            this.refScript,
            this.encodingConfig
        )
    }

    /**
     * @returns {Object}
     */
    dump() {
        return {
            address: this.address.dump(),
            value: this.value.dump(),
            datum: this.datum ? this.datum.dump() : null,
            refScript: this.refScript
                ? bytesToHex(this.refScript.toCbor())
                : null
        }
    }

    /**
     * @returns {number[]}
     */
    toCbor() {
        if (
            (!this.datum || this.datum.isHash()) &&
            !this.refScript &&
            !this.encodingConfig.strictBabbage
        ) {
            // this is needed to match eternl wallet (de)serialization (annoyingly eternl deserializes the tx and then signs its own serialization)
            // hopefully cardano-cli signs whatever serialization we choose (so we use the eternl variant in order to be compatible with both)

            const fields = [this.address.toCbor(), this.value.toCbor()]

            if (this.datum && this.datum.isHash()) {
                fields.push(this.datum.hash.toCbor())
            }

            return encodeTuple(fields)
        } else {
            /**
             * @type {Map<number, number[]>}
             */
            const object = new Map()

            object.set(0, this.address.toCbor())
            object.set(1, this.value.toCbor())

            if (this.datum) {
                object.set(2, this.datum.toCbor())
            }

            if (this.refScript) {
                object.set(
                    3,
                    encodeTag(24n).concat(
                        encodeBytes(
                            encodeTuple([
                                encodeInt(
                                    BigInt(this.refScript.plutusVersionTag)
                                ),
                                this.refScript.toCbor()
                            ])
                        )
                    )
                )
            }

            return encodeObjectIKey(object)
        }
    }

    /**
     * @returns {ConstrData}
     */
    toUplcData() {
        return new ConstrData(0, [
            this.address.toUplcData(),
            this.value.toUplcData(),
            this.datum ? this.datum.toUplcData() : new ConstrData(0, []),
            encodeOptionData(
                this.refScript ? new ByteArrayData(this.refScript.hash()) : None
            )
        ])
    }

    /**
     * Each UTxO must contain some minimum quantity of lovelace to avoid that the blockchain is used for data storage.
     * @param {NetworkParamsLike} params
     * @returns {bigint}
     */
    calcDeposit(params) {
        const helper = NetworkParamsHelper.new(params)

        const lovelacePerByte = helper.lovelacePerUTXOByte

        const correctedSize = this.toCbor().length + 160 // 160 accounts for some database overhead?

        return BigInt(correctedSize) * BigInt(lovelacePerByte)
    }

    /**
     * Makes sure the `TxOutput` contains the minimum quantity of lovelace.
     * The network requires this to avoid the creation of unusable dust UTxOs.
     *
     * Optionally an update function can be specified that allows mutating the datum of the `TxOutput` to account for an increase of the lovelace quantity contained in the value.
     * @param {NetworkParamsHelper} params
     * @param {Option<(output: TxOutput) => void>} updater
     */
    correctLovelace(params, updater = null) {
        const helper = NetworkParamsHelper.new(params)

        let minLovelace = this.calcDeposit(params)

        while (this.value.lovelace < minLovelace) {
            this.value.lovelace = minLovelace

            if (updater != null) {
                updater(this)
            }

            minLovelace = this.calcDeposit(params)
        }
    }
}
