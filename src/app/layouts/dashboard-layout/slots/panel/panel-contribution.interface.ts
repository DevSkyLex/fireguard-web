import type { Signal } from '@angular/core';
import type { SlotComponentSource } from '../slot-component-source';

/**
 * Interface PanelContribution
 * @interface PanelContribution
 *
 * @description
 * A contextual right-hand panel offered to the dashboard shell: the
 * conversation info panel, the intervention rail, the assistant, the map
 * sidebar. The shell renders at most one or two at a time depending on
 * viewport width, and falls back to an overlay drawer below `lg`.
 *
 * **Registration is unconditional; visibility is reactive.** Angular resolves a
 * multi-provider array once per injector, and `provideDashboardLayoutSlots` runs
 * in a route's `providers` — a child route builds a *child* injector that the
 * already-constructed layout never reads. So a contribution can never be added
 * or removed at runtime, and wrapping the read in `computed()` changes nothing
 * because the source array is immutable. Gate on {@link available} instead.
 * `NavigationContribution.section` already works this way, and is the only slot
 * that behaves correctly today.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface PanelContribution extends SlotComponentSource {
  /**
   * Stable key used to open, close and identify the panel.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Sort order among the registered panels, ascending.
   *
   * @type {number}
   */
  readonly order: number;

  // The panel body comes from `SlotComponentSource`: either `component` (a
  // class) or `loadComponent` (a deferred loader). A panel is closed on first
  // paint, so it should almost always use `loadComponent`.

  /**
   * Header label. A signal because most panels title themselves after the
   * entity they describe.
   *
   * @type {Signal<string>}
   */
  readonly title: Signal<string>;

  /**
   * PrimeIcons class for the shell's toggle button.
   *
   * @type {string}
   */
  readonly icon: string;

  /**
   * Whether the panel applies to the current route and permissions. False hides
   * both the panel and its toggle. Panels that always apply may omit it.
   *
   * @type {Signal<boolean> | undefined}
   */
  readonly available?: Signal<boolean>;
}
