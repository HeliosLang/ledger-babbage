import { isSome } from "@helios-lang/type-utils"
import { ScriptHash as ScriptHashAllegra } from "@helios-lang/ledger-allegra"
import { compareBytes, equalsBytes } from "@helios-lang/codec-utils"

/**
 * @typedef {import("@helios-lang/codec-utils").ByteArrayLike} ByteArrayLike
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
     * @param {ByteArrayLike} bytes
     * @param {Option<C>} context
     */
    constructor(bytes, context) {
        super(bytes)

        if (isSome(context)) {
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
     * @param {ScriptHash} other
     * @returns {boolean}
     */
    isEqual(other) {
        return equalsBytes(this.bytes, other.bytes)
    }
}
