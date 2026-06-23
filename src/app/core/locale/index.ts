export { LocalePreferenceService } from './services/locale-preference/locale-preference.service';
export {
  DEFAULT_LOCALE_SUBPATH,
  LANG_COOKIE_NAME,
  SUPPORTED_LOCALES,
  SUPPORTED_LOCALE_SUBPATHS,
} from './constants/app-locale.constants';
export type { AppLocaleOption, AppLocaleSubPath } from './models/app-locale.type';
export {
  isSupportedLocale,
  localeSubPathFromPathname,
  matchAcceptLanguage,
  parseCookieHeader,
  resolveLocaleFromRequest,
  stripLocaleFromPathname,
} from './utils/locale-resolution.utils';
