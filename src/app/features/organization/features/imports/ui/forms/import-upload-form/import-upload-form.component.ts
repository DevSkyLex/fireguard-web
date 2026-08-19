import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { form, FormField, required, type FieldTree } from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronDown, lucideFileText, lucideUpload } from '@ng-icons/lucide';
import type { ImportJobKind } from '@features/organization/features/imports/models';
import { IMPORT_JOB_KIND_OPTIONS } from '@features/organization/features/imports/options';
import { HlmButton } from '@shared/ui/button';
import { HlmCollapsibleImports } from '@shared/ui/collapsible';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmSelectImports } from '@shared/ui/select';
import { HlmSwitchImports } from '@shared/ui/switch';
import {
  IMPORT_CSV_COLUMN_HELP,
  IMPORT_CSV_GENERAL_NOTES,
} from './constants/import-csv-columns.constants';
import type { ImportUploadSubmission } from './models/import-upload-submission.interface';

/** Backend-enforced ceiling (`ARCHITECTURE.md` API contract): 5 MB, checked client-side for a friendlier error than the server's 422. */
const MAX_FILE_SIZE_BYTES: number = 5 * 1024 * 1024;

/** Draft shape backing the Signal Forms field tree. */
interface ImportUploadDraft {
  readonly kind: ImportJobKind | '';
  readonly dryRun: boolean;
}

/** A blank draft. */
const EMPTY_DRAFT: ImportUploadDraft = { kind: '', dryRun: false };

/**
 * Component ImportUploadForm
 * @class ImportUploadForm
 *
 * @description
 * The CSV upload card: a kind select, a file picker with client-side
 * extension/size pre-checks (friendlier than waiting for the backend's 422),
 * a dry-run toggle explaining what it does, and a collapsible "Expected CSV
 * format" help block sourced from {@link IMPORT_CSV_COLUMN_HELP} — the
 * column contract this app hard-codes since no template endpoint exists.
 *
 * Presentational: it validates and emits {@link submitted}, never calling the
 * store itself (`ARCHITECTURE.md` §10.3). Resets its own draft and picked
 * file immediately on submit rather than waiting on the page to report a
 * result, mirroring `OrganizationLogoPicker`'s picked-file handling — a
 * failed upload's message is shown via {@link error} without repopulating
 * the (now-cleared) form, since the operator must re-pick the file either way.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-import-upload-form
 *   [pending]="store.isCreating()"
 *   [error]="store.createError()"
 *   (submitted)="upload($event)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-import-upload-form',
  imports: [
    FormField,
    NgIcon,
    HlmButton,
    ...HlmCollapsibleImports,
    ...HlmFieldImports,
    ...HlmSelectImports,
    ...HlmSwitchImports,
  ],
  providers: [provideIcons({ lucideChevronDown, lucideFileText, lucideUpload })],
  templateUrl: './import-upload-form.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportUploadForm {
  //#region Inputs
  /**
   * Property pending
   * @readonly
   * @description Whether the upload request is in flight.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property error
   * @readonly
   * @description The last upload's normalized failure message, or `null`.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | null>}
   */
  public readonly error: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property kindOptions
   * @readonly
   * @description The kind choices offered — the page narrows this to the kinds the active member may write.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<typeof IMPORT_JOB_KIND_OPTIONS>}
   */
  public readonly kindOptions: InputSignal<typeof IMPORT_JOB_KIND_OPTIONS> =
    input<typeof IMPORT_JOB_KIND_OPTIONS>(IMPORT_JOB_KIND_OPTIONS);
  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @readonly
   * @description The validated kind, file and dry-run choice.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<ImportUploadSubmission>}
   */
  public readonly submitted: OutputEmitterRef<ImportUploadSubmission> =
    output<ImportUploadSubmission>();
  //#endregion

  //#region Properties
  /** Whether the "Expected CSV format" block is expanded. */
  protected readonly helpExpanded: WritableSignal<boolean> = signal<boolean>(false);

  /** The edited draft. */
  protected readonly model: WritableSignal<ImportUploadDraft> =
    signal<ImportUploadDraft>(EMPTY_DRAFT);

  /**
   * Property uploadForm
   * @readonly
   * @description The field tree and its rules.
   * @access protected
   * @since 1.0.0
   * @type {FieldTree<ImportUploadDraft>}
   */
  protected readonly uploadForm: FieldTree<ImportUploadDraft> = form(this.model, (path) => {
    required(path.kind, {
      message: $localize`:@@imports.upload.kindRequired:Choose what the file imports.`,
    });
  });

  /** The picked file, or `null` before one is chosen. */
  protected readonly selectedFile: WritableSignal<File | null> = signal<File | null>(null);

  /** Client-side pre-check failure for the picked file, or `null`. */
  protected readonly fileError: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Property columnHelp
   * @readonly
   * @description The active kind's column contract, or `null` before a kind is chosen.
   * @access protected
   * @since 1.0.0
   * @type {Signal<(typeof IMPORT_CSV_COLUMN_HELP)[ImportJobKind] | null>}
   */
  protected readonly columnHelp: Signal<(typeof IMPORT_CSV_COLUMN_HELP)[ImportJobKind] | null> =
    computed(() => {
      const kind: ImportJobKind | '' = this.model().kind;
      return kind === '' ? null : IMPORT_CSV_COLUMN_HELP[kind];
    });

  /** File-level rules shown regardless of the active kind. */
  protected readonly generalNotes: ReadonlyArray<string> = IMPORT_CSV_GENERAL_NOTES;
  //#endregion

  //#region Methods
  /**
   * Method pick
   * @method pick
   *
   * @description
   * Validates the picked file's extension and size before accepting it —
   * the same two conditions the backend rejects with a 422/400, checked
   * here for immediate feedback. The input is cleared either way, so
   * picking the same file again after a rejection still fires `change`.
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

    if (!file.name.toLowerCase().endsWith('.csv')) {
      this.fileError.set($localize`:@@imports.upload.fileErrorExtension:Choose a .csv file.`);
      this.selectedFile.set(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      this.fileError.set(
        $localize`:@@imports.upload.fileErrorSize:This file is larger than the 5 MB limit.`,
      );
      this.selectedFile.set(null);
      return;
    }

    this.fileError.set(null);
    this.selectedFile.set(file);
  }

  /**
   * Method submit
   *
   * @description
   * Marks the tree touched so an unmet kind selection shows, requires a
   * validated file, then emits the submission and resets the card for the
   * next upload.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {Event} event - The submit event.
   *
   * @returns {void}
   */
  protected submit(event: Event): void {
    event.preventDefault();

    this.uploadForm().markAsTouched();

    const file: File | null = this.selectedFile();
    if (file === null) {
      this.fileError.set($localize`:@@imports.upload.fileRequired:Choose a CSV file to upload.`);
    }

    if (this.uploadForm().invalid() || file === null) return;

    const draft: ImportUploadDraft = this.model();
    this.submitted.emit({ kind: draft.kind as ImportJobKind, file, dryRun: draft.dryRun });

    this.model.set(EMPTY_DRAFT);
    this.selectedFile.set(null);
    this.fileError.set(null);
  }
  //#endregion
}
