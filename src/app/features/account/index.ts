export {
  NOTIFICATION_CENTER_PORT,
  USER_ACCESS_PORT,
  USER_IDENTITY_PORT,
  USER_PROFILE_PORT,
} from './ports';
export type {
  NotificationCenterPort,
  ShellUserProfile,
  UserAccessPort,
  UserIdentityPort,
  UserProfilePort,
} from './ports';
export { ACCOUNT_PERMISSION, ACCOUNT_PERMISSION_NAMES } from './models';
export type { AccountPermissionName } from './models';
export { UserPermissionService } from './access';
export { accountPermissionGuard } from './http/guards';
export type {
  AccountPermissionGuardMatch,
  AccountPermissionGuardOptions,
  AccountPermissionGuardRedirect,
} from './http/guards';
export { provideAccountFeature } from './account.feature';
export { withAccountNavigation, withAccountProfile, withNotificationBell } from './providers';
export { NotificationBell, AccountUserMenu } from './ui/components';
