import type { BooleanInput } from '@angular/cdk/coercion';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
  type InputSignal,
  type InputSignalWithTransform,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import type {
  FacilityEditState,
  FacilityEditTarget,
  FacilityOutput,
  UpdateFacilityInput,
} from '@features/organization/features/facilities/models';
import { FACILITY_TYPE_OPTIONS } from '@features/organization/features/facilities/options';
import { InplaceField } from '@shared/inplace-field';
import { HlmInput } from '@shared/ui/input';

/** Parses a coordinate draft, returning `null` for a blank string and `NaN` for anything unparsable. */
function parseCoordinate(value: string): number | null {
  const trimmed: string = value.trim();

  return trimmed === '' ? null : Number(trimmed);
}

/**
 * Component FacilityInformationPanel
 * @class FacilityInformationPanel
 *
 * @description
 * The facility's identification properties — name, code, address,
 * coordinates — each edited where it is displayed (`ARCHITECTURE.md` §10.5,
 * `FEATURE.md` "The record is the edit surface"). Type and the parent render
 * as plain read-only rows: `UpdateFacilityInput` accepts neither, so an
 * `InplaceField` trigger would only promise a write the API refuses.
 *
 * The four free-text/number fields keep an explicit Save (`confirm`) since
 * neither has a single "done" gesture. Only one field is ever open at a
 * time (`editState`), so `name`/`code`/`address` share one draft signal and
 * the coordinate pair shares its own two, mirroring
 * `EquipmentInformationPanel`.
 *
 * Coordinates commit together and only together: a value in one without the
 * other is refused client-side rather than sent half-filled.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-information-panel',
  imports: [RouterLink, InplaceField, HlmInput],
  templateUrl: './facility-information-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityInformationPanel {
  //#region Inputs
  /**
   * Property facility
   * @readonly
   * @description The loaded facility whose properties this panel edits.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<FacilityOutput>}
   */
  public readonly facility: InputSignal<FacilityOutput> = input.required<FacilityOutput>();

  /**
   * Property editable
   * @readonly
   * @description Whether the member may write to this facility at all.
   * @access public
   * @since 1.0.0
   * @type {InputSignalWithTransform<boolean, BooleanInput>}
   */
  public readonly editable: InputSignalWithTransform<boolean, BooleanInput> = input<
    boolean,
    BooleanInput
  >(false, { transform: booleanAttribute });

  /**
   * Property editState
   * @readonly
   * @description Which field the page has open, writing, or showing a rejection.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<FacilityEditState>}
   */
  public readonly editState: InputSignal<FacilityEditState> = input.required<FacilityEditState>();

  /**
   * Property organizationId
   * @readonly
   * @description The workspace owning the facility, so the parent row can link into it.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();
  //#endregion

  //#region Outputs
  /**
   * Property detailsChanged
   * @readonly
   * @description A patch the page should send. Never emitted for an unchanged value.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<UpdateFacilityInput>}
   */
  public readonly detailsChanged: OutputEmitterRef<UpdateFacilityInput> =
    output<UpdateFacilityInput>();

  /**
   * Property editTargetChanged
   * @readonly
   * @description Asks the page to open or close an editor.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<FacilityEditTarget | null>}
   */
  public readonly editTargetChanged: OutputEmitterRef<FacilityEditTarget | null> =
    output<FacilityEditTarget | null>();
  //#endregion

  //#region Properties
  /** The facility types offered, for the read-only type row's label. */
  protected readonly typeOptions: typeof FACILITY_TYPE_OPTIONS = FACILITY_TYPE_OPTIONS;

  /**
   * Property textDraft
   * @readonly
   *
   * @description
   * The in-flight value for whichever confirm-mode text field is open
   * (`name`, `code`, `address`), seeded when that field opens. A single
   * signal is enough because `InplaceField`'s `editing` is controlled and
   * only one field opens at a time.
   *
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<string>}
   */
  protected readonly textDraft: WritableSignal<string> = signal<string>('');

  /** The in-flight latitude draft, seeded when `coordinates` opens. */
  protected readonly latitudeDraft: WritableSignal<string> = signal<string>('');

  /** The in-flight longitude draft, seeded when `coordinates` opens. */
  protected readonly longitudeDraft: WritableSignal<string> = signal<string>('');

  /**
   * Property canSaveText
   * @readonly
   * @description Whether the open text field's draft differs from its stored value and, for `name`, is not blank.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly canSaveText: Signal<boolean> = computed<boolean>(() => {
    const target: FacilityEditTarget | null = this.editState().open;
    const trimmed: string = this.textDraft().trim();
    const stored: string = this.storedTextValueOf(target) ?? '';

    if (target === 'name' && trimmed === '') return false;

    return trimmed !== stored;
  });

  /**
   * Property canSaveCoordinates
   * @readonly
   *
   * @description
   * Whether the coordinate draft is worth sending: both fields blank (clears
   * the location), or both filled with finite numbers — never just one — and
   * different from what is stored.
   *
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly canSaveCoordinates: Signal<boolean> = computed<boolean>(() => {
    const latitude: number | null = parseCoordinate(this.latitudeDraft());
    const longitude: number | null = parseCoordinate(this.longitudeDraft());

    if (latitude === null && longitude === null) {
      return this.facility().latitude != null || this.facility().longitude != null;
    }

    if (latitude === null || longitude === null) return false;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return false;

    return latitude !== this.facility().latitude || longitude !== this.facility().longitude;
  });

  /** Names a facility type for the read-only type row. */
  protected readonly typeLabelOf: (value: string) => string = (value) =>
    this.typeOptions.find((option) => option.value === value)?.label ?? value.replace(/_/g, ' ');
  //#endregion

  //#region Methods
  /**
   * Method isEditing
   * @description Whether the page has this field open.
   * @access protected
   * @since 1.0.0
   * @param {FacilityEditTarget} target - The field in question.
   * @returns {boolean} True when it is the open one.
   */
  protected isEditing(target: FacilityEditTarget): boolean {
    return this.editState().open === target;
  }

  /**
   * Method isSaving
   * @description Whether this field's own write is in flight.
   * @access protected
   * @since 1.0.0
   * @param {FacilityEditTarget} target - The field in question.
   * @returns {boolean} True while its patch is pending.
   */
  protected isSaving(target: FacilityEditTarget): boolean {
    return this.editState().saving === target;
  }

  /**
   * Method errorFor
   * @description The rejection message attributed to this field, if any.
   * @access protected
   * @since 1.0.0
   * @param {FacilityEditTarget} target - The field in question.
   * @returns {string | null} Its failure message, or null.
   */
  protected errorFor(target: FacilityEditTarget): string | null {
    const state: FacilityEditState = this.editState();

    return state.failed === target ? state.failure : null;
  }

  /**
   * Method onTextEditing
   *
   * @description
   * Seeds the shared draft on open and forwards the open/close request to the
   * page, which owns which field is open.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {FacilityEditTarget} target - The text field being opened or closed.
   * @param {boolean} open - Whether it is being opened.
   *
   * @returns {void}
   */
  protected onTextEditing(target: FacilityEditTarget, open: boolean): void {
    if (open) this.textDraft.set(this.storedTextValueOf(target) ?? '');

    this.editTargetChanged.emit(open ? target : null);
  }

  /**
   * Method onCoordinatesEditing
   * @description Seeds both coordinate drafts on open and forwards the open/close request.
   * @access protected
   * @since 1.0.0
   * @param {boolean} open - Whether the field is being opened.
   * @returns {void}
   */
  protected onCoordinatesEditing(open: boolean): void {
    if (open) {
      const facility: FacilityOutput = this.facility();
      this.latitudeDraft.set(facility.latitude != null ? String(facility.latitude) : '');
      this.longitudeDraft.set(facility.longitude != null ? String(facility.longitude) : '');
    }

    this.editTargetChanged.emit(open ? 'coordinates' : null);
  }

  /**
   * Method saveText
   * @description Emits the drafted value for the currently open text field, trimmed and nulled if blank (never for `name`).
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected saveText(): void {
    const target: FacilityEditTarget | null = this.editState().open;
    if (target === null || target === 'coordinates') return;

    const trimmed: string = this.textDraft().trim();

    this.detailsChanged.emit({ [target]: target === 'name' || trimmed !== '' ? trimmed : null });
  }

  /**
   * Method saveCoordinates
   * @description Emits both coordinates together — a matching pair of numbers, or both cleared to `null`.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected saveCoordinates(): void {
    const latitude: number | null = parseCoordinate(this.latitudeDraft());
    const longitude: number | null = parseCoordinate(this.longitudeDraft());

    this.detailsChanged.emit({ latitude, longitude });
  }

  /**
   * Method storedTextValueOf
   * @description The currently stored value for a text edit target, or null for `coordinates`/unset.
   * @access private
   * @since 1.0.0
   * @param {FacilityEditTarget | null} target - The field in question.
   * @returns {string | null} The stored value.
   */
  private storedTextValueOf(target: FacilityEditTarget | null): string | null {
    if (target === null || target === 'coordinates') return null;

    return this.facility()[target];
  }
  //#endregion
}
