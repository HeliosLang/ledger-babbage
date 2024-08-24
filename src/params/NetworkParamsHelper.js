import { toInt } from "@helios-lang/codec-utils"
import { None, expectSome } from "@helios-lang/type-utils"
import { DEFAULT_NETWORK_PARAMS } from "./NetworkParams.js"

/**
 * @typedef {import("@helios-lang/codec-utils").IntLike} IntLike
 * @typedef {import("./NetworkParams.js").NetworkParams} NetworkParams
 */

/**
 * @typedef {NetworkParamsHelper | NetworkParams} NetworkParamsLike
 */

/**
 * Wrapper for the raw JSON containing all the current network parameters.
 *
 * NetworkParamsHelper is needed to be able to calculate script budgets and perform transaction building checks.
 */
export class NetworkParamsHelper {
    /**
     * @readonly
     * @type {NetworkParams}
     */
    params

    /**
     * @param {NetworkParams} params
     */
    constructor(params) {
        this.params = params
    }

    /**
     * @returns {NetworkParamsHelper}
     */
    static default() {
        return new NetworkParamsHelper(DEFAULT_NETWORK_PARAMS)
    }

    /**
     * Returns default if called without args
     * @param {Option<NetworkParamsLike>} params
     * @returns {NetworkParamsHelper}
     */
    static new(params = None) {
        if (!params) {
            return new NetworkParamsHelper(DEFAULT_NETWORK_PARAMS)
        } else if (params instanceof NetworkParamsHelper) {
            return params
        } else {
            return new NetworkParamsHelper(params)
        }
    }

    /**
     * @type {Object}
     */
    get costModel() {
        const model = this.params?.latestParams?.costModels?.PlutusScriptV2

        if (!model) {
            throw new Error(
                "'networkParams.latestParams.costModels.PlutusScriptV2' undefined"
            )
        }

        return model
    }

    /**
     * @type {[number, number]} - a + b*txSize
     */
    get txFeeParams() {
        return [
            expectSome(
                this.params?.latestParams?.txFeeFixed,
                "'networkParams.latestParams.txFeeFixed' undefined"
            ),
            expectSome(
                this.params?.latestParams?.txFeePerByte,
                "'networkParams.latestParams.txFeePerByte' undefined"
            )
        ]
    }

    /**
     * @type {[number, number]} - [memPrice, cpuPrice]
     */
    get exFeeParams() {
        return [
            expectSome(
                this.params?.latestParams?.executionUnitPrices?.priceMemory,
                "'networkParams.latestParams.executionUnitPrices.priceMemory' undefined"
            ),
            expectSome(
                this.params?.latestParams?.executionUnitPrices?.priceSteps,
                "'networkParams.latestParams.executionUnitPrices.priceSteps' undefined"
            )
        ]
    }

    /**
     * @type {number}
     */
    get lovelacePerUTXOByte() {
        return expectSome(
            this.params?.latestParams?.utxoCostPerByte,
            "'networkParams.latestParams.utxoCostPerByte' undefined"
        )
    }

    /**
     * @type {number}
     */
    get minCollateralPct() {
        return expectSome(
            this.params?.latestParams?.collateralPercentage,
            "'networkParams.latestParams.collateralPercentage' undefined"
        )
    }

    /**
     * @type {number}
     */
    get maxCollateralInputs() {
        return expectSome(
            this.params?.latestParams?.maxCollateralInputs,
            "'networkParams.latestParams.maxCollateralInputs' undefined"
        )
    }

    /**
     * @type {[number, number]} - [mem, cpu]
     */
    get maxTxExecutionBudget() {
        return [
            expectSome(
                this.params?.latestParams?.maxTxExecutionUnits?.memory,
                "'networkParams.latestParams.maxTxExecutionUnits.memory' undefined"
            ),
            expectSome(
                this.params?.latestParams?.maxTxExecutionUnits?.steps,
                "'networkParams.latestParams.maxTxExecutionUnits.steps' undefined"
            )
        ]
    }

    /**
     * Tx balancing picks additional inputs by starting from maxTxFee.
     * This is done because the order of the inputs can have a huge impact on the tx fee, so the order must be known before balancing.
     * If there aren't enough inputs to cover the maxTxFee and the min deposits of newly created UTxOs, the balancing will fail.
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
        return expectSome(
            this.params?.latestParams?.maxTxSize,
            "'networkParams.latestParams.maxTxSize' undefined"
        )
    }

    /**
     * @type {number}
     */
    get secondsPerSlot() {
        return expectSome(
            this.params?.shelleyGenesis?.slotLength,
            "'networkParams.shelleyGenesis.slotLength' undefined"
        )
    }

    /**
     * @type {bigint}
     */
    get stakeAddressDeposit() {
        return BigInt(
            expectSome(
                this.params?.latestParams?.stakeAddressDeposit,
                "'networkParams.latestParams.stakeAddressDeposit' undefined"
            )
        )
    }

    /**
     * @private
     * @type {number}
     */
    get latestTipSlot() {
        return expectSome(
            this.params?.latestTip?.slot,
            "'networkParams.latestTip.slot' undefined"
        )
    }

    /**
     * @private
     * @type {number}
     */
    get latestTipTime() {
        return expectSome(
            this.params?.latestTip?.time,
            "'networkParams.latestTip.time' undefined"
        )
    }

    /**
     * Needed when calculating the scriptDataHash inside the TxBuilder
     * @type {number[]}
     */
    get sortedV2CostParams() {
        let baseObj = this.params?.latestParams?.costModels?.PlutusScriptV2
        let keys = Object.keys(baseObj)

        keys.sort()

        return keys.map((key) => baseObj[key])
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
