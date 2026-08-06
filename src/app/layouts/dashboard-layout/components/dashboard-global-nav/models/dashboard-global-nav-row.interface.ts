/**
 * Interface DashboardGlobalNavRow
 * @interface DashboardGlobalNavRow
 *
 * @description
 * One catalog entry the shell has decided to render, with its final link — so
 * the template draws a row rather than resolving one.
 *
 * @since 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface DashboardGlobalNavRow {
  /** Stable identity, used as the `@for` track and as the DOM hook. */
  readonly id: string;
  /** Rendered label, also the accessible name on the icon rail. */
  readonly label: string;
  /** Registered lucide icon name, resolved by the rendering component. */
  readonly icon: string;
  /** The link to render, or `null` for a destination that does not exist yet. */
  readonly resolvedRoute: string | null;
}
