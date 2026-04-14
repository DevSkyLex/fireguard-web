import type {
  OrganizationDashboardGranularity,
  OrganizationDashboardTrendSeriesPoint,
} from '@features/organization/models';

/**
 * Type AlignedDashboardTrendSeries
 *
 * @description
 * Result of {@link alignDashboardTrendSeries}. Provides a common sorted
 * bucket axis for N sparse series so they can be rendered as aligned
 * Chart.js datasets without gaps or mismatched indices.
 */
export type AlignedDashboardTrendSeries = {
  /** Sorted ISO bucket strings shared by all datasets. */
  readonly buckets: readonly string[];
  /** Human-readable labels corresponding to each bucket (same order). */
  readonly labels: readonly string[];
  /** One `number[]` per input series, zero-filled for missing buckets. */
  readonly datasets: readonly number[][];
};

/**
 * Function getDashboardTrendPointBucket
 *
 * @description
 * Extracts the time-bucket key from a trend series point. Tries the
 * `bucket`, `date`, `label`, and `from` fields in that order and
 * coerces the result to a string.
 *
 * @param {OrganizationDashboardTrendSeriesPoint} point - The trend data point to inspect.
 * @returns {string} The bucket key, or an empty string if none found.
 */
export function getDashboardTrendPointBucket(point: OrganizationDashboardTrendSeriesPoint): string {
  return String(point['bucket'] ?? point['date'] ?? point['label'] ?? point['from'] ?? '');
}

/**
 * Function getDashboardTrendPointValue
 *
 * @description
 * Extracts the numeric value from a trend series point. Tries the
 * `count`, `total`, and `value` fields in that order.
 *
 * @param {OrganizationDashboardTrendSeriesPoint} point - The trend data point to inspect.
 * @returns {number} The numeric value, or 0 if none found.
 */
export function getDashboardTrendPointValue(point: OrganizationDashboardTrendSeriesPoint): number {
  return Number(point['count'] ?? point['total'] ?? point['value'] ?? 0);
}

/**
 * Function formatDashboardTrendBucket
 *
 * @description
 * Converts a raw ISO bucket string into a human-readable en-US label.
 *
 * - ISO week buckets (`YYYY-Www`) → `"Mon DD – Mon DD, YYYY"` range.
 * - Month buckets (`YYYY-MM`) → `"Mon YYYY"`.
 * - Day/datetime buckets → `"DD Mon YYYY"`.
 * - Unrecognised strings are returned unchanged.
 *
 * @param {string} bucket - The raw ISO bucket string from the API.
 * @param {OrganizationDashboardGranularity} granularity - The active granularity.
 * @returns {string} A human-readable label for the bucket.
 */
export function formatDashboardTrendBucket(
  bucket: string,
  granularity: OrganizationDashboardGranularity,
): string {
  if (!bucket) return '';

  const weekMatch = bucket.match(/^(\d{4})-W(\d{2})$/);

  if (weekMatch) {
    const year = parseInt(weekMatch[1], 10);
    const week = parseInt(weekMatch[2], 10);
    const jan4 = new Date(year, 0, 4);
    const dayOffset = (jan4.getDay() + 6) % 7;
    const weekStart = new Date(year, 0, 4 - dayOffset + (week - 1) * 7);
    const weekEnd = new Date(year, 0, 4 - dayOffset + (week - 1) * 7 + 6);
    const fromLabel = weekStart.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
    });
    const toLabel = weekEnd.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    return `${fromLabel} - ${toLabel}`;
  }

  const monthMatch = bucket.match(/^(\d{4})-(\d{2})$/);
  const dayMatch = bucket.match(/^(\d{4})-(\d{2})-(\d{2})/);

  let date: Date;

  if (monthMatch) {
    date = new Date(parseInt(monthMatch[1], 10), parseInt(monthMatch[2], 10) - 1, 1);
  } else if (dayMatch) {
    date = new Date(
      parseInt(dayMatch[1], 10),
      parseInt(dayMatch[2], 10) - 1,
      parseInt(dayMatch[3], 10),
    );
  } else {
    date = new Date(bucket);
  }

  if (Number.isNaN(date.getTime())) return bucket;

  if (granularity === 'month') {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  }

  if (granularity === 'week') {
    const weekEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 6);
    const fromLabel = date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
    });
    const toLabel = weekEnd.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    return `${fromLabel} - ${toLabel}`;
  }

  return date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Function alignDashboardTrendSeries
 *
 * @description
 * Takes N sparse series (each containing only the buckets where events
 * occurred) and produces a fully-aligned {@link AlignedDashboardTrendSeries}
 * whose datasets all share the same sorted bucket axis with zero-fill
 * for missing entries.
 *
 * This is the primary utility that prevents Chart.js from misaligning
 * grouped bars when series have different bucket sets.
 *
 * @param {readonly (readonly OrganizationDashboardTrendSeriesPoint[] | null | undefined)[]} seriesCollection
 *   One array of trend points per dataset. Nullish entries are treated as empty.
 * @param {OrganizationDashboardGranularity} granularity - The active granularity used for label formatting.
 * @returns {AlignedDashboardTrendSeries} The aligned result.
 */
export function alignDashboardTrendSeries(
  seriesCollection: readonly (
    | readonly OrganizationDashboardTrendSeriesPoint[]
    | null
    | undefined
  )[],
  granularity: OrganizationDashboardGranularity,
): AlignedDashboardTrendSeries {
  const bucketSet = new Set<string>();

  for (const series of seriesCollection) {
    for (const point of series ?? []) {
      const bucket = getDashboardTrendPointBucket(point);

      if (bucket) {
        bucketSet.add(bucket);
      }
    }
  }

  const buckets = Array.from(bucketSet).sort((left: string, right: string) =>
    left.localeCompare(right),
  );
  const labels = buckets.map((bucket: string) => formatDashboardTrendBucket(bucket, granularity));
  const datasets = seriesCollection.map((series) => {
    const valueByBucket = new Map<string, number>();

    for (const point of series ?? []) {
      const bucket = getDashboardTrendPointBucket(point);

      if (!bucket) continue;

      valueByBucket.set(
        bucket,
        (valueByBucket.get(bucket) ?? 0) + getDashboardTrendPointValue(point),
      );
    }

    return buckets.map((bucket: string) => valueByBucket.get(bucket) ?? 0);
  });

  return {
    buckets,
    labels,
    datasets,
  };
}

/**
 * Function buildDifferenceSeries
 *
 * @description
 * Computes an element-wise difference (`left[i] - right[i]`) between two
 * numeric series. Missing right-side values default to 0.
 *
 * Typical use-case: deriving a "net pressure" series from opened and
 * resolved non-conformity datasets.
 *
 * @param {readonly number[]} left - The minuend series.
 * @param {readonly number[]} right - The subtrahend series.
 * @returns {number[]} A new array of element-wise differences.
 */
export function buildDifferenceSeries(left: readonly number[], right: readonly number[]): number[] {
  return left.map((value, index) => value - (right[index] ?? 0));
}

/**
 * Function buildPercentageSeries
 *
 * @description
 * Computes an element-wise percentage (`(numerator[i] / denominator[i]) * 100`)
 * with configurable decimal precision. Returns 0 for any bucket where the
 * denominator is zero or negative, guarding against division-by-zero.
 *
 * @param {readonly number[]} numerator - The dividend series.
 * @param {readonly number[]} denominator - The divisor series.
 * @param {number} [precision=1] - Number of decimal places to round to.
 * @returns {number[]} A new array of percentage values.
 */
export function buildPercentageSeries(
  numerator: readonly number[],
  denominator: readonly number[],
  precision: number = 1,
): number[] {
  return numerator.map((value, index) => {
    const divisor = denominator[index] ?? 0;

    if (divisor <= 0) return 0;

    return Number(((value / divisor) * 100).toFixed(precision));
  });
}

/**
 * Function sumDashboardTrendValues
 *
 * @description
 * Returns the sum of all values in a numeric series.
 * Commonly used to produce the period-total KPI displayed above the chart.
 *
 * @param {readonly number[]} values - The values to sum.
 * @returns {number} The total.
 */
export function sumDashboardTrendValues(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0);
}
