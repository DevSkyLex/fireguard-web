import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { toServerFieldErrors, type ServerFieldErrors } from '@core/api';
import type { UpdateCurrentUserProfileInput, UserProfileOutput } from '@features/account/models';
import type { AccountProfileFormData } from './models';

/**
 * Component AccountProfileForm
 * @class AccountProfileForm
 *
 * @description
 * Presentational form used to edit the authenticated user's profile fields.
 * Owns reactive-form state, validation and reset behavior while emitting
 * user intents without depending on account stores. The avatar lives in the
 * dedicated {@link AccountAvatarForm} since it targets its own endpoint.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-account-profile-form
 *   [profile]="profile()"
 *   [saving]="saving()"
 *   (submitted)="save($event)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-account-profile-form',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputGroupModule,
    InputGroupAddonModule,
    InputTextModule,
    MessageModule,
  ],
  templateUrl: './account-profile-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountProfileForm {
  //#region Properties
  /**
   * Input profile
   * @input
   *
   * @description
   * Current authenticated-user profile used to populate and reset the form.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<UserProfileOutput | null>}
   */
  public readonly profile: InputSignal<UserProfileOutput | null> = input<UserProfileOutput | null>(
    null,
  );

  /**
   * Input saving
   * @input
   *
   * @description
   * Indicates whether profile values are currently being persisted.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly saving: InputSignal<boolean> = input<boolean>(false);

  /**
   * Input serverError
   * @input
   *
   * @description
   * Last save rejection, as held by the store's call state.
   *
   * Replaces the former boolean flag: a 422 names the field it refused, and
   * collapsing that to "something failed" forced a generic banner where the user
   * could have been told exactly which value to fix. Non-422 failures still fall
   * back to that banner.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<unknown>}
   */
  public readonly serverError: InputSignal<unknown> = input<unknown>(null);

  /** Server message per field, projected from the last 422. */
  protected readonly serverFieldErrors: Signal<ServerFieldErrors> = computed(() =>
    toServerFieldErrors(this.serverError()),
  );

  /**
   * Property hasGenericSaveError
   * @readonly
   *
   * @description
   * Whether a failure occurred that no field can explain — a transport fault, or a
   * 422 naming only fields this form does not render.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly hasGenericSaveError: Signal<boolean> = computed(
    () => this.serverError() !== null && Object.keys(this.serverFieldErrors()).length === 0,
  );

  /**
   * Output submitted
   * @output
   *
   * @description
   * Emits valid profile-field values when the form is submitted.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<UpdateCurrentUserProfileInput>}
   */
  public readonly submitted: OutputEmitterRef<UpdateCurrentUserProfileInput> =
    output<UpdateCurrentUserProfileInput>();

  /**
   * Property formBuilder
   * @readonly
   *
   * @description
   * Non-nullable form builder used to preserve strict control value types.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {NonNullableFormBuilder}
   */
  private readonly formBuilder: NonNullableFormBuilder =
    inject<NonNullableFormBuilder>(NonNullableFormBuilder);

  /**
   * Property form
   * @readonly
   *
   * @description
   * Strictly typed reactive form containing editable profile fields.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormGroup<AccountProfileFormData>}
   */
  protected readonly form: FormGroup<AccountProfileFormData> =
    this.formBuilder.group<AccountProfileFormData>({
      firstName: this.formBuilder.control('', [Validators.maxLength(100)]),
      lastName: this.formBuilder.control('', [Validators.maxLength(100)]),
    });
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Synchronizes incoming profile values and the saving state with the
   * reactive form.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => this.reset());
    effect((): void =>
      this.saving()
        ? this.form.disable({ emitEvent: false })
        : this.form.enable({ emitEvent: false }),
    );
  }
  //#endregion

  //#region Methods
  /**
   * Method submit
   * @method submit
   *
   * @description
   * Marks invalid controls as touched or emits the valid raw form values.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const profile: UserProfileOutput | null = this.profile();
    const values = this.form.getRawValue();
    const update: UpdateCurrentUserProfileInput = {
      ...(values.firstName !== (profile?.firstName ?? '') && { firstName: values.firstName }),
      ...(values.lastName !== (profile?.lastName ?? '') && { lastName: values.lastName }),
    };

    if (Object.keys(update).length > 0) this.submitted.emit(update);
  }

  /**
   * Method reset
   * @method reset
   *
   * @description
   * Resets editable fields to the latest profile input values.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected reset(): void {
    const profile: UserProfileOutput | null = this.profile();
    this.form.reset(
      {
        firstName: profile?.firstName ?? '',
        lastName: profile?.lastName ?? '',
      },
      { emitEvent: false },
    );
  }
  //#endregion
}
