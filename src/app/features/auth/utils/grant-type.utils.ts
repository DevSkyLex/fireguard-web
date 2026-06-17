import type { GrantType } from '@features/auth/models';

/**
 * Constant grantTypeLookup
 *
 * @description
 * Lookup object for type-safe validation of grant types.
 *
 * @access private
 * @since 1.0.0
 *
 * @type {Record<GrantType, true>}
 */
const grantTypeLookup: Record<GrantType, true> = {
  client_credentials: true,
  refresh_token: true,
  authorization_code: true,
};

/**
 * Function isGrantType
 *
 * @description
 * Type guard function to check if a value is a valid GrantType.
 *
 * @since 1.0.0
 *
 * @param {unknown} value - Value to check.
 *
 * @returns {boolean} True if the value is a valid GrantType.
 */
export function isGrantType(value: unknown): value is GrantType {
  return typeof value === 'string' && value in grantTypeLookup;
}
