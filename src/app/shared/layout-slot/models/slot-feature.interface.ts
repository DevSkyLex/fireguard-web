import type { ExclusiveSlotContribution } from './exclusive-slot-contribution.interface';
import type { SlotContribution } from './slot-contribution.interface';

/**
 * Interface SlotFeature
 * @interface SlotFeature
 *
 * @description
 * What a `with<Thing>()` contribution factory returns. The factory itself is
 * deferred, so a contribution may call `inject()` — it is executed by the
 * injector when the layout resolves the slot, not when the route is declared.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface SlotFeature<TContribution> {
  /** Factory producing the contribution, run inside the layout's injector. */
  readonly useFactory: () => TContribution;
}

/**
 * AdditiveSlotFeature
 *
 * @description
 * Return type of a `with<Thing>()` helper contributing to an additive slot.
 *
 * @since 1.0.0
 */
export type AdditiveSlotFeature = SlotFeature<SlotContribution>;

/**
 * ExclusiveSlotFeature
 *
 * @description
 * Return type of a `with<Thing>()` helper contributing to a mono-active slot.
 *
 * @since 1.0.0
 */
export type ExclusiveSlotFeature = SlotFeature<ExclusiveSlotContribution>;
