import {
    decodeBytes,
    decodeString,
    decodeTuple,
    encodeBytes,
    encodeString,
    encodeTuple
} from "@helios-lang/cbor"
import { ByteStream } from "@helios-lang/codec-utils"
import { blake2b } from "@helios-lang/crypto"

/**
 * @typedef {import("@helios-lang/codec-utils").BytesLike} BytesLike
 */

/**
 * TODO: figure out what exactly the hash field is
 */
export class PoolMetadata {
    /**
     * @param {string} url
     */
    constructor(url) {
        this.url = url
    }

    /**
     *
     * @param {BytesLike} bytes
     */
    static fromCbor(bytes) {
        const stream = ByteStream.from(bytes)

        const [url, hash] = decodeTuple(stream, [decodeString, decodeBytes])

        // TODO: take into account the hash. Should this be the hash of the TxMetadata instead?
        return new PoolMetadata(url)
    }

    toCbor() {
        const urlBytes = encodeString(this.url)
        const hash = blake2b(urlBytes) // TODO: why? is this correct?

        return encodeTuple([urlBytes, encodeBytes(hash)])
    }
}
