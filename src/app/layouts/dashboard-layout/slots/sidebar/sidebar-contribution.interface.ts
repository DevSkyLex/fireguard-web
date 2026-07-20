import type { Signal, Type } from '@angular/core';

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

  /**
   * Where the widget mounts. `rail` is the persistent organization rail on the
   * far left and `rail-end` its bottom edge (the account avatar); `lead` and
   * `footer` bracket the navigation list inside the channel sidebar; `content`
   * renders inside the sidebar's scroller, below the navigation — the channel
   * sections scroll with the nav, as one column.
   *
   * Regions on one token rather than separate slots: each region has exactly
   * one consumer today, and a token per consumer is the abstraction the rule
   * of three exists to prevent.
   *
   * @type {'rail' | 'rail-end' | 'lead' | 'content' | 'footer'}
   */
  readonly region: 'rail' | 'rail-end' | 'lead' | 'content' | 'footer';
  readonly component: Type<unknown>;

  /**
   * Whether the widget applies right now. Registration cannot be conditional —
   * see {@link PanelContribution} for why — so gate here instead. Widgets that
   * always apply may omit it.
   *
   * @type {Signal<boolean> | undefined}
   */
  readonly available?: Signal<boolean>;
}
