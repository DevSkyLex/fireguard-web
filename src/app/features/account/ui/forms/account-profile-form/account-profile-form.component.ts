import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { FileUploadModule, type FileUpload } from 'primeng/fileupload';
import { IconFieldModule } from 'primeng/iconfield';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import type { UpdateCurrentUserProfileInput, UserProfileOutput } from '@features/account/models';
import type { AccountProfileFormData, AvatarUploadEvent } from './models';

/**
 * Component AccountProfileForm
 * @class AccountProfileForm
 *
 * @description
 * Presentational form used to edit the authenticated user's profile. Owns
 * reactive-form state, validation, reset behavior and avatar selection while
 * emitting user intents without depending on account stores.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-account-profile-form
 *   [profile]="profile()"
 *   [saving]="saving()"
 *   (submitted)="save($event)"
 *   (avatarSelected)="uploadAvatar($event)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-account-profile-form',
  imports: [
    ReactiveFormsModule,
    AvatarModule,
    ButtonModule,
    FileUploadModule,
    IconFieldModule,
    InputIconModule,
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
   * Input avatarUrl
   * @input
   *
   * @description
   * Current avatar URL displayed beside the upload control.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly avatarUrl: InputSignal<string | null> = input<string | null>(null);

  /**
   * Input initials
   * @input
   *
   * @description
   * User initials displayed when no avatar URL is available.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly initials: InputSignal<string | null> = input<string | null>(null);

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
   * Input hasSaveError
   * @input
   *
   * @description
   * Indicates whether the latest profile-field save operation failed.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly hasSaveError: InputSignal<boolean> = input<boolean>(false);

  /**
   * Input hasAvatarError
   * @input
   *
   * @description
   * Indicates whether the latest avatar upload operation failed.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly hasAvatarError: InputSignal<boolean> = input<boolean>(false);

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
   * Output avatarSelected
   * @output
   *
   * @description
   * Emits the avatar file selected through the upload control.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<File>}
   */
  public readonly avatarSelected: OutputEmitterRef<File> = output<File>();

  /**
   * Property maxAvatarSize
   * @readonly
   *
   * @description
   * Maximum avatar size accepted by the upload field, in bytes.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {number}
   */
  protected readonly maxAvatarSize: number = 5 * 1024 * 1024;

  /**
   * Property acceptedAvatarTypes
   * @readonly
   *
   * @description
   * MIME types accepted by the avatar upload endpoint.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   */
  protected readonly acceptedAvatarTypes: string = 'image/jpeg,image/png,image/webp,image/gif';

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
  private readonly formBuilder: NonNullableFormBuilder = inject(NonNullableFormBuilder);

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

  /**
   * Method onAvatarUpload
   * @method onAvatarUpload
   *
   * @description
   * Emits the first selected avatar file and clears the PrimeNG upload field.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {AvatarUploadEvent} event - PrimeNG upload event containing selected files.
   * @param {FileUpload} fileUpload - Upload component instance to clear.
   * @returns {void}
   */
  protected onAvatarUpload(event: AvatarUploadEvent, fileUpload: FileUpload): void {
    const file: File | undefined = event.files[0];
    if (file) this.avatarSelected.emit(file);
    fileUpload.clear();
  }
  //#endregion
}
