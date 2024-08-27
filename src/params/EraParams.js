import { COST_MODEL_PARAMS_V1 } from "@helios-lang/ledger-alonzo"
import { COST_MODEL_PARAMS_V2 } from "./costmodel.js"

/**
 * @typedef {import("@helios-lang/ledger-alonzo").CommonAlonzoBabbageParams} CommonAlonzoBabbageParams
 */

/**
 * @typedef {CommonAlonzoBabbageParams & {
 *   executionUnitPrices: {
 *     priceMemory: number
 *     priceSteps: number
 *   }
 *   maxBlockBodySize: number
 *   maxBlockExecutionUnits: {
 *     memory: number
 *     steps: number
 *   }
 *   maxBlockHeaderSize: number
 *   maxTxExecutionUnits: {
 *     memory: number
 *     steps: number
 *   }
 *   maxTxSize: number
 *   minPoolCost: number
 *   monetaryExpansion: number
 *   poolPledgeInfluence: number
 *   poolRetireMaxEpoch: number
 *   protocolVersion: {
 *     major: number
 *     minor: number
 *   }
 *   stakeAddressDeposit: number
 *   stakePoolDeposit: number
 *   stakePoolTargetNum: number
 *   treasuryCut: number
 *   txFeeFixed: number
 *   txFeePerByte: number
 *   utxoCostPerByte: number
 * }} CommonBabbageConwayParams
 */

/**
 * @typedef {CommonBabbageConwayParams & {
 *   costModels: {
 *     PlutusV1: number[]
 *     PlutusV2: number[]
 *   }
 * }} EraParams
 */

export const ERA_PARAMS = {
    collateralPercentage: 150,
    costModels: {
        PlutusV1: COST_MODEL_PARAMS_V1,
        PlutusV2: COST_MODEL_PARAMS_V2
    },
    executionUnitPrices: { priceMemory: 0.0577, priceSteps: 0.0000721 },
    maxBlockBodySize: 90112,
    maxBlockExecutionUnits: { memory: 62000000, steps: 20000000000 },
    maxBlockHeaderSize: 1100,
    maxCollateralInputs: 3,
    maxTxExecutionUnits: { memory: 14000000, steps: 10000000000 },
    maxTxSize: 16384,
    maxValueSize: 5000,
    minPoolCost: 170000000,
    monetaryExpansion: 0.003,
    poolPledgeInfluence: 0.3,
    poolRetireMaxEpoch: 18,
    protocolVersion: { major: 8, minor: 0 },
    stakeAddressDeposit: 2000000,
    stakePoolDeposit: 500000000,
    stakePoolTargetNum: 500,
    treasuryCut: 0.2,
    txFeeFixed: 155381,
    txFeePerByte: 44,
    utxoCostPerByte: 4310
}
