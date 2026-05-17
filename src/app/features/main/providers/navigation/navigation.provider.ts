import { signal } from '@angular/core';
import type { MenuItem } from 'primeng/api';
import { SIDEBAR_NAVIGATION_SLOT } from '@layouts/dashboard-layout/slots/sidebar-navigation';
import type { MainFeature } from '../../main.feature';

/**
 * Feature withMainNavigation
 *
 * @description
 * Registers the Home section in the dashboard sidebar navigation slot.
 * Contributes a "Home" group containing the Home and Organizations links.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * provideMainFeature(withMainNavigation())
 * ```
 */
export function withMainNavigation(): MainFeature {
  return {
    providers: [
      {
        provide: SIDEBAR_NAVIGATION_SLOT,
        useFactory: () => ({
          id: 'home',
          order: 10,
          section: signal<MenuItem>({
            id: 'home',
            label: 'Home',
            expanded: true,
            items: [
              {
                id: 'home',
                label: 'Home',
                icon: 'pi pi-home',
                routerLink: '/',
              },
              {
                id: 'organizations',
                label: 'Organizations',
                icon: 'pi pi-sitemap',
                routerLink: '/organizations',
              },
            ],
          }),
        }),
        multi: true,
      },
    ],
  };
}
