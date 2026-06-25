import type { Signal, Type } from '@angular/core';

/**
 * Interface ShowcaseContribution
 * @interface ShowcaseContribution
 *
 * @description
 * A component contributed to the split layout showcase slot (the branded left
 * panel). The slot is mono-active: the host renders the highest-`priority`
 * contribution whose `active` signal is currently `true`, mirroring the
 * dashboard aside slot contract.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ShowcaseContribution {
  /** Stable identifier of the contribution. */
  readonly id: string;
  /** Resolution priority; the highest active contribution wins the slot. */
  readonly priority: number;
  /** Component rendered in the slot. */
  readonly component: Type<unknown>;
  /** Reactive activation flag gating whether the contribution can claim the slot. */
  readonly active: Signal<boolean>;
}
