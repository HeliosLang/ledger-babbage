import { UplcProgramV1, UplcProgramV2 } from "@helios-lang/uplc"

/**
 * @template TStrict
 * @template TPermissive
 * @typedef {import("../hashes/Cast.js").Cast<TStrict, TPermissive>} Cast
 */

/**
 * @template TDatumPermissive
 * @typedef {{
 *   datum: Cast<any, TDatumPermissive>
 * }} DatumPaymentContext
 */

/**
 * @template TDatumStrict
 * @template TDatumPermissive
 * @template TRedeemerStrict
 * @template TRedeemerPermissive
 * @typedef {DatumPaymentContext<TDatumPermissive> & {
 *   program: UplcProgramV1 | UplcProgramV2
 *   datum: Cast<TDatumStrict, TDatumPermissive>
 *   redeemer: Cast<TRedeemerStrict, TRedeemerPermissive>
 * }} SpendingContext
 */
