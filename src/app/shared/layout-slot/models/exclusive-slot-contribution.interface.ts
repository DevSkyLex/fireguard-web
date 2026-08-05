import type { Signal, Type } from '@angular/core';

/**
 * Interface ExclusiveSlotContribution
 * @interface ExclusiveSlotContribution
 *
 * @description
 * A component contributed to a **mono-active** layout slot: the host renders
 * the highest-`priority` contribution whose `active` signal is currently true,
 * and nothing at all when none is.
 *
 * Use this shape when the region can only hold one thing at a time — a branded
 * showcase panel, a contextual side panel — and the contributions compete for
 * it rather than stack.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ExclusiveSlotContribution {
  /** Stable identifier of the contribution. */
  readonly id: string;
  /** Resolution priority; the highest active contribution wins the slot. */
  readonly priority: number;
  /** Component rendered in the slot. */
  readonly component: Type<unknown>;
  /** Reactive activation flag gating whether the contribution can claim the slot. */
  readonly active: Signal<boolean>;
}
