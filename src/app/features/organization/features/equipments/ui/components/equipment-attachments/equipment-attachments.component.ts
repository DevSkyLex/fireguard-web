import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideDownload,
  lucideFileText,
  lucideImage,
  lucidePaperclip,
  lucideTrash2,
} from '@ng-icons/lucide';
import type { EquipmentAttachmentOutput } from '@features/organization/features/equipments/models';
import { EmptyState } from '@shared/empty-state';
import { HlmBadgeImports } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmItemImports } from '@shared/ui/item';
import { HlmSpinnerImports } from '@shared/ui/spinner';

/**
 * Component EquipmentAttachments
 * @class EquipmentAttachments
 *
 * @description
 * The equipment's attached files: metadata rows (name, size, label, a
 * per-row download button), a file picker, and a per-row delete button that
 * emits {@link deleteRequested} straight away — the page owns the store call
 * and locks the row through {@link pendingIds}. Mirrors
 * `InterventionAttachments`'s shape; the wire differs, since
 * `EquipmentService.addAttachment` takes base64 JSON rather than
 * multipart — the page converts the picked {@link File} before calling the
 * store, this component only ever emits the raw pick. Purely presentational
 * (`ARCHITECTURE.md` §10.3): it owns no store and calls no service.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-equipment-attachments
 *   [attachments]="store.attachments()"
 *   [canManage]="canWrite()"
 *   [pendingIds]="pendingAttachmentDeleteIds()"
 *   [downloadingIds]="pendingAttachmentDownloadIds()"
 *   [uploading]="store.isAddingAttachment()"
 *   (filesPicked)="onAttachmentFilesPicked($event)"
 *   (deleteRequested)="onAttachmentDeleteRequested($event)"
 *   (downloadRequested)="onAttachmentDownloadRequested($event)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-equipment-attachments',
  imports: [
    NgIcon,
    HlmButton,
    EmptyState,
    ...HlmBadgeImports,
    ...HlmItemImports,
    ...HlmSpinnerImports,
  ],
  providers: [
    provideIcons({ lucideDownload, lucideFileText, lucideImage, lucidePaperclip, lucideTrash2 }),
  ],
  templateUrl: './equipment-attachments.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentAttachments {
  //#region Inputs
  /**
   * Property attachments
   * @readonly
   * @description The loaded attachments, upload order.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly EquipmentAttachmentOutput[]>}
   */
  public readonly attachments: InputSignal<readonly EquipmentAttachmentOutput[]> = input<
    readonly EquipmentAttachmentOutput[]
  >([]);

  /**
   * Property canManage
   * @readonly
   * @description Whether the host grants uploading and deleting; the write permission stays with the page.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly canManage: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property pendingIds
   * @readonly
   * @description Ids of the attachments whose delete is in flight, so each row locks on its own write.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<ReadonlySet<string>>}
   */
  public readonly pendingIds: InputSignal<ReadonlySet<string>> = input<ReadonlySet<string>>(
    new Set<string>(),
  );

  /**
   * Property downloadingIds
   * @readonly
   * @description Ids of the attachments whose download is in flight, so each row locks on its own fetch.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<ReadonlySet<string>>}
   */
  public readonly downloadingIds: InputSignal<ReadonlySet<string>> = input<ReadonlySet<string>>(
    new Set<string>(),
  );

  /**
   * Property uploading
   * @readonly
   * @description Whether an upload is in flight, which locks the picker.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly uploading: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property filesPicked
   * @readonly
   * @description Emits the picked files; the page converts each to base64 and calls the store.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<readonly File[]>}
   */
  public readonly filesPicked: OutputEmitterRef<readonly File[]> = output<readonly File[]>();

  /**
   * Property deleteRequested
   * @readonly
   * @description Emits the row's attachment on a delete click; the page calls the store.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<EquipmentAttachmentOutput>}
   */
  public readonly deleteRequested: OutputEmitterRef<EquipmentAttachmentOutput> =
    output<EquipmentAttachmentOutput>();

  /**
   * Property downloadRequested
   * @readonly
   * @description Emits the attachment the page should fetch and save to the visitor's device.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<EquipmentAttachmentOutput>}
   */
  public readonly downloadRequested: OutputEmitterRef<EquipmentAttachmentOutput> =
    output<EquipmentAttachmentOutput>();
  //#endregion

  //#region Methods
  /**
   * Method pick
   * @description Opens the hidden file input to start a pick.
   * @access protected
   * @since 1.0.0
   * @param {HTMLInputElement} fileInput - The hidden file input to open.
   * @returns {void}
   */
  protected pick(fileInput: HTMLInputElement): void {
    fileInput.click();
  }

  /**
   * Method onFilesSelected
   * @description Emits the picked files as-is; the backend stays authoritative on size and type.
   * @access protected
   * @since 1.0.0
   * @param {Event} event - The file input's change event.
   * @returns {void}
   */
  protected onFilesSelected(event: Event): void {
    const inputElement: HTMLInputElement = event.target as HTMLInputElement;
    const files: readonly File[] = Array.from(inputElement.files ?? []);
    inputElement.value = ''; // Re-picking the same file fires no change event otherwise.
    if (files.length === 0) return;

    this.filesPicked.emit(files);
  }

  /**
   * Method iconOf
   * @description The registered icon name matching the attachment's declared MIME type.
   * @access protected
   * @since 1.0.0
   * @param {EquipmentAttachmentOutput} attachment - The row's attachment.
   * @returns {string} A name registered with `provideIcons`.
   */
  protected iconOf(attachment: EquipmentAttachmentOutput): string {
    return attachment.mimeType.startsWith('image/') ? 'lucideImage' : 'lucideFileText';
  }

  /**
   * Method extensionOf
   * @description The attachment's file extension, badge-sized, read from the file name and falling back to the declared MIME subtype.
   * @access protected
   * @since 1.0.0
   * @param {EquipmentAttachmentOutput} attachment - The row's attachment.
   * @returns {string} An uppercased extension of at most 4 characters, e.g. "PDF", "JPEG".
   */
  protected extensionOf(attachment: EquipmentAttachmentOutput): string {
    const dotIndex: number = attachment.fileName.lastIndexOf('.');
    const fromName: string = dotIndex > 0 ? attachment.fileName.slice(dotIndex + 1) : '';
    const extension: string = fromName || (attachment.mimeType.split('/').at(-1) ?? '');

    return extension.slice(0, 4).toUpperCase();
  }

  /**
   * Method sizeLabelOf
   * @description The attachment's size as a compact label.
   * @access protected
   * @since 1.0.0
   * @param {EquipmentAttachmentOutput} attachment - The row's attachment.
   * @returns {string} e.g. "1.2 MB".
   */
  protected sizeLabelOf(attachment: EquipmentAttachmentOutput): string {
    const megabytes: number = attachment.size / (1024 * 1024);

    return `${megabytes >= 10 ? megabytes.toFixed(0) : megabytes.toFixed(1)} MB`;
  }

  /**
   * Method downloadAriaLabelOf
   * @description The download button's accessible name, naming the file so repeated rows stay distinguishable to assistive tech.
   * @access protected
   * @since 1.1.0
   * @param {EquipmentAttachmentOutput} attachment - The row's attachment.
   * @returns {string} The localized label.
   */
  protected downloadAriaLabelOf(attachment: EquipmentAttachmentOutput): string {
    const fileName: string = attachment.fileName;

    return $localize`:@@equipment.attachments.downloadAria:Download ${fileName}:fileName:`;
  }

  /**
   * Method deleteAriaLabelOf
   * @description The delete button's accessible name, naming the file so repeated rows stay distinguishable to assistive tech.
   * @access protected
   * @since 1.1.0
   * @param {EquipmentAttachmentOutput} attachment - The row's attachment.
   * @returns {string} The localized label.
   */
  protected deleteAriaLabelOf(attachment: EquipmentAttachmentOutput): string {
    const fileName: string = attachment.fileName;

    return $localize`:@@equipment.attachments.deleteAria:Delete ${fileName}:fileName:`;
  }

  /**
   * Method isRowPending
   * @description Whether this row's own delete is in flight.
   * @access protected
   * @since 1.0.0
   * @param {EquipmentAttachmentOutput} attachment - The row's attachment.
   * @returns {boolean} True while the row's write is pending.
   */
  protected isRowPending(attachment: EquipmentAttachmentOutput): boolean {
    return this.pendingIds().has(attachment.id);
  }

  /**
   * Method isRowDownloading
   * @description Whether this row's own download is in flight.
   * @access protected
   * @since 1.0.0
   * @param {EquipmentAttachmentOutput} attachment - The row's attachment.
   * @returns {boolean} True while the row's fetch is pending.
   */
  protected isRowDownloading(attachment: EquipmentAttachmentOutput): boolean {
    return this.downloadingIds().has(attachment.id);
  }
  //#endregion
}
