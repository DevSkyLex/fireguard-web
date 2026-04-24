import type { Signal } from '@angular/core';
import type { MenuItem } from 'primeng/api';

/**
 * SidebarNavigationContribution
 * @interface SidebarNavigationContribution
 *
 * @description
 * Contract that a feature publishes to inject sections into the
 * dashboard primary sidebar. The layout aggregates all registered
 * contributions, applies the active search query filter and renders
 * the resulting `MenuItem[]` tree.
 *
 * Ownership: this contract lives in `layouts/dashboard-layout/slots`
 * because the dashboard sidebar is the sole consumer of the slot.
 * Features import this contract from the layout's public API
 * (`@layouts/dashboard-layout/slots/sidebar-navigation`).
 *
 * Features register contributions via:
 * ```typescript
 * { provide: SIDEBAR_NAVIGATION_SLOT, useFactory: ..., multi: true }
 * ```
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface SidebarNavigationContribution {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Unique identifier for the contribution. Used to deduplicate
   * sections when multiple providers register the same id.
   *
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property order
   * @readonly
   *
   * @description
   * Insertion order for the section in the sidebar. Lower value
   * appears first. Sections with equal order keep registration order.
   *
   * @since 1.0.0
   *
   * @type {number}
   */
  readonly order: number;

  /**
   * Property section
   * @readonly
   *
   * @description
   * Reactive signal returning the `MenuItem` section to render, or
   * `null` when the contribution is not currently applicable (e.g. no
   * active organization). A `null` value causes the section to be
   * omitted from the sidebar.
   *
   * @since 1.0.0
   *
   * @type {Signal<MenuItem | null>}
   */
  readonly section: Signal<MenuItem | null>;
}
