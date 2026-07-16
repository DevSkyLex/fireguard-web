import type { Type } from '@angular/core';

/**
 * Interface SidebarContribution
 *
 * @description
 * A shell widget contributed to the dashboard sidebar. `region` decides
 * where the widget renders: `'lead'` between the brand row and the
 * navigation, `'footer'` pinned at the bottom of the sidebar.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface SidebarContribution {
  readonly id: string;
  readonly order: number;
  readonly region: 'lead' | 'footer';
  readonly component: Type<unknown>;
}
