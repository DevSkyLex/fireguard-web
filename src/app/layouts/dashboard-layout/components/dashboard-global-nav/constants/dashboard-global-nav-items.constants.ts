import type { DashboardGlobalNavItem } from '../models';

/**
 * Constant DASHBOARD_GLOBAL_NAV_ITEMS
 * @const DASHBOARD_GLOBAL_NAV_ITEMS
 *
 * @description
 * The bottom of the sidebar, in rendering order: the utilities that sit under
 * the work and stay in place from one section to the next.
 *
 * A `null` route names a destination that does not exist yet — Support today:
 * the row is rendered as unavailable rather than omitted, so the shape of the
 * product is visible, and rather than linked, so no one lands on a 404. Give it
 * its route in the same change that mounts the page.
 *
 * Only a **destination** belongs here. A capability that opens over the current
 * page instead of replacing it has no URL and no place in a navigation list;
 * the assistant left for the header's action cluster for exactly that reason.
 * Messages and Collaboration are organization-scoped destinations owned by
 * the collaboration feature and contributed through `CollaborationNav`.
 *
 * @since 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const DASHBOARD_GLOBAL_NAV_ITEMS: readonly DashboardGlobalNavItem[] = [
  {
    id: 'support',
    label: $localize`:@@dashboard.nav.support:Support`,
    icon: 'lucideLifeBuoy',
    route: null,
  },
];
