import {
    decodeInt,
    decodeList,
    decodeMap,
    decodeString,
    encodeDefList,
    encodeInt,
    encodeMap,
    encodeString,
    isList,
    isMap,
    isString
} from "@helios-lang/cbor"
import { ByteStream } from "@helios-lang/codec-utils"

/**
 * @typedef {import("@helios-lang/codec-utils").ByteArrayLike} ByteArrayLike
 */

/**
 * TxMetadataAttr is a simple JSON schema object
 * @typedef {string | number | {
 *   list: TxMetadataAttr[]
 * } | {
 *   map: [TxMetadataAttr, TxMetadataAttr][]
 * }} TxMetadataAttr
 */

/**
 * @param {ByteArrayLike} bytes
 * @returns {TxMetadataAttr}
 */
export function decodeMetadataAttr(bytes) {
    const stream = ByteStream.from(bytes)

    if (isString(stream)) {
        return decodeString(stream)
    } else if (isList(stream)) {
        return { list: decodeList(stream, decodeMetadataAttr) }
    } else if (isMap(stream)) {
        return {
            map: decodeMap(stream, decodeMetadataAttr, decodeMetadataAttr)
        }
    } else {
        return Number(decodeInt(stream))
    }
}

/**
 * @param {TxMetadataAttr} attr
 * @returns {number[]}
 */
export function encodeMetadataAttr(attr) {
    if (typeof attr === "string") {
        return encodeString(attr, true)
    } else if (typeof attr === "number") {
        if (attr % 1.0 != 0.0) {
            throw new Error("not a whole number")
        }

        return encodeInt(attr)
    } else if ("list" in attr) {
        return encodeDefList(attr.list.map((item) => encodeMetadataAttr(item)))
    } else if (
        attr instanceof Object &&
        "map" in attr &&
        Object.keys(attr).length == 1
    ) {
        const pairs = attr["map"]

        if (Array.isArray(pairs)) {
            return encodeMap(
                pairs.map((pair) => {
                    if (Array.isArray(pair) && pair.length == 2) {
                        return [
                            encodeMetadataAttr(pair[0]),
                            encodeMetadataAttr(pair[1])
                        ]
                    } else {
                        throw new Error("invalid metadata schema")
                    }
                })
            )
        } else {
            throw new Error("invalid metadata schema")
        }
    } else {
        throw new Error("invalid metadata schema")
    }
}
