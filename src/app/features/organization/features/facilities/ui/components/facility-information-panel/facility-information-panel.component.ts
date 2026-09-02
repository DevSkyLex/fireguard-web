import type { BooleanInput } from '@angular/cdk/coercion';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
  type InputSignal,
  type InputSignalWithTransform,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLocateFixed, lucideMapPin } from '@ng-icons/lucide';
import type {
  FacilityEditState,
  FacilityEditTarget,
  FacilityGeocodeOutput,
  FacilityOutput,
  UpdateFacilityInput,
} from '@features/organization/features/facilities/models';
import { FACILITY_TYPE_OPTIONS } from '@features/organization/features/facilities/options';
import { InplaceField } from '@shared/inplace-field';
import type { MapCoordinates } from '@shared/map';
import { HlmButton } from '@shared/ui/button';
import { HlmInput } from '@shared/ui/input';
import { FacilityMapPickerDialog } from '../../dialogs/facility-map-picker-dialog';

/** Parses a coordinate draft, returning `null` for a blank string and `NaN` for anything unparsable. */
function parseCoordinate(value: string): number | null {
  const trimmed: string = value.trim();

  return trimmed === '' ? null : Number(trimmed);
}

/** The stacking order's own bounds, mirroring the backend's `FacilityLevelIndex` value object. */
const LEVEL_INDEX_BOUNDS: readonly [number, number] = [-100, 200];

/** Parses a level-index draft, returning `null` for a blank string and `NaN` for anything unparsable. */
function parseLevelIndex(value: string): number | null {
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
 * `levelIndex` only renders when the facility's `type` is `floor` — it means
 * nothing on any other type — and shares the same confirm-mode shape as the
 * text fields: blank clears it, an integer outside `[-100, 200]` is refused
 * client-side.
 *
 * @version 1.2.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-information-panel',
  imports: [RouterLink, InplaceField, FacilityMapPickerDialog, HlmButton, HlmInput, NgIcon],
  providers: [provideIcons({ lucideLocateFixed, lucideMapPin })],
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

  /**
   * Property geocodePending
   * @readonly
   * @description Whether the page's "Locate address" lookup is in flight, which makes the button inert (`aria-disabled`, still focusable).
   * @access public
   * @since 1.1.0
   * @type {InputSignal<boolean>}
   */
  public readonly geocodePending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property geocodeResult
   * @readonly
   * @description The latest successful lookup. Fills the coordinate drafts — both stay editable — and its `displayName` renders as help in the coordinates editor.
   * @access public
   * @since 1.1.0
   * @type {InputSignal<FacilityGeocodeOutput | null>}
   */
  public readonly geocodeResult: InputSignal<FacilityGeocodeOutput | null> =
    input<FacilityGeocodeOutput | null>(null);

  /**
   * Property geocodeNotFound
   * @readonly
   * @description Whether the latest lookup answered `404` — shown as a non-blocking inline message, never a field error.
   * @access public
   * @since 1.1.0
   * @type {InputSignal<boolean>}
   */
  public readonly geocodeNotFound: InputSignal<boolean> = input<boolean>(false);
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

  /**
   * Property geocodeRequested
   * @readonly
   * @description Asks the page to resolve the record's stored address to coordinates — the page owns the transport call and answers through {@link geocodeResult} / {@link geocodeNotFound}.
   * @access public
   * @since 1.1.0
   * @type {OutputEmitterRef<string>}
   */
  public readonly geocodeRequested: OutputEmitterRef<string> = output<string>();
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

  /** The in-flight level-index draft, seeded when `levelIndex` opens. */
  protected readonly levelIndexDraft: WritableSignal<string> = signal<string>('');

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

  /**
   * Property canSaveLevelIndex
   * @readonly
   *
   * @description
   * Whether the level-index draft is worth sending: blank (clears a stored
   * value), or a whole number within `[-100, 200]` different from what is
   * stored.
   *
   * @access protected
   * @since 1.2.0
   * @type {Signal<boolean>}
   */
  protected readonly canSaveLevelIndex: Signal<boolean> = computed<boolean>(() => {
    const parsed: number | null = parseLevelIndex(this.levelIndexDraft());
    const stored: number | null = this.facility().levelIndex ?? null;

    if (parsed === null) return stored !== null;
    if (!Number.isInteger(parsed)) return false;
    if (parsed < LEVEL_INDEX_BOUNDS[0] || parsed > LEVEL_INDEX_BOUNDS[1]) return false;

    return parsed !== stored;
  });

  /**
   * Property coordinatesError
   * @readonly
   *
   * @description
   * Why a coordinate draft cannot be saved, or `null` when it is acceptable.
   *
   * The pair rule was enforced silently before: `canSaveCoordinates` returned
   * `false` and the Save button simply greyed out, leaving the user to guess
   * that a latitude without a longitude is not half a location. The create
   * form has always said so out loud; this says the same thing.
   *
   * @access protected
   * @since 1.2.0
   * @type {Signal<string | null>}
   */
  protected readonly coordinatesError: Signal<string | null> = computed<string | null>(() => {
    const rawLatitude: string = this.latitudeDraft().trim();
    const rawLongitude: string = this.longitudeDraft().trim();

    if (rawLatitude === '' && rawLongitude === '') return null;

    if (rawLatitude === '' || rawLongitude === '') {
      return $localize`:@@facility.info.coordinatesIncomplete:Enter both latitude and longitude, or leave both empty.`;
    }

    const latitude: number | null = parseCoordinate(rawLatitude);
    const longitude: number | null = parseCoordinate(rawLongitude);

    if (
      latitude === null ||
      longitude === null ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return $localize`:@@facility.info.coordinatesRange:Latitude runs from -90 to 90, longitude from -180 to 180.`;
    }

    return null;
  });

  /**
   * Property levelIndexError
   * @readonly
   *
   * @description
   * The reason a level-index draft cannot be saved, or `null` when it is
   * blank or acceptable. Without this the Save button simply greys out and
   * the user is left to guess why — the bound is a domain rule, not a
   * self-evident one.
   *
   * @access protected
   * @since 1.2.0
   * @type {Signal<string | null>}
   */
  protected readonly levelIndexError: Signal<string | null> = computed<string | null>(() => {
    const raw: string = this.levelIndexDraft().trim();
    if (raw === '') return null;

    const parsed: number | null = parseLevelIndex(raw);
    if (
      parsed === null ||
      !Number.isInteger(parsed) ||
      parsed < LEVEL_INDEX_BOUNDS[0] ||
      parsed > LEVEL_INDEX_BOUNDS[1]
    ) {
      return $localize`:@@facility.info.levelIndexRange:Enter a whole number between -100 and 200.`;
    }

    return null;
  });

  /** Names a facility type for the read-only type row. */
  protected readonly typeLabelOf: (value: string) => string = (value) =>
    this.typeOptions.find((option) => option.value === value)?.label ??
    $localize`:@@common.unknownType:Unknown type`;

  /** Whether the "Pick on map" dialog is open. */
  protected readonly mapPickerVisible: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property pickerCenter
   * @readonly
   * @description Where the picker opens: the coordinate draft once both fields are filled, else the record's own stored coordinates, else the primitive's neutral default.
   * @access protected
   * @since 1.1.0
   * @type {Signal<MapCoordinates | undefined>}
   */
  protected readonly pickerCenter: Signal<MapCoordinates | undefined> = computed<
    MapCoordinates | undefined
  >(() => {
    const latitude: number | null = parseCoordinate(this.latitudeDraft());
    const longitude: number | null = parseCoordinate(this.longitudeDraft());
    if (
      latitude !== null &&
      longitude !== null &&
      Number.isFinite(latitude) &&
      Number.isFinite(longitude)
    ) {
      return { latitude, longitude };
    }

    const facility: FacilityOutput = this.facility();

    return facility.latitude != null && facility.longitude != null
      ? { latitude: facility.latitude, longitude: facility.longitude }
      : undefined;
  });
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   * @description Fills the coordinate drafts from each new "Locate address" match while the coordinates editor is open.
   * @access public
   * @since 1.1.0
   */
  public constructor() {
    effect((): void => {
      const result: FacilityGeocodeOutput | null = this.geocodeResult();
      if (result === null) return;

      untracked((): void => {
        if (this.editState().open !== 'coordinates') return;

        this.latitudeDraft.set(String(result.latitude));
        this.longitudeDraft.set(String(result.longitude));
      });
    });
  }
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
   * Method onLevelIndexEditing
   * @description Seeds the level-index draft on open and forwards the open/close request.
   * @access protected
   * @since 1.2.0
   * @param {boolean} open - Whether the field is being opened.
   * @returns {void}
   */
  protected onLevelIndexEditing(open: boolean): void {
    if (open) {
      const value: number | null | undefined = this.facility().levelIndex;
      this.levelIndexDraft.set(value != null ? String(value) : '');
    }

    this.editTargetChanged.emit(open ? 'levelIndex' : null);
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
   * Method saveLevelIndex
   * @description Emits the drafted level index, cleared to `null` when blank.
   * @access protected
   * @since 1.2.0
   * @returns {void}
   */
  protected saveLevelIndex(): void {
    this.detailsChanged.emit({ levelIndex: parseLevelIndex(this.levelIndexDraft()) });
  }

  /**
   * Method locateAddress
   *
   * @description
   * Emits {@link geocodeRequested} with the record's stored address. A
   * no-op while a lookup is already in flight or while the record has no
   * address — the button stays focusable (`aria-disabled`, not
   * `disabled`), so this guard is what prevents a double request.
   *
   * @access protected
   * @since 1.1.0
   *
   * @returns {void}
   */
  protected locateAddress(): void {
    if (this.geocodePending()) return;

    const address: string = this.facility().address?.trim() ?? '';
    if (address === '') return;

    this.geocodeRequested.emit(address);
  }

  /**
   * Method onMapPicked
   * @description Fills both coordinate drafts from the picker's click; Save still commits them, so a mis-click is never sent unreviewed.
   * @access protected
   * @since 1.1.0
   * @param {MapCoordinates} coordinates - The picked position.
   * @returns {void}
   */
  protected onMapPicked(coordinates: MapCoordinates): void {
    this.latitudeDraft.set(String(coordinates.latitude));
    this.longitudeDraft.set(String(coordinates.longitude));
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
    if (target === null || target === 'coordinates' || target === 'levelIndex') return null;

    return this.facility()[target];
  }
  //#endregion
}
