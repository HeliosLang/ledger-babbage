import {
    decodeInt,
    decodeTagged,
    encodeInt,
    encodeTuple
} from "@helios-lang/cbor"
import { ByteStream, toInt } from "@helios-lang/codec-utils"
import { None } from "@helios-lang/type-utils"
import { ConstrData, IntData } from "@helios-lang/uplc"
import { PubKeyHash, StakingHash } from "../hashes/index.js"
import { PoolParameters } from "../pool/index.js"
import { StakingCredential } from "./StakingCredential.js"

/**
 * @typedef {import("@helios-lang/codec-utils").BytesLike} BytesLike
 * @typedef {import("@helios-lang/codec-utils").IntLike} IntLike
 * @typedef {import("../hashes/index.js").PubKeyHashLike} PubKeyHashLike
 * @typedef {import("./StakingCredential.js").StakingCredentialLike} StakingCredentialLike
 */

/**
 * @typedef {"Register" | "Deregister" | "Delegate" | "RegisterPool" | "RetirePool" } DCertKind
 */

/**
 * @template {DCertKind} T
 * @typedef {T extends "Register" ? {
 *   credential: StakingCredential
 * } : T extends "Deregister" ? {
 *   credential: StakingCredential
 * } : T extends "Delegate" ? {
 *   credential: StakingCredential
 *   poolId: PubKeyHash
 * } : T extends "RegisterPool" ? {
 *   parameters: PoolParameters
 * } : T extends "RetirePool" ? {
 *   poolId: PubKeyHash
 *   epoch: number
 * } : never} DCertProps
 */

/**
 * Confusingly the DCerts in the script context uses full StakingCredentials (which can be Staking Pointer), but the Cbor ledger format only encodes the StakingHash (presumably resolving Staking Ptrs to Staking Hashes)
 * @template {DCertKind} [T=DCertKind]
 */
export class DCert {
    /**
     * @private
     * @readonly
     * @type {T}
     */
    kind

    /**
     * @private
     * @readonly
     * @type {DCertProps<T>}
     */
    props

    /**
     * @private
     * @param {T} kind
     * @param {DCertProps<T>} props
     */
    constructor(kind, props) {
        this.kind = kind
        this.props = props
    }

    /**
     * @param {StakingCredentialLike} credential
     * @returns {DCert<"Register">}
     */
    static Register(credential) {
        return new DCert("Register", {
            credential: StakingCredential.new(credential)
        })
    }

    /**
     * @param {StakingCredentialLike} credential
     * @returns {DCert<"Deregister">}
     */
    static Deregister(credential) {
        return new DCert("Deregister", {
            credential: StakingCredential.new(credential)
        })
    }

    /**
     *
     * @param {StakingCredentialLike} credential
     * @param {PubKeyHashLike} poolId
     * @returns {DCert<"Delegate">}
     */
    static Delegate(credential, poolId) {
        return new DCert("Delegate", {
            credential: StakingCredential.new(credential),
            poolId: PubKeyHash.new(poolId)
        })
    }

    /**
     * @param {PoolParameters} parameters
     * @return {DCert<"RegisterPool">}
     */
    static RegisterPool(parameters) {
        return new DCert("RegisterPool", {
            parameters: parameters
        })
    }

    /**
     * @param {PubKeyHashLike} poolId
     * @param {IntLike} epoch
     * @returns {DCert<"RetirePool">}
     */
    static RetirePool(poolId, epoch) {
        return new DCert("RetirePool", {
            poolId: PubKeyHash.new(poolId),
            epoch: toInt(epoch)
        })
    }

    /**
     *
     * @param {BytesLike} bytes
     */
    static fromCbor(bytes) {
        const stream = ByteStream.from(bytes)

        const [tag, decodeItem] = decodeTagged(stream)

        switch (tag) {
            case 0:
                return DCert.Register(decodeItem(StakingHash))
            case 1:
                return DCert.Deregister(decodeItem(StakingHash))
            case 2:
                return DCert.Delegate(
                    decodeItem(StakingHash),
                    decodeItem(PubKeyHash)
                )
            case 3:
                return DCert.RegisterPool(decodeItem(PoolParameters))
            case 4:
                return DCert.RetirePool(
                    decodeItem(PubKeyHash),
                    decodeItem(decodeInt)
                )
            default:
                throw new Error(`unhandled DCert type (tag: ${tag})`)
        }
    }

    /**
     * @typedef {("Register" | "Deregister" | "Delegate")} DCertKindWithCredential
     */

    /**
     * @type {T extends DCertKindWithCredential ? StakingCredential<unknown> : T extends Exclude<DCertKind, DCertKindWithCredential> ? never : Option<StakingCredential<unknown>>}
     */
    get credential() {
        return /** @type {any} */ (
            this.isRegister() || this.isDeregister() || this.isDelegate()
                ? this.props.credential
                : None
        )
    }

    /**
     * @typedef {"RetirePool"} DCertKindWithEpoch
     */
    /**
     * @type {T extends DCertKindWithEpoch ? number : T extends Exclude<DCertKind, DCertKindWithEpoch> ? never : Option<number>}
     */
    get epoch() {
        return /** @type {any} */ (
            this.isRetirePool() ? this.props.epoch : None
        )
    }

    /**
     * @typedef {"Delegate" | "RegisterPool" | "RetirePool"} DCertKindWithPoolId
     */

    /**
     * @type {T extends DCertKindWithPoolId ? PubKeyHash : T extends Exclude<DCertKind, DCertKindWithPoolId> ? never : Option<PubKeyHash>}
     */
    get poolId() {
        return /** @type {any} */ (
            this.isDelegate()
                ? this.props.poolId
                : this.isRetirePool()
                  ? this.props.poolId
                  : this.isRegisterPool()
                    ? this.props.parameters.id
                    : None
        )
    }

    /**
     * @typedef {"RegisterPool"} DCertKindWithPoolParameters
     */

    /**
     * @type {T extends DCertKindWithPoolParameters ? PoolParameters : T extends Exclude<DCertKind, DCertKindWithPoolParameters> ? never : Option<PoolParameters>}
     */
    get poolParameters() {
        return /** @type {any} */ (
            this.isRegisterPool() ? this.props.parameters : None
        )
    }

    /**
     * @type {number}
     */
    get tag() {
        return this.isRegister()
            ? 0
            : this.isDeregister()
              ? 1
              : this.isDelegate()
                ? 2
                : this.isRegisterPool()
                  ? 3
                  : 4
    }

    /**
     * @returns {Object}
     */
    dump() {
        if (this.isRegister()) {
            return {
                dcertType: "Register"
            }
        } else if (this.isDeregister()) {
            return {
                dcertType: "Deregister"
            }
        } else if (this.isDelegate()) {
            return {
                dcertType: "Delegate"
            }
        } else if (this.isRegisterPool()) {
            return {
                dcertType: "RegisterPool"
            }
        } else if (this.isRetirePool()) {
            return {
                dcertType: "RetirePool"
            }
        } else {
            throw new Error("unhandled DCert kind")
        }
    }

    /**
     * @returns {this is DCert<"Register">}
     */
    isRegister() {
        return this.kind == "Register"
    }

    /**
     * @returns {this is DCert<"Deregister">}
     */
    isDeregister() {
        return this.kind == "Deregister"
    }

    /**
     * @this {DCert}
     * @returns {this is DCert<"Delegate">}
     */
    isDelegate() {
        return this.kind == "Delegate"
    }

    /**
     * @returns {this is DCert<"RegisterPool">}
     */
    isRegisterPool() {
        return this.kind == "RegisterPool"
    }

    /**
     * @returns {this is DCert<"RetirePool">}
     */
    isRetirePool() {
        return this.kind == "RetirePool"
    }

    /**
     * @returns {number[]}
     */
    toCbor() {
        if (this.isRegister()) {
            return encodeTuple([encodeInt(0), this.props.credential.toCbor()])
        } else if (this.isDeregister()) {
            return encodeTuple([encodeInt(1), this.props.credential.toCbor()])
        } else if (this.isDelegate()) {
            return encodeTuple([
                encodeInt(2),
                this.props.credential.toCbor(),
                this.props.poolId.toCbor()
            ])
        } else if (this.isRegisterPool()) {
            return encodeTuple([encodeInt(3), this.props.parameters.toCbor()])
        } else if (this.isRetirePool()) {
            return encodeTuple([
                encodeInt(4),
                this.props.poolId,
                encodeInt(this.props.epoch)
            ])
        } else {
            throw new Error("unhandled DCert type")
        }
    }

    /**
     * @returns {ConstrData}
     */
    toUplcData() {
        if (this.isRegister()) {
            return new ConstrData(0, [this.props.credential.toUplcData()])
        } else if (this.isDeregister()) {
            return new ConstrData(1, [this.props.credential.toUplcData()])
        } else if (this.isDelegate()) {
            return new ConstrData(2, [
                this.props.credential.toUplcData(),
                this.props.poolId.toUplcData()
            ])
        } else if (this.isRegisterPool()) {
            return new ConstrData(3, [
                this.props.parameters.id.toUplcData(),
                this.props.parameters.vrf.toUplcData()
            ])
        } else if (this.isRetirePool()) {
            return new ConstrData(4, [
                this.props.poolId.toUplcData(),
                new IntData(this.props.epoch)
            ])
        } else {
            throw new Error("unhandled DCert type")
        }
    }
}
