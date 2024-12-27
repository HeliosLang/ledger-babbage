import { toInt } from "@helios-lang/codec-utils"
import { expectDefined } from "@helios-lang/type-utils"
import { DEFAULT_NETWORK_PARAMS } from "./NetworkParams.js"

/**
 * @typedef {import("@helios-lang/codec-utils").IntLike} IntLike
 * @typedef {import("./NetworkParams.js").NetworkParams} NetworkParams
 */

/**
 * Wrapper for the raw JSON containing all the current network parameters.
 *
 * NetworkParamsHelper is needed to be able to calculate script budgets and perform transaction building checks.
 * @template {NetworkParams} T
 */
export class NetworkParamsHelper {
    /**
     * @readonly
     * @type {T}
     */
    params

    /**
     * @param {T} params
     */
    constructor(params) {
        this.params = params
    }

    /**
     * @returns {NetworkParamsHelper<NetworkParams>}
     */
    static default() {
        return new NetworkParamsHelper(DEFAULT_NETWORK_PARAMS())
    }

    /**
     * @type {number[]}
     */
    get costModelParamsV1() {
        return expectDefined(
            this.params?.costModelParamsV1,
            "'networkParams.costModelParamsV1' undefined"
        )
    }

    /**
     * @type {number[]}
     */
    get costModelParamsV2() {
        return expectDefined(
            this.params?.costModelParamsV2,
            "'networkParams.costModelParamsV2' undefined"
        )
    }

    /**
     * @type {[number, number]} - a + b*txSize
     */
    get txFeeParams() {
        return [
            expectDefined(
                this.params?.txFeeFixed,
                "'networkParams.txFeeFixed' undefined"
            ),
            expectDefined(
                this.params?.txFeePerByte,
                "'networkParams.txFeePerByte' undefined"
            )
        ]
    }

    /**
     * @type {[number, number]} - [memPrice, cpuPrice]
     */
    get exFeeParams() {
        return [
            expectDefined(
                this.params?.exMemFeePerUnit,
                "'networkParams.exMemFeePerUnit' undefined"
            ),
            expectDefined(
                this.params?.exCpuFeePerUnit,
                "'networkParams.exCpuFeePerUnit' undefined"
            )
        ]
    }

    /**
     * @type {number}
     */
    get lovelacePerUTXOByte() {
        return expectDefined(
            this.params?.utxoDepositPerByte,
            "'networkParams.utxoDepositPerByte' undefined"
        )
    }

    /**
     * @type {number}
     */
    get minCollateralPct() {
        return expectDefined(
            this.params?.collateralPercentage,
            "'networkParams.collateralPercentage' undefined"
        )
    }

    /**
     * @type {number}
     */
    get maxCollateralInputs() {
        return expectDefined(
            this.params?.maxCollateralInputs,
            "'networkParams.maxCollateralInputs' undefined"
        )
    }

    /**
     * @type {[number, number]} - [mem, cpu]
     */
    get maxTxExecutionBudget() {
        return [
            expectDefined(
                this.params?.maxTxExMem,
                "'networkParams.maxTxExMem' undefined"
            ),
            expectDefined(
                this.params?.maxTxExCpu,
                "'networkParams.maxTxExCpu' undefined"
            )
        ]
    }

    /**
     * Tx balancing picks additional inputs by starting from maxTxFee.
     * This is done because the order of the inputs can have a huge impact on the tx fee, so the order must be known before balancing.
     * If there aren't enough inputs to cover the maxTxFee and the min deposits of newly created UTxOs, the balancing will fail.
     * TODO: make this private once we are in Conway era, because this should always take into account the cost of ref scripts
     * @type {bigint}
     */
    get maxTxFee() {
        const [a, b] = this.txFeeParams
        const [feePerMem, feePerCpu] = this.exFeeParams
        const [maxMem, maxCpu] = this.maxTxExecutionBudget

        return (
            BigInt(a) +
            BigInt(Math.ceil(b * this.maxTxSize)) +
            BigInt(Math.ceil(feePerMem * maxMem)) +
            BigInt(Math.ceil(feePerCpu * maxCpu))
        )
    }

    /**
     * @type {number}
     */
    get maxTxSize() {
        return expectDefined(
            this.params?.maxTxSize,
            "'networkParams.maxTxSize' undefined"
        )
    }

    /**
     * @type {number}
     */
    get secondsPerSlot() {
        return expectDefined(
            this.params?.secondsPerSlot,
            "'networkParams.secondsPerSlot' undefined"
        )
    }

    /**
     * @type {bigint}
     */
    get stakeAddressDeposit() {
        return BigInt(
            expectDefined(
                this.params?.stakeAddrDeposit,
                "'networkParams.stakeAddrDeposit' undefined"
            )
        )
    }

    /**
     * @protected
     * @type {number}
     */
    get latestTipSlot() {
        return expectDefined(
            this.params?.refTipSlot,
            "'networkParams.refTipSlot' undefined"
        )
    }

    /**
     * @protected
     * @type {number}
     */
    get latestTipTime() {
        return expectDefined(
            this.params?.refTipTime,
            "'networkParams.refTipTime' undefined"
        )
    }

    /**
     * Calculates the time (in milliseconds in 01/01/1970) associated with a given slot number.
     * @param {IntLike} slot
     * @returns {number}
     */
    slotToTime(slot) {
        const slotDiff = toInt(slot) - this.latestTipSlot

        return this.latestTipTime + slotDiff * this.secondsPerSlot * 1000
    }

    /**
     * Calculates the slot number associated with a given time. Time is specified as milliseconds since 01/01/1970.
     * @param {IntLike} time Milliseconds since 1970
     * @returns {number}
     */
    timeToSlot(time) {
        const timeDiff = toInt(time) - this.latestTipTime

        return (
            this.latestTipSlot +
            Math.round(timeDiff / (1000 * this.secondsPerSlot))
        )
    }
}
