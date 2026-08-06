import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type WritableSignal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideUpload } from '@ng-icons/lucide';
import { HlmButton } from '@shared/ui/button';

/**
 * Constant ACCEPTED_TYPES
 *
 * @description
 * Image formats the avatar endpoint stores. Declared here as well as on the
 * input's `accept` attribute: `accept` only filters the file dialog, and a
 * dragged or pasted file bypasses it entirely.
 *
 * @since 1.0.0
 */
const ACCEPTED_TYPES: ReadonlyArray<string> = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

/**
 * Constant MAX_BYTES
 *
 * @description
 * Largest avatar the API accepts, mirroring its 5 MB cap. Checked here so an
 * oversized file fails instantly rather than after uploading it.
 *
 * @since 1.0.0
 */
const MAX_BYTES: number = 5 * 1024 * 1024;

/**
 * Component AccountAvatarPicker
 * @class AccountAvatarPicker
 *
 * @description
 * Picks a new profile picture and emits it. A component rather than a form:
 * there is no field tree behind a file input, so the two constraints that
 * matter — type and size — are checked here and reported inline.
 *
 * It draws no avatar of its own. The picture belongs to the identity block
 * above it, and two components rendering the same face would eventually
 * disagree about which one is current.
 *
 * @version 2.0.0
 *
 * @example
 * ```html
 * <app-account-avatar-picker [pending]="store.isUploadingAvatar()" (selected)="upload($event)" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-account-avatar-picker',
  imports: [NgIcon, HlmButton],
  providers: [provideIcons({ lucideUpload })],
  templateUrl: './account-avatar-picker.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountAvatarPicker {
  //#region Inputs
  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether an upload is in flight.
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
   * Property selected
   * @readonly
   *
   * @description
   * Emits an accepted image. A rejected one never reaches the parent.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<File>}
   */
  public readonly selected: OutputEmitterRef<File> = output<File>();
  //#endregion

  //#region Properties
  /**
   * Property error
   * @readonly
   *
   * @description
   * Why the chosen file was refused, or `null`. Inline rather than a toast:
   * this is a problem with the field, and the fix is to pick another file.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string | null>}
   */
  protected readonly error: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Property accept
   * @readonly
   *
   * @description
   * The file dialog's filter.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   */
  protected readonly accept: string = ACCEPTED_TYPES.join(',');
  //#endregion

  //#region Methods
  /**
   * Method pick
   * @method pick
   *
   * @description
   * Validates the chosen file and emits it, or reports why it was refused.
   *
   * The input is cleared either way, so choosing the same file twice — after a
   * failed upload, say — still fires a `change` event.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {Event} event - The input's change event.
   *
   * @returns {void}
   */
  protected pick(event: Event): void {
    const field = event.target as HTMLInputElement;
    const file: File | undefined = field.files?.[0];
    field.value = '';

    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      this.error.set($localize`:@@account.avatar.typeError:Choose a JPEG, PNG, WebP or GIF image.`);
      return;
    }

    if (file.size > MAX_BYTES) {
      this.error.set($localize`:@@account.avatar.sizeError:Choose an image under 5 MB.`);
      return;
    }

    this.error.set(null);
    this.selected.emit(file);
  }
  //#endregion
}
