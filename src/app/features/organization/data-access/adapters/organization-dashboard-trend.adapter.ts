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
 * chart datasets without mismatched indices. A sparse bucket is zero-filled;
 * an explicitly present point whose value is unavailable remains `null`.
 *
 * @since 1.0.0
 * @type {AlignedDashboardTrendSeries}
 */
export type AlignedDashboardTrendSeries = {
  /**
   * Property buckets
   * @readonly
   *
   * @description Sorted ISO bucket strings shared by all datasets.
   * @access public
   * @since 1.0.0
   * @type {readonly string[]}
   */
  readonly buckets: readonly string[];

  /**
   * Property labels
   * @readonly
   *
   * @description Localized labels corresponding to each bucket in the same order.
   * @access public
   * @since 1.0.0
   * @type {readonly string[]}
   */
  readonly labels: readonly string[];

  /**
   * Property datasets
   * @readonly
   *
   * @description One dataset per input series, with null reserved for unavailable point values.
   * @access public
   * @since 1.0.0
   * @type {readonly (readonly (number | null)[])[]}
   */
  readonly datasets: readonly (readonly (number | null)[])[];
};

/**
 * Function getDashboardTrendPointBucket
 *
 * @description
 * Extracts the time-bucket key from a trend series point. Tries the
 * `bucket`, `date`, `label`, and `from` fields in that order and
 * coerces the result to a string.
 *
 * @access public
 * @since 1.0.0
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
 * `count`, `total`, and `value` fields in that order. Missing and non-finite
 * values stay unavailable instead of becoming a healthy-looking zero.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {OrganizationDashboardTrendSeriesPoint} point - The trend data point to inspect.
 * @returns {number | null} The finite numeric value, or null when unavailable.
 */
export function getDashboardTrendPointValue(
  point: OrganizationDashboardTrendSeriesPoint,
): number | null {
  const rawValue: unknown = point['count'] ?? point['total'] ?? point['value'];

  if (rawValue === null || rawValue === undefined || rawValue === '') return null;

  const value: number = Number(rawValue);
  return Number.isFinite(value) ? value : null;
}

/**
 * Function formatDashboardTrendBucket
 *
 * @description
 * Converts a raw ISO bucket string into a human-readable label in the active
 * application locale.
 *
 * - ISO week buckets (`YYYY-Www`) → `"Mon DD – Mon DD, YYYY"` range.
 * - Month buckets (`YYYY-MM`) → `"Mon YYYY"`.
 * - Day/datetime buckets → `"DD Mon YYYY"`.
 * - Unrecognised strings are returned unchanged.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {string} bucket - The raw ISO bucket string from the API.
 * @param {OrganizationDashboardGranularity} granularity - The active granularity.
 * @param {string} locale - Locale used by the date formatter.
 * @returns {string} A human-readable label for the bucket.
 */
export function formatDashboardTrendBucket(
  bucket: string,
  granularity: OrganizationDashboardGranularity,
  locale: string = 'en-US',
): string {
  if (!bucket) return '';

  const weekMatch = bucket.match(/^(\d{4})-W(\d{2})$/);

  if (weekMatch) {
    const year = Number.parseInt(weekMatch[1], 10);
    const week = Number.parseInt(weekMatch[2], 10);
    const jan4 = new Date(year, 0, 4);
    const dayOffset = (jan4.getDay() + 6) % 7;
    const weekStart = new Date(year, 0, 4 - dayOffset + (week - 1) * 7);
    const weekEnd = new Date(year, 0, 4 - dayOffset + (week - 1) * 7 + 6);
    const fromLabel = weekStart.toLocaleDateString(locale, {
      day: '2-digit',
      month: 'short',
    });
    const toLabel = weekEnd.toLocaleDateString(locale, {
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
    date = new Date(Number.parseInt(monthMatch[1], 10), Number.parseInt(monthMatch[2], 10) - 1, 1);
  } else if (dayMatch) {
    date = new Date(
      Number.parseInt(dayMatch[1], 10),
      Number.parseInt(dayMatch[2], 10) - 1,
      Number.parseInt(dayMatch[3], 10),
    );
  } else {
    date = new Date(bucket);
  }

  if (Number.isNaN(date.getTime())) return bucket;

  if (granularity === 'month') {
    return date.toLocaleDateString(locale, {
      month: 'short',
      year: 'numeric',
    });
  }

  if (granularity === 'week') {
    const weekEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 6);
    const fromLabel = date.toLocaleDateString(locale, {
      day: '2-digit',
      month: 'short',
    });
    const toLabel = weekEnd.toLocaleDateString(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    return `${fromLabel} - ${toLabel}`;
  }

  return date.toLocaleDateString(locale, {
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
 * @access public
 * @since 1.0.0
 *
 * @param {readonly (readonly OrganizationDashboardTrendSeriesPoint[] | null | undefined)[]} seriesCollection
 *   One array of trend points per dataset. Nullish entries are treated as empty.
 * @param {OrganizationDashboardGranularity} granularity - The active granularity used for label formatting.
 * @param {string} locale - Locale used for the shared bucket labels.
 * @returns {AlignedDashboardTrendSeries} The aligned result.
 */
export function alignDashboardTrendSeries(
  seriesCollection: readonly (
    | readonly OrganizationDashboardTrendSeriesPoint[]
    | null
    | undefined
  )[],
  granularity: OrganizationDashboardGranularity,
  locale: string = 'en-US',
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

  const buckets = Array.from(bucketSet).toSorted((left: string, right: string) =>
    left.localeCompare(right),
  );
  const labels = buckets.map((bucket: string) =>
    formatDashboardTrendBucket(bucket, granularity, locale),
  );
  const datasets = seriesCollection.map((series) => {
    if (series === null || series === undefined) return buckets.map(() => null);

    const valueByBucket = new Map<string, number | null>();

    for (const point of series) {
      const bucket = getDashboardTrendPointBucket(point);

      if (!bucket) continue;

      const value: number | null = getDashboardTrendPointValue(point);
      const previous: number | null | undefined = valueByBucket.get(bucket);

      if (value === null) {
        if (!valueByBucket.has(bucket)) valueByBucket.set(bucket, null);
        continue;
      }

      valueByBucket.set(bucket, (typeof previous === 'number' ? previous : 0) + value);
    }

    return buckets.map((bucket: string) =>
      valueByBucket.has(bucket) ? (valueByBucket.get(bucket) ?? null) : 0,
    );
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
 * @access public
 * @since 1.0.0
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
 * @access public
 * @since 1.0.0
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
 * Function getDashboardTrendSeriesValues
 *
 * @description
 * Maps a raw trend series into a dense numeric array by extracting the
 * value of each point in order. Nullish series are treated as empty.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {readonly OrganizationDashboardTrendSeriesPoint[] | null | undefined} series
 *   The raw trend series returned by the API.
 * @returns {(number | null)[]} The ordered values, preserving unavailable samples.
 */
export function getDashboardTrendSeriesValues(
  series: readonly OrganizationDashboardTrendSeriesPoint[] | null | undefined,
): (number | null)[] {
  return (series ?? []).map(getDashboardTrendPointValue);
}

/**
 * Function sumDashboardTrendValues
 *
 * @description
 * Returns the sum of all values in a numeric series.
 * Commonly used to produce the period-total KPI displayed above the chart.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {readonly (number | null)[]} values - The values to sum.
 * @returns {number | null} The total, or null when no finite value is available.
 */
export function sumDashboardTrendValues(values: readonly (number | null)[]): number | null {
  const available: number[] = values.filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value),
  );
  return available.length > 0 ? available.reduce((sum, value) => sum + value, 0) : null;
}

/**
 * Function sumTrendSeries
 *
 * @description
 * Convenience wrapper that extracts the numeric value from each point of
 * a raw trend series and returns their total. Handles nullish series
 * gracefully without manufacturing a total when every sample is unavailable.
 *
 * Typical use-case: computing period totals from a comparison series
 * without having to manually `.map(getDashboardTrendPointValue)` first.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {readonly OrganizationDashboardTrendSeriesPoint[] | null | undefined} series
 *   The raw series returned by the API, or nullish when not yet loaded.
 * @returns {number | null} The sum of all available point values, or null.
 */
export function sumTrendSeries(
  series: readonly OrganizationDashboardTrendSeriesPoint[] | null | undefined,
): number | null {
  return sumDashboardTrendValues(getDashboardTrendSeriesValues(series));
}
