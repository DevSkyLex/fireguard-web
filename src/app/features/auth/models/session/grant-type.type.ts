/**
 * OAuth2 Grant Types
 *
 * @description
 * Supported OAuth2 grant types for token requests.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */

/**
 * Type GrantType
 * @type GrantType
 *
 * @description
 * OAuth2 grant type union representing supported authentication flows.
 * - client_credentials: Machine-to-machine authentication
 * - refresh_token: Token renewal using refresh token
 * - authorization_code: User authorization code flow
 *
 * @since 1.0.0
 */
export type GrantType = 'client_credentials' | 'refresh_token' | 'authorization_code';

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
 * Constant GRANT_TYPES
 *
 * @description
 * Array of all available OAuth2 grant types.
 *
 * @since 1.0.0
 *
 * @type {readonly GrantType[]}
 */
export const GRANT_TYPES: readonly GrantType[] = [
  'client_credentials',
  'refresh_token',
  'authorization_code',
];

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
