import { PubKeyHash } from "../hashes/index.js"
import { Assets } from "../money/index.js"
import { TimeRange } from "../time/index.js"
import { DCert } from "./DCert.js"
import { TxRedeemer } from "./TxRedeemer.js"
import { TxId } from "./TxId.js"
import { TxInput } from "./TxInput.js"
import { TxOutput } from "./TxOutput.js"
import { StakingAddress } from "./StakingAddress.js"

/**
 * @typedef {import("@helios-lang/codec-utils").IntLike} IntLike
 * @typedef {import("@helios-lang/uplc").UplcData} UplcData
 */

/**
 * Most fields are optional to make it easier to create dummy ScriptContexts for unit testing
 * @typedef {{
 *   inputs: TxInput[]
 *   refInputs?: TxInput[]
 *   outputs: TxOutput[]
 *   fee?: IntLike
 *   minted?: Assets
 *   dcerts?: DCert[]
 *   withdrawals?: [StakingAddress, IntLike][]
 *   validityTimerange?: TimeRange
 *   signers?: PubKeyHash[]
 *   redeemers?: TxRedeemer[]
 *   datums?: UplcData[]
 *   id?: TxId
 * }} TxInfo
 */
