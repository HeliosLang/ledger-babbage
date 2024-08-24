import { AssetClass } from "./AssetClass.js"
import { Assets } from "./Assets.js"
import { Value } from "./Value.js"

/**
 * @typedef {import("@helios-lang/codec-utils").IntLike} IntLike
 */

/**
 * Single asset class value (quantity can be more than 1)
 * For this special case we can preserve the context
 * @template [C=unknown]
 */
export class TokenValue extends Value {
    /**
     * @readonly
     * @type {AssetClass<C>}
     */
    assetClass

    /**
     * @readonly
     * @type {bigint}
     */
    quantity

    /**
     * @readonly
     * @type {C}
     */
    context

    /**
     * @param {AssetClass<C>} assetClass
     * @param {IntLike} qty
     */
    constructor(assetClass, qty) {
        super(0, Assets.fromAssetClasses([[assetClass, qty]]))

        this.assetClass = assetClass
        this.quantity = BigInt(qty)

        if (assetClass.context) {
            this.context = assetClass.context
        }
    }

    /**
     * Multiplies a `TokenValue` by a whole number.
     * @param {IntLike} scalar
     * @returns {TokenValue<C>}
     */
    multiply(scalar) {
        const lovelace = this.lovelace // might've been mutated
        const s = BigInt(scalar)
        const t = new TokenValue(this.assetClass, this.quantity * s)

        if (lovelace != 0n) {
            t.lovelace = lovelace * s
        }

        return t
    }
}
