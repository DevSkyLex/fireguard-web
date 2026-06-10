import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { AvatarModule } from 'primeng/avatar';
import { FileUploadModule, type FileUpload } from 'primeng/fileupload';
import { MessageModule } from 'primeng/message';
import type { AvatarUploadEvent } from './models';

/**
 * Component AccountAvatarForm
 * @class AccountAvatarForm
 *
 * @description
 * Presentational control dedicated to the avatar upload workflow. The avatar
 * is persisted through its own `/api/me/avatar` endpoint, so it is kept
 * separate from the profile-field form and emits the selected file without
 * depending on account stores.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-account-avatar-form
 *   [avatarUrl]="avatarUrl()"
 *   [initials]="initials()"
 *   [uploading]="uploading()"
 *   [hasError]="hasError()"
 *   (avatarSelected)="uploadAvatar($event)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-account-avatar-form',
  imports: [AvatarModule, FileUploadModule, MessageModule],
  templateUrl: './account-avatar-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountAvatarForm {
  //#region Properties
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
   * Input uploading
   * @input
   *
   * @description
   * Indicates whether an avatar upload is in progress.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly uploading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Input hasError
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
  public readonly hasError: InputSignal<boolean> = input<boolean>(false);

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
  //#endregion

  //#region Methods
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
