import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Type ShowcaseMetric
 * @typedef ShowcaseMetric
 *
 * @description
 * A single headline metric rendered in the auth showcase panel.
 *
 * @since 1.0.0
 */
type ShowcaseMetric = {
  readonly label: string;
  readonly value: string;
};

const SHOWCASE_METRICS: readonly ShowcaseMetric[] = [
  { label: $localize`:@@splitLayout.metric.liveAlerts:Live alerts`, value: '24/7' },
  {
    label: $localize`:@@splitLayout.metric.responseWorkflows:Response workflows`,
    value: $localize`:@@splitLayout.metric.automated:Automated`,
  },
  {
    label: $localize`:@@splitLayout.metric.complianceTracking:Compliance tracking`,
    value: $localize`:@@splitLayout.metric.isoReady:ISO-ready`,
  },
];

const SHOWCASE_HIGHLIGHTS: readonly string[] = [
  $localize`:@@splitLayout.highlight.commandCenter:Unified safety command center`,
  $localize`:@@splitLayout.highlight.rbac:Role-based access and approvals`,
  $localize`:@@splitLayout.highlight.auditHistory:Audit-ready incident history`,
];

/**
 * Component AuthShowcase
 * @class AuthShowcase
 *
 * @description
 * Branded marketing panel rendered in the split layout showcase slot on the
 * authentication pages (login, register, password reset). It is auth-owned
 * content contributed to the layout through `withAuthShowcase()`; the layout
 * renders it generically without knowing what it shows.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-auth-showcase />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-auth-showcase',
  imports: [],
  templateUrl: './auth-showcase.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthShowcase {
  /**
   * Property metrics
   * @readonly
   *
   * @description
   * Headline metrics displayed in the showcase grid.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly ShowcaseMetric[]}
   */
  protected readonly metrics: readonly ShowcaseMetric[] = SHOWCASE_METRICS;

  /**
   * Property highlights
   * @readonly
   *
   * @description
   * Bullet highlights displayed at the foot of the showcase.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly string[]}
   */
  protected readonly highlights: readonly string[] = SHOWCASE_HIGHLIGHTS;
}
