export {}

/**
 * @typedef {import("@helios-lang/uplc").UplcProgramV1I} UplcProgramV1I
 * @typedef {import("@helios-lang/uplc").UplcProgramV2I} UplcProgramV2I
 */

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
 *   program: UplcProgramV1I | UplcProgramV2I
 *   datum: Cast<TDatumStrict, TDatumPermissive>
 *   redeemer: Cast<TRedeemerStrict, TRedeemerPermissive>
 * }} SpendingContext
 */
