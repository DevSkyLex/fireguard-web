import type { Signal } from '@angular/core';
import type { SlotComponentSource } from '../slot-component-source';

/**
 * Interface TopbarContribution
 * @interface TopbarContribution
 *
 * @description
 * A control contributed to the shell header's right-hand action cluster. The
 * rendered component comes from {@link SlotComponentSource}: `component` for
 * the controls the shell paints immediately, `loadComponent` for anything that
 * would otherwise drag a heavy dependency into the eager graph.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface TopbarContribution extends SlotComponentSource {
  readonly id: string;
  readonly order: number;

  /**
   * Whether the action applies right now. Registration cannot be conditional —
   * see {@link PanelContribution} for why — so gate here instead. Actions that
   * always apply may omit it.
   *
   * @type {Signal<boolean> | undefined}
   */
  readonly available?: Signal<boolean>;
}
