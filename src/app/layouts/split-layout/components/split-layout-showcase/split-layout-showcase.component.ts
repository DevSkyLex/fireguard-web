import { ChangeDetectionStrategy, Component } from '@angular/core';

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

@Component({
  selector: 'app-split-layout-showcase',
  imports: [],
  templateUrl: './split-layout-showcase.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SplitLayoutShowcase {
  protected readonly metrics: readonly ShowcaseMetric[] = SHOWCASE_METRICS;

  protected readonly highlights: readonly string[] = SHOWCASE_HIGHLIGHTS;
}
