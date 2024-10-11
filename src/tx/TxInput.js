import {
    decodeTuple,
    decodeTupleLazy,
    encodeTuple,
    isBytes,
    isTuple
} from "@helios-lang/cbor"
import { ByteStream } from "@helios-lang/codec-utils"
import { None } from "@helios-lang/type-utils"
import { ConstrData } from "@helios-lang/uplc"
import { Value } from "../money/Value.js"
import { Address } from "./Address.js"
import { TxOutput } from "./TxOutput.js"
import { TxOutputDatum } from "./TxOutputDatum.js"
import { TxOutputId } from "./TxOutputId.js"

/**
 * @typedef {import("@helios-lang/codec-utils").BytesLike} BytesLike
 * @typedef {import("@helios-lang/uplc").UplcData} UplcData
 * @typedef {import("@helios-lang/uplc").UplcProgramV1I} UplcProgramV1I
 * @typedef {import("@helios-lang/uplc").UplcProgramV2I} UplcProgramV2I
 * @typedef {import("./TxOutputDatum.js").TxOutputDatumKind} TxOutputDatumKind
 * @typedef {import("./TxOutputId.js").TxOutputIdLike} TxOutputIdLike
 */

/**
 * @template TStrict
 * @template TPermissive
 * @typedef {import("../hashes/Cast.js").Cast<TStrict, TPermissive>} Cast
 */

/**
 * @template TDatum
 * @template TRedeemer
 * @typedef {{
 *   program: UplcProgramV1I | UplcProgramV2I
 *   datum: Cast<TDatum, any>
 *   redeemer: Cast<any, TRedeemer>
 * }} TxInputContext
 */

/**
 * TxInput represents UTxOs that are available for spending
 * @template [CSpending=unknown]
 * @template [CStaking=unknown]
 */
export class TxInput {
    /**
     * @readonly
     * @type {TxOutputId}
     */
    id

    /**
     * Can be mutated in order to recover
     * @private
     * @type {Option<TxOutput>}
     */
    _output

    /**
     * @param {TxOutputIdLike} outputId
     * @param {Option<TxOutput<CSpending, CStaking>>} output - used during building/emulation, not part of serialization
     */
    constructor(outputId, output = None) {
        this.id = TxOutputId.new(outputId)
        this._output = output
    }

    /**
     * Decodes either the ledger representation of full representation of a TxInput
     * @param {BytesLike} bytes
     * @returns {TxInput}
     */
    static fromCbor(bytes) {
        const stream = ByteStream.from(bytes)

        if (decodeTupleLazy(stream.copy())(isBytes)) {
            // first element in tuple is a bytearray -> ledger representation (i.e. just a reference)
            const id = TxOutputId.fromCbor(stream) // [bytes, int]

            return new TxInput(id)
        } else if (decodeTupleLazy(stream.copy())(isTuple)) {
            // first element in tuple is another tuple -> full representation (i.e. as used in ScriptContext)

            // [[bytes,int], [...] | {...}]

            const [id, output] = decodeTuple(stream, [TxOutputId, TxOutput])

            return new TxInput(id, output)
        } else {
            throw new Error("unhandled TxInput encoding")
        }
    }

    /**
     * Full representation (as used in ScriptContext)
     * @param {boolean} isMainnet
     * @param {UplcData} data
     * @returns {TxInput}
     */
    static fromUplcData(isMainnet, data) {
        ConstrData.assert(data, 0, 2)

        return new TxInput(
            TxOutputId.fromUplcData(data.fields[0]),
            TxOutput.fromUplcData(isMainnet, data.fields[1])
        )
    }

    /**
     * Used by TxBodyBuilder.addInput and TxBodyBuilder.addRefInput
     * @param {TxInput[]} list
     * @param {TxInput} input
     * @param {boolean} checkUniqueness
     */
    static append(list, input, checkUniqueness = true) {
        const output = input._output

        if (!output) {
            throw new Error(
                "TxInput.output must be set when building a transaction"
            )
        }

        output.value.assertAllPositive()

        if (
            checkUniqueness &&
            list.some((prevInput) => prevInput.isEqual(input))
        ) {
            throw new Error("input already added before")
        }

        list.push(input)
        list.sort(TxInput.compare)
    }

    /**
     * Tx inputs must be ordered.
     * The following function can be used directly by a js array sort
     * @param {TxInput} a
     * @param {TxInput} b
     * @returns {number}
     */
    static compare(a, b) {
        return TxOutputId.compare(a.id, b.id)
    }

    /**
     * @overload
     * @param {boolean} expectFull
     * @returns {(bytes: BytesLike) => boolean}
     *
     * @overload
     * @param {BytesLike} bytes
     * @param {boolean} expectFull
     * @returns {boolean}
     *
     * @param {[boolean] | [BytesLike, boolean]} args
     */
    static isValidCbor(...args) {
        if (args.length == 1) {
            const [expectFull] = args

            /**
             * @type {(bytes: BytesLike) => boolean}
             */
            return (bytes) => {
                return TxInput.isValidCbor(bytes, expectFull)
            }
        } else {
            const [bytes, expectFull] = args

            const stream = ByteStream.from(bytes).copy()

            try {
                const input = TxInput.fromCbor(stream)
                if (expectFull) {
                    input.output
                }
                return true
            } catch (_e) {
                return false
            }
        }
    }

    /**
     * @param {TxInput[]} inputs
     * @returns {Value}
     */
    static sumValues(inputs) {
        return inputs.reduce(
            (prev, input) => prev.add(input.value),
            new Value()
        )
    }

    /**
     * Shortcut
     * @type {Address<CSpending, CStaking>}
     */
    get address() {
        return this.output.address
    }

    /**
     * Shortcut
     * @type {Option<TxOutputDatum<TxOutputDatumKind>>}
     */
    get datum() {
        return this.output.datum
    }

    /**
     * Throws an error if the TxInput hasn't been recovered
     * @returns {TxOutput<CSpending, CStaking>}
     */
    get output() {
        if (this._output) {
            return this._output
        } else {
            throw new Error("TxInput original output not synced")
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
     * Shortcut
     * @type {Value}
     */
    get value() {
        return this.output.value
    }

    /**
     * The output itself isn't stored in the ledger, so must be recovered after deserializing blocks/transactions
     * @param {{getUtxo(id: TxOutputId): Promise<TxInput>}} network
     */
    async recover(network) {
        if (!this._output) {
            this._output = (await network.getUtxo(this.id)).output
        }
    }

    /**
     * Deep copy of the TxInput so that Network interfaces don't allow accidental mutation of the underlying data
     * @returns {TxInput<CSpending, CStaking>}
     */
    copy() {
        return new TxInput(this.id, this._output?.copy())
    }

    /**
     * @returns {Object}
     */
    dump() {
        return {
            outputId: this.id.toString(),
            output: this._output ? this._output.dump() : null
        }
    }

    /**
     * @param {TxInput} other
     * @returns {boolean}
     */
    isEqual(other) {
        return other.id.isEqual(this.id)
    }

    /**
     * Ledger format is without original output (so full = false)
     * full = true is however useful for complete deserialization of the TxInput (and then eg. using it in off-chain applications)
     * @param {boolean} full
     * @returns {number[]}
     */
    toCbor(full = false) {
        if (full) {
            return encodeTuple([this.id.toCbor(), this.output.toCbor()])
        } else {
            return this.id.toCbor()
        }
    }

    /**
     * full representation (as used in ScriptContext)
     * @returns {ConstrData}
     */
    toUplcData() {
        if (this._output) {
            return new ConstrData(0, [
                this.id.toUplcData(),
                this._output.toUplcData()
            ])
        } else {
            throw new Error("TxInput original output not synced")
        }
    }
}
