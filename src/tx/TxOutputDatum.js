import {
    decodeBytes,
    decodeTag,
    decodeTagged,
    encodeBytes,
    encodeInt,
    encodeTag,
    encodeTuple
} from "@helios-lang/cbor"
import { bytesToHex } from "@helios-lang/codec-utils"
import { blake2b } from "@helios-lang/crypto"
import { None } from "@helios-lang/type-utils"
import { ConstrData, decodeUplcData } from "@helios-lang/uplc"
import { DatumHash } from "../hashes/index.js"

/**
 * @typedef {import("@helios-lang/codec-utils").ByteArrayLike} ByteArrayLike
 * @typedef {import("@helios-lang/uplc").UplcData} UplcData
 */

/**
 * @template TStrict
 * @template TPermissive
 * @typedef {import("../hashes/Cast.js").Cast<TStrict, TPermissive>} Cast
 */

/**
 * @typedef {Option<TxOutputDatum> | DatumHash | UplcData} TxOutputDatumLike
 */

/**
 * @template T
 * @typedef {{hash: T} | {inline: T}} TxOutputDatumCastable
 */

/**
 * @typedef {"Hash" | "Inline"} TxOutputDatumKind
 */

/**
 * @template {TxOutputDatumKind} T
 * @typedef {T extends "Inline" ? {
 *   data: UplcData
 * } : {
 *   hash: DatumHash
 *   data?: UplcData
 * }} TxOutputDatumProps
 */

/**
 * On-chain the TxOutputDatum has 3 variants (`none`, `hash` and `inline`), off-chain it is more convenient to treat it as an Option of two variants
 * @template {TxOutputDatumKind} [T=TxOutputDatumKind]
 */
export class TxOutputDatum {
    /**
     * @private
     * @readonly
     * @type {T}
     */
    kind

    /**
     * @private
     * @readonly
     * @type {TxOutputDatumProps<T>}
     */
    props

    /**
     * @private
     * @param {T} kind
     * @param {TxOutputDatumProps<T>} props
     */
    constructor(kind, props) {
        this.kind = kind
        this.props = props
    }

    /**
     * @overload
     * @param {DatumHash} hash
     * @returns {TxOutputDatum<"Hash">}
     */

    /**
     * @overload
     * @param {UplcData} data
     * @returns {TxOutputDatum<"Hash">}
     */

    /**
     * @param {DatumHash | UplcData} arg
     * @returns {TxOutputDatum<"Hash">}
     */
    static Hash(arg) {
        if (arg instanceof DatumHash) {
            return new TxOutputDatum("Hash", { hash: arg })
        } else {
            return new TxOutputDatum("Hash", {
                data: arg,
                hash: new DatumHash(blake2b(arg.toCbor()))
            })
        }
    }

    /**
     * @param {UplcData} data
     * @returns {TxOutputDatum<"Inline">}
     */
    static Inline(data) {
        return new TxOutputDatum("Inline", { data: data })
    }

    /**
     * @type {typeof None}
     */
    static get None() {
        return None
    }

    /**
     * @param {TxOutputDatumLike} arg
     * @returns {Option<TxOutputDatum>}
     */
    static new(arg) {
        if (arg instanceof TxOutputDatum) {
            return arg
        } else if (arg instanceof DatumHash) {
            return TxOutputDatum.Hash(arg)
        } else if (arg === null || arg === undefined) {
            return None
        } else {
            return TxOutputDatum.Inline(arg)
        }
    }

    /**
     * @template T
     * @template {TxOutputDatumCastable<T>} D
     * @param {D} data
     * @param {Cast<any, T>} cast
     * @returns {D extends {hash: T} ? TxOutputDatum<"Hash"> : TxOutputDatum<"Inline">}
     */
    static fromCast(data, cast) {
        return /** @type {any} */ (
            "hash" in data
                ? TxOutputDatum.Hash(cast.toUplcData(data.hash))
                : TxOutputDatum.Inline(cast.toUplcData(data.inline))
        )
    }

    /**
     * @param {ByteArrayLike} bytes
     * @returns {TxOutputDatum}
     */
    static fromCbor(bytes) {
        const [type, decodeItem] = decodeTagged(bytes)

        switch (type) {
            case 0:
                return TxOutputDatum.Hash(decodeItem(DatumHash))
            case 1:
                return TxOutputDatum.Inline(
                    decodeItem((bytes) => {
                        const tag = decodeTag(bytes)
                        if (tag != 24n) {
                            throw new Error(`expected 24 as tag, got ${tag}`)
                        }

                        return decodeUplcData(decodeBytes(bytes))
                    })
                )
            default:
                throw new Error(`unhandled TxOutputDatum type ${type}`)
        }
    }

    /**
     * @param {UplcData} data
     * @returns {Option<TxOutputDatum>}
     */
    static fromUplcData(data) {
        const { tag, fields } = ConstrData.expect(data)

        switch (tag) {
            case 0:
                if (fields.length != 0) {
                    throw new Error(
                        `expected 0 fields for TxOutputDatum::None ConstrData, got ${fields.length} fields`
                    )
                }

                return None
            case 1:
                if (fields.length != 1) {
                    throw new Error(
                        `expected 1 field for TxOutputDatum::Hash ConstrData, got ${fields.length} fields`
                    )
                }

                return TxOutputDatum.Hash(DatumHash.fromUplcData(fields[0]))
            case 2:
                if (fields.length != 1) {
                    throw new Error(
                        `expected 1 field for TxOutputDatum::Inline ConstrData, got ${fields.length} fields`
                    )
                }

                return TxOutputDatum.Inline(fields[0])
            default:
                throw new Error(
                    `expected 0, 1 or 2 TxOutputDatum ConstrData tag, got ${tag}`
                )
        }
    }

    /**
     * @type {UplcData}
     */
    get data() {
        if (this.isHash()) {
            const data = this.props.data

            if (!data) {
                throw new Error(
                    "data not set for TxOutDatum.Hash (hint: recover)"
                )
            }

            return data
        } else if (this.isInline()) {
            return this.props.data
        } else {
            throw new Error(`unhandled TxOutputDatum kind ${this.kind}`)
        }
    }

    /**
     * @type {DatumHash}
     */
    get hash() {
        if (this.isHash()) {
            return this.props.hash
        } else if (this.isInline()) {
            return DatumHash.hashUplcData(this.props.data)
        } else {
            throw new Error(`unhandled TxOutputDatum kind ${this.kind}`)
        }
    }

    /**
     * @returns {TxOutputDatum<T>}
     */
    copy() {
        return new TxOutputDatum(this.kind, this.props)
    }

    /**
     * @returns {this is TxOutputDatum<"Hash">}
     */
    isHash() {
        return this.kind == "Hash"
    }

    /**
     * @returns {this is TxOutputDatum<"Inline">}
     */
    isInline() {
        return this.kind == "Inline"
    }

    /**
     * @returns {Object}
     */
    dump() {
        if (this.isHash()) {
            const props = this.props

            return {
                hash: props.hash.dump(),
                cbor: props?.data ? bytesToHex(props.data.toCbor()) : null,
                schema: props?.data
                    ? JSON.parse(props.data.toSchemaJson())
                    : null
            }
        } else if (this.isInline()) {
            const props = this.props

            return {
                inlineCbor: bytesToHex(props.data.toCbor()),
                inlineSchema: JSON.parse(props.data.toSchemaJson())
            }
        } else {
            throw new Error(`unhandled TxOutputDatum kind ${this.kind}`)
        }
    }

    /**
     * @returns {number[]}
     */
    toCbor() {
        if (this.isHash()) {
            return encodeTuple([encodeInt(0n), this.props.hash.toCbor()])
        } else if (this.isInline()) {
            return encodeTuple([
                encodeInt(1n),
                encodeTag(24n).concat(encodeBytes(this.props.data.toCbor()))
            ])
        } else {
            throw new Error(`unhandled TxOutputDatum kind ${this.kind}`)
        }
    }

    /**
     * Used by script context emulation
     * @returns {ConstrData}
     */
    toUplcData() {
        if (this.isHash()) {
            return new ConstrData(1, [this.props.hash.toUplcData()])
        } else if (this.isInline()) {
            return new ConstrData(2, [this.props.data])
        } else {
            throw new Error(`unhandled TxOutputDatum kind ${this.kind}`)
        }
    }
}
