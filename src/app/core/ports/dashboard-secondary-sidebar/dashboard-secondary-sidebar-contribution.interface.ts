import type { Signal, Type } from '@angular/core';

/**
 * DashboardSecondarySidebarContribution
 * @interface DashboardSecondarySidebarContribution
 *
 * @description
 * Neutral contract that a feature publishes to fill the dashboard
 * secondary sidebar slot. The layout resolves the highest-priority
 * active contribution and renders it via `NgComponentOutlet`.
 *
 * Ownership: this contract lives in `core` so that feature providers
 * can depend on it without importing layout code, which would invert
 * the allowed dependency direction.
 *
 * Features register contributions via:
 * ```typescript
 * { provide: DASHBOARD_SECONDARY_SIDEBAR_CONTRIBUTION, useFactory: ..., multi: true }
 * ```
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface DashboardSecondarySidebarContribution {
  /** Unique identifier for the contribution. */
  readonly id: string;

  /**
   * Resolution priority when multiple contributions are active simultaneously.
   * Higher value wins.
   */
  readonly priority: number;

  /** The component class to instantiate in the slot via `NgComponentOutlet`. */
  readonly component: Type<unknown>;

  /**
   * Reactive signal controlling whether this contribution is currently active.
   * The layout watches all contributions and renders the first active one.
   */
  readonly isActive: Signal<boolean>;
}
