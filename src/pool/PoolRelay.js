import {
    decodeBytes,
    decodeInt,
    decodeNullOption,
    decodeString,
    decodeTagged,
    encodeBytes,
    encodeInt,
    encodeNull,
    encodeString,
    encodeTuple
} from "@helios-lang/cbor"
import { makeByteStream } from "@helios-lang/codec-utils"

/**
 * @typedef {import("@helios-lang/codec-utils").BytesLike} BytesLike
 */

/**
 * @typedef {"SingleAddr" | "SingleName" | "MultiName"} PoolRelayKind
 */

/**
 * @typedef {{
 *   port?: number
 *   ipv4?: number[]
 *   ipv6?: number[]
 * }} SingleAddrProps
 */
/**
 * @template {PoolRelayKind} T
 * @typedef {T extends "SingleAddr" ? SingleAddrProps : T extends "SingleName" ? {
 *   port?: number
 *   record: string
 * } : {
 *   record: string
 * }} PoolRelayProps
 */

/**
 * @template {PoolRelayKind} [T=PoolRelayKind]
 */
export class PoolRelay {
    /**
     * @private
     * @readonly
     * @type {T}
     */
    kind

    /**
     * @private
     * @readonly
     * @type {PoolRelayProps<T>}
     */
    props

    /**
     * @private
     * @param {T} kind
     * @param {PoolRelayProps<T>} props
     */
    constructor(kind, props) {
        this.kind = kind
        this.props = props
    }

    /**
     * @param {SingleAddrProps} props
     * @returns {PoolRelay<"SingleAddr">}
     */
    static SingleAddr(props) {
        return new PoolRelay("SingleAddr", props)
    }

    /**
     * @param {string} record
     * @param {number | undefined} port
     * @returns {PoolRelay<"SingleName">}
     */
    static SingleName(record, port = undefined) {
        return new PoolRelay("SingleName", {
            record: record,
            port: port ? port : undefined
        })
    }

    /**
     * @param {string} record
     * @returns {PoolRelay<"MultiName">}
     */
    static MultiName(record) {
        return new PoolRelay("MultiName", { record: record })
    }

    /**
     * @param {BytesLike} bytes
     * @returns {PoolRelay}
     */
    static fromCbor(bytes) {
        const stream = makeByteStream({ bytes })

        const [tag, decodeItem] = decodeTagged(stream)

        switch (tag) {
            case 0: {
                const port = decodeItem((stream) =>
                    decodeNullOption(stream, decodeInt)
                )
                const ipv4 = decodeItem((stream) =>
                    decodeNullOption(stream, decodeBytes)
                )
                const ipv6 = decodeItem((stream) =>
                    decodeNullOption(stream, decodeBytes)
                )

                return PoolRelay.SingleAddr({
                    port: port ? Number(port) : undefined,
                    ipv4: ipv4 ?? undefined,
                    ipv6: ipv6 ?? undefined
                })
            }
            case 1: {
                const port = decodeItem((stream) =>
                    decodeNullOption(stream, decodeInt)
                )
                const record = decodeItem(decodeString)

                return PoolRelay.SingleName(
                    record,
                    port ? Number(port) : undefined
                )
            }
            case 2: {
                const record = decodeItem(decodeString)

                return PoolRelay.MultiName(record)
            }
            default:
                throw new Error(
                    `expected 0, 1 or 2 PoolRelay CBOR tag, got ${tag}`
                )
        }
    }

    /**
     * @returns {this is PoolRelay<"SingleAddr">}
     */
    isSingleAddr() {
        return this.kind == "SingleAddr"
    }

    /**
     * @returns {this is PoolRelay<"SingleName">}
     */
    isSingleName() {
        return this.kind == "SingleName"
    }

    /**
     * @returns {this is PoolRelay<"MultiName">}
     */
    isMultiName() {
        return this.kind == "MultiName"
    }

    /**
     * @typedef {"SingleAddr"} PoolRelayKindWithIpv4
     */

    /**
     * @type {T extends PoolRelayKindWithIpv4 ? (number[] | undefined) : T extends Exclude<PoolRelayKind, PoolRelayKindWithIpv4> ? never : (number[] | undefined)}
     */
    get ipv4() {
        return /** @type {any} */ (
            this.isSingleAddr() ? this.props.ipv4 : undefined
        )
    }

    /**
     * @typedef {"SingleAddr"} PoolRelayKindWithIpv6
     */

    /**
     * @type {T extends PoolRelayKindWithIpv6 ? (number[] | undefined) : T extends Exclude<PoolRelayKind, PoolRelayKindWithIpv6> ? never : (number[] | undefined)}
     */
    get ipv6() {
        return /** @type {any} */ (
            this.isSingleAddr() ? this.props.ipv6 : undefined
        )
    }

    /**
     * @typedef {"SingleAddr" | "SingleName"} PoolRelayKindWithPort
     */

    /**
     * @type {T extends PoolRelayKindWithPort ? (number | undefined) : T extends Exclude<PoolRelayKind, PoolRelayKindWithPort> ? never : (number | undefined)}
     */
    get port() {
        return /** @type {any} */ (
            this.isSingleAddr()
                ? this.props.port
                : this.isSingleName()
                  ? this.props.port
                  : undefined
        )
    }

    /**
     * @typedef {"SingleName" | "MultiName"} PoolRelayKindWithRecord
     */

    /**
     * @type {T extends PoolRelayKindWithRecord ? string : T extends Exclude<PoolRelayKind, PoolRelayKindWithRecord> ? never : (string | undefined)}
     */
    get record() {
        return /** @type {any} */ (
            this.isSingleName()
                ? this.props.record
                : this.isMultiName()
                  ? this.props.record
                  : undefined
        )
    }

    /**
     * @returns {number[]}
     */
    toCbor() {
        if (this.isSingleAddr()) {
            const props = this.props

            return encodeTuple([
                encodeInt(0),
                props.port ? encodeInt(props.port) : encodeNull(),
                props.ipv4 ? encodeBytes(props.ipv4) : encodeNull(),
                props.ipv6 ? encodeBytes(props.ipv6) : encodeNull()
            ])
        } else if (this.isSingleName()) {
            const props = this.props

            return encodeTuple([
                encodeInt(1),
                props.port ? encodeInt(props.port) : encodeNull(),
                encodeString(props.record)
            ])
        } else if (this.isMultiName()) {
            const props = this.props

            return encodeTuple([encodeInt(2), encodeString(props.record)])
        } else {
            throw new Error("unhandled variant")
        }
    }
}
