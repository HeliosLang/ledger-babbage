import { ALONZO_GENESIS_PARAMS } from "@helios-lang/ledger-alonzo"
import { SHELLEY_GENESIS_PARAMS } from "@helios-lang/ledger-shelley"
import {
    DEFAULT_COST_MODEL_PARAMS_V1,
    DEFAULT_COST_MODEL_PARAMS_V2
} from "@helios-lang/uplc"

/**
 * @typedef {import("@helios-lang/ledger-alonzo").AlonzoGenesisParams} AlonzoGenesisParams
 * @typedef {import("@helios-lang/ledger-shelley").ShelleyGenesisParams} ShelleyGenesisParams
 * @typedef {import("@helios-lang/uplc").CostModelParamsV1} CostModelParamsV1
 * @typedef {import("@helios-lang/uplc").CostModelParamsV2} CostModelParamsV2
 * @typedef {import("./BabbageParams.js").BabbageParams} BabbageParams
 */

/**
 * @typedef {{
 *   epoch: number
 *   hash: string
 *   slot: number
 *   time: number
 * }} LatestTip
 */

/**
 * The raw JSON can be downloaded from the following CDN locations:
 *
 *  - Preview: [https://network-status.helios-lang.io/preview/config](https://network-status.helios-lang.io/preview/config)
 *  - Preprod: [https://network-status.helios-lang.io/preprod/config](https://network-status.helios-lang.io/preprod/config)
 *  - Mainnet: [https://network-status.helios-lang.io/mainnet/config](https://network-status.helios-lang.io/mainnet/config)
 *
 * These JSONs are updated every 15 minutes.
 *
 * @typedef {{
 *   shelleyGenesis: ShelleyGenesisParams
 *   alonzoGenesis: AlonzoGenesisParams
 *   latestParams: BabbageParams
 *   latestTip: LatestTip
 * }} NetworkParams
 */

/**
 * TODO: also for preview and preprod
 * @returns {NetworkParams}
 */
export function DEFAULT_NETWORK_PARAMS() {
    return {
        shelleyGenesis: SHELLEY_GENESIS_PARAMS,
        alonzoGenesis: ALONZO_GENESIS_PARAMS,
        latestParams: {
            collateralPercentage: 150,
            costModels: {
                PlutusScriptV1: DEFAULT_COST_MODEL_PARAMS_V1(),
                PlutusScriptV2: DEFAULT_COST_MODEL_PARAMS_V2()
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
        },
        latestTip: {
            epoch: 459,
            hash: "4286b3906ecf96c751be977f8aa84967c52c9f237e79a7428cc94fe19f4c7361",
            slot: 113163674,
            time: 1704729965000
        }
    }
}
