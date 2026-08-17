import type { CookieOptions } from '@core/cookie';

/**
 * One year. A working list-sort preference should outlive a session; nothing
 * persisted through this codec is sensitive — a sort field and a direction.
 */
const LIST_SORT_PREFERENCES_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Function decodeListSortCookie
 * @function decodeListSortCookie
 *
 * @description
 * Decodes a list-sort preferences cookie into a plain record, answering with
 * an empty record for anything that is not a JSON object — absent,
 * truncated, or hand-edited. A cookie is user-editable and survives
 * deployments, so this never throws.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {string | null} raw - The raw cookie value, as read from `CookieService`.
 *
 * @returns {Record<string, unknown>} The decoded record, or `{}` when it could not be decoded.
 */
export function decodeListSortCookie(raw: string | null): Record<string, unknown> {
  if (!raw) return {};

  try {
    const parsed: unknown = JSON.parse(raw);

    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/**
 * Function resolvePersistedListSort
 * @function resolvePersistedListSort
 *
 * @description
 * Validates a decoded sort field/direction pair against the field whitelist
 * a given list actually supports, falling back to `defaultSort` whole when
 * the field is missing or no longer supported. When the field is valid, the
 * direction falls back to `defaultSort.direction` unless the stored value is
 * exactly the opposite direction.
 *
 * @access public
 * @since 1.0.0
 *
 * @template TField - The literal union of sort fields the calling list supports.
 *
 * @param {unknown} storedField - The decoded field, before validation.
 * @param {unknown} storedDirection - The decoded direction, before validation.
 * @param {(field: string) => field is TField} isSupportedField - Narrows a string to a field this build supports.
 * @param {{ readonly field: TField; readonly direction: 'asc' | 'desc' }} defaultSort - Ordering used when nothing usable was stored.
 *
 * @returns {{ readonly field: TField; readonly direction: 'asc' | 'desc' }} The restored ordering.
 */
export function resolvePersistedListSort<TField extends string>(
  storedField: unknown,
  storedDirection: unknown,
  isSupportedField: (field: string) => field is TField,
  defaultSort: { readonly field: TField; readonly direction: 'asc' | 'desc' },
): { readonly field: TField; readonly direction: 'asc' | 'desc' } {
  if (typeof storedField !== 'string' || !isSupportedField(storedField)) return defaultSort;

  const oppositeDirection: 'asc' | 'desc' = defaultSort.direction === 'asc' ? 'desc' : 'asc';

  return {
    field: storedField,
    direction: storedDirection === oppositeDirection ? oppositeDirection : defaultSort.direction,
  };
}

/**
 * Function buildListSortCookieOptions
 * @function buildListSortCookieOptions
 *
 * @description
 * Builds the `CookieOptions` a list-sort preference is written with: a
 * one-year, path-rooted, `Lax` cookie. Callers pass the result straight to
 * `CookieService.setCookie`.
 *
 * @access public
 * @since 1.0.0
 *
 * @template TValue - The type of the cookie's persisted value.
 *
 * @param {string} name - The cookie name.
 * @param {TValue} value - The value to persist, typically a JSON-serialized payload.
 *
 * @returns {CookieOptions<TValue>} The options to pass to `CookieService.setCookie`.
 */
export function buildListSortCookieOptions<TValue>(
  name: string,
  value: TValue,
): CookieOptions<TValue> {
  return {
    name,
    value,
    path: '/',
    maxAge: LIST_SORT_PREFERENCES_COOKIE_MAX_AGE,
    sameSite: 'Lax',
  };
}
