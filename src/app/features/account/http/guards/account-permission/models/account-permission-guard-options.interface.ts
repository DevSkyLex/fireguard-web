import type { AccountPermissionName } from '@features/account/models';

export type AccountPermissionGuardMatch = 'all' | 'any';

export type AccountPermissionGuardRedirect =
  | ReadonlyArray<string>
  | (() => ReadonlyArray<string>);

export interface AccountPermissionGuardOptions {
  permissions: ReadonlyArray<AccountPermissionName>;
  match?: AccountPermissionGuardMatch;
  redirectTo?: AccountPermissionGuardRedirect;
}
