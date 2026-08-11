import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';

/**
 * Component OrganizationTrendChartNotice
 * @class OrganizationTrendChartNotice
 *
 * @description
 * The compact icon + message block one trend chart card shows in place of
 * its plot — a permission denial or a load failure — with an optional
 * projected action (a Retry button; nothing for a permission denial, since
 * there is nothing to retry). Replaces the four chart cards' own bare `<p>`
 * on `OrganizationStatisticsPage`; feature-owned rather than promoted to
 * `shared/` since every usage stays inside that one page today
 * (`ARCHITECTURE.md` §2.9/§7).
 *
 * The caller registers `icon` with `provideIcons()` so this concept pulls in
 * no icon set of its own, matching `EmptyState`'s / `ErrorState`'s
 * convention.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-organization-trend-chart-notice icon="lucideTriangleAlert" [message]="trendLoadErrorMessage">
 *   <button hlmBtn variant="outline" size="sm" (click)="retryOverviewTrend()">Retry</button>
 * </app-organization-trend-chart-notice>
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-trend-chart-notice',
  imports: [NgIcon],
  host: { class: 'block', role: 'status' },
  templateUrl: './organization-trend-chart-notice.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationTrendChartNotice {
  //#region Inputs
  /**
   * Property icon
   * @readonly
   *
   * @description
   * Registered lucide icon name, decorative.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly icon: InputSignal<string> = input.required<string>();

  /**
   * Property message
   * @readonly
   *
   * @description
   * The localized sentence explaining what happened, already resolved by
   * the caller.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly message: InputSignal<string> = input.required<string>();
  //#endregion
}
