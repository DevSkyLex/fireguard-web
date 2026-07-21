import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LocalePreferenceService } from '@core/locale';
import type { AppLocaleSubPath } from '@core/locale';
import { AccountProfileEditStore } from '@features/account/state';
import { AccountLanguageForm } from '../../forms';

/**
 * Component AccountSettingsPanel
 * @class AccountSettingsPanel
 *
 * @description
 * Container for the personal preferences section. Hosts the display-language
 * picker and wires it to the app-wide {@link LocalePreferenceService}. Kept as
 * a dedicated panel, composed as an extra card inside {@link AccountProfilePanel}
 * so language and display preferences can grow without bloating the profile
 * form itself.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-account-settings-panel',
  imports: [AccountLanguageForm],
  // Own instance: the store is component-scoped, and this panel's locale save
  // is independent of the profile/avatar edits made through the host panel's
  // own AccountProfileEditStore instance.
  providers: [AccountProfileEditStore],
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

  /**
   * Property profileEditStore
   * @readonly
   *
   * @description
   * Persists the language on the account. The picker used to write only this
   * browser's cookie, so the choice was lost on the next device even though the
   * API has always stored a `locale`.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {AccountProfileEditStore}
   */
  private readonly profileEditStore: AccountProfileEditStore =
    inject<AccountProfileEditStore>(AccountProfileEditStore);
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
    // Save first: `setLocale` triggers a hard navigation to the locale bundle,
    // which tears down this component.
    this.profileEditStore.save({ locale: subPath });
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
    this.profileEditStore.save({ locale: 'system' });
    this.localePreference.useBrowserDefault();
  }
  //#endregion
}
