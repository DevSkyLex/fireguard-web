export type PrimeTagSeverity = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';

export interface OverviewToggleOption {
  readonly label: string;
  readonly value: string;
}

export interface OverviewQuickAction {
  readonly label: string;
  readonly description: string;
  readonly route: string;
  readonly icon: string;
}

export interface OverviewHeadlineMetric {
  readonly label: string;
  readonly value: string;
  readonly helper: string;
  readonly badgeLabel: string;
  readonly badgeSeverity: PrimeTagSeverity;
}

export interface OverviewPulseReadout {
  readonly label: string;
  readonly value: string;
  readonly helper: string;
}

export interface OverviewFocusBoardItem {
  readonly label: string;
  readonly value: string;
  readonly helper: string;
  readonly severity: PrimeTagSeverity;
}

export interface OverviewMeterValue {
  readonly label: string;
  readonly value: number;
  readonly color: string;
}
