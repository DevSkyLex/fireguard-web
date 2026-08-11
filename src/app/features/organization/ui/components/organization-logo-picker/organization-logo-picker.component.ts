import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideTrash2, lucideUpload } from '@ng-icons/lucide';
import { getOrganizationInitials } from '@features/organization/utils';
import { HlmAvatarImports } from '@shared/ui/avatar';
import { HlmButton } from '@shared/ui/button';

/**
 * Component OrganizationLogoPicker
 * @class OrganizationLogoPicker
 *
 * @description
 * Previews the organization's current logo and picks a replacement. Unlike
 * `AccountAvatarPicker`, it applies no client-side type/size check: the logo
 * endpoint's constraints are not published to the frontend, so any picked
 * file is handed to the page and the store's upload call is the sole
 * authority — a rejection surfaces through {@link error}.
 *
 * Presentational: it emits the chosen file and never calls the store itself
 * (`ARCHITECTURE.md` §10.3).
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-organization-logo-picker
 *   [logoUrl]="organization().logoUrl"
 *   [organizationName]="organization().name"
 *   [pending]="settingsStore.isUploadingLogo()"
 *   [error]="settingsStore.uploadLogoError()?.message ?? null"
 *   (selected)="uploadLogo($event)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-logo-picker',
  imports: [NgIcon, HlmButton, ...HlmAvatarImports],
  providers: [provideIcons({ lucideTrash2, lucideUpload })],
  templateUrl: './organization-logo-picker.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationLogoPicker {
  //#region Inputs
  /**
   * Property logoUrl
   * @readonly
   *
   * @description
   * The organization's current logo, or `null` when none has been set.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly logoUrl: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property organizationName
   * @readonly
   *
   * @description
   * Used to derive the monogram fallback shown while no logo is set.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationName: InputSignal<string> = input<string>('');

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

  /**
   * Property error
   * @readonly
   *
   * @description
   * The store's upload failure message, or `null`. Shown inline because the
   * problem is with the picked file, and the fix is to pick another one.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly error: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property removing
   * @readonly
   *
   * @description
   * Whether a removal is in flight. Separate from {@link pending} so the two
   * actions report their own progress instead of one spinner standing for
   * both.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly removing: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property selected
   * @readonly
   *
   * @description
   * Emits the picked file, unvalidated.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<File>}
   */
  public readonly selected: OutputEmitterRef<File> = output<File>();

  /**
   * Property removed
   * @readonly
   *
   * @description
   * Asks for the current logo to be cleared. Only offered while there is one
   * to clear, so the page never has to guard against a no-op removal.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly removed: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /**
   * Property initials
   * @readonly
   *
   * @description
   * The monogram fallback derived from {@link organizationName}.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly initials: Signal<string> = computed<string>(() =>
    getOrganizationInitials(this.organizationName()),
  );
  //#endregion

  //#region Methods
  /**
   * Method pick
   * @method pick
   *
   * @description
   * Emits the picked file. The input is cleared either way, so picking the
   * same file twice after a failed upload still fires a `change` event.
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

    this.selected.emit(file);
  }
  //#endregion
}
