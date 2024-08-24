import { decodeInt, decodeMap, encodeInt, encodeMap } from "@helios-lang/cbor"
import { blake2b } from "@helios-lang/crypto"
import { decodeMetadataAttr, encodeMetadataAttr } from "./TxMetadataAttr.js"

/**
 * @typedef {import("@helios-lang/codec-utils").ByteArrayLike} ByteArrayLike
 * @typedef {import("./TxMetadataAttr.js").TxMetadataAttr} TxMetadataAttr
 */

export class TxMetadata {
    /**
     * @readonly
     * @type {{[key: number]: TxMetadataAttr}}
     */
    attributes

    /**
     * @param {{[key: number]: TxMetadataAttr}} attributes
     */
    constructor(attributes) {
        this.attributes = attributes
    }

    /**
     * Decodes a TxMetadata instance from Cbor
     * @param {ByteArrayLike} bytes
     * @returns {TxMetadata}
     */
    static fromCbor(bytes) {
        const attributes = Object.fromEntries(
            decodeMap(bytes, (s) => Number(decodeInt(s)), decodeMetadataAttr)
        )
        return new TxMetadata(attributes)
    }

    /**
     * @type {number[]}
     */
    get keys() {
        return Object.keys(this.attributes)
            .map((key) => parseInt(key))
            .sort()
    }

    /**
     * @returns {Object}
     */
    dump() {
        let obj = {}

        for (let key of this.keys) {
            obj[key] = this.attributes[key]
        }

        return obj
    }

    /**
     * @returns {number[]}
     */
    hash() {
        return blake2b(this.toCbor())
    }

    /**
     * Sorts the keys before serializing
     * @returns {number[]}
     */
    toCbor() {
        return encodeMap(
            this.keys.map((key) => [
                encodeInt(BigInt(key)),
                encodeMetadataAttr(this.attributes[key])
            ])
        )
    }
}
