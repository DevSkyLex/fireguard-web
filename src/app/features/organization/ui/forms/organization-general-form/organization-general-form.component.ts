import { SlicePipe } from '@angular/common';
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
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule, type ButtonProps } from 'primeng/button';
import { FileUploadModule, type FileUpload } from 'primeng/fileupload';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import type { OrganizationOutput, UpdateOrganizationInput } from '@features/organization/models';
import type { LogoUploadEvent } from './models';

/**
 * Component OrganizationGeneralForm
 * @class OrganizationGeneralForm
 *
 * @description
 * Presentational form for an organization's general & branding settings: name,
 * slug, description, active status and logo. Field changes are emitted through
 * `submitted`; the logo is uploaded through its own endpoint, so the selected
 * file is emitted separately through `logoSelected`. The form owns no
 * navigation, store, or API access.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-general-form',
  imports: [
    SlicePipe,
    AvatarModule,
    ButtonModule,
    FileUploadModule,
    InputTextModule,
    MessageModule,
    ReactiveFormsModule,
    TextareaModule,
    ToggleSwitchModule,
  ],
  templateUrl: './organization-general-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationGeneralForm {
  //#region Properties
  /** Active organization whose settings are being edited. */
  public readonly organization: InputSignal<OrganizationOutput | null> =
    input<OrganizationOutput | null>(null);
  /** Whether the settings submission is pending. */
  public readonly saving: InputSignal<boolean> = input<boolean>(false);
  /** Whether a logo upload is in progress. */
  public readonly uploadingLogo: InputSignal<boolean> = input<boolean>(false);
  /** Whether the latest logo upload failed. */
  public readonly logoHasError: InputSignal<boolean> = input<boolean>(false);
  /** Emits valid general settings values. */
  public readonly submitted: OutputEmitterRef<UpdateOrganizationInput> = output();
  /** Emits the logo file selected through the upload control. */
  public readonly logoSelected: OutputEmitterRef<File> = output<File>();

  /** Non-nullable builder preserving strict form value types. */
  private readonly formBuilder: NonNullableFormBuilder =
    inject<NonNullableFormBuilder>(NonNullableFormBuilder);

  /** Strictly typed general settings form. */
  protected readonly form = this.formBuilder.group({
    name: this.formBuilder.control('', [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(120),
    ]),
    slug: this.formBuilder.control('', [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(120),
      Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    ]),
    description: this.formBuilder.control('', [Validators.maxLength(2000)]),
    isActive: this.formBuilder.control(true),
  });

  /** Maximum logo size accepted by the upload field, in bytes. */
  protected readonly maxLogoSize: number = 5 * 1024 * 1024;

  /** MIME types accepted by the logo upload endpoint. */
  protected readonly acceptedLogoTypes: string = 'image/jpeg,image/png,image/webp,image/gif';

  /** Quiet secondary styling for the logo upload trigger. */
  protected readonly chooseButtonProps: ButtonProps = {
    severity: 'secondary',
    outlined: true,
    size: 'small',
  };
  //#endregion

  //#region Methods
  /** Synchronizes existing organization values and submission state. */
  public constructor() {
    effect(() => {
      const organization = this.organization();
      this.form.reset(
        {
          name: organization?.name ?? '',
          slug: organization?.slug ?? '',
          description: organization?.description ?? '',
          isActive: organization?.isActive ?? true,
        },
        { emitEvent: false },
      );
    });

    effect(() =>
      this.saving()
        ? this.form.disable({ emitEvent: false })
        : this.form.enable({ emitEvent: false }),
    );
  }

  /** Emits valid general settings values. */
  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const values = this.form.getRawValue();
    this.submitted.emit({
      name: values.name,
      slug: values.slug,
      description: values.description,
      isActive: values.isActive,
    });
  }

  /**
   * Method onLogoUpload
   * @method onLogoUpload
   *
   * @description
   * Emits the first selected logo file and clears the PrimeNG upload field.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {LogoUploadEvent} event - PrimeNG upload event containing selected files.
   * @param {FileUpload} fileUpload - Upload component instance to clear.
   * @returns {void}
   */
  protected onLogoUpload(event: LogoUploadEvent, fileUpload: FileUpload): void {
    const file: File | undefined = event.files[0];
    if (file) this.logoSelected.emit(file);
    fileUpload.clear();
  }
  //#endregion
}
