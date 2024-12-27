import { ScriptHash as ScriptHashAllegra } from "@helios-lang/ledger-allegra"
import { compareBytes, dummyBytes, equalsBytes } from "@helios-lang/codec-utils"

/**
 * @import { BytesLike } from "@helios-lang/codec-utils"
 * @typedef {import("@helios-lang/ledger-allegra").ScriptHashLike} ScriptHashLike
 * @typedef {import("./Hash.js").Hash} Hash
 */

/**
 * @template [C=unknown]
 * @implements {Hash}
 */
export class ScriptHash extends ScriptHashAllegra {
    /**
     * @readonly
     * @type {C}
     */
    context

    /**
     * @param {BytesLike} bytes
     * @param {C | undefined} context
     */
    constructor(bytes, context = undefined) {
        super(bytes)

        if (context !== undefined) {
            this.context = context
        }
    }

    /**
     * @param {ScriptHash} a
     * @param {ScriptHash} b
     * @returns {number}
     */
    static compare(a, b) {
        return compareBytes(a.bytes, b.bytes)
    }

    /**
     * @param {number} seed
     * @returns {ScriptHash}
     */
    static dummy(seed = 0) {
        return new ScriptHash(dummyBytes(28, seed), undefined)
    }

    /**
     * @param {ScriptHash} other
     * @returns {boolean}
     */
    isEqual(other) {
        return equalsBytes(this.bytes, other.bytes)
    }
}
