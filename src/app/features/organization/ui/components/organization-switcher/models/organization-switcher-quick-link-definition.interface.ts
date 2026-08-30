import type { OrganizationPermissionName } from '@features/organization/models';

/**
 * Interface OrganizationSwitcherQuickLinkDefinition
 * @interface OrganizationSwitcherQuickLinkDefinition
 *
 * @description
 * One quick-link's permission contract, before it is resolved against the
 * active organization into an {@link OrganizationSwitcherQuickLink}.
 *
 * @since 3.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface OrganizationSwitcherQuickLinkDefinition {
  /** Stable identifier, also the destination's route path when `path` is unset. */
  readonly id: string;
  /** Display label. */
  readonly label: string;
  /** Registered lucide icon name. */
  readonly icon: string;
  /** Route segment appended to the organization prefix. */
  readonly path: string;
  /** Extra query parameters the destination needs, or `null`. */
  readonly queryParams: Readonly<Record<string, string>> | null;
  /** Permissions gating the destination. */
  readonly permissions: ReadonlyArray<OrganizationPermissionName>;
  /** Whether every permission or just one must be granted. */
  readonly match: 'all' | 'any';
}
