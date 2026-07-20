import { TestBed } from '@angular/core/testing';
import { LocalePreferenceService } from '@core/locale';
import type { AppLocaleSubPath } from '@core/locale';
import type { UpdateCurrentUserProfileInput } from '@features/account/models';
import { AccountProfileEditStore } from '@features/account/state';
import { AccountSettingsPanel } from '../account-settings-panel.component';

interface PanelInternals {
  changeLanguage(subPath: AppLocaleSubPath): void;
  resetLanguage(): void;
}

interface MockLocalePreferenceService {
  readonly setLocale: ReturnType<typeof vi.fn<(subPath: AppLocaleSubPath) => void>>;
  readonly useBrowserDefault: ReturnType<typeof vi.fn<() => void>>;
}

interface MockProfileEditStore {
  readonly save: ReturnType<typeof vi.fn<(input: UpdateCurrentUserProfileInput) => void>>;
}

describe('AccountSettingsPanel', () => {
  const setup = (): {
    component: PanelInternals;
    mockLocale: MockLocalePreferenceService;
    mockStore: MockProfileEditStore;
  } => {
    const mockLocale: MockLocalePreferenceService = {
      setLocale: vi.fn<(subPath: AppLocaleSubPath) => void>(),
      useBrowserDefault: vi.fn<() => void>(),
    };
    const mockStore: MockProfileEditStore = {
      save: vi.fn<(input: UpdateCurrentUserProfileInput) => void>(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: LocalePreferenceService, useValue: mockLocale },
        { provide: AccountProfileEditStore, useValue: mockStore },
      ],
    });

    const component = TestBed.runInInjectionContext(
      () => new AccountSettingsPanel(),
    ) as unknown as PanelInternals;
    return { component, mockLocale, mockStore };
  };

  it('should apply an explicit language choice through the locale service', () => {
    const { component, mockLocale } = setup();

    component.changeLanguage('fr');

    expect(mockLocale.setLocale).toHaveBeenCalledWith('fr');
  });

  // The picker used to write only this browser's cookie, so a language chosen
  // on one device was gone on the next even though the API stores a `locale`.
  it('should persist the language on the account', () => {
    const { component, mockStore } = setup();

    component.changeLanguage('fr');

    expect(mockStore.save).toHaveBeenCalledWith({ locale: 'fr' });
  });

  it('should clear the explicit choice to follow the browser language', () => {
    const { component, mockLocale, mockStore } = setup();

    component.resetLanguage();

    expect(mockLocale.useBrowserDefault).toHaveBeenCalledTimes(1);
    // "Follow the browser" is a stored value of its own, not an absent one.
    expect(mockStore.save).toHaveBeenCalledWith({ locale: 'system' });
  });
});
