import type { Type } from '@angular/core';

/**
 * HeaderActionContribution
 * @interface HeaderActionContribution
 *
 * @description
 * Neutral contract that a feature publishes to inject an action
 * into the dashboard header's right-hand action bar. The layout
 * resolves the full list, sorts by `order`, and renders each
 * component via `NgComponentOutlet`.
 *
 * Features register contributions via:
 * ```typescript
 * { provide: HEADER_ACTION_SLOT, useFactory: ..., multi: true }
 * ```
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface HeaderActionContribution {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Unique identifier for the contribution.
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
   * Rendering order in the action bar. Lower values appear first (left).
   *
   * @since 1.0.0
   *
   * @type {number}
   */
  readonly order: number;

  /**
   * Property component
   * @readonly
   *
   * @description
   * The standalone component class to instantiate in the header action bar.
   *
   * @since 1.0.0
   *
   * @type {Type<unknown>}
   */
  readonly component: Type<unknown>;
}
