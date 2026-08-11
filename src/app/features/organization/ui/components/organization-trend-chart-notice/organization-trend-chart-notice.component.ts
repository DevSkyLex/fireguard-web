import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';

/**
 * Type OrganizationTrendChartNoticeVariant
 *
 * @description
 * Which live-region role the notice announces as: `muted` for a permission
 * denial (nothing actionable, not urgent) and `error` for a load failure
 * (worth interrupting a screen reader for).
 *
 * @since 1.1.0
 */
export type OrganizationTrendChartNoticeVariant = 'muted' | 'error';

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
 * The host's `role` tracks {@link variant} rather than a fixed `status`: a
 * load failure is announced as `alert` (worth interrupting a screen reader
 * for), a permission denial stays `status` (nothing actionable, no urgency).
 *
 * @version 1.1.0
 *
 * @example
 * ```html
 * <app-organization-trend-chart-notice icon="lucideTriangleAlert" variant="error" [message]="trendLoadErrorMessage">
 *   <button hlmBtn variant="outline" size="sm" (click)="retryOverviewTrend()">Retry</button>
 * </app-organization-trend-chart-notice>
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-trend-chart-notice',
  imports: [NgIcon],
  host: { class: 'block', '[attr.role]': 'role()' },
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

  /**
   * Property variant
   * @readonly
   *
   * @description
   * Which condition the notice reports — decides the host's live-region
   * role (§10.10 is not in play here: this is an accessibility switch, not a
   * domain enum). Defaults to `muted` (`role="status"`), the permission-denial
   * case; a load failure passes `error` for `role="alert"`.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<OrganizationTrendChartNoticeVariant>}
   */
  public readonly variant: InputSignal<OrganizationTrendChartNoticeVariant> =
    input<OrganizationTrendChartNoticeVariant>('muted');
  //#endregion

  //#region Properties
  /**
   * Property role
   * @readonly
   * @description The host's ARIA role, derived from {@link variant}.
   * @access protected
   * @since 1.1.0
   * @type {Signal<'alert' | 'status'>}
   */
  protected readonly role: Signal<'alert' | 'status'> = computed(() =>
    this.variant() === 'error' ? 'alert' : 'status',
  );
  //#endregion
}
