import { TestBed } from '@angular/core/testing';
import { LocalePreferenceService } from '@core/locale';
import type { AppLocaleSubPath } from '@core/locale';
import { AccountSettingsPanel } from '../account-settings-panel.component';

interface PanelInternals {
  changeLanguage(subPath: AppLocaleSubPath): void;
  resetLanguage(): void;
}

interface MockLocalePreferenceService {
  readonly setLocale: ReturnType<typeof vi.fn<(subPath: AppLocaleSubPath) => void>>;
  readonly useBrowserDefault: ReturnType<typeof vi.fn<() => void>>;
}

describe('AccountSettingsPanel', () => {
  const setup = (): { component: PanelInternals; mockLocale: MockLocalePreferenceService } => {
    const mockLocale: MockLocalePreferenceService = {
      setLocale: vi.fn<(subPath: AppLocaleSubPath) => void>(),
      useBrowserDefault: vi.fn<() => void>(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: LocalePreferenceService, useValue: mockLocale }],
    });

    const component = TestBed.runInInjectionContext(
      () => new AccountSettingsPanel(),
    ) as unknown as PanelInternals;
    return { component, mockLocale };
  };

  it('should apply an explicit language choice through the locale service', () => {
    const { component, mockLocale } = setup();

    component.changeLanguage('fr');

    expect(mockLocale.setLocale).toHaveBeenCalledWith('fr');
  });

  it('should clear the explicit choice to follow the browser language', () => {
    const { component, mockLocale } = setup();

    component.resetLanguage();

    expect(mockLocale.useBrowserDefault).toHaveBeenCalledTimes(1);
  });
});
