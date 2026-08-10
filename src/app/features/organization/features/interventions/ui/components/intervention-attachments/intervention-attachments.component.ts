import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  LOCALE_ID,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCamera,
  lucideFileText,
  lucideImage,
  lucidePaperclip,
  lucideTrash2,
} from '@ng-icons/lucide';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import type { InterventionAttachmentOutput } from '@features/organization/features/interventions/models';
import { EmptyState } from '@shared/empty-state';
import { HlmAlertDialogImports } from '@shared/ui/alert-dialog';
import { HlmBadgeImports } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmItemImports } from '@shared/ui/item';
import { HlmSpinnerImports } from '@shared/ui/spinner';

/**
 * The backend's hard ceiling (`AttachmentConstraints::MAX_SIZE_BYTES`),
 * pre-checked here so an oversized pick fails fast instead of round-tripping.
 */
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * The backend's MIME whitelist (`AttachmentCategory` IMAGE + DOCUMENT),
 * byte for byte.
 */
const ACCEPTED_MIME_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
];

/**
 * The backend's per-parent cardinality cap
 * (`AttachmentConstraints::MAX_ATTACHMENTS_PER_PARENT`), mirrored so the
 * pickers close at the ceiling instead of letting the upload fail with a 422.
 */
const MAX_ATTACHMENTS = 25;

/**
 * Component InterventionAttachments
 * @class InterventionAttachments
 *
 * @description
 * The intervention's attached files: metadata rows (name, size, label,
 * upload date — the API exposes no download URL yet, and this section says
 * so rather than faking a link), a file picker, a camera capture button for
 * field photo evidence, and a confirm-gated per-row delete that locks only
 * its own row. Picks are pre-checked against the backend's 10 MiB ceiling,
 * MIME whitelist and 25-file cardinality cap so an invalid file fails fast;
 * the server stays authoritative. A `n / 25` counter appears once the list
 * is half full and the pickers close at the ceiling — the alternative is an
 * enabled button that can only ever answer 422. Presentational — the page
 * owns the store calls and the photo compression.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-intervention-attachments
 *   [attachments]="store.attachments()"
 *   [canManage]="canManageAttachments()"
 *   [pendingIds]="store.pendingAttachmentIds()"
 *   [uploading]="attachmentUploading()"
 *   [online]="online()"
 *   (filesPicked)="uploadAttachments($event)"
 *   (deleteRequested)="removeAttachment($event)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-attachments',
  imports: [
    NgIcon,
    HlmButton,
    EmptyState,
    ...HlmAlertDialogImports,
    ...HlmBadgeImports,
    ...HlmItemImports,
    ...HlmSpinnerImports,
  ],
  providers: [
    provideIcons({ lucideCamera, lucideFileText, lucideImage, lucidePaperclip, lucideTrash2 }),
  ],
  templateUrl: './intervention-attachments.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionAttachments {
  //#region Inputs
  /**
   * Property attachments
   * @readonly
   * @description The loaded attachments, upload order.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly InterventionAttachmentOutput[]>}
   */
  public readonly attachments: InputSignal<readonly InterventionAttachmentOutput[]> = input<
    readonly InterventionAttachmentOutput[]
  >([]);

  /**
   * Property canManage
   * @readonly
   * @description Whether the host grants uploading and deleting; the backend rules stay with the page.
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
   * Property uploading
   * @readonly
   * @description Whether an upload is in flight, which locks the pickers.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly uploading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property online
   * @readonly
   * @description Whether the network is reachable — uploads are online-only, the outbox has no attachment operation.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly online: InputSignal<boolean> = input<boolean>(true);
  //#endregion

  //#region Outputs
  /**
   * Property filesPicked
   * @readonly
   * @description Emits the valid picked files; the page compresses photos and calls the store.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<readonly File[]>}
   */
  public readonly filesPicked: OutputEmitterRef<readonly File[]> = output<readonly File[]>();

  /**
   * Property deleteRequested
   * @readonly
   * @description Emits the attachment whose confirmed deletion the page should perform.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<InterventionAttachmentOutput>}
   */
  public readonly deleteRequested: OutputEmitterRef<InterventionAttachmentOutput> =
    output<InterventionAttachmentOutput>();
  //#endregion

  //#region Properties
  private readonly locale: string = inject(LOCALE_ID);

  /** The attachment awaiting delete confirmation, if any. */
  protected readonly pendingDelete: WritableSignal<InterventionAttachmentOutput | null> =
    signal<InterventionAttachmentOutput | null>(null);

  /** The last pick's local rejection, cleared on the next valid pick. */
  protected readonly pickError: WritableSignal<string | null> = signal<string | null>(null);

  /** The `accept` attribute, straight from the whitelist. */
  protected readonly acceptedTypes: string = ACCEPTED_MIME_TYPES.join(',');

  /** How many more files this intervention may take, never below zero. */
  protected readonly remainingSlots: Signal<number> = computed<number>(() =>
    Math.max(MAX_ATTACHMENTS - this.attachments().length, 0),
  );

  /** Whether the intervention has reached the backend's attachment ceiling. */
  protected readonly atCapacity: Signal<boolean> = computed<boolean>(
    () => this.remainingSlots() === 0,
  );

  /** The `n / 25` counter text. */
  protected readonly countLabel: Signal<string> = computed<string>(
    () => `${this.attachments().length} / ${MAX_ATTACHMENTS}`,
  );

  /**
   * Property showCounter
   * @readonly
   *
   * @description
   * Whether to show the counter at all. Below half the cap it is noise —
   * nobody with 3 files needs to be told the ceiling is 25 — so it appears
   * only once the ceiling is close enough to matter.
   *
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly showCounter: Signal<boolean> = computed<boolean>(
    () => this.attachments().length >= MAX_ATTACHMENTS / 2,
  );

  /** Whether the pickers are usable right now. */
  protected readonly canPick: Signal<boolean> = computed<boolean>(
    () => this.canManage() && this.online() && !this.uploading() && !this.atCapacity(),
  );

  /**
   * Property emptyDescription
   * @readonly
   *
   * @description
   * What the empty list says, which depends on whether the reader can add a
   * file — pointing a read-only viewer at a picker they cannot use is worse
   * than saying nothing.
   *
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly emptyDescription: Signal<string> = computed<string>(() =>
    this.canManage()
      ? $localize`:@@intervention.attachments.emptyDesc:Add photos or documents to keep with this intervention.`
      : $localize`:@@intervention.attachments.emptyDescReadOnly:No one has attached a file to this intervention yet.`,
  );
  //#endregion

  //#region Methods
  /**
   * Method pick
   * @description Opens the given hidden file input to start a pick.
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
   *
   * @description
   * Validates a pick against the backend's cardinality, size and MIME policy,
   * emits the valid files and names the first rejection inline. The
   * cardinality check comes first and rejects the pick whole rather than
   * partly: accepting only the files that fit would leave the user guessing
   * which of theirs made it through.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {Event} event - The file input's change event.
   *
   * @returns {void}
   */
  protected onFilesSelected(event: Event): void {
    const inputElement: HTMLInputElement = event.target as HTMLInputElement;
    const files: readonly File[] = Array.from(inputElement.files ?? []);
    inputElement.value = ''; // Re-picking the same file fires no change event otherwise.
    if (files.length === 0) return;

    if (files.length > this.remainingSlots()) {
      this.pickError.set(
        this.atCapacity()
          ? $localize`:@@intervention.attachments.capacityReached:This intervention already holds the maximum of ${MAX_ATTACHMENTS}:max: files. Delete one to add another.`
          : $localize`:@@intervention.attachments.capacityExceeded:Only ${this.remainingSlots()}:remaining: more file(s) can be added to this intervention.`,
      );

      return;
    }

    const oversized: File | undefined = files.find((file) => file.size > MAX_SIZE_BYTES);
    if (oversized) {
      this.pickError.set(
        $localize`:@@intervention.attachments.tooLarge:"${oversized.name}:name:" exceeds the 10 MB limit.`,
      );

      return;
    }
    const unsupported: File | undefined = files.find(
      (file) => !ACCEPTED_MIME_TYPES.includes(file.type),
    );
    if (unsupported) {
      this.pickError.set(
        $localize`:@@intervention.attachments.unsupported:"${unsupported.name}:name:" is not an accepted format (images or PDF).`,
      );

      return;
    }

    this.pickError.set(null);
    this.filesPicked.emit(files);
  }

  /**
   * Method iconOf
   * @description The registered icon name matching the attachment's declared MIME type.
   * @access protected
   * @since 1.0.0
   * @param {InterventionAttachmentOutput} attachment - The row's attachment.
   * @returns {string} A name registered with `provideIcons`.
   */
  protected iconOf(attachment: InterventionAttachmentOutput): string {
    return attachment.mimeType.startsWith('image/') ? 'lucideImage' : 'lucideFileText';
  }

  /**
   * Method extensionOf
   * @description The attachment's file extension, badge-sized, read from the file name and falling back to the declared MIME subtype.
   * @access protected
   * @since 1.0.0
   * @param {InterventionAttachmentOutput} attachment - The row's attachment.
   * @returns {string} An uppercased extension of at most 4 characters, e.g. "PDF", "JPEG".
   */
  protected extensionOf(attachment: InterventionAttachmentOutput): string {
    const dotIndex: number = attachment.fileName.lastIndexOf('.');
    const fromName: string = dotIndex > 0 ? attachment.fileName.slice(dotIndex + 1) : '';
    const extension: string = fromName || (attachment.mimeType.split('/').at(-1) ?? '');

    return extension.slice(0, 4).toUpperCase();
  }

  /**
   * Method isRowPending
   * @description Whether this row's own delete is in flight.
   * @access protected
   * @since 1.0.0
   * @param {InterventionAttachmentOutput} attachment - The row's attachment.
   * @returns {boolean} True while the row's write is pending.
   */
  protected isRowPending(attachment: InterventionAttachmentOutput): boolean {
    return this.pendingIds().has(attachment.id);
  }

  /**
   * Method sizeLabelOf
   * @description The attachment's size as a compact localized label.
   * @access protected
   * @since 1.0.0
   * @param {InterventionAttachmentOutput} attachment - The row's attachment.
   * @returns {string} e.g. "1.2 MB".
   */
  protected sizeLabelOf(attachment: InterventionAttachmentOutput): string {
    const megabytes: number = attachment.size / (1024 * 1024);
    const formatted: string = new Intl.NumberFormat(this.locale, {
      maximumFractionDigits: megabytes >= 10 ? 0 : 1,
    }).format(Math.max(megabytes, 0.1));

    return `${formatted} MB`;
  }

  /**
   * Method onDeleteDialogStateChanged
   * @description Mirrors an overlay-initiated close back into the pending target.
   * @access protected
   * @since 1.0.0
   * @param {BrnDialogState} state - The overlay's new state.
   * @returns {void}
   */
  protected onDeleteDialogStateChanged(state: BrnDialogState): void {
    if (state === 'closed') this.pendingDelete.set(null);
  }

  /**
   * Method confirmDelete
   * @description Emits the confirmed deletion and closes the dialog.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected confirmDelete(): void {
    const target: InterventionAttachmentOutput | null = this.pendingDelete();
    this.pendingDelete.set(null);
    if (target) this.deleteRequested.emit(target);
  }
  //#endregion
}
