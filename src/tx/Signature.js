import {
    decodeBytes,
    decodeTuple,
    encodeBytes,
    encodeTuple
} from "@helios-lang/cbor"
import {
    ByteStream,
    bytesToHex,
    dummyBytes,
    toBytes
} from "@helios-lang/codec-utils"
import { Ed25519 } from "@helios-lang/crypto"
import { PubKey } from "./PubKey.js"
import { PubKeyHash } from "../hashes/index.js"

/**
 * @typedef {import("@helios-lang/codec-utils").ByteArrayLike} ByteArrayLike
 * @typedef {import("./PubKey.js").PubKeyLike} PubKeyLike
 */

/**
 * Represents a Ed25519 signature.
 *
 * Also contains a reference to the PubKey that did the signing.
 */
export class Signature {
    /**
     * @readonly
     * @type {PubKey}
     */
    pubKey

    /**
     * @readonly
     * @type {number[]}
     */
    bytes

    /**
     * @param {PubKeyLike} pubKey
     * @param {ByteArrayLike} bytes
     */
    constructor(pubKey, bytes) {
        this.pubKey = PubKey.new(pubKey)
        this.bytes = toBytes(bytes)
    }

    /**
     * @param {number} seed
     * @returns {Signature}
     */
    static dummy(seed = 0) {
        return new Signature(PubKey.dummy(seed), dummyBytes(64, seed))
    }

    /**
     * @param {ByteArrayLike} bytes
     * @returns {Signature}
     */
    static fromCbor(bytes) {
        const stream = ByteStream.from(bytes)

        const [pubKey, signatureBytes] = decodeTuple(stream, [
            PubKey,
            decodeBytes
        ])

        return new Signature(pubKey, signatureBytes)
    }

    /**
     * @type {PubKeyHash}
     */
    get pubKeyHash() {
        return this.pubKey.toHash()
    }

    /**
     * Diagnostic representation
     * @returns {Object}
     */
    dump() {
        return {
            pubKey: this.pubKey.dump,
            pubKeyHash: this.pubKeyHash.dump(),
            signature: bytesToHex(this.bytes)
        }
    }

    /**
     * @returns {boolean}
     */
    isDummy() {
        return this.pubKey.isDummy() && this.bytes.every((b) => b == 0)
    }

    /**
     * @returns {number[]}
     */
    toCbor() {
        return encodeTuple([this.pubKey.toCbor(), encodeBytes(this.bytes)])
    }

    /**
     * Throws error if incorrect
     * @param {number[]} msg
     * @returns {void}
     */
    verify(msg) {
        if (this.bytes === null) {
            throw new Error("signature can't be null")
        } else {
            if (this.pubKey === null) {
                throw new Error("pubKey can't be null")
            } else {
                if (!Ed25519.verify(this.bytes, msg, this.pubKey.bytes)) {
                    throw new Error("incorrect signature")
                }
            }
        }
    }
}
