import {
  isSupportedLocale,
  localeSubPathFromPathname,
  matchAcceptLanguage,
  parseCookieHeader,
  resolveLocaleFromRequest,
  stripLocaleFromPathname,
} from '../locale-resolution.utils';

describe('locale-resolution.utils', () => {
  describe('isSupportedLocale', () => {
    it('accepts supported sub-paths and rejects others', () => {
      expect(isSupportedLocale('fr')).toBe(true);
      expect(isSupportedLocale('es')).toBe(true);
      expect(isSupportedLocale('de')).toBe(false);
      expect(isSupportedLocale(null)).toBe(false);
      expect(isSupportedLocale(undefined)).toBe(false);
    });
  });

  describe('parseCookieHeader', () => {
    it('parses and decodes cookie pairs', () => {
      expect(parseCookieHeader('lang=es; theme=dark')).toEqual({ lang: 'es', theme: 'dark' });
    });

    it('returns an empty map for missing headers', () => {
      expect(parseCookieHeader(undefined)).toEqual({});
    });
  });

  describe('matchAcceptLanguage', () => {
    it('matches the highest quality supported language', () => {
      expect(matchAcceptLanguage('de-DE,fr;q=0.9,en;q=0.8')).toBe('fr');
    });

    it('matches on the primary sub-tag', () => {
      expect(matchAcceptLanguage('es-419,es;q=0.9')).toBe('es');
    });

    it('returns null when nothing is supported', () => {
      expect(matchAcceptLanguage('de,it')).toBeNull();
      expect(matchAcceptLanguage(undefined)).toBeNull();
    });
  });

  describe('resolveLocaleFromRequest', () => {
    it('prefers the explicit cookie choice', () => {
      expect(resolveLocaleFromRequest('lang=fr', 'es')).toBe('fr');
    });

    it('falls back to Accept-Language when no valid cookie', () => {
      expect(resolveLocaleFromRequest('lang=de', 'es-ES,es;q=0.9')).toBe('es');
      expect(resolveLocaleFromRequest(undefined, 'fr')).toBe('fr');
    });

    it('falls back to the default source locale otherwise', () => {
      expect(resolveLocaleFromRequest(undefined, undefined)).toBe('en');
      expect(resolveLocaleFromRequest('lang=de', 'it')).toBe('en');
    });
  });

  describe('localeSubPathFromPathname', () => {
    it('extracts a leading supported locale', () => {
      expect(localeSubPathFromPathname('/es/account')).toBe('es');
      expect(localeSubPathFromPathname('/account')).toBeNull();
    });
  });

  describe('stripLocaleFromPathname', () => {
    it('removes a leading locale and keeps an absolute path', () => {
      expect(stripLocaleFromPathname('/es/account')).toBe('/account');
      expect(stripLocaleFromPathname('/es')).toBe('/');
      expect(stripLocaleFromPathname('/account')).toBe('/account');
    });
  });
});
