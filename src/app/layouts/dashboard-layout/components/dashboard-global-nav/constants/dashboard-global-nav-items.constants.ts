import type { DashboardGlobalNavItem } from '../models';

/**
 * Constant DASHBOARD_GLOBAL_NAV_ITEMS
 * @const DASHBOARD_GLOBAL_NAV_ITEMS
 *
 * @description
 * The global destinations, in rendering order. They are listed whether or not
 * an organization is selected, which is what keeps the top of the sidebar
 * identical on an organization page and on a global one.
 *
 * A `null` route names a destination that does not exist yet: the row is
 * rendered as unavailable rather than omitted, so the shape of the product is
 * visible, and rather than linked, so no one lands on a 404. Give it its route
 * in the same change that mounts the page.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const DASHBOARD_GLOBAL_NAV_ITEMS: readonly DashboardGlobalNavItem[] = [
  {
    id: 'assistant',
    label: $localize`:@@dashboard.nav.assistant:Assistant`,
    icon: 'lucideSparkles',
    route: null,
  },
  {
    id: 'messages',
    label: $localize`:@@dashboard.nav.messages:Live messages`,
    icon: 'lucideMessageSquare',
    route: null,
  },
  {
    id: 'support',
    label: $localize`:@@dashboard.nav.support:Support`,
    icon: 'lucideLifeBuoy',
    route: null,
  },
];
