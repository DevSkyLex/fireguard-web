import { DOCUMENT } from '@angular/common';
import { LOCALE_ID, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CookieService } from '@core/cookie';
import { LANG_COOKIE_NAME } from '../../../constants/app-locale.constants';
import { LocalePreferenceService } from '../locale-preference.service';

describe('LocalePreferenceService', () => {
  const assign: ReturnType<typeof vi.fn> = vi.fn();
  const cookie: {
    getCookie: ReturnType<typeof vi.fn>;
    setCookie: ReturnType<typeof vi.fn>;
    deleteCookie: ReturnType<typeof vi.fn>;
  } = { getCookie: vi.fn(), setCookie: vi.fn(), deleteCookie: vi.fn() };

  function setup(
    pathname: string,
    localeId = 'es',
    options: { search?: string; hash?: string; platformId?: string } = {},
  ): LocalePreferenceService {
    const origin = 'https://app.fireguard.test';
    const search = options.search ?? '';
    const hash = options.hash ?? '';
    const document = {
      location: {
        pathname,
        search,
        hash,
        origin,
        href: `${origin}${pathname}${search}${hash}`,
        assign,
      },
    } as unknown as Document;

    TestBed.configureTestingModule({
      providers: [
        LocalePreferenceService,
        { provide: DOCUMENT, useValue: document },
        { provide: PLATFORM_ID, useValue: options.platformId ?? 'browser' },
        { provide: LOCALE_ID, useValue: localeId },
        { provide: CookieService, useValue: cookie },
      ],
    });

    return TestBed.inject(LocalePreferenceService);
  }

  afterEach(() => {
    vi.clearAllMocks();
    TestBed.resetTestingModule();
  });

  it('derives the active locale from the URL sub-path', () => {
    expect(setup('/es/account').current()).toBe('es');
  });

  it('persists the choice and navigates to the new locale sub-path', () => {
    setup('/es/account').setLocale('fr');

    expect(cookie.setCookie).toHaveBeenCalledWith(
      expect.objectContaining({ name: LANG_COOKIE_NAME, value: 'fr', path: '/' }),
    );
    expect(assign).toHaveBeenCalledWith('https://app.fireguard.test/fr/account');
  });

  it('persists an explicit preference without navigating when its locale is already active', () => {
    setup('/es/account').setLocale('es');

    expect(cookie.setCookie).toHaveBeenCalledWith(
      expect.objectContaining({ name: LANG_COOKIE_NAME, value: 'es', path: '/' }),
    );
    expect(assign).not.toHaveBeenCalled();
  });

  it('applies an explicit profile preference to the current route', () => {
    setup('/en/account').applyPreference('fr');

    expect(cookie.setCookie).toHaveBeenCalledWith(
      expect.objectContaining({ name: LANG_COOKIE_NAME, value: 'fr', path: '/' }),
    );
    expect(assign).toHaveBeenCalledWith('https://app.fireguard.test/fr/account');
  });

  it('leaves a browser-default preference alone when no explicit cookie remains', () => {
    cookie.getCookie.mockReturnValue(null);

    setup('/fr/account').applyPreference('system');

    expect(cookie.deleteCookie).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
  });

  it('clears a previous explicit locale when the profile returns to browser default', () => {
    cookie.getCookie.mockReturnValue('fr');

    setup('/fr/account').applyPreference('system');

    expect(cookie.deleteCookie).toHaveBeenCalledWith(LANG_COOKIE_NAME);
    expect(assign).toHaveBeenCalledWith('https://app.fireguard.test/account');
  });

  it('clears the cookie and navigates to the locale-less path on browser default', () => {
    setup('/es/account').useBrowserDefault();

    expect(cookie.deleteCookie).toHaveBeenCalledWith(LANG_COOKIE_NAME);
    expect(assign).toHaveBeenCalledWith('https://app.fireguard.test/account');
  });

  it.each(['/fr//attacker.example', '/fr/\\attacker.example'])(
    'keeps a system preference navigation on the current origin for %s',
    (pathname) => {
      cookie.getCookie.mockReturnValue('fr');

      setup(pathname).applyPreference('system');

      expect(cookie.deleteCookie).toHaveBeenCalledWith(LANG_COOKIE_NAME);
      expect(assign).toHaveBeenCalledWith('https://app.fireguard.test/attacker.example');
    },
  );

  it('preserves the route, query and fragment when switching explicit locales', () => {
    setup('/en/account//files', 'en', {
      search: '?return=%2F%2Fexample.test',
      hash: '#details',
    }).applyPreference('fr');

    expect(assign).toHaveBeenCalledWith(
      'https://app.fireguard.test/fr/account//files?return=%2F%2Fexample.test#details',
    );
  });

  it('preserves encoded double slashes, the query and the fragment on browser default', () => {
    setup('/fr/%2F%2Fattacker.example', 'fr', {
      search: '?tab=profile',
      hash: '#details',
    }).useBrowserDefault();

    expect(assign).toHaveBeenCalledWith(
      'https://app.fireguard.test/%2F%2Fattacker.example?tab=profile#details',
    );
  });

  it('blocks an origin-changing URL after URL parser normalization', () => {
    setup('/fr/\t/attacker.example').useBrowserDefault();

    expect(cookie.deleteCookie).toHaveBeenCalledWith(LANG_COOKIE_NAME);
    expect(assign).not.toHaveBeenCalled();
  });

  it('keeps preference reconciliation browser-only', () => {
    setup('/fr/account', 'fr', { platformId: 'server' }).applyPreference('system');

    expect(cookie.getCookie).not.toHaveBeenCalled();
    expect(cookie.deleteCookie).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
  });
});
