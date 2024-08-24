export {}

/**
 * @typedef {import("@helios-lang/uplc").UplcData} UplcData
 */

/**
 * @template TStrict
 * @template TPermissive
 * @typedef {{
 *   toUplcData: (x: TPermissive | UplcData) => UplcData
 *   fromUplcData: (d: UplcData) => TStrict
 * }} Cast
 */
