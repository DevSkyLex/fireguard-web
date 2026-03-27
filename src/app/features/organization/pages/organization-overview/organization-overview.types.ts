export type PrimeTagSeverity = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';

/**
 * Type OverviewPulseFilter
 *
 * @description
 * Allowed filter values for the operations pulse switcher.
 */
export type OverviewPulseFilter = 'live' | '30days' | 'health' | 'risk' | 'all';

/**
 * Type OverviewQuickActionRoute
 *
 * @description
 * Child routes exposed by the organization overview shortcuts.
 */
export type OverviewQuickActionRoute = 'facilities' | 'equipments' | 'inspections';

/**
 * Interface OverviewToggleOption
 *
 * @description
 * Generic option contract used by toggle-based controls.
 */
export interface OverviewToggleOption<TValue extends string = string> {
  readonly label: string;
  readonly value: TValue;
}

/**
 * Interface OverviewQuickAction
 *
 * @description
 * Shortcut action displayed in the overview header.
 */
export interface OverviewQuickAction {
  readonly label: string;
  readonly description: string;
  readonly route: OverviewQuickActionRoute;
  readonly icon: string;
}

/**
 * Interface OverviewHeadlineMetric
 *
 * @description
 * Headline KPI card rendered above the dashboard.
 */
export interface OverviewHeadlineMetric {
  readonly label: string;
  readonly value: string;
  readonly helper: string;
  readonly badgeLabel: string;
  readonly badgeSeverity: PrimeTagSeverity;
}

/**
 * Interface OverviewPulseReadout
 *
 * @description
 * Compact readout item displayed below the operations chart.
 */
export interface OverviewPulseReadout {
  readonly label: string;
  readonly value: string;
  readonly helper: string;
}

/**
 * Interface OverviewBreakdownItem
 *
 * @description
 * Normalized breakdown item derived from keyed backend counts.
 */
export interface OverviewBreakdownItem {
  readonly label: string;
  readonly value: number;
}

/**
 * Interface OverviewFocusBoardItem
 *
 * @description
 * Insight tile displayed in the focus board sidebar.
 */
export interface OverviewFocusBoardItem {
  readonly label: string;
  readonly value: string;
  readonly helper: string;
  readonly severity: PrimeTagSeverity;
}

/**
 * Interface OverviewMeterValue
 *
 * @description
 * Severity segment consumed by PrimeNG MeterGroup.
 */
export interface OverviewMeterValue {
  readonly label: string;
  readonly value: number;
  readonly color: string;
}
