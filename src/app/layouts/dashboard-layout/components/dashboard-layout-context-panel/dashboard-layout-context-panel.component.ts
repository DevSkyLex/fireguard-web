import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  type Signal,
  type Type,
} from '@angular/core';
import {
  CONTEXT_PANEL_SLOT,
  type ContextPanelContribution,
} from '@layouts/dashboard-layout/slots/context-panel';

/**
 * Component DashboardLayoutContextPanel
 * @class DashboardLayoutContextPanel
 *
 * @description
 * Generic slot host rendered to the right of the primary sidebar when at
 * least one context panel contribution is active. Resolves the
 * highest-priority active contribution and renders its component class
 * dynamically via `NgComponentOutlet`.
 *
 * The component is intentionally thin: it owns the slot structure
 * (scroll area, height constraints) but has no knowledge of what
 * content it renders. Content ownership stays with the contributing
 * feature.
 *
 * Features register contributions via:
 * ```typescript
 * { provide: CONTEXT_PANEL_SLOT, useFactory: ..., multi: true }
 * ```
 *
 * @version 2.0.0
 *
 * @example
 * ```html
 * <app-dashboard-layout-context-panel />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-dashboard-layout-context-panel',
  imports: [NgComponentOutlet],
  templateUrl: './dashboard-layout-context-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayoutContextPanel {
  //#region Properties
  /**
   * Property contributions
   * @readonly
   *
   * @description
   * All registered secondary sidebar contributions, injected as a
   * multi-provider array. Optional: defaults to an empty array when
   * no feature has registered a contribution.
   *
   * @access private
   * @since 2.0.0
   *
   * @type {ContextPanelContribution[]}
   */
  private readonly contributions: ContextPanelContribution[] =
    inject<ContextPanelContribution[]>(
      CONTEXT_PANEL_SLOT,
      { optional: true },
    ) ?? [];

  /**
   * Property activeComponent
   * @readonly
   *
   * @description
   * The component class of the highest-priority active contribution, or
   * `null` when no contribution is currently active.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {Signal<Type<unknown> | null>}
   */
  public readonly activeComponent: Signal<Type<unknown> | null> = computed(
    (): Type<unknown> | null => {
      const active: ContextPanelContribution | undefined = [...this.contributions]
        .sort(
          (a: ContextPanelContribution, b: ContextPanelContribution) =>
            b.priority - a.priority,
        )
        .find((c: ContextPanelContribution) => c.active());

      return active?.component ?? null;
    },
  );
  //#endregion
}
