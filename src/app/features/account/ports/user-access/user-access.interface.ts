import type { Signal } from '@angular/core';

/**
 * UserAccessPort
 * @interface UserAccessPort
 *
 * @description
 * Account-owned contract publishing the resolved global roles and permissions
 * of the authenticated user to approved consumers.
 */
export interface UserAccessPort {
  readonly roles: Signal<ReadonlyArray<string>>;
  readonly permissions: Signal<ReadonlyArray<string>>;
}
