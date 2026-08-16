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
import {
  form,
  FormField,
  required,
  validate,
  type FieldTree,
  type ValidationError,
} from '@angular/forms/signals';
import { toServerFieldErrors, toUnmatchedViolations, type Violation } from '@core/api';
import type {
  CreateFacilityInput,
  FacilityType,
} from '@features/organization/features/facilities/models';
import { FACILITY_TYPE_OPTIONS } from '@features/organization/features/facilities/options';
import type { MapCoordinates } from '@shared/map';
import { HlmButton } from '@shared/ui/button';
import { HlmComboboxImports } from '@shared/ui/combobox';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmSelectImports } from '@shared/ui/select';
import { FacilityMapPickerDialog } from '../../dialogs/facility-map-picker-dialog';
import type { FacilityCreateFormDraft } from './models';

/** A blank draft. */
const EMPTY_VALUES: FacilityCreateFormDraft = {
  type: '',
  name: '',
  parentFacilityId: '',
  code: '',
  address: '',
  latitude: '',
  longitude: '',
};

/** Trims a free-text field, sending `undefined` rather than an empty string. */
function trimmed(value: string): string | undefined {
  const trimmedValue: string = value.trim();

  return trimmedValue === '' ? undefined : trimmedValue;
}

/** Parses a coordinate draft to a finite number, or `undefined` for a blank string. */
function parsedCoordinate(value: string): number | undefined {
  const trimmedValue: string = value.trim();

  return trimmedValue === '' ? undefined : Number(trimmedValue);
}

/** Geographic bounds a latitude/longitude draft must fall within, once filled. */
const LATITUDE_BOUNDS: readonly [number, number] = [-90, 90];
const LONGITUDE_BOUNDS: readonly [number, number] = [-180, 180];

/** Whether a coordinate draft is either blank or a finite number within `bounds`. */
function isCoordinateInRange(value: string, bounds: readonly [number, number]): boolean {
  const trimmedValue: string = value.trim();
  if (trimmedValue === '') return true;

  const parsed: number = Number(trimmedValue);

  return Number.isFinite(parsed) && parsed >= bounds[0] && parsed <= bounds[1];
}

/**
 * Component FacilityCreateForm
 * @class FacilityCreateForm
 *
 * @description
 * The form that creates a facility, composed from spartan's field
 * primitives: one `hlm-field-group`, one `hlm-field` per control, and
 * `hlm-field-error` for the messages.
 *
 * It owns its model, its rules and its own validity, and emits
 * {@link submitted} with the API-shaped payload — the page calls the store
 * (`ARCHITECTURE.md` §10.4). `type` and `name` are the only required
 * fields; the parent, code, address and coordinates are completed here or
 * left for later, in place, on the detail page (`FEATURE.md` "The record is
 * the edit surface"). Coordinates are enforced both-or-neither: a value in
 * one without the other is refused before it ever reaches the store.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-create-form',
  imports: [
    FormField,
    FacilityMapPickerDialog,
    HlmButton,
    HlmInput,
    ...HlmComboboxImports,
    ...HlmFieldImports,
    ...HlmSelectImports,
  ],
  templateUrl: './facility-create-form.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityCreateForm {
  //#region Inputs
  /**
   * Property pending
   * @readonly
   * @description Whether a creation request is in flight, which locks the controls.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property serverError
   * @readonly
   * @description Whatever the store's create call failed with.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<unknown>}
   */
  public readonly serverError: InputSignal<unknown> = input<unknown>(null);

  /**
   * Property parentOptions
   * @readonly
   * @description The organization's facilities, offered as candidate parents. Empty until the page loads them.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<ReadonlyArray<{ readonly value: string; readonly label: string }>>}
   */
  public readonly parentOptions: InputSignal<
    ReadonlyArray<{ readonly value: string; readonly label: string }>
  > = input<ReadonlyArray<{ readonly value: string; readonly label: string }>>([]);

  /**
   * Property mapCenter
   * @readonly
   * @description Where the "Pick on map" picker opens when the draft has no coordinates of its own yet, resolved by the page from its already-loaded facilities.
   * @access public
   * @since 1.1.0
   * @type {InputSignal<MapCoordinates | undefined>}
   */
  public readonly mapCenter: InputSignal<MapCoordinates | undefined> = input<
    MapCoordinates | undefined
  >(undefined);
  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @readonly
   * @description Emits the API-shaped payload once the form is valid.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<CreateFacilityInput>}
   */
  public readonly submitted: OutputEmitterRef<CreateFacilityInput> = output<CreateFacilityInput>();

  /**
   * Property cancelled
   * @readonly
   * @description The operator backed out without creating anything.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly cancelled: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /** The edited draft. */
  protected readonly model: WritableSignal<FacilityCreateFormDraft> =
    signal<FacilityCreateFormDraft>(EMPTY_VALUES);

  /**
   * Property createForm
   * @readonly
   * @description The field tree and its rules.
   * @access protected
   * @since 1.0.0
   * @type {FieldTree<FacilityCreateFormDraft>}
   */
  protected readonly createForm: FieldTree<FacilityCreateFormDraft> = form(this.model, (path) => {
    required(path.type, {
      message: $localize`:@@facility.form.typeRequired:Facility type is required.`,
    });
    required(path.name, {
      message: $localize`:@@facility.form.nameRequired:Name is required.`,
    });

    validate(path.latitude, ({ value, valueOf }): ValidationError | null => {
      const latitude: string = value().trim();
      const longitude: string = valueOf(path.longitude).trim();

      return (latitude === '') === (longitude === '')
        ? null
        : {
            kind: 'coordinatesIncomplete',
            message: $localize`:@@facility.form.coordinatesIncomplete:Enter both latitude and longitude, or leave both empty.`,
          };
    });
    validate(path.latitude, ({ value }): ValidationError | null =>
      isCoordinateInRange(value(), LATITUDE_BOUNDS)
        ? null
        : {
            kind: 'coordinateRange',
            message: $localize`:@@facility.form.latitudeRange:Enter a latitude between -90 and 90.`,
          },
    );
    validate(path.longitude, ({ value, valueOf }): ValidationError | null => {
      const longitude: string = value().trim();
      const latitude: string = valueOf(path.latitude).trim();

      return (latitude === '') === (longitude === '')
        ? null
        : {
            kind: 'coordinatesIncomplete',
            message: $localize`:@@facility.form.coordinatesIncomplete:Enter both latitude and longitude, or leave both empty.`,
          };
    });
    validate(path.longitude, ({ value }): ValidationError | null =>
      isCoordinateInRange(value(), LONGITUDE_BOUNDS)
        ? null
        : {
            kind: 'coordinateRange',
            message: $localize`:@@facility.form.longitudeRange:Enter a longitude between -180 and 180.`,
          },
    );
  });

  /** The facility types offered. */
  protected readonly typeOptions: typeof FACILITY_TYPE_OPTIONS = FACILITY_TYPE_OPTIONS;

  /**
   * Property serverMessages
   * @readonly
   *
   * @description
   * Everything the API said about the rejected request, as flat lines shown
   * above the form.
   *
   * @access protected
   * @since 1.0.0
   * @type {Signal<readonly string[]>}
   */
  protected readonly serverMessages: Signal<readonly string[]> = computed<readonly string[]>(() => {
    const error: unknown = this.serverError();

    if (error === null || error === undefined) return [];

    const combined: readonly string[] = [
      ...new Set([
        ...Object.values(toServerFieldErrors(error)),
        ...toUnmatchedViolations(error, []).map((v: Violation): string => v.message),
      ]),
    ];

    return combined.length > 0
      ? combined
      : [$localize`:@@facility.cf.createFailed:The facility could not be created.`];
  });

  /** Names a facility type on the closed select trigger. */
  protected readonly typeLabelOf: (value: FacilityType | '') => string = (value) =>
    this.typeOptions.find((option) => option.value === value)?.label ?? '';

  /** Names a picked parent on the closed combobox trigger. */
  protected readonly parentLabelOf: (value: string) => string = (value) =>
    this.parentOptions().find((option) => option.value === value)?.label ?? '';

  /** Whether the "Pick on map" dialog is open. */
  protected readonly mapPickerVisible: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property pickerCenter
   * @readonly
   * @description Where the picker opens: the draft's own coordinates once both are filled, else {@link mapCenter}.
   * @access protected
   * @since 1.1.0
   * @type {Signal<MapCoordinates | undefined>}
   */
  protected readonly pickerCenter: Signal<MapCoordinates | undefined> = computed<
    MapCoordinates | undefined
  >(() => {
    const draft: FacilityCreateFormDraft = this.model();
    const latitude: number | undefined = parsedCoordinate(draft.latitude);
    const longitude: number | undefined = parsedCoordinate(draft.longitude);

    return latitude !== undefined &&
      longitude !== undefined &&
      Number.isFinite(latitude) &&
      Number.isFinite(longitude)
      ? { latitude, longitude }
      : this.mapCenter();
  });
  //#endregion

  //#region Methods
  /**
   * Method submit
   *
   * @description
   * Marks the tree touched so every unmet rule shows at once, then emits
   * when the form is valid. Blank optional fields are dropped rather than
   * sent as empty strings; coordinates are sent as a matching pair or
   * omitted entirely.
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

    this.createForm().markAsTouched();

    if (this.createForm().invalid()) return;

    const draft: FacilityCreateFormDraft = this.model();
    if (draft.type === '') return;

    this.submitted.emit({
      type: draft.type,
      name: draft.name.trim(),
      parentFacilityId: draft.parentFacilityId === '' ? undefined : draft.parentFacilityId,
      code: trimmed(draft.code),
      address: trimmed(draft.address),
      latitude: parsedCoordinate(draft.latitude),
      longitude: parsedCoordinate(draft.longitude),
    });
  }

  /**
   * Method onMapPicked
   * @description Fills the latitude/longitude drafts from the picker's click, leaving them editable.
   * @access protected
   * @since 1.1.0
   * @param {MapCoordinates} coordinates - The picked position.
   * @returns {void}
   */
  protected onMapPicked(coordinates: MapCoordinates): void {
    this.model.update((draft) => ({
      ...draft,
      latitude: String(coordinates.latitude),
      longitude: String(coordinates.longitude),
    }));
  }
  //#endregion
}
