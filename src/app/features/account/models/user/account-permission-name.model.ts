/**
 * Constant ACCOUNT_PERMISSION
 *
 * @description
 * Canonical global permission names exposed by the account feature.
 *
 * A const object is preferred over a TypeScript enum so consumers keep strict
 * typing and autocomplete without adding enum runtime output.
 *
 * @since 1.0.0
 */
export const ACCOUNT_PERMISSION = {
  USERS_CREATE: 'users.create',
  USERS_READ: 'users.read',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',
  USERS_ALL: 'users.*',
  CLIENTS_CREATE: 'clients.create',
  CLIENTS_READ: 'clients.read',
  CLIENTS_UPDATE: 'clients.update',
  CLIENTS_DELETE: 'clients.delete',
  CLIENTS_ALL: 'clients.*',
  ROLES_READ: 'roles.read',
  ROLES_CREATE: 'roles.create',
  ROLES_UPDATE: 'roles.update',
  ROLES_DELETE: 'roles.delete',
  ROLES_ASSIGN: 'roles.assign',
  ROLES_ALL: 'roles.*',
  PERMISSIONS_READ: 'permissions.read',
  PERMISSIONS_MANAGE: 'permissions.manage',
  SESSIONS_READ: 'sessions.read',
  SESSIONS_REVOKE: 'sessions.revoke',
  OTP_CONFIG_READ: 'otp_config.read',
  OTP_CHALLENGES_CREATE: 'otp_challenges.create',
  OTP_CHALLENGES_READ: 'otp_challenges.read',
  OTP_CHALLENGES_VERIFY: 'otp_challenges.verify',
  OTP_CHALLENGES_RESEND: 'otp_challenges.resend',
  OTP_CHALLENGES_ALL: 'otp_challenges.*',
  OTP_TOTP_SETUP: 'otp_totp.setup',
  TRUSTED_DEVICES_CREATE: 'trusted_devices.create',
  TRUSTED_DEVICES_READ: 'trusted_devices.read',
  TRUSTED_DEVICES_REVOKE: 'trusted_devices.revoke',
  TRUSTED_DEVICES_ALL: 'trusted_devices.*',
  TENANTS_CREATE: 'tenants.create',
  TENANTS_READ: 'tenants.read',
  TENANTS_UPDATE: 'tenants.update',
  TENANTS_DELETE: 'tenants.delete',
  TENANTS_ALL: 'tenants.*',
  AUDIT_READ: 'audit.read',
  AUDIT_EXPORT: 'audit.export',
  AUDIT_ALL: 'audit.*',
  PROFILE_READ: 'profile.read',
  PROFILE_UPDATE: 'profile.update',
  ALL: '*.*',
} as const;

/**
 * Type AccountPermissionName
 *
 * @description
 * Union of all known global permission names.
 */
export type AccountPermissionName = (typeof ACCOUNT_PERMISSION)[keyof typeof ACCOUNT_PERMISSION];

/**
 * Constant ACCOUNT_PERMISSION_NAMES
 *
 * @description
 * Flat list of all known global permission names.
 */
export const ACCOUNT_PERMISSION_NAMES: ReadonlyArray<AccountPermissionName> =
  Object.values(ACCOUNT_PERMISSION);
