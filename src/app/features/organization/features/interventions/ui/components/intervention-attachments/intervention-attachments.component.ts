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
  lucideCloudUpload,
  lucideDownload,
  lucideFileText,
  lucideImage,
  lucidePaperclip,
  lucideTrash2,
} from '@ng-icons/lucide';
import {
  resolveInterventionTag,
  type InterventionAttachmentOutput,
  type InterventionQueuedAttachment,
  type InterventionWorkItemOutput,
} from '@features/organization/features/interventions/models';
import { HlmAttachmentImports } from '@shared/ui/attachment';
import { HlmBadgeImports } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmCardImports } from '@shared/ui/card';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmSpinnerImports } from '@shared/ui/spinner';

/**
 * The backend's hard ceiling (`AttachmentConstraints::MAX_SIZE_BYTES`),
 * pre-checked here so an oversized pick fails fast instead of round-tripping.
 * Images are exempt from this local check: the page compresses them before
 * upload, so a multi-megabyte camera capture is exactly the input the
 * pipeline exists for — the server stays authoritative on the final size.
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
 * The file metadata shared by a synced attachment row and a queued one, so the
 * icon/extension/size helpers serve both.
 */
interface AttachmentFileMeta {
  readonly fileName: string;
  readonly mimeType: string;
  readonly size: number;
}

/**
 * Component InterventionAttachments
 * @class InterventionAttachments
 *
 * @description
 * The intervention's attached files: native Spartan attachment rows (name, size, label,
 * file type, a per-row download button), a file picker, a camera capture
 * button for field photo evidence, and a per-row delete button that emits
 * {@link deleteRequested} straight away — the page owns the confirmation
 * (`app-intervention-attachment-delete-dialog`) and locks the row through
 * the store's `pendingAttachmentIds` once accepted. Picks are pre-checked
 * against the backend's MIME whitelist, 25-file cardinality cap, and — for
 * non-image files only, since the page compresses photos before upload —
 * the 10 MiB ceiling, so an invalid file fails fast; the server stays
 * authoritative. Uploads queued in the offline outbox render ahead of the
 * synced rows with a pending-sync badge and a delete button that emits
 * {@link queuedDeleteRequested}; queued rows count toward the cap, since each
 * one consumes a server slot on replay. A `n / 25` counter appears once the list is half full and
 * the pickers close at the ceiling — the alternative is an enabled button
 * that can only ever answer 422. Presentational — the page owns the store
 * calls, the photo compression, and the fetch-then-save that a download
 * requires.
 *
 * @version 1.3.0
 *
 * @example
 * ```html
 * <app-intervention-attachments
 *   [attachments]="store.attachments()"
 *   [canManage]="canManageAttachments()"
 *   [pendingIds]="store.pendingAttachmentIds()"
 *   [downloadingIds]="pendingDownloadIds()"
 *   [uploading]="attachmentUploading()"
 *   [online]="online()"
 *   (filesPicked)="uploadAttachments($event)"
 *   (deleteRequested)="pendingAttachmentDelete.set($event)"
 *   (downloadRequested)="downloadAttachment($event)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-attachments',
  imports: [
    NgIcon,
    ...HlmEmptyImports,
    HlmButton,
    ...HlmBadgeImports,
    ...HlmCardImports,
    ...HlmAttachmentImports,
    ...HlmSpinnerImports,
  ],
  providers: [
    provideIcons({
      lucideCamera,
      lucideCloudUpload,
      lucideDownload,
      lucideFileText,
      lucideImage,
      lucidePaperclip,
      lucideTrash2,
    }),
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
   * Property queuedAttachments
   * @readonly
   * @description Uploads waiting in the offline outbox, rendered ahead of the synced rows with a pending-sync badge.
   * @access public
   * @since 1.3.0
   * @type {InputSignal<readonly InterventionQueuedAttachment[]>}
   */
  public readonly queuedAttachments: InputSignal<readonly InterventionQueuedAttachment[]> = input<
    readonly InterventionQueuedAttachment[]
  >([]);

  /**
   * Property workItems
   * @readonly
   * @description The workspace's work items, used only to resolve a `workItemId` into a display label for the chip.
   * @access public
   * @since 5.4.0
   * @type {InputSignal<readonly InterventionWorkItemOutput[]>}
   */
  public readonly workItems: InputSignal<readonly InterventionWorkItemOutput[]> = input<
    readonly InterventionWorkItemOutput[]
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
   * Property downloadingIds
   * @readonly
   * @description Ids of the attachments whose download is in flight, so each row locks on its own fetch.
   * @access public
   * @since 1.1.0
   * @type {InputSignal<ReadonlySet<string>>}
   */
  public readonly downloadingIds: InputSignal<ReadonlySet<string>> = input<ReadonlySet<string>>(
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
   * @description Whether the network is reachable — downloads and server-side deletes need it; uploads queue offline instead.
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
   * @description Emits the row's attachment on a delete click; the page confirms and calls the store.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<InterventionAttachmentOutput>}
   */
  public readonly deleteRequested: OutputEmitterRef<InterventionAttachmentOutput> =
    output<InterventionAttachmentOutput>();

  /**
   * Property queuedDeleteRequested
   * @readonly
   * @description Emits the queued row on a delete click; the page confirms and discards the outbox operation.
   * @access public
   * @since 1.3.0
   * @type {OutputEmitterRef<InterventionQueuedAttachment>}
   */
  public readonly queuedDeleteRequested: OutputEmitterRef<InterventionQueuedAttachment> =
    output<InterventionQueuedAttachment>();

  /**
   * Property downloadRequested
   * @readonly
   * @description Emits the attachment the page should fetch and save to the visitor's device.
   * @access public
   * @since 1.1.0
   * @type {OutputEmitterRef<InterventionAttachmentOutput>}
   */
  public readonly downloadRequested: OutputEmitterRef<InterventionAttachmentOutput> =
    output<InterventionAttachmentOutput>();
  //#endregion

  //#region Properties
  private readonly locale: string = inject(LOCALE_ID);

  /** One number formatter per precision — the `Intl` constructor is too costly for per-row calls. */
  private readonly sizeFormats: ReadonlyMap<number, Intl.NumberFormat> = new Map<
    number,
    Intl.NumberFormat
  >([
    [0, new Intl.NumberFormat(this.locale, { maximumFractionDigits: 0 })],
    [1, new Intl.NumberFormat(this.locale, { maximumFractionDigits: 1 })],
  ]);

  /** The last pick's local rejection, cleared on the next valid pick. */
  protected readonly pickError: WritableSignal<string | null> = signal<string | null>(null);

  /** The `accept` attribute, straight from the whitelist. */
  protected readonly acceptedTypes: string = ACCEPTED_MIME_TYPES.join(',');

  /** Synced plus queued rows — what the cap and counter reason about, since queued files consume server slots on replay. */
  protected readonly totalCount: Signal<number> = computed<number>(
    () => this.attachments().length + this.queuedAttachments().length,
  );

  /** How many more files this intervention may take, never below zero. */
  protected readonly remainingSlots: Signal<number> = computed<number>(() =>
    Math.max(MAX_ATTACHMENTS - this.totalCount(), 0),
  );

  /** Whether the intervention has reached the backend's attachment ceiling. */
  protected readonly atCapacity: Signal<boolean> = computed<boolean>(
    () => this.remainingSlots() === 0,
  );

  /** The `n / 25` counter text. */
  protected readonly countLabel: Signal<string> = computed<string>(
    () => `${this.totalCount()} / ${MAX_ATTACHMENTS}`,
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
    () => this.totalCount() >= MAX_ATTACHMENTS / 2,
  );

  /** Whether the pickers are usable right now. */
  protected readonly canPick: Signal<boolean> = computed<boolean>(
    () => this.canManage() && !this.uploading() && !this.atCapacity(),
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

    const oversized: File | undefined = files.find(
      (file) => !file.type.startsWith('image/') && file.size > MAX_SIZE_BYTES,
    );
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
   * @param {AttachmentFileMeta} attachment - The row's attachment, synced or queued.
   * @returns {string} A name registered with `provideIcons`.
   */
  protected iconOf(attachment: AttachmentFileMeta): string {
    return attachment.mimeType.startsWith('image/') ? 'lucideImage' : 'lucideFileText';
  }

  /**
   * Method extensionOf
   * @description The attachment's file extension, badge-sized, read from the file name and falling back to the declared MIME subtype.
   * @access protected
   * @since 1.0.0
   * @param {AttachmentFileMeta} attachment - The row's attachment, synced or queued.
   * @returns {string} An uppercased extension of at most 4 characters, e.g. "PDF", "JPEG".
   */
  protected extensionOf(attachment: AttachmentFileMeta): string {
    const dotIndex: number = attachment.fileName.lastIndexOf('.');
    const fromName: string = dotIndex > 0 ? attachment.fileName.slice(dotIndex + 1) : '';
    const extension: string = fromName || (attachment.mimeType.split('/').at(-1) ?? '');

    return extension.slice(0, 4).toUpperCase();
  }

  /**
   * Method workItemLabelOf
   *
   * @description
   * The display label of the work item this attachment documents, resolved
   * from {@link workItems} by id. Null both for a plain intervention-level
   * attachment and for a `workItemId` that no longer resolves (the item was
   * deleted after upload — the backend keeps the file as intervention-level
   * evidence, but this component was not told that).
   *
   * @access protected
   * @since 5.4.0
   *
   * @param {InterventionAttachmentOutput} attachment - The row's attachment.
   *
   * @returns {string | null} The work item's action label, or null.
   */
  protected workItemLabelOf(attachment: InterventionAttachmentOutput): string | null {
    const workItemId: string | null | undefined = attachment.workItemId;
    if (!workItemId) return null;

    const workItem = this.workItems().find((item) => item.id === workItemId);
    return workItem ? resolveInterventionTag('workItemAction', workItem.action).label : null;
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
   * Method isRowDownloading
   * @description Whether this row's own download is in flight.
   * @access protected
   * @since 1.1.0
   * @param {InterventionAttachmentOutput} attachment - The row's attachment.
   * @returns {boolean} True while the row's fetch is pending.
   */
  protected isRowDownloading(attachment: InterventionAttachmentOutput): boolean {
    return this.downloadingIds().has(attachment.id);
  }

  /**
   * Method sizeLabelOf
   * @description The attachment's size as a compact localized label.
   * @access protected
   * @since 1.0.0
   * @param {AttachmentFileMeta} attachment - The row's attachment, synced or queued.
   * @returns {string} e.g. "1.2 MB".
   */
  protected sizeLabelOf(attachment: AttachmentFileMeta): string {
    const megabytes: number = attachment.size / (1024 * 1024);
    const format: Intl.NumberFormat | undefined = this.sizeFormats.get(megabytes >= 10 ? 0 : 1);
    const formatted: string = format?.format(Math.max(megabytes, 0.1)) ?? megabytes.toFixed(1);

    return `${formatted} MB`;
  }
  //#endregion
}
