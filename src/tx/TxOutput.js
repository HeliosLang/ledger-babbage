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
import { bytesToHex, makeByteStream } from "@helios-lang/codec-utils"
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
import {
    convertUplcDataToAddress,
    decodeShelleyAddress,
    makeAddress
} from "./ShelleyAddress.js"
import { TxOutputDatum } from "./TxOutputDatum.js"

/**
 * @import { BytesLike } from "@helios-lang/codec-utils"
 * @import { UplcData, UplcProgramV1I, UplcProgramV2I } from "@helios-lang/uplc"
 * @import { Address, ShelleyAddressLike } from "./ShelleyAddress.js"
 * @typedef {import("../money/index.js").ValueLike} ValueLike
 * @typedef {import("../params/index.js").NetworkParams} NetworkParams
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
     * @type {TxOutputDatum<TxOutputDatumKind> | undefined}
     */
    datum

    /**
     * @type {UplcProgramV1I | UplcProgramV2I | undefined}
     */
    refScript

    /**
     * @type {TxOutputEncodingConfig}
     */
    encodingConfig

    /**
     * Constructs a `TxOutput` instance using an `Address`, a `Value`, an optional `Datum`, and optional `UplcProgram` reference script.
     * @param {Address<CSpending, CStaking> | ShelleyAddressLike} address
     * @param {ValueLike} value
     * @param {TxOutputDatum | undefined} datum
     * @param {UplcProgramV1I | UplcProgramV2I | undefined} refScript - plutus v2 script for now
     */
    constructor(
        address,
        value,
        datum = undefined,
        refScript = undefined,
        encodingConfig = DEFAULT_TX_OUTPUT_ENCODING_CONFIG
    ) {
        this.address = /** @type {any} */ (
            typeof address != "string" &&
            "kind" in address &&
            address.kind == "Address"
                ? address
                : makeAddress(address)
        )
        this.value = Value.new(value)
        this.datum = datum
        this.refScript = refScript
        this.encodingConfig = encodingConfig
    }

    /**
     * @param {BytesLike} bytes
     * @returns {TxOutput}
     */
    static fromCbor(bytes) {
        const stream = makeByteStream({ bytes })

        if (isObject(bytes)) {
            const {
                0: address,
                1: value,
                2: datum,
                3: refScriptBytes
            } = decodeObjectIKey(stream, {
                0: decodeShelleyAddress,
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
             * @type {UplcProgramV1I | UplcProgramV2I | undefined}
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
                    return undefined
                }
            })()

            return new TxOutput(address, value, datum, refScript, {
                strictBabbage: true
            })
        } else if (isTuple(bytes)) {
            const [address, value, datumHash] = decodeTuple(
                bytes,
                [decodeShelleyAddress, Value],
                [DatumHash]
            )

            return new TxOutput(
                address,
                value,
                datumHash ? TxOutputDatum.Hash(datumHash) : undefined
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
            convertUplcDataToAddress(isMainnet, data.fields[0]),
            Value.fromUplcData(data.fields[1]),
            TxOutputDatum.fromUplcData(data.fields[2]),
            undefined, // The refScript hash isn't very useful
            encodingConfig
        )
    }

    /**
     * @param {BytesLike} bytes
     * @returns {boolean}
     */
    static isValidCbor(bytes) {
        const stream = makeByteStream({ bytes }).copy()

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
        if (this.address.era == "Byron") {
            return /** @type {any} */ (undefined)
        } else {
            return this.address.spendingContext
        }
    }

    /**
     * @type {CStaking}
     */
    get stakingContext() {
        if (this.address.era == "Byron") {
            return /** @type {any} */ (undefined)
        } else {
            return this.address.stakingContext
        }
    }

    /**
     * Deep copy of the TxInput so that Network interfaces don't allow accidental mutation of the underlying data
     * @returns {TxOutput<CSpending, CStaking>}
     */
    copy() {
        return new TxOutput(
            this.address.era == "Byron" ? this.address : this.address.copy(),
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
            address:
                this.address.era == "Byron"
                    ? this.address.toBase58()
                    : this.address.dump(),
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
        const address = this.address

        if (address.era == "Byron") {
            throw new Error("not yet implemented")
        }

        return new ConstrData(0, [
            address.toUplcData(),
            this.value.toUplcData(),
            this.datum ? this.datum.toUplcData() : new ConstrData(0, []),
            encodeOptionData(
                this.refScript
                    ? new ByteArrayData(this.refScript.hash())
                    : undefined
            )
        ])
    }

    /**
     * Each UTxO must contain some minimum quantity of lovelace to avoid that the blockchain is used for data storage.
     * @param {NetworkParams} params
     * @returns {bigint}
     */
    calcDeposit(params) {
        // TODO: also iterative calculation
        const helper = new NetworkParamsHelper(params)

        const lovelacePerByte = helper.lovelacePerUTXOByte

        const correctedSize = this.toCbor().length + 160 // 160 accounts for some database overhead?

        return BigInt(correctedSize) * BigInt(lovelacePerByte)
    }

    /**
     * Makes sure the `TxOutput` contains the minimum quantity of lovelace.
     * The network requires this to avoid the creation of unusable dust UTxOs.
     *
     * Optionally an update function can be specified that allows mutating the datum of the `TxOutput` to account for an increase of the lovelace quantity contained in the value.
     * @param {NetworkParams} params
     * @param {((output: TxOutput) => void) | undefined} updater
     */
    correctLovelace(params, updater = undefined) {
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
