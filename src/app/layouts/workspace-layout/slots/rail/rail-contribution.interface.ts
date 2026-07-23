import type { Type } from '@angular/core';

/**
 * Type RailRegion
 * @type RailRegion
 *
 * @description
 * Vertical region of the workspace rail a contribution docks into. `lead`
 * stacks from the top (organization tiles), `footer` is pinned to the bottom
 * (the seat avatar and its menu).
 *
 * @since 1.0.0
 */
export type RailRegion = 'lead' | 'footer';

/**
 * Interface RailContribution
 * @interface RailContribution
 *
 * @description
 * A component contributed to the workspace rail — the 60px column pinned to
 * the far left of the shell. The slot is additive: every contribution renders,
 * sorted by `order` within its `region`.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface RailContribution {
  /** Stable identifier of the contribution. */
  readonly id: string;
  /** Sort key within the region; lower renders first. */
  readonly order: number;
  /** Region the contribution docks into. Defaults to `lead` when omitted. */
  readonly region?: RailRegion;
  /** Component rendered in the slot. */
  readonly component: Type<unknown>;
}
