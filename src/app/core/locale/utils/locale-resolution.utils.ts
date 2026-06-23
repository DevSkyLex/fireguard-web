import {
  DEFAULT_LOCALE_SUBPATH,
  LANG_COOKIE_NAME,
  SUPPORTED_LOCALE_SUBPATHS,
} from '../constants/app-locale.constants';
import type { AppLocaleSubPath } from '../models/app-locale.type';

/**
 * Function isSupportedLocale
 *
 * @description
 * Type guard narrowing an arbitrary string to a supported locale sub-path.
 *
 * @param {string | null | undefined} value - Candidate sub-path.
 * @returns {boolean} `true` when the value is a supported locale sub-path.
 */
export function isSupportedLocale(value: string | null | undefined): value is AppLocaleSubPath {
  return value != null && (SUPPORTED_LOCALE_SUBPATHS as ReadonlyArray<string>).includes(value);
}

/**
 * Function parseCookieHeader
 *
 * @description
 * Parses a raw `Cookie` header into a name/value map. Dependency-free so it can
 * run both in the Express SSR server and in the browser.
 *
 * @param {string | null | undefined} header - Raw cookie header.
 * @returns {Record<string, string>} Decoded cookie name/value pairs.
 */
export function parseCookieHeader(header: string | null | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;

  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;

    const name = part.slice(0, separator).trim();
    if (!name) continue;

    cookies[name] = decodeURIComponent(part.slice(separator + 1).trim());
  }

  return cookies;
}

/**
 * Function matchAcceptLanguage
 *
 * @description
 * Resolves the best supported locale from an `Accept-Language` header, honoring
 * quality (`q`) weighting and matching on the primary language sub-tag.
 *
 * @param {string | null | undefined} header - Raw `Accept-Language` header.
 * @returns {AppLocaleSubPath | null} The best supported match, or `null`.
 */
export function matchAcceptLanguage(header: string | null | undefined): AppLocaleSubPath | null {
  if (!header) return null;

  const ranked = header
    .split(',')
    .map((entry) => {
      const [tag, ...params] = entry.trim().split(';');
      const quality = params.find((param) => param.trim().startsWith('q='));
      const weight = quality ? Number.parseFloat(quality.trim().slice(2)) : 1;
      return { tag: tag.trim().toLowerCase(), weight: Number.isNaN(weight) ? 0 : weight };
    })
    .filter((entry) => entry.tag.length > 0)
    .toSorted((a, b) => b.weight - a.weight);

  for (const { tag } of ranked) {
    const base = tag.split('-')[0];
    if (isSupportedLocale(base)) return base;
  }

  return null;
}

/**
 * Function resolveLocaleFromRequest
 *
 * @description
 * Resolves the locale to serve for an incoming SSR request, applying the
 * precedence: explicit cookie choice, then browser `Accept-Language`, then the
 * default source locale.
 *
 * @param {string | null | undefined} cookieHeader - Raw `Cookie` header.
 * @param {string | null | undefined} acceptLanguageHeader - Raw `Accept-Language` header.
 * @returns {AppLocaleSubPath} The resolved locale sub-path.
 */
export function resolveLocaleFromRequest(
  cookieHeader: string | null | undefined,
  acceptLanguageHeader: string | null | undefined,
): AppLocaleSubPath {
  const cookieLocale = parseCookieHeader(cookieHeader)[LANG_COOKIE_NAME];
  if (isSupportedLocale(cookieLocale)) return cookieLocale;

  return matchAcceptLanguage(acceptLanguageHeader) ?? DEFAULT_LOCALE_SUBPATH;
}

/**
 * Function localeSubPathFromPathname
 *
 * @description
 * Extracts the locale sub-path from a URL pathname when its first segment is a
 * supported locale (e.g. `/es/account` -> `es`).
 *
 * @param {string} pathname - URL pathname.
 * @returns {AppLocaleSubPath | null} The leading locale sub-path, or `null`.
 */
export function localeSubPathFromPathname(pathname: string): AppLocaleSubPath | null {
  const segment = pathname.split('/')[1];
  return isSupportedLocale(segment) ? segment : null;
}

/**
 * Function stripLocaleFromPathname
 *
 * @description
 * Removes a leading supported locale sub-path from a pathname, always returning
 * an absolute path (`/es/account` -> `/account`, `/es` -> `/`).
 *
 * @param {string} pathname - URL pathname, possibly locale-prefixed.
 * @returns {string} The pathname without its locale prefix.
 */
export function stripLocaleFromPathname(pathname: string): string {
  const segment = pathname.split('/')[1];
  if (!isSupportedLocale(segment)) return pathname;

  const rest = pathname.slice(segment.length + 1);
  return rest.length > 0 ? rest : '/';
}
