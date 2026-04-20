import type { OrganizationPermissionName } from '@features/organization/models';

/**
 * Type OrganizationPermissionGuardMatch
 * @type OrganizationPermissionGuardMatch
 *
 * @description
 * Strategy used by `organizationPermissionGuard` when evaluating the
 * required organization-scoped permissions.
 */
export type OrganizationPermissionGuardMatch = 'all' | 'any';

/**
 * Type OrganizationPermissionGuardRedirect
 * @type OrganizationPermissionGuardRedirect
 *
 * @description
 * Redirect target used when the guard denies access.
 *
 * - When a static command array is provided, it is passed directly to the router.
 * - When a callback is provided, it receives the resolved organization ID.
 */
export type OrganizationPermissionGuardRedirect =
  | ReadonlyArray<string>
  | ((organizationId: string) => ReadonlyArray<string>);

/**
 * Interface OrganizationPermissionGuardOptions
 * @interface OrganizationPermissionGuardOptions
 *
 * @description
 * Configuration object used by `organizationPermissionGuard`.
 */
export interface OrganizationPermissionGuardOptions {
  /** Organization-scoped permissions required to access the route. */
  readonly permissions: ReadonlyArray<OrganizationPermissionName>;

  /** Matching strategy. Defaults to `'all'`. */
  readonly match?: OrganizationPermissionGuardMatch;

  /** Optional redirect target when access is denied. */
  readonly redirectTo?: OrganizationPermissionGuardRedirect;
}
