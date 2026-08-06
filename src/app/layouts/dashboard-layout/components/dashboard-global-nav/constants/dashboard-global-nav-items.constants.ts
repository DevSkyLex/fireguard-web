import { ORGANIZATION_PERMISSION } from '@features/organization';
import type { DashboardGlobalNavItem } from '../models';

/**
 * Constant DASHBOARD_GLOBAL_NAV_ITEMS
 * @const DASHBOARD_GLOBAL_NAV_ITEMS
 *
 * @description
 * The bottom of the sidebar, in rendering order: the utilities that sit under
 * the work and stay in place from one section to the next.
 *
 * A `null` route names a destination that does not exist yet: the row is
 * rendered as unavailable rather than omitted, so the shape of the product is
 * visible, and rather than linked, so no one lands on a 404. Give it its route
 * in the same change that mounts the page.
 *
 * Messaging is organization-scoped on the API, yet it belongs here rather than
 * among the organization's sections: direct conversations follow the reader,
 * not the workspace they happen to have open. The route is completed with
 * whichever organization that is, and the row is hidden from a member without
 * the permission to read it.
 *
 * @since 2.0.0
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
    id: 'support',
    label: $localize`:@@dashboard.nav.support:Support`,
    icon: 'lucideLifeBuoy',
    route: null,
  },
  {
    id: 'messages',
    label: $localize`:@@dashboard.nav.messages:Messages`,
    icon: 'lucideMessageSquare',
    route: 'messages',
    organizationScoped: true,
    permissions: [ORGANIZATION_PERMISSION.MESSAGING_READ],
  },
];
