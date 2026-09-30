import type { UserOutput } from './user-output.interface';

/**
 * Type UserWritableFields
 *
 * @description
 * Server-writable profile fields shared by the user create and replacement payloads.
 *
 * @access private
 * @since 0.1.0
 *
 * @type {Pick<
 *   UserOutput,
 *   'username' | 'email' | 'firstName' | 'lastName' | 'avatarUrl' | 'tenantId'
 * >}
 */
type UserWritableFields = Pick<
  UserOutput,
  'username' | 'email' | 'firstName' | 'lastName' | 'avatarUrl' | 'tenantId'
>;

/**
 * Type UserInput
 *
 * @description
 * Payload used to create or replace a user resource.
 *
 * @type UserInput
 */
export type UserInput = UserWritableFields & {
  readonly password: string;
};
