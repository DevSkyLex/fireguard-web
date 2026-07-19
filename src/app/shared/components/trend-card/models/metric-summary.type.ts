import type { MetricComparison } from './metric-comparison.type';

export type MetricSummary = {
  readonly label: string;
  readonly value: string;
  readonly icon: string | null;
  readonly comparison?: MetricComparison | null;
};
