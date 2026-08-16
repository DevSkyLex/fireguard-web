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
import {
  lucideCheck,
  lucideEllipsisVertical,
  lucideMap,
  lucidePlus,
  lucideTrash2,
} from '@ng-icons/lucide';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import type { FacilityAttachmentOutput } from '@features/organization/features/facilities/models';
import { HlmAlertDialogImports } from '@shared/ui/alert-dialog';
import { HlmBadgeImports } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmDropdownMenuImports } from '@shared/ui/dropdown-menu';
import { HlmItemImports } from '@shared/ui/item';
import { HlmSpinnerImports } from '@shared/ui/spinner';

/** The MIME types the backend accepts for a floor plan, byte for byte. */
const ACCEPTED_MIME_TYPES: readonly string[] = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
];

/**
 * Component FacilityPlanList
 * @class FacilityPlanList
 *
 * @description
 * The facility's floor plans: an upload button, a row per plan (file name,
 * pixel dimensions when known, a primary badge with both a label and an
 * icon), and a per-row menu (View, Set as primary, Delete). Presentational —
 * the page owns the store calls; this component only picks and confirms.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-plan-list',
  imports: [
    NgIcon,
    HlmButton,
    ...HlmAlertDialogImports,
    ...HlmBadgeImports,
    ...HlmDropdownMenuImports,
    ...HlmItemImports,
    ...HlmSpinnerImports,
  ],
  providers: [
    provideIcons({ lucideCheck, lucideEllipsisVertical, lucideMap, lucidePlus, lucideTrash2 }),
  ],
  templateUrl: './facility-plan-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityPlanList {
  //#region Inputs
  /** The facility's floor plans, primary-first. */
  public readonly plans: InputSignal<readonly FacilityAttachmentOutput[]> = input<
    readonly FacilityAttachmentOutput[]
  >([]);

  /** The plan currently shown by the viewer. */
  public readonly selectedPlanId: InputSignal<string | null> = input<string | null>(null);

  /** Whether the host grants uploading, setting primary and deleting. */
  public readonly canManage: InputSignal<boolean> = input<boolean>(false);

  /** Whether an upload is in flight, which locks the picker. */
  public readonly uploading: InputSignal<boolean> = input<boolean>(false);

  /** Id of the plan whose set-primary write is in flight. */
  public readonly settingPrimaryId: InputSignal<string | null> = input<string | null>(null);

  /** Id of the plan whose delete write is in flight. */
  public readonly deletingId: InputSignal<string | null> = input<string | null>(null);
  //#endregion

  //#region Outputs
  /** Emits the plan a row (or its View action) selected for the viewer. */
  public readonly planSelected: OutputEmitterRef<string> = output<string>();

  /** Emits the picked file for upload; validity is pre-checked here. */
  public readonly filePicked: OutputEmitterRef<File> = output<File>();

  /** Emits the plan the page should set as primary. */
  public readonly setPrimaryRequested: OutputEmitterRef<FacilityAttachmentOutput> =
    output<FacilityAttachmentOutput>();

  /** Emits the plan whose confirmed deletion the page should perform. */
  public readonly deleteRequested: OutputEmitterRef<FacilityAttachmentOutput> =
    output<FacilityAttachmentOutput>();
  //#endregion

  //#region Properties
  /** The `accept` attribute, straight from the whitelist. */
  protected readonly acceptedTypes: string = ACCEPTED_MIME_TYPES.join(',');

  /** The last pick's local rejection, cleared on the next valid pick. */
  protected readonly pickError: WritableSignal<string | null> = signal<string | null>(null);

  /** The plan awaiting delete confirmation, if any. */
  protected readonly pendingDelete: WritableSignal<FacilityAttachmentOutput | null> =
    signal<FacilityAttachmentOutput | null>(null);
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
   * Method onFileSelected
   * @description Validates a pick against the backend's image MIME whitelist and emits it.
   * @access protected
   * @since 1.0.0
   * @param {Event} event - The file input's change event.
   * @returns {void}
   */
  protected onFileSelected(event: Event): void {
    const inputElement: HTMLInputElement = event.target as HTMLInputElement;
    const file: File | null = inputElement.files?.[0] ?? null;
    inputElement.value = ''; // Re-picking the same file fires no change event otherwise.
    if (!file) return;

    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      this.pickError.set(
        $localize`:@@facility.plans.unsupported:"${file.name}:name:" is not an accepted image format (PNG, JPEG, WebP or SVG).`,
      );

      return;
    }

    this.pickError.set(null);
    this.filePicked.emit(file);
  }

  /**
   * Method dimensionsLabelOf
   * @description The plan's pixel dimensions, or null when the backend could not probe them.
   * @access protected
   * @since 1.0.0
   * @param {FacilityAttachmentOutput} plan - The row's plan.
   * @returns {string | null} e.g. "1200 × 800 px".
   */
  protected dimensionsLabelOf(plan: FacilityAttachmentOutput): string | null {
    if (plan.imageWidth === null || plan.imageHeight === null) return null;

    return $localize`:@@facility.plans.dimensions:${plan.imageWidth}:width: × ${plan.imageHeight}:height: px`;
  }

  /**
   * Method isRowSettingPrimary
   * @description Whether this row's own set-primary write is in flight.
   * @access protected
   * @since 1.0.0
   * @param {FacilityAttachmentOutput} plan - The row's plan.
   * @returns {boolean} True while the row's write is pending.
   */
  protected isRowSettingPrimary(plan: FacilityAttachmentOutput): boolean {
    return this.settingPrimaryId() === plan.id;
  }

  /**
   * Method isRowDeleting
   * @description Whether this row's own delete write is in flight.
   * @access protected
   * @since 1.0.0
   * @param {FacilityAttachmentOutput} plan - The row's plan.
   * @returns {boolean} True while the row's write is pending.
   */
  protected isRowDeleting(plan: FacilityAttachmentOutput): boolean {
    return this.deletingId() === plan.id;
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
    const target: FacilityAttachmentOutput | null = this.pendingDelete();
    this.pendingDelete.set(null);
    if (target) this.deleteRequested.emit(target);
  }
  //#endregion
}
