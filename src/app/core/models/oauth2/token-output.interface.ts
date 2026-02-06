import type { HydraItem } from '@core/models/api';
import type { TokenType } from '@core/models/auth';

/**
 * Interface TokenOutput
 * @interface TokenOutput
 *
 * @description
 * Response from OAuth2 token endpoint.
 * Returned by POST /api/oauth2/token.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * const token: TokenOutput = {
 *   '@id': '/api/oauth2/token',
 *   '@type': 'Token',
 *   access_token: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
 *   token_type: 'Bearer',
 *   expires_in: 3600,
 *   refresh_token: 'dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...',
 *   scope: 'openid profile email',
 *   id_token: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...'
 * };
 * ```
 */
export interface TokenOutput extends HydraItem {
  /**
   * Property access_token
   * @readonly
   *
   * @description
   * JWT access token for API authentication.
   *
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly access_token: string;

  /**
   * Property token_type
   * @readonly
   *
   * @description
   * Token type (always 'Bearer' per OAuth2 specification).
   *
   * @since 1.0.0
   *
   * @type {TokenType}
   */
  readonly token_type: TokenType;

  /**
   * Property expires_in
   * @readonly
   *
   * @description
   * Token lifetime in seconds from the time of issuance.
   *
   * @since 1.0.0
   *
   * @type {number}
   */
  readonly expires_in: number;

  /**
   * Property refresh_token
   * @readonly
   *
   * @description
   * Refresh token for obtaining new access tokens.
   * Only present when offline_access scope is granted.
   *
   * @since 1.0.0
   *
   * @type {string | null | undefined}
   */
  readonly refresh_token?: string | null;

  /**
   * Property scope
   * @readonly
   *
   * @description
   * Space-separated list of granted OAuth2 scopes.
   *
   * @since 1.0.0
   *
   * @type {string | null | undefined}
   */
  readonly scope?: string | null;

  /**
   * Property id_token
   * @readonly
   *
   * @description
   * OIDC ID token (JWT) containing identity claims.
   * Present when openid scope is granted.
   *
   * @since 1.0.0
   *
   * @type {string | null | undefined}
   */
  readonly id_token?: string | null;
}
