export {}

/**
 * @typedef {import("@helios-lang/uplc").CostModelParamsV1} CostModelParamsV1
 * @typedef {import("@helios-lang/uplc").CostModelParamsV2} CostModelParamsV2
 */

/**
 * @typedef {{
 *   collateralPercentage: number
 *   costModels: {
 *     PlutusScriptV1: CostModelParamsV1
 *     PlutusScriptV2: CostModelParamsV2
 *   }
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
 *   maxCollateralInputs: number
 *   maxTxExecutionUnits: {
 *     memory: number
 *     steps: number
 *   }
 *   maxTxSize: number
 *   maxValueSize: number
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
 * }} BabbageParams
 */
