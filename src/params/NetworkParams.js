import { COST_MODEL_PARAMS_V1 } from "@helios-lang/ledger-alonzo"
import { COST_MODEL_PARAMS_V2 } from "./costmodel.js"

/**
 * The raw JSON can be downloaded from the following CDN locations:
 *
 *  - Preview: [https://network-status.helios-lang.io/preview/config](https://network-status.helios-lang.io/preview/config)
 *  - Preprod: [https://network-status.helios-lang.io/preprod/config](https://network-status.helios-lang.io/preprod/config)
 *  - Mainnet: [https://network-status.helios-lang.io/mainnet/config](https://network-status.helios-lang.io/mainnet/config)
 *
 * These JSONs are updated every 15 minutes.
 *
 * Only include the minimum fields needed. flattened so it can be extended more easily
 *
 * @typedef {{
 *   txFeeFixed: number
 *   txFeePerByte: number
 *   exMemFeePerUnit: number
 *   exCpuFeePerUnit: number
 *   utxoDepositPerByte: number
 *   collateralPercentage: number
 *   maxCollateralInputs: number
 *   maxTxExMem: number
 *   maxTxExCpu: number
 *   maxTxSize: number
 *   secondsPerSlot: number
 *   stakeAddrDeposit: number
 *   refTipSlot: number
 *   refTipTime: number
 *   costModelParamsV1: number[]
 *   costModelParamsV2: number[]
 * }} NetworkParams
 */

/**
 * TODO: also for preview and preprod (refTipSlot/Time will be)
 * @returns {NetworkParams}
 */
export function DEFAULT_NETWORK_PARAMS() {
    return {
        txFeeFixed: 155381,
        txFeePerByte: 44,
        exMemFeePerUnit: 0.0577,
        exCpuFeePerUnit: 0.0000721,
        utxoDepositPerByte: 4310,
        collateralPercentage: 150,
        maxCollateralInputs: 3,
        maxTxExMem: 14000000,
        maxTxExCpu: 10000000000,
        maxTxSize: 16384,
        secondsPerSlot: 1,
        stakeAddrDeposit: 2000000,
        refTipSlot: 113163674,
        refTipTime: 1704729965000,
        costModelParamsV1: COST_MODEL_PARAMS_V1,
        costModelParamsV2: COST_MODEL_PARAMS_V2
    }
}
