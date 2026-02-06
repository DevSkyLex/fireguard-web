/**
 * OAuth2 Models
 *
 * @description
 * Models for OAuth2/OpenID Connect operations.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */

export type { GrantType } from './grant-type.type';
export { GRANT_TYPES, isGrantType } from './grant-type.type';
export type { TokenOutput } from './token-output.interface';
export type { UserInfoOutput } from './userinfo-output.interface';
