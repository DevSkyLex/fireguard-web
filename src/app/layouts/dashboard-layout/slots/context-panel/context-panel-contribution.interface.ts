import type { Signal, Type } from '@angular/core';

/**
 * ContextPanelContribution
 * @interface ContextPanelContribution
 *
 * @description
 * Neutral contract that a feature publishes to fill the dashboard
 * secondary sidebar slot. The layout resolves the highest-priority
 * active contribution and renders it via `NgComponentOutlet`.
 *
 * Ownership: this contract lives in `layouts/dashboard-layout/slots`
 * because the dashboard layout is the sole consumer of the slot.
 * Features that want to contribute import this contract from the
 * layout's public API (`@layouts/dashboard-layout/slots/context-panel`),
 * which is the standard plugin/extension-point direction.
 *
 * Features register contributions via:
 * ```typescript
 * { provide: CONTEXT_PANEL_SLOT, useFactory: ..., multi: true }
 * ```
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ContextPanelContribution {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Unique identifier for the
   * contribution.
   *
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property priority
   * @readonly
   *
   * @description
   * Resolution priority when multiple contributions are active simultaneously.
   * Higher value wins.
   *
   * @since 1.0.0
   *
   * @type {number}
   */
  readonly priority: number;

  /**
   * Property component
   * @readonly
   *
   * @description
   * The component class to instantiate in the slot
   * via `NgComponentOutlet`.
   *
   * @since 1.0.0
   *
   * @type {Type<unknown>}
   */
  readonly component: Type<unknown>;

  /**
   * Property active
   * @readonly
   *
   * @description
   * Signal that indicates whether the contribution should be rendered.
   * The layout listens to this signal and re-evaluates which contribution
   * to render whenever it emits a new value.
   *
   * @since 2.0.0
   *
   * @type {Signal<boolean>}
   */
  readonly active: Signal<boolean>;
}
