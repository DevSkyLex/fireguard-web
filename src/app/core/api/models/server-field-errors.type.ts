/**
 * Type ServerFieldErrors
 * @typedef ServerFieldErrors
 *
 * @description
 * Field-path -> server message map produced from a rejected submit.
 * Keyed by the violation's `propertyPath` exactly as the API reports it.
 *
 * @access public
 * @since 1.0.0
 */
export type ServerFieldErrors = Readonly<Record<string, string>>;
