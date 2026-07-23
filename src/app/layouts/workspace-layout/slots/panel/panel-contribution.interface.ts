import type { Signal, Type } from '@angular/core';

/**
 * Interface PanelContribution
 * @interface PanelContribution
 *
 * @description
 * A component contributed to the workspace right-hand panel. The slot is
 * mono-active: the host renders the highest-`priority` contribution whose
 * `active` signal is currently `true`, mirroring the split layout showcase
 * contract.
 *
 * Priorities reproduce the source prototype's rules — the assistant outranks
 * everything, otherwise the panel matching the current view claims the slot.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface PanelContribution {
  /** Stable identifier of the contribution. */
  readonly id: string;
  /** Resolution priority; the highest active contribution wins the slot. */
  readonly priority: number;
  /** Component rendered in the slot. */
  readonly component: Type<unknown>;
  /** Reactive activation flag gating whether the contribution can claim the slot. */
  readonly active: Signal<boolean>;
  /**
   * Desktop width of the panel, as a **literal** Tailwind class
   * (`'lg:w-[330px]'`, `'lg:w-[360px]'`, …). Each panel owns its own width —
   * the prototype's four panels are 330/344/360/340px — so the layout does not
   * impose a shared one.
   *
   * Tailwind has no safelist here, so this must be a literal string in the
   * contributing file; a computed value silently produces no class.
   */
  readonly widthClass: string;
  /** Accessible label announced for the panel region. */
  readonly ariaLabel: string;
}
