import {
    decodeInt,
    decodeTuple,
    encodeInt,
    encodeTuple,
    isTuple
} from "@helios-lang/cbor"
import { ByteStream } from "@helios-lang/codec-utils"
import {
    ByteArrayData,
    IntData,
    MapData,
    decodeUplcData
} from "@helios-lang/uplc"
import { MintingPolicyHash } from "../hashes/MintingPolicyHash.js"
import { handleAssetClassArgsWithQty, AssetClass } from "./AssetClass.js"
import { Assets } from "./Assets.js"

/**
 * @typedef {import("@helios-lang/codec-utils").BytesLike} BytesLike
 * @typedef {import("@helios-lang/codec-utils").IntLike} IntLike
 * @typedef {import("@helios-lang/uplc").UplcData} UplcData
 * @typedef {import("./Assets.js").AssetsLike} AssetsLike
 * @typedef {import("./AssetClass.js").AssetClassLike} AssetClassLike
 * @typedef {import("../hashes/MintingPolicyHash.js").MintingPolicyHashLike} MintingPolicyHashLike
 */

/**
 * @typedef {Value | IntLike | [IntLike, AssetsLike] | {lovelace: IntLike, assets?: AssetsLike}} ValueLike
 */

/**
 * Represents a collection of tokens.
 */
export class Value {
    /**
     * Mutatable which is useful in case of tx balancing
     * @type {bigint}
     */
    lovelace

    /**
     * @type {Assets}
     */
    assets

    /**
     * @param {IntLike} lovelace
     * @param {AssetsLike} assets
     */
    constructor(lovelace = 0n, assets = []) {
        this.lovelace = BigInt(lovelace)
        this.assets = Assets.new(assets)
    }

    /**
     * @param {ValueLike} arg
     * @returns {Value}
     */
    static new(arg) {
        if (arg instanceof Value) {
            return arg.copy()
        } else if (typeof arg == "bigint" || typeof arg == "number") {
            return new Value(arg, [])
        } else if (Array.isArray(arg)) {
            return new Value(arg[0], arg[1])
        } else if (typeof arg == "object" && "lovelace" in arg) {
            return new Value(arg.lovelace, arg?.assets ?? [])
        } else {
            throw new Error(
                `unhandled Value.new argument ${JSON.stringify(arg)}`
            )
        }
    }

    /**
     * @overload
     * @param {AssetClassLike} assetClass
     * @param {IntLike} qty
     */

    /**
     * @overload
     * @param {MintingPolicyHashLike} mph
     * @param {BytesLike} tokenName
     * @param {IntLike} qty
     */

    /**
     * TODO: should this be moved into Assets?
     * @param {[AssetClassLike, IntLike] | [MintingPolicyHashLike, BytesLike, IntLike]} args
     * @returns {Value}
     */
    static fromAsset(...args) {
        const [mph, tokenName, qty] = handleAssetClassArgsWithQty(...args)

        return new Value(0n, new Assets([[mph, [[tokenName, qty]]]]))
    }

    /**
     * Blockfrost has a special format for Value
     * @param {{unit: string, quantity: string}[]} list
     * @returns {Value}
     */
    static fromBlockfrost(list) {
        return list.reduce((sum, { unit, quantity }) => {
            const qty = BigInt(quantity)
            if (unit == "lovelace") {
                return sum.add(new Value(qty))
            } else {
                const mph = unit.substring(0, 56)
                const tokenName = unit.substring(56)

                return sum.add(
                    new Value(0n, new Assets([[mph, [[tokenName, qty]]]]))
                )
            }
        }, new Value())
    }

    /**
     * @param {BytesLike} bytes
     * @returns {Value}
     */
    static fromCbor(bytes) {
        const stream = ByteStream.from(bytes)

        if (isTuple(bytes)) {
            const [lovelace, assets] = decodeTuple(stream, [decodeInt, Assets])

            return new Value(lovelace, assets)
        } else {
            return new Value(decodeInt(stream))
        }
    }

    /**
     * @param {BytesLike} bytes
     * @returns {Value}
     */
    static fromUplcCbor(bytes) {
        return Value.fromUplcData(decodeUplcData(bytes))
    }

    /**
     * Converts a `UplcData` instance into a `Value`. Throws an error if it isn't in the right format.
     * @param {UplcData} data
     * @returns {Value}
     */
    static fromUplcData(data) {
        MapData.assert(data)

        return data.items.reduce((prev, [mphData, tokensData]) => {
            const mph = MintingPolicyHash.fromUplcData(mphData)
            const tokens = MapData.expect(tokensData)

            if (mph.bytes.length == 0) {
                if (
                    tokens.items.length != 1 ||
                    ByteArrayData.expect(tokens.items[0][0]).bytes.length != 0
                ) {
                    throw new Error("bad ada token map")
                }

                return prev.add(
                    new Value(IntData.expect(tokens.items[0][1]).value)
                )
            } else {
                return tokens.items.reduce((prev, [tokenNameData, qtyData]) => {
                    const tokenName = ByteArrayData.expect(tokenNameData).bytes
                    const qty = IntData.expect(qtyData).value

                    return prev.add(Value.fromAsset(mph, tokenName, qty))
                }, prev)
            }
        }, new Value())
    }

    /**
     * @param {(Value | {value: Value})[]} values
     * @returns {Value}
     */
    static sum(values) {
        let s = new Value(0n)

        values.forEach((v) => {
            s = s.add(v instanceof Value ? v : v.value)
        })

        return s
    }

    /**
     * Only include AssetClass.ADA if lovelace != 0n
     * @type {AssetClass[]}
     */
    get assetClasses() {
        return (this.lovelace == 0n ? [] : [AssetClass.ADA]).concat(
            this.assets.assetClasses
        )
    }

    /**
     * Adds two `Value` instances together. Returns a new `Value` instance.
     * @param {Value} other
     * @returns {Value}
     */
    add(other) {
        return new Value(
            this.lovelace + other.lovelace,
            this.assets.add(other.assets)
        )
    }

    /**
     * Throws an error if any of the `Value` entries is negative.
     *
     * Used when building transactions because transactions can't contain negative values.
     * @returns {Value} - returns this
     */
    assertAllPositive() {
        if (this.lovelace < 0n) {
            throw new Error("negative lovelace")
        }

        this.assets.assertAllPositive()

        return this
    }

    /**
     * Deep copy
     * @returns {Value}
     */
    copy() {
        return new Value(this.lovelace, this.assets.copy())
    }

    /**
     * @returns {Object}
     */
    dump() {
        return {
            lovelace: this.lovelace.toString(),
            assets: this.assets.dump()
        }
    }

    /**
     * Checks if two `Value` instances are equal (`Assets` need to be in the same order).
     * @param {Value} other
     * @returns {boolean}
     */
    isEqual(other) {
        return (
            this.lovelace == other.lovelace && this.assets.isEqual(other.assets)
        )
    }

    /**
     * Checks if a `Value` instance is strictly greater or equal to another `Value` instance. Returns false if any asset is missing.
     * @param {Value} other
     * @returns {boolean}
     */
    isGreaterOrEqual(other) {
        return (
            this.lovelace >= other.lovelace &&
            this.assets.isGreaterOrEqual(other.assets)
        )
    }
    /**
     * Checks if a `Value` instance is strictly greater than another `Value` instance. Returns false if any asset is missing.
     * @param {Value} other
     * @returns {boolean}
     */
    isGreaterThan(other) {
        return (
            this.lovelace > other.lovelace &&
            this.assets.isGreaterThan(other.assets)
        )
    }

    /**
     * Multiplies a `Value` by a whole number.
     * @param {IntLike} scalar
     * @returns {Value}
     */
    multiply(scalar) {
        const s = BigInt(scalar)
        return new Value(this.lovelace * s, this.assets.multiply(s))
    }

    /**
     * Substracts one `Value` instance from another. Returns a new `Value` instance.
     * @param {Value} other
     * @returns {Value}
     */
    subtract(other) {
        return new Value(
            this.lovelace - other.lovelace,
            this.assets.subtract(other.assets)
        )
    }

    /**
     * @returns {number[]}
     */
    toCbor() {
        if (this.assets.isZero()) {
            return encodeInt(this.lovelace)
        } else {
            return encodeTuple([encodeInt(this.lovelace), this.assets.toCbor()])
        }
    }

    /**
     * Used when building script context
     * @param {boolean} isInScriptContext
     * @returns {MapData}
     */
    toUplcData(isInScriptContext = false) {
        const map = this.assets.toUplcData()

        if (this.lovelace != 0n || isInScriptContext) {
            map.items.unshift([
                new ByteArrayData([]),
                new MapData([
                    [new ByteArrayData([]), new IntData(this.lovelace)]
                ])
            ])
        }

        return map
    }
}
