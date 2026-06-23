import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { InputSignal, OutputEmitterRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { SUPPORTED_LOCALES } from '@core/locale';
import type { AppLocaleOption, AppLocaleSubPath } from '@core/locale';

/**
 * Component AccountLanguageForm
 * @class AccountLanguageForm
 *
 * @description
 * Presentational control letting the authenticated user pick the display
 * language of the interface. It emits the user's intent only — applying the
 * choice (which triggers a hard navigation to the locale bundle) is delegated
 * to the parent panel and the app-wide locale infrastructure.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-account-language-form
 *   [currentLocale]="locale.current()"
 *   (localeSelected)="changeLanguage($event)"
 *   (browserDefaultRequested)="resetLanguage()"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-account-language-form',
  imports: [FormsModule, ButtonModule, SelectModule],
  templateUrl: './account-language-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountLanguageForm {
  //#region Properties
  /**
   * Input currentLocale
   * @input
   *
   * @description
   * Currently active display-language sub-path, used to pre-select the picker.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<AppLocaleSubPath>}
   */
  public readonly currentLocale: InputSignal<AppLocaleSubPath> = input.required<AppLocaleSubPath>();

  /**
   * Output localeSelected
   * @output
   *
   * @description
   * Emits the chosen locale sub-path when the user selects a different language.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<AppLocaleSubPath>}
   */
  public readonly localeSelected: OutputEmitterRef<AppLocaleSubPath> = output<AppLocaleSubPath>();

  /**
   * Output browserDefaultRequested
   * @output
   *
   * @description
   * Emits when the user asks to follow their browser language instead of an
   * explicit choice.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly browserDefaultRequested: OutputEmitterRef<void> = output<void>();

  /**
   * Property options
   * @readonly
   *
   * @description
   * Selectable display languages, in picker order.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {AppLocaleOption[]}
   */
  protected readonly options: AppLocaleOption[] = [...SUPPORTED_LOCALES];
  //#endregion

  //#region Methods
  /**
   * Method onSelect
   * @method onSelect
   *
   * @description
   * Forwards a picker selection as an intent when it differs from the active
   * locale.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {AppLocaleSubPath} subPath - Locale sub-path chosen by the user.
   * @returns {void}
   */
  protected onSelect(subPath: AppLocaleSubPath): void {
    if (subPath !== this.currentLocale()) this.localeSelected.emit(subPath);
  }
  //#endregion
}
