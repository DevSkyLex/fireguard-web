import type { GrantType } from '@features/auth/models';

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
