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
 * @template TRedeemerStrict
 * @template TRedeemerPermissive
 * @typedef {{
 *   program: UplcProgramV1I | UplcProgramV2I
 *   redeemer: Cast<TRedeemerStrict, TRedeemerPermissive>
 * }} MintingContext
 */
