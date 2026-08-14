import {
  ChangeDetectionStrategy,
  Component,
  input,
  linkedSignal,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type WritableSignal,
} from '@angular/core';
import { form, FormField, maxLength, type FieldTree } from '@angular/forms/signals';
import { USER_LOCALE_OPTIONS } from '@features/account/options';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmSelectImports } from '@shared/ui/select';
import type { AccountProfileFormValues } from './models';

/**
 * Constant NAME_MAX_LENGTH
 *
 * @description
 * Longest first or last name the API stores. Mirrors the `Length(max: 100)`
 * constraint on `CurrentUserProfileInput`; exceeding it is a 422, so the rule
 * belongs here rather than only server-side.
 *
 * @since 1.0.0
 */
const NAME_MAX_LENGTH: number = 100;

/**
 * Component AccountProfileForm
 * @class AccountProfileForm
 *
 * @description
 * The editable part of the account profile: the two names and the interface
 * language. It owns its model and rules and emits {@link submitted}; the page
 * maps the values onto the transport DTO and calls the store
 * (`ARCHITECTURE.md` §10.4).
 *
 * The model is a `linkedSignal` over {@link profile}, so a freshly saved — or
 * freshly loaded — profile re-seeds the fields instead of leaving the user
 * looking at a stale draft.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-account-profile-form [profile]="values()" [pending]="store.isSaving()" (submitted)="save($event)" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-account-profile-form',
  imports: [FormField, HlmButton, HlmInput, ...HlmFieldImports, ...HlmSelectImports],
  templateUrl: './account-profile-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountProfileForm {
  //#region Inputs
  /**
   * Property profile
   * @readonly
   *
   * @description
   * The values the form starts from, and re-seeds to whenever they change.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<AccountProfileFormValues>}
   */
  public readonly profile: InputSignal<AccountProfileFormValues> =
    input.required<AccountProfileFormValues>();

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether a save is in flight, which disables the submit control.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Emits the edited values once the form is valid.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<AccountProfileFormValues>}
   */
  public readonly submitted: OutputEmitterRef<AccountProfileFormValues> =
    output<AccountProfileFormValues>();

  /**
   * Property cancelled
   * @readonly
   *
   * @description
   * Emits when the user abandons the edit. Nothing is reset here: the model is
   * a `linkedSignal` over {@link profile}, so the next time the form is shown it
   * starts from the stored values rather than from the abandoned draft.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly cancelled: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /**
   * Property localeOptions
   * @readonly
   *
   * @description
   * The interface languages on offer.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {typeof USER_LOCALE_OPTIONS}
   */
  protected readonly localeOptions: typeof USER_LOCALE_OPTIONS = USER_LOCALE_OPTIONS;

  /**
   * Property model
   * @readonly
   *
   * @description
   * The edited values, re-seeded from {@link profile} whenever it changes.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<AccountProfileFormValues>}
   */
  protected readonly model: WritableSignal<AccountProfileFormValues> = linkedSignal(
    (): AccountProfileFormValues => ({ ...this.profile() }),
  );

  /**
   * Property profileForm
   * @readonly
   *
   * @description
   * The field tree and its rules. Neither name is required: the API accepts an
   * absent name, and demanding one here would lock out a user who has only ever
   * had a username.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FieldTree<AccountProfileFormValues>}
   */
  protected readonly profileForm: FieldTree<AccountProfileFormValues> = form(
    this.model,
    (path): void => {
      maxLength(path.firstName, NAME_MAX_LENGTH, {
        message: $localize`:@@account.profile.firstNameMaxLength:Use at most ${NAME_MAX_LENGTH}:max: characters`,
      });
      maxLength(path.lastName, NAME_MAX_LENGTH, {
        message: $localize`:@@account.profile.lastNameMaxLength:Use at most ${NAME_MAX_LENGTH}:max: characters`,
      });
    },
  );

  /**
   * Property localeLabel
   * @readonly
   *
   * @description
   * Renders the selected locale in the closed trigger, which otherwise shows
   * the raw stored value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {(value: string) => string}
   */
  protected readonly localeLabel = (value: string): string =>
    USER_LOCALE_OPTIONS.find((option): boolean => option.value === value)?.label ?? '';
  //#endregion

  //#region Methods
  /**
   * Method submit
   * @method submit
   *
   * @description
   * Marks the form touched so every failing rule becomes visible, then emits
   * only if it is valid.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {Event} event - The native submit event.
   *
   * @returns {void}
   */
  protected submit(event: Event): void {
    event.preventDefault();

    this.profileForm().markAsTouched();

    if (this.profileForm().invalid()) return;

    this.submitted.emit(this.model());
  }
  //#endregion
}
