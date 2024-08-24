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
import { ByteStream } from "@helios-lang/codec-utils"
import { None } from "@helios-lang/type-utils"

/**
 * @typedef {import("@helios-lang/codec-utils").ByteArrayLike} ByteArrayLike
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
     * @param {Option<number>} port
     * @returns {PoolRelay<"SingleName">}
     */
    static SingleName(record, port = None) {
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
     * @param {ByteArrayLike} bytes
     * @returns {PoolRelay}
     */
    static fromCbor(bytes) {
        const stream = ByteStream.from(bytes)

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

                return PoolRelay.SingleName(record, port ? Number(port) : None)
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
     * @type {T extends PoolRelayKindWithIpv4 ? Option<number[]> : T extends Exclude<PoolRelayKind, PoolRelayKindWithIpv4> ? never : Option<number[]>}
     */
    get ipv4() {
        return /** @type {any} */ (this.isSingleAddr() ? this.props.ipv4 : None)
    }

    /**
     * @typedef {"SingleAddr"} PoolRelayKindWithIpv6
     */

    /**
     * @type {T extends PoolRelayKindWithIpv6 ? Option<number[]> : T extends Exclude<PoolRelayKind, PoolRelayKindWithIpv6> ? never : Option<number[]>}
     */
    get ipv6() {
        return /** @type {any} */ (this.isSingleAddr() ? this.props.ipv6 : None)
    }

    /**
     * @typedef {"SingleAddr" | "SingleName"} PoolRelayKindWithPort
     */

    /**
     * @type {T extends PoolRelayKindWithPort ? Option<number> : T extends Exclude<PoolRelayKind, PoolRelayKindWithPort> ? never : Option<number>}
     */
    get port() {
        return /** @type {any} */ (
            this.isSingleAddr()
                ? this.props.port
                : this.isSingleName()
                  ? this.props.port
                  : None
        )
    }

    /**
     * @typedef {"SingleName" | "MultiName"} PoolRelayKindWithRecord
     */

    /**
     * @type {T extends PoolRelayKindWithRecord ? string : T extends Exclude<PoolRelayKind, PoolRelayKindWithRecord> ? never : Option<string>}
     */
    get record() {
        return /** @type {any} */ (
            this.isSingleName()
                ? this.props.record
                : this.isMultiName()
                  ? this.props.record
                  : None
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
