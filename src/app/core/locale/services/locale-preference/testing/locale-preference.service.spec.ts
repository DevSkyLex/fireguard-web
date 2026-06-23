import { DOCUMENT } from '@angular/common';
import { LOCALE_ID, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CookieService } from '@core/cookie';
import { LANG_COOKIE_NAME } from '../../../constants/app-locale.constants';
import { LocalePreferenceService } from '../locale-preference.service';

describe('LocalePreferenceService', () => {
  const assign = vi.fn();
  const cookie = { setCookie: vi.fn(), deleteCookie: vi.fn() };

  function setup(pathname: string, localeId = 'es'): LocalePreferenceService {
    const document = {
      location: { pathname, search: '', hash: '', assign },
    } as unknown as Document;

    TestBed.configureTestingModule({
      providers: [
        LocalePreferenceService,
        { provide: DOCUMENT, useValue: document },
        { provide: PLATFORM_ID, useValue: 'browser' },
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
    expect(assign).toHaveBeenCalledWith('/fr/account');
  });

  it('does nothing when selecting the active locale', () => {
    setup('/es/account').setLocale('es');

    expect(cookie.setCookie).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
  });

  it('clears the cookie and navigates to the locale-less path on browser default', () => {
    setup('/es/account').useBrowserDefault();

    expect(cookie.deleteCookie).toHaveBeenCalledWith(LANG_COOKIE_NAME);
    expect(assign).toHaveBeenCalledWith('/account');
  });
});
