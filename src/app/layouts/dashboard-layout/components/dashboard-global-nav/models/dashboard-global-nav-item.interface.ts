/**
 * Interface DashboardGlobalNavItem
 * @interface DashboardGlobalNavItem
 *
 * @description
 * One destination of the shell's global navigation: the part of the sidebar
 * that belongs to no organization and is therefore listed everywhere.
 *
 * @since 1.0.0
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
  /** Absolute route, or `null` while the destination does not exist yet. */
  readonly route: string | null;
}
