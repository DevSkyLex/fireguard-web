import type { SlotComponentSource } from '../slot-component-source';

/**
 * Interface PageHeaderContribution
 * @interface PageHeaderContribution
 *
 * @description
 * A component contributed to the dashboard page header action slot (the
 * right-aligned area of the page title banner). Mirrors the topbar slot
 * contract: contributions are sorted by ascending `order` and rendered through
 * the shell's slot outlet, which accepts either an eager `component` or a
 * deferred `loadComponent` (see {@link SlotComponentSource}).
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface PageHeaderContribution extends SlotComponentSource {
  /** Stable identifier of the contribution. */
  readonly id: string;
  /** Ascending sort order within the action slot. */
  readonly order: number;
}
