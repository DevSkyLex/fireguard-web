/**
 * Constant MATCH_FIELDS_ERROR_KEY
 *
 * @description
 * Validation-error key set by {@link matchFieldsValidator} when the two
 * watched controls hold different values. Consumers read
 * `errors?.[MATCH_FIELDS_ERROR_KEY]` instead of hard-coding the string.
 *
 * @access public
 * @since 1.0.0
 *
 * @type {string}
 */
export const MATCH_FIELDS_ERROR_KEY: string = 'fieldMismatch';
