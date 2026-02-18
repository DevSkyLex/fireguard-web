import { ChangeDetectionStrategy, Component } from '@angular/core';

type ShowcaseMetric = {
  readonly label: string;
  readonly value: string;
};

const SHOWCASE_METRICS: readonly ShowcaseMetric[] = [
  { label: 'Live alerts', value: '24/7' },
  { label: 'Response workflows', value: 'Automated' },
  { label: 'Compliance tracking', value: 'ISO-ready' },
];

const SHOWCASE_HIGHLIGHTS: readonly string[] = [
  'Unified safety command center',
  'Role-based access and approvals',
  'Audit-ready incident history',
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
