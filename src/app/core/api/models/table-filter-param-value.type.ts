/**
 * Type TableFilterParamValue
 * @typedef TableFilterParamValue
 *
 * @description
 * Primitive value that can be forwarded as a single Hydra query parameter.
 * Mirrors the value type accepted by the transport `params` bag on
 * `RequestOptions` and flattened by `HydraApiService.buildParams`.
 *
 * @access public
 * @since 1.0.0
 */
export type TableFilterParamValue = string | number | boolean;
