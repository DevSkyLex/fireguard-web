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
  DASHBOARD_SECONDARY_SIDEBAR_CONTRIBUTION,
  type DashboardSecondarySidebarContribution,
} from '@core/ports/dashboard-secondary-sidebar';

/**
 * Component DashboardLayoutSecondarySidebar
 * @class DashboardLayoutSecondarySidebar
 *
 * @description
 * Generic slot host rendered to the right of the primary sidebar when at
 * least one secondary sidebar contribution is active. Resolves the
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
 * { provide: DASHBOARD_SECONDARY_SIDEBAR_CONTRIBUTION, useFactory: ..., multi: true }
 * ```
 *
 * @version 2.0.0
 *
 * @example
 * ```html
 * <app-dashboard-layout-secondary-sidebar />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-dashboard-layout-secondary-sidebar',
  imports: [NgComponentOutlet],
  templateUrl: './dashboard-layout-secondary-sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayoutSecondarySidebar {
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
   * @type {DashboardSecondarySidebarContribution[]}
   */
  private readonly contributions: DashboardSecondarySidebarContribution[] =
    inject<DashboardSecondarySidebarContribution[]>(
      DASHBOARD_SECONDARY_SIDEBAR_CONTRIBUTION,
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
      const active = [...this.contributions]
        .sort(
          (a: DashboardSecondarySidebarContribution, b: DashboardSecondarySidebarContribution) =>
            b.priority - a.priority,
        )
        .find((c: DashboardSecondarySidebarContribution) => c.isActive());

      return active?.component ?? null;
    },
  );
  //#endregion
}
