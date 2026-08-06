import type { OrganizationPermissionName } from '@features/organization';

/**
 * Interface DashboardGlobalNavItem
 * @interface DashboardGlobalNavItem
 *
 * @description
 * One destination of the shell's bottom navigation: the utilities that sit
 * under the work, listed on every page rather than per section.
 *
 * Most belong to no organization. One may still be organization-scoped —
 * {@link organizationScoped} prefixes its route with whichever organization is
 * open, and {@link permissions} hides it from a member who could not reach it.
 *
 * @since 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface DashboardGlobalNavItem {
  /** Stable identity, used as the `@for` track and as the DOM hook. */
  readonly id: string;
  /** Rendered label, also the accessible name on the icon rail. */
  readonly label: string;
  /** Registered lucide icon name, resolved by the rendering component. */
  readonly icon: string;
  /** Route, or `null` while the destination does not exist yet. Absolute unless {@link organizationScoped}. */
  readonly route: string | null;
  /** Whether {@link route} is relative to the open organization rather than absolute. */
  readonly organizationScoped?: boolean;
  /** Organization permissions of which the member needs at least one; absent means always listed. */
  readonly permissions?: ReadonlyArray<OrganizationPermissionName>;
}
