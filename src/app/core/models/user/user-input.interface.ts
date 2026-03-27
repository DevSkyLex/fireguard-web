import type { UserOutput } from './user-output.interface';

type UserWritableFields = Pick<
  UserOutput,
  'username' | 'email' | 'firstName' | 'lastName' | 'avatarUrl' | 'tenantId'
>;

/**
 * Type UserInput
 *
 * @description
 * Payload used to create or replace a user resource.
 */
export type UserInput = UserWritableFields & {
  readonly password: string;
};
