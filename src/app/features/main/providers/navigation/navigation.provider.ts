import { signal } from '@angular/core';
import type { MenuItem } from 'primeng/api';
import type { DashboardLayoutNavigationSlotFeature } from '@layouts/dashboard-layout';

/**
 * Feature withMainNavigation
 *
 * @description
 * Registers the Home section in the dashboard sidebar navigation slot.
 * Contributes a "Home" group containing the Organizations link. The root path
 * (`/`) redirects to `/organizations`, so it has no separate nav entry.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * provideDashboardLayoutSlots({ navigation: [withMainNavigation()] })
 * ```
 */
export function withMainNavigation(): DashboardLayoutNavigationSlotFeature {
  return {
    useFactory: () => ({
      id: 'home',
      order: 10,
      section: signal<MenuItem>({
        id: 'home',
        label: 'Home',
        expanded: true,
        items: [
          {
            id: 'organizations',
            label: 'Organizations',
            icon: 'pi pi-sitemap',
            routerLink: '/organizations',
          },
        ],
      }),
    }),
  };
}
