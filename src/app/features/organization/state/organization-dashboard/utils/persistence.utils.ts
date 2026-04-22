import type { OrganizationDashboardGranularity } from '@features/organization/models';

/**
 * @constant DASHBOARD_PERSISTENCE_VERSION
 *
 * @description
 * Version stamp embedded in every persisted dashboard filter payload.
 * Increment this value in a future release to invalidate stale payloads
 * written by older app versions and fall back gracefully to defaults.
 *
 * @since 1.0.0
 */
export const DASHBOARD_PERSISTENCE_VERSION = 1 as const;

/**
 * Type PersistedDashboardBaseFilters
 *
 * @description
 * Serializable shape of the three base dashboard filter fields that
 * are common to every trend widget store. Extended by each widget's
 * own persisted type to include dimension-specific filters.
 *
 * @since 1.0.0
 */
export type PersistedDashboardBaseFilters = {
  readonly _v: typeof DASHBOARD_PERSISTENCE_VERSION;
  readonly granularity: OrganizationDashboardGranularity;
  readonly dateRange: [string, string] | null;
  readonly compareEnabled: boolean;
};

/**
 * @function buildDashboardStorageKey
 *
 * @description
 * Builds an organization-scoped, widget-scoped `localStorage` key to
 * prevent cross-organization filter pollution when the user has multiple
 * organizations in the same browser session.
 *
 * @param {string} organizationId - Active organization identifier.
 * @param {string} widgetKey      - Short, stable identifier for the widget (e.g. `'inspection-quality'`).
 * @returns {string} Namespaced localStorage key.
 *
 * @since 1.0.0
 */
export function buildDashboardStorageKey(organizationId: string, widgetKey: string): string {
  return `org-dashboard:${organizationId}:${widgetKey}`;
}

/**
 * @function serializeDateRange
 *
 * @description
 * Converts a `Date[]` filter range to a tuple of ISO-8601 strings suitable
 * for JSON serialization. Returns `null` if the range is absent or incomplete.
 *
 * @param {Date[] | null} range - Date filter range from store state.
 * @returns {[string, string] | null} Serialized range, or null.
 *
 * @since 1.0.0
 */
export function serializeDateRange(range: Date[] | null): [string, string] | null {
  if (!range || range.length < 2 || !range[0] || !range[1]) return null;
  return [range[0].toISOString(), range[1].toISOString()];
}

/**
 * @function deserializeDateRange
 *
 * @description
 * Parses a serialized ISO-string date range back into `Date` objects.
 * Returns `null` if either date is invalid so that the store falls back
 * to its default range.
 *
 * @param {[string, string] | null} iso - Serialized range from localStorage.
 * @returns {[Date, Date] | null} Parsed dates, or null on failure.
 *
 * @since 1.0.0
 */
export function deserializeDateRange(iso: [string, string] | null): [Date, Date] | null {
  if (!iso) return null;
  const from = new Date(iso[0]);
  const to = new Date(iso[1]);
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return null;
  return [from, to];
}

/**
 * @function readDashboardStorage
 *
 * @description
 * Safely reads and parses a persisted dashboard filter payload from
 * `localStorage`. Returns `null` on any failure (missing key, invalid
 * JSON, type mismatch, version mismatch) so that callers can fall back
 * gracefully to default state without throwing.
 *
 * Must only be called in a browser context (`isPlatformBrowser` guard).
 *
 * @template T - Extends `PersistedDashboardBaseFilters`.
 * @param {string} key - The `localStorage` key to read from.
 * @returns {T | null} Parsed payload, or null.
 *
 * @since 1.0.0
 */
export function readDashboardStorage<T extends PersistedDashboardBaseFilters>(
  key: string,
): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      (parsed as Record<string, unknown>)['_v'] !== DASHBOARD_PERSISTENCE_VERSION
    ) {
      return null;
    }
    return parsed as T;
  } catch {
    return null;
  }
}

/**
 * @function writeDashboardStorage
 *
 * @description
 * Serializes a dashboard filter payload to `localStorage`. Silently
 * ignores errors (quota exceeded, private-browsing restrictions) to
 * avoid surfacing non-critical storage failures to the user.
 *
 * Must only be called in a browser context (`isPlatformBrowser` guard).
 *
 * @template T - The persisted payload type.
 * @param {string} key   - The `localStorage` key to write to.
 * @param {T}      value - The payload to serialize.
 * @returns {void}
 *
 * @since 1.0.0
 */
export function writeDashboardStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or private browsing — silently ignore.
  }
}
