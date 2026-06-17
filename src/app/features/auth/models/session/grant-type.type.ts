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
