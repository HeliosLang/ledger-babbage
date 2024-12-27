import {
    decodeBytes,
    decodeInt,
    decodeMap,
    encodeBytes,
    encodeInt,
    encodeMap
} from "@helios-lang/cbor"
import {
    bytesToHex,
    compareBytes,
    decodeUtf8,
    isValidUtf8,
    makeByteStream,
    toBytes
} from "@helios-lang/codec-utils"
import { ByteArrayData, IntData, MapData } from "@helios-lang/uplc"
import { MintingPolicyHash, ScriptHash } from "../hashes/index.js"
import {
    AssetClass,
    handleAssetClassArgs,
    handleAssetClassArgsWithQty
} from "./AssetClass.js"

/**
 * @typedef {import("@helios-lang/codec-utils").BytesLike} BytesLike
 * @typedef {import("@helios-lang/codec-utils").IntLike} IntLike
 * @typedef {import("./AssetClass.js").AssetClassLike} AssetClassLike
 * @typedef {import("../hashes/MintingPolicyHash.js").MintingPolicyHashLike} MintingPolicyHashLike
 */

/**
 * @typedef {[
 *     BytesLike,
 *     IntLike
 * ][] | Record<string, IntLike>} TokensLike
 */

/**
 * @typedef {Assets | [
 *   MintingPolicyHashLike,
 *   TokensLike
 * ][] | Record<string, TokensLike>} AssetsLike
 */

/**
 *   1. 100
 *   2. 222
 *   3. 333
 *   4. 444
 */
const CIP68_PREFIXES = ["000643b0", "000de140", "0014df10", "001BC280"]

/**
 * Represents a list of non-Ada tokens.
 */
export class Assets {
    /**
     * @type {[MintingPolicyHash, [number[], bigint][]][]}
     */
    assets

    /**
     * **Note**: the assets are normalized by removing entries with 0 tokens, and merging all entries with the same MintingPolicyHash and token name.
     * @param {Exclude<AssetsLike, Assets>} arg Either a list of `AssetClass`/quantity pairs, or a list of `MintingPolicyHash`/`tokens` pairs (where each `tokens` entry is a bytearray/quantity pair).
     */
    constructor(arg = []) {
        this.assets = (Array.isArray(arg) ? arg : Object.entries(arg)).map(
            ([mph, tokens]) => {
                return [
                    MintingPolicyHash.new(mph),
                    (Array.isArray(tokens)
                        ? tokens
                        : Object.entries(tokens)
                    ).map(([tokenName, qty]) => [
                        toBytes(tokenName),
                        BigInt(qty)
                    ])
                ]
            }
        )

        this.normalize()
    }

    /**
     * @param {AssetsLike} arg
     * @returns {Assets}
     */
    static new(arg) {
        return arg instanceof Assets ? arg : new Assets(arg)
    }

    /**
     * @param {[AssetClassLike, IntLike][]} arg
     * @returns {Assets}
     */
    static fromAssetClasses(arg) {
        return new Assets(
            arg.map(([acl, qty]) => {
                const ac = AssetClass.new(acl)

                return /** @type {[MintingPolicyHash, [number[], bigint][]]} */ ([
                    ac.mph,
                    [[ac.tokenName, qty]]
                ])
            })
        )
    }

    /**
     * @param {BytesLike} bytes
     * @returns {Assets}
     */
    static fromCbor(bytes) {
        const stream = makeByteStream({ bytes })

        return new Assets(
            decodeMap(stream, MintingPolicyHash, (innerBytes) =>
                decodeMap(innerBytes, decodeBytes, decodeInt)
            )
        )
    }

    /**
     * @type {AssetClass[]}
     */
    get assetClasses() {
        /**
         * @type {AssetClass[]}
         */
        const assetClasses = []

        for (let [mph, tokens] of this.assets) {
            for (let [tokenName] of tokens) {
                assetClasses.push(new AssetClass(mph, tokenName))
            }
        }

        return assetClasses
    }

    /**
     * @param {Assets} other
     * @returns {Assets}
     */
    add(other) {
        return this.applyBinOp(other, (a, b) => a + b)
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
     * Mutates 'this'.
     * @param {[AssetClassLike, IntLike] | [MintingPolicyHashLike, BytesLike, IntLike]} args
     */
    addComponent(...args) {
        const [mph, tokenName, qty] = handleAssetClassArgsWithQty(...args)

        if (qty == 0n) {
            return
        }

        const entry = this.assets.find((asset) => mph.isEqual(asset[0]))

        if (entry) {
            const token = entry[1].find(
                (pair) => compareBytes(pair[0], tokenName) == 0
            )

            if (token) {
                token[1] += qty
            } else {
                entry[1].push([tokenName, qty])
            }
        } else {
            this.assets.push([mph, [[tokenName, qty]]])
        }

        this.removeZeroes()
    }

    /**
     * Mutates 'this'.
     * Throws error if mph is already contained in 'this'.
     * @param {MintingPolicyHashLike} mph
     * @param {[BytesLike, IntLike][]} tokens
     */
    addTokens(mph, tokens) {
        const mph_ = MintingPolicyHash.new(mph)

        for (let asset of this.assets) {
            if (asset[0].isEqual(mph_)) {
                throw new Error(`MultiAsset already contains ${mph_.toHex()}`)
            }
        }

        this.assets.push([
            mph_,
            tokens.map(([tokenName, qty]) => [toBytes(tokenName), BigInt(qty)])
        ])

        // sort immediately
        this.sort()
    }

    /**
     * @private
     * @param {Assets} other
     * @param {(a: bigint, b: bigint) => bigint} op
     * @returns {Assets}
     */
    applyBinOp(other, op) {
        let res = new Assets()

        for (let [mph, tokens] of this.assets) {
            for (let [tokenName, quantity] of tokens) {
                res.addComponent(mph, tokenName, op(quantity, 0n))
            }
        }

        for (let [mph, tokens] of other.assets) {
            for (let [tokenName, quantity] of tokens) {
                res.addComponent(mph, tokenName, op(0n, quantity))
            }
        }

        return res
    }

    /**
     * Throws an error if any contained quantity <= 0n
     */
    assertAllPositive() {
        if (!this.isAllPositive()) {
            throw new Error("non-positive token amounts detected")
        }
    }

    assertSorted() {
        this.assets.forEach((b, i) => {
            if (i > 0) {
                const a = this.assets[i - 1]

                if (ScriptHash.compare(a[0], b[0]) >= 0) {
                    throw new Error(
                        `assets not sorted (${a[0].toHex()} vs ${b[0].toHex()})`
                    )
                }

                b[1].forEach((bb, j) => {
                    if (j > 0) {
                        const aa = b[1][j - 1]

                        if (compareBytes(aa[0], bb[0], true) >= 0) {
                            throw new Error("tokens not sorted")
                        }
                    }
                })
            }
        })
    }

    /**
     * @returns {number}
     */
    countTokens() {
        return this.assets.reduce(
            (prev, [_mph, tokens]) => prev + tokens.length,
            0
        )
    }

    /**
     * @returns {Assets}
     */
    copy() {
        return new Assets(this.assets.slice())
    }

    /**
     * @returns {Object}
     */
    dump() {
        return Object.fromEntries(
            this.assets.map(([mph, tokens]) => [
                mph.toHex(),
                Object.fromEntries(
                    tokens.map(([tokenName, qty]) => {
                        const hasCip68Prefix = CIP68_PREFIXES.includes(
                            bytesToHex(tokenName.slice(0, 4))
                        )

                        return [
                            bytesToHex(tokenName),
                            {
                                name: hasCip68Prefix
                                    ? decodeUtf8(tokenName.slice(4))
                                    : isValidUtf8(tokenName)
                                      ? decodeUtf8(tokenName)
                                      : undefined,
                                quantity: qty.toString()
                            }
                        ]
                    })
                )
            ])
        )
    }

    /**
     * Returns 0n if not found
     *
     * @overload
     * @param {AssetClassLike} assetClass
     * @returns {bigint}
     *
     * @overload
     * @param {MintingPolicyHashLike} mph
     * @param {BytesLike} tokenName
     * @returns {bigint}
     *
     * @param {[AssetClassLike] | [MintingPolicyHashLike, BytesLike]} args
     * @returns {bigint}
     */
    getQuantity(...args) {
        const [mph, tokenName] = handleAssetClassArgs(...args)

        const entry = this.assets.find((asset) => mph.isEqual(asset[0]))

        if (entry) {
            const token = entry[1].find(
                (pair) => compareBytes(pair[0], tokenName) == 0
            )
            return token ? token[1] : 0n
        } else {
            return 0n
        }
    }

    /**
     * Returns a list of all the minting policies.
     * @returns {MintingPolicyHash[]}
     */
    getPolicies() {
        return this.assets.map(([mph, _tokens]) => mph)
    }

    /**
     * Returns empty if mph not found
     * @param {MintingPolicyHashLike} policy
     * @returns {[number[], bigint][]}
     */
    getPolicyTokens(policy) {
        const mph = MintingPolicyHash.new(policy)

        const entry = this.assets.find((entry) => entry[0].isEqual(mph))

        return entry ? entry[1] : []
    }

    /**
     * Returns an empty array if policy isn't found
     * @param {MintingPolicyHashLike} policy
     * @returns {number[][]}
     */
    getPolicyTokenNames(policy) {
        const mph = MintingPolicyHash.new(policy)

        for (let [otherMph, tokens] of this.assets) {
            if (otherMph.isEqual(mph)) {
                return tokens.map(([tokenName, _qty]) => tokenName)
            }
        }

        return []
    }

    /**
     * @overload
     * @param {AssetClassLike} args
     * @returns {boolean}
     *
     * @overload
     * @param {MintingPolicyHashLike} mph
     * @param {BytesLike} tokenName
     * @returns {boolean}
     *
     * @param {[AssetClassLike] | [MintingPolicyHashLike, BytesLike]} args
     * @returns {boolean}
     */
    has(...args) {
        const [mph, tokenName] = handleAssetClassArgs(...args)

        const entry = this.assets.find((asset) => mph.isEqual(asset[0]))

        if (entry) {
            return (
                entry[1].findIndex(
                    (pair) => compareBytes(pair[0], tokenName) == 0
                ) != -1
            )
        } else {
            return false
        }
    }

    /**
     * @returns {boolean}
     */
    isAllPositive() {
        for (let [_mph, tokens] of this.assets) {
            for (let [_tokenName, qty] of tokens) {
                if (qty < 0n) {
                    return false
                } else if (qty == 0n) {
                    throw new Error("unexpected")
                }
            }
        }

        return true
    }

    /**
     * @param {Assets} other
     * @returns {boolean}
     */
    isEqual(other) {
        for (let [mph, tokens] of this.assets) {
            for (let [tokenName, qty] of tokens) {
                if (qty != other.getQuantity(mph, tokenName)) {
                    return false
                }
            }
        }

        for (let [mph, tokens] of other.assets) {
            for (let [tokenName, qty] of tokens) {
                if (qty != this.getQuantity(mph, tokenName)) {
                    return false
                }
            }
        }

        return true
    }

    /**
     * @param {Assets} other
     * @returns {boolean}
     */
    isGreaterOrEqual(other) {
        if (this.isZero()) {
            return other.isZero()
        }

        if (
            this.assets.some(([mph, tokens]) =>
                tokens.some(
                    ([tokenName, qty]) =>
                        qty < other.getQuantity(mph, tokenName)
                )
            )
        ) {
            return false
        }

        if (
            other.assets.some(([mph, tokens]) =>
                tokens.some(([tokenName]) => !this.has(mph, tokenName))
            )
        ) {
            return false
        }

        return true
    }

    /**
     * Strict gt, if other contains assets this one doesn't contain => return false
     * @param {Assets} other
     * @returns {boolean}
     */
    isGreaterThan(other) {
        if (this.isZero()) {
            return false
        }

        if (
            this.assets.some(([mph, tokens]) =>
                tokens.some(
                    ([tokenName, qty]) =>
                        qty <= other.getQuantity(mph, tokenName)
                )
            )
        ) {
            return false
        }

        if (
            other.assets.some(([mph, tokens]) =>
                tokens.some(([tokenName]) => !this.has(mph, tokenName))
            )
        ) {
            return false
        }

        return true
    }

    /**
     * @returns {boolean}
     */
    isZero() {
        return this.assets.length == 0
    }

    /**
     * @param {IntLike} scalar
     * @returns {Assets}
     */
    multiply(scalar) {
        const s = BigInt(scalar)

        return new Assets(
            this.assets.map(([mph, tokens]) => {
                return /** @type {[MintingPolicyHash, [number[], bigint][]]} */ ([
                    mph,
                    tokens.map(([token, qty]) => [token, qty * s])
                ])
            })
        )
    }

    /**
     * Removes zeroes and merges duplicates.
     * In-place algorithm.
     * Keeps the same order as much as possible.
     */
    normalize() {
        /**
         * @type {Map<string, Map<string, bigint>>}
         */
        const assets = new Map()

        for (let [mph, tokens] of this.assets) {
            let outerPrev = assets.get(mph.toHex())

            if (!outerPrev) {
                outerPrev = new Map()
            }

            for (let [tokenName, qty] of tokens) {
                let innerPrev = outerPrev.get(bytesToHex(tokenName))

                if (!innerPrev) {
                    innerPrev = 0n
                }

                innerPrev += qty

                outerPrev.set(bytesToHex(tokenName), innerPrev)
            }

            assets.set(mph.toHex(), outerPrev)
        }

        const entries = Array.from(assets.entries())

        this.assets = entries.map(([rawMph, rawTokens]) => {
            const tokens = Array.from(rawTokens.entries())

            return [
                MintingPolicyHash.new(rawMph),
                tokens.map(([rawTokenName, rawQty]) => [
                    toBytes(rawTokenName),
                    rawQty
                ])
            ]
        })
    }

    /**
     * Mutates 'this'
     */
    removeZeroes() {
        for (let asset of this.assets) {
            asset[1] = asset[1].filter((token) => token[1] != 0n)
        }

        this.assets = this.assets.filter((asset) => asset[1].length != 0)
    }

    /**
     * Makes sure minting policies are in correct order, and for each minting policy make sure the tokens are in the correct order
     * Mutates 'this'
     */
    sort() {
        this.assets.sort(([a], [b]) => {
            return ScriptHash.compare(a, b)
        })

        this.assets.forEach(([_mph, tokens]) => {
            tokens.sort(([a], [b]) => {
                return compareBytes(a, b, true)
            })
        })
    }

    /**
     * @param {Assets} other
     * @returns {Assets}
     */
    subtract(other) {
        return this.applyBinOp(other, (a, b) => a - b)
    }

    /**
     * @returns {number[]}
     */
    toCbor() {
        return encodeMap(
            this.assets.map(([mph, tokens]) => {
                return [
                    mph.toCbor(),
                    encodeMap(
                        tokens.map(([tokenName, qty]) => [
                            encodeBytes(tokenName),
                            encodeInt(qty)
                        ])
                    )
                ]
            })
        )
    }

    /**
     * Used when generating script contexts for running programs
     * @returns {MapData}
     */
    toUplcData() {
        return new MapData(
            this.assets.map(([mph, tokens]) => [
                mph.toUplcData(),
                new MapData(
                    tokens.map(([tokenName, qty]) => [
                        new ByteArrayData(tokenName),
                        new IntData(qty)
                    ])
                )
            ])
        )
    }
}
