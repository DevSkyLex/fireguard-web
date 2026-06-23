import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LocalePreferenceService } from '@core/locale';
import type { AppLocaleSubPath } from '@core/locale';
import { AccountLanguageForm } from '../../forms';

/**
 * Component AccountSettingsPanel
 * @class AccountSettingsPanel
 *
 * @description
 * Container for the personal preferences section. Hosts the display-language
 * picker and wires it to the app-wide {@link LocalePreferenceService}. Kept as a
 * dedicated panel (mirroring {@link AccountProfilePanel}) so the "Settings" tab
 * can grow with further preferences without bloating the profile panel.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-account-settings-panel',
  imports: [AccountLanguageForm],
  templateUrl: './account-settings-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountSettingsPanel {
  //#region Properties
  /**
   * Property localePreference
   * @readonly
   *
   * @description
   * App-wide locale service used to read the active display language and apply a
   * new language choice (a hard navigation to the locale bundle).
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {LocalePreferenceService}
   */
  protected readonly localePreference: LocalePreferenceService =
    inject<LocalePreferenceService>(LocalePreferenceService);
  //#endregion

  //#region Methods
  /**
   * Method changeLanguage
   * @method changeLanguage
   *
   * @description
   * Applies an explicit display-language choice, persisting it and navigating to
   * the matching locale bundle.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {AppLocaleSubPath} subPath - Locale sub-path selected by the user.
   * @returns {void}
   */
  protected changeLanguage(subPath: AppLocaleSubPath): void {
    this.localePreference.setLocale(subPath);
  }

  /**
   * Method resetLanguage
   * @method resetLanguage
   *
   * @description
   * Clears the explicit language choice so the interface follows the browser
   * language again.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected resetLanguage(): void {
    this.localePreference.useBrowserDefault();
  }
  //#endregion
}
