import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import {
  disabled,
  form,
  FormField,
  required,
  validate,
  type FieldTree,
  type ValidationError,
} from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleAlert, lucideMapPin } from '@ng-icons/lucide';
import { idleCallState, type CallState } from '@core/request-state';
import type {
  FacilityOption,
  CreateFacilityInput,
  FacilityGeocodeOutput,
  FacilityType,
} from '@features/organization/features/facilities/models';
import { FACILITY_TYPE_OPTIONS } from '@features/organization/features/facilities/options';
import { serverMessagesOf } from '@shared/form-feedback';
import type { MapCoordinates } from '@shared/map';
import { RequiredMarker } from '@shared/required-marker';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmSelectImports } from '@shared/ui/select';
import { HlmSheetFooter } from '@shared/ui/sheet';
import { FacilityOptionPicker } from '../../components/facility-option-picker';
import { FacilityMapPickerDialog } from '../../dialogs/facility-map-picker-dialog';
import type { FacilityCreateFormDraft } from './models';

/**
 * Constant EMPTY_VALUES
 *
 * @description
 * A blank draft.
 */
const EMPTY_VALUES: FacilityCreateFormDraft = {
  type: '',
  name: '',
  parentFacilityId: '',
  code: '',
  address: '',
  latitude: '',
  longitude: '',
  levelIndex: '',
  elevationMeters: '',
  heightMeters: '',
};

/**
 * Function trimmed
 *
 * @description
 * Trims a form value and treats blank text as absent.
 *
 * @param {string | undefined} value - Optional value to trim.
 *
 * @returns {string | undefined} Trimmed text, or undefined when blank.
 */
function trimmed(value: string): string | undefined {
  const trimmedValue: string = value.trim();

  return trimmedValue === '' ? undefined : trimmedValue;
}

/**
 * Function parsedOptionalNumber
 *
 * @description
 * Parses an optional numeric draft; coordinate and level-index validity are checked by their
 * fields.
 *
 * @access private
 * @since 1.0.0
 *
 * @param {string} value - The editable numeric draft.
 *
 * @returns {number | undefined} Its numeric value, or `undefined` when blank.
 */
function parsedOptionalNumber(value: string): number | undefined {
  const trimmedValue: string = value.trim();

  return trimmedValue === '' ? undefined : Number(trimmedValue);
}

/**
 * Constant LATITUDE_BOUNDS
 *
 * @description
 * Geographic bounds a latitude/longitude draft must fall within, once filled.
 */
const LATITUDE_BOUNDS: readonly [number, number] = [-90, 90];

/**
 * Constant LONGITUDE_BOUNDS
 *
 * @description
 * Defines the accepted longitude range from 180 degrees west to 180 degrees east.
 *
 * @access public
 *
 * @type {readonly [number, number]}
 */
const LONGITUDE_BOUNDS: readonly [number, number] = [-180, 180];

/**
 * Function isCoordinateInRange
 *
 * @description
 * Checks whether a finite coordinate falls within its inclusive bounds.
 *
 * @param {number} value - Coordinate value to validate.
 * @param {readonly [number, number]} bounds - Inclusive minimum and maximum.
 *
 * @returns {boolean} Whether the value is finite and within the supplied bounds.
 */
function isCoordinateInRange(value: string, bounds: readonly [number, number]): boolean {
  const trimmedValue: string = value.trim();
  if (trimmedValue === '') return true;

  const parsed: number = Number(trimmedValue);

  return Number.isFinite(parsed) && parsed >= bounds[0] && parsed <= bounds[1];
}

/**
 * Constant LEVEL_INDEX_BOUNDS
 *
 * @description
 * The stacking order's own bounds, mirroring the backend's `FacilityLevelIndex` value object.
 */
const LEVEL_INDEX_BOUNDS: readonly [number, number] = [-100, 200];

/**
 * Function isLevelIndexInRange
 *
 * @description
 * Checks whether a level index is an integer within its supported range.
 *
 * @param {number} value - Level index to validate.
 *
 * @returns {boolean} Whether the value is an integer within the supported bounds.
 */
function isLevelIndexInRange(value: string): boolean {
  const trimmedValue: string = value.trim();
  if (trimmedValue === '') return true;

  const parsed: number = Number(trimmedValue);

  return (
    Number.isInteger(parsed) && parsed >= LEVEL_INDEX_BOUNDS[0] && parsed <= LEVEL_INDEX_BOUNDS[1]
  );
}

/**
 * Class FacilityCreateForm
 * @class FacilityCreateForm
 *
 * @description
 * The form that creates a facility, composed from spartan's field
 * primitives: one `hlm-field-group`, one `hlm-field` per control, and
 * `hlm-field-error` for the messages.
 * It owns its model, its rules and its own validity, and emits
 * {@link submitted} with the API-shaped payload — the page calls the store
 * (`ARCHITECTURE.md` §10.4). `type` and `name` are the only required
 * fields; the parent, code, address and coordinates are completed here or
 * left for later, in place, on the detail page (`FEATURE.md` "The record is
 * the edit surface"). Coordinates are enforced both-or-neither: a value in
 * one without the other is refused before it ever reaches the store.
 * Reports its own dirtiness through {@link dirtyChanged} so the hosting page
 * can implement `UnsavedChangesAware` (`DESIGN.md` § Action Surfaces)
 * without owning the field tree itself.
 * The stacking-order field (`levelIndex`) only shows once `type` is `floor`
 * — it means nothing on any other type — and is optional, validated
 * client-side as a whole number in `[-100, 200]` mirroring the backend's
 * `FacilityLevelIndex` value object.
 *
 * @version 1.3.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-create-form',
  imports: [
    RequiredMarker,
    FormField,
    FacilityMapPickerDialog,
    NgIcon,
    HlmButton,
    HlmInput,
    ...HlmAlertImports,
    FacilityOptionPicker,
    ...HlmFieldImports,
    ...HlmSelectImports,
    HlmSheetFooter,
  ],
  providers: [provideIcons({ lucideCircleAlert, lucideMapPin })],
  templateUrl: './facility-create-form.component.html',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityCreateForm {
  /**
   * Property parentCallState
   * @readonly
   *
   * @description
   * Server lifecycle for admissible parent candidates.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<CallState>}
   */
  public readonly parentCallState: InputSignal<CallState> = input(idleCallState());
  /**
   * Property parentPage
   * @readonly
   *
   * @description
   * Current candidate server page.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<number>}
   */
  public readonly parentPage: InputSignal<number> = input(1);
  /**
   * Property parentPageCount
   * @readonly
   *
   * @description
   * Number of candidate pages for the current server search.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<number>}
   */
  public readonly parentPageCount: InputSignal<number> = input(1);
  /**
   * Property hydratedParent
   * @readonly
   *
   * @description
   * Hydrated preselected parent even when it is outside the candidate page.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<FacilityOption | null>}
   */
  public readonly hydratedParent: InputSignal<FacilityOption | null> = input<FacilityOption | null>(
    null,
  );
  /**
   * Property typeChanged
   * @readonly
   *
   * @description
   * Notifies the page to request parents admissible for this type.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<FacilityType | ''>}
   */
  public readonly typeChanged: OutputEmitterRef<FacilityType | ''> = output<FacilityType | ''>();
  /**
   * Property parentSearchChanged
   * @readonly
   *
   * @description
   * Requests a server search over admissible parents.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly parentSearchChanged: OutputEmitterRef<string> = output<string>();
  /**
   * Property parentPageChanged
   * @readonly
   *
   * @description
   * Requests a server page of admissible parents.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<number>}
   */
  public readonly parentPageChanged: OutputEmitterRef<number> = output<number>();

  /**
   * Property parentTypes
   * @readonly
   *
   * @description
   * Parent types admissible under the backend hierarchy contract.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Readonly<Record<FacilityType, readonly FacilityType[]>>}
   */
  protected readonly parentTypes: Readonly<Record<FacilityType, readonly FacilityType[]>> = {
    site: [],
    building: ['site'],
    floor: ['building'],
    zone: ['site', 'building', 'floor', 'zone', 'area'],
    area: ['site', 'building', 'floor', 'zone', 'area'],
  };
  /**
   * Property parentHint
   * @readonly
   *
   * @description
   * Explains the parent rule for the currently selected type.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<string>}
   */
  protected readonly parentHint: Signal<string> = computed(() => {
    const type = this.model().type;
    if (type === 'site')
      return $localize`:@@facility.form.siteParentHint:Sites are created at the root of the hierarchy.`;
    if (type === 'building')
      return $localize`:@@facility.form.buildingParentHint:Choose the site containing this building.`;
    if (type === 'floor')
      return $localize`:@@facility.form.floorParentHint:Choose the building containing this floor.`;
    if (type === '')
      return $localize`:@@facility.form.chooseTypeFirst:Choose a type to see its admissible parents.`;
    return $localize`:@@facility.form.zoneParentHint:Choose the site, building, floor, zone or area containing this place.`;
  });

  //#region Inputs
  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether a creation request is in flight, which locks the controls.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property serverError
   * @readonly
   *
   * @description
   * Whatever the store's create call failed with.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<unknown>}
   */
  public readonly serverError: InputSignal<unknown> = input<unknown>(null);

  /**
   * Property initialParentFacilityId
   * @readonly
   *
   * @description
   * The parent site the form starts under, seeded from the caller's `?parent=`.
   * It is what carries the asset explorer's selected site into the form instead
   * of making the operator find it again in the combobox.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly initialParentFacilityId: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property parentOptions
   * @readonly
   *
   * @description
   * The organization's facilities, offered as candidate parents. Empty until the page loads them.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<ReadonlyArray<{ readonly value: string; readonly label: string }>>}
   */
  public readonly parentOptions: InputSignal<readonly FacilityOption[]> = input<
    readonly FacilityOption[]
  >([]);

  /**
   * Property mapCenter
   * @readonly
   *
   * @description
   * Where the "Pick on map" picker opens when the draft has no coordinates of its own yet, resolved
   * by the page from its already-loaded facilities.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<MapCoordinates | undefined>}
   */
  public readonly mapCenter: InputSignal<MapCoordinates | undefined> = input<
    MapCoordinates | undefined
  >(undefined);

  /**
   * Property geocodePending
   * @readonly
   *
   * @description
   * Whether the page's "Locate address" lookup is in flight, which makes the button inert
   * (`aria-disabled`, still focusable).
   *
   * @access public
   * @since 1.2.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly geocodePending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property geocodeResult
   * @readonly
   *
   * @description
   * The latest successful lookup. Fills the latitude/longitude drafts — both stay editable — and
   * its `displayName` renders as help under the address field.
   *
   * @access public
   * @since 1.2.0
   *
   * @type {InputSignal<FacilityGeocodeOutput | null>}
   */
  public readonly geocodeResult: InputSignal<FacilityGeocodeOutput | null> =
    input<FacilityGeocodeOutput | null>(null);

  /**
   * Property geocodeNotFound
   * @readonly
   *
   * @description
   * Whether the latest lookup answered `404` — shown as a non-blocking inline message, never a
   * field error.
   *
   * @access public
   * @since 1.2.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly geocodeNotFound: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Emits the API-shaped payload once the form is valid.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<CreateFacilityInput>}
   */
  public readonly submitted: OutputEmitterRef<CreateFacilityInput> = output<CreateFacilityInput>();

  /**
   * Property cancelled
   * @readonly
   *
   * @description
   * The operator backed out without creating anything.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly cancelled: OutputEmitterRef<void> = output<void>();

  /**
   * Property dirtyChanged
   * @readonly
   *
   * @description
   * Emits whenever the field tree's dirtiness changes.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly dirtyChanged: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Property geocodeRequested
   * @readonly
   *
   * @description
   * Asks the hosting page to resolve the trimmed address draft to coordinates — the page owns the
   * transport call and answers through {@link geocodeResult} / {@link geocodeNotFound}.
   *
   * @access public
   * @since 1.2.0
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly geocodeRequested: OutputEmitterRef<string> = output<string>();
  //#endregion

  //#region Properties
  /**
   * Property model
   * @readonly
   *
   * @description
   * Holds the current facility creation draft edited by this form.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<FacilityCreateFormDraft>}
   */
  protected readonly model: WritableSignal<FacilityCreateFormDraft> =
    signal<FacilityCreateFormDraft>(EMPTY_VALUES);

  /**
   * Property selectedParentOption
   * @readonly
   *
   * @description
   * Retains the chosen parent's type while candidate pages and server searches change.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<FacilityOption | null>}
   */
  protected readonly selectedParentOption: WritableSignal<FacilityOption | null> = signal(null);

  /**
   * Property selectedParent
   * @readonly
   *
   * @description
   * Resolves only records matching the draft's parent identity for hierarchy validation.
   *
   * @access private
   * @since unreleased
   *
   * @type {Signal<FacilityOption | null>}
   */
  private readonly selectedParent: Signal<FacilityOption | null> = computed(() => {
    const parentId = this.model().parentFacilityId;
    return (
      this.parentOptions().find((option) => option.value === parentId) ??
      [this.hydratedParent(), this.selectedParentOption()].find(
        (option) => option?.value === parentId,
      ) ??
      null
    );
  });

  /**
   * Property createForm
   * @readonly
   *
   * @description
   * The field tree and its rules.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FieldTree<FacilityCreateFormDraft>}
   */
  protected readonly createForm: FieldTree<FacilityCreateFormDraft> = form(this.model, (path) => {
    disabled(
      path.parentFacilityId,
      () => this.pending() || this.model().type === '' || this.model().type === 'site',
    );
    validate(path.parentFacilityId, ({ value, valueOf }): ValidationError | null => {
      const type = valueOf(path.type);
      if (type === '') return null;
      if (type === 'site')
        return value() === ''
          ? null
          : {
              kind: 'siteParent',
              message: $localize`:@@facility.form.siteParentError:A site must be at the root of the hierarchy.`,
            };
      if (!value())
        return {
          kind: 'parentRequired',
          message: $localize`:@@facility.form.parentRequired:Choose an admissible parent for this place.`,
        };
      const selected = this.selectedParent();
      return selected?.value === value() &&
        selected.type &&
        !this.parentTypes[type].includes(selected.type)
        ? {
            kind: 'parentType',
            message: $localize`:@@facility.form.invalidParentType:This parent cannot contain the selected type.`,
          }
        : null;
    });
    validate(path.elevationMeters, ({ value, valueOf }): ValidationError | null =>
      valueOf(path.type) !== 'floor' || isCoordinateInRange(value(), [-10000, 10000])
        ? null
        : {
            kind: 'elevationRange',
            message: $localize`:@@facility.form.elevationRange:Enter an elevation between -10000 and 10000 metres.`,
          },
    );
    validate(path.heightMeters, ({ value, valueOf }): ValidationError | null =>
      valueOf(path.type) !== 'floor' ||
      value().trim() === '' ||
      (Number.isFinite(Number(value())) && Number(value()) > 0 && Number(value()) <= 1000)
        ? null
        : {
            kind: 'heightRange',
            message: $localize`:@@facility.form.heightRange:Enter a height greater than 0 and no more than 1000 metres.`,
          },
    );
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
    validate(path.levelIndex, ({ value }): ValidationError | null =>
      isLevelIndexInRange(value())
        ? null
        : {
            kind: 'levelIndexRange',
            message: $localize`:@@facility.form.levelIndexRange:Enter a whole number between -100 and 200.`,
          },
    );
  });

  /**
   * Property typeOptions
   * @readonly
   *
   * @description
   * Provides the facility type choices displayed by the creation form.
   *
   * @access protected
   * @since unreleased
   *
   * @type {typeof FACILITY_TYPE_OPTIONS}
   */
  protected readonly typeOptions: typeof FACILITY_TYPE_OPTIONS = FACILITY_TYPE_OPTIONS;

  /**
   * Property serverMessages
   * @readonly
   *
   * @description
   * Everything the API said about the rejected request, as flat lines shown
   * above the form. A refusal without violations (e.g. a 409 quota refusal)
   * falls back to the normalized error's own message before the generic line.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly string[]>}
   */
  protected readonly serverMessages: Signal<readonly string[]> = computed<readonly string[]>(() =>
    serverMessagesOf(
      this.serverError(),
      [],
      $localize`:@@facility.cf.createFailed:The facility could not be created.`,
    ),
  );

  /**
   * Property errorTitle
   * @readonly
   *
   * @description
   * Provides the title shown when facility creation fails.
   *
   * @access protected
   * @since unreleased
   *
   * @type {string}
   */
  protected readonly errorTitle: string = $localize`:@@facility.cf.createErrorTitle:Couldn't create the facility`;

  /**
   * Property typeLabelOf
   * @readonly
   *
   * @description
   * Resolves a facility type to its display label.
   *
   * @access protected
   * @since unreleased
   *
   * @type {(value: FacilityType | '') => string}
   */
  protected readonly typeLabelOf: (value: FacilityType | '') => string = (value) =>
    this.typeOptions.find((option) => option.value === value)?.label ?? '';

  /**
   * Property parentLabelOf
   * @readonly
   *
   * @description
   * Resolves a parent facility id to its display label.
   *
   * @access protected
   * @since unreleased
   *
   * @type {(value: string) => string}
   */
  protected readonly parentLabelOf: (value: string) => string = (value) =>
    this.parentOptions().find((option) => option.value === value)?.label ?? '';

  /**
   * Property mapPickerVisible
   * @readonly
   *
   * @description
   * Controls whether the parent-facility map picker is displayed.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly mapPickerVisible: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property pickerCenter
   * @readonly
   *
   * @description
   * Where the picker opens: the draft's own coordinates once both are filled, else
   * {@link mapCenter}.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<MapCoordinates | undefined>}
   */
  protected readonly pickerCenter: Signal<MapCoordinates | undefined> = computed<
    MapCoordinates | undefined
  >(() => {
    const draft: FacilityCreateFormDraft = this.model();
    const latitude: number | undefined = parsedOptionalNumber(draft.latitude);
    const longitude: number | undefined = parsedOptionalNumber(draft.longitude);

    return latitude !== undefined &&
      longitude !== undefined &&
      Number.isFinite(latitude) &&
      Number.isFinite(longitude)
      ? { latitude, longitude }
      : this.mapCenter();
  });
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Relays the field tree's dirtiness through {@link dirtyChanged}.
   *
   * @access public
   * @since 1.1.0
   */
  public constructor() {
    /*
     * Seeds the parent once, from `?parent=`. It writes the model rather than
     * the field so the form does not start dirty — arriving with a parent
     * preselected is not an edit, and the unsaved-changes guard must not fire
     * on a form nobody has touched.
     */
    effect((): void => {
      const parentId: string | null = this.initialParentFacilityId();
      if (!parentId) return;

      untracked((): void => {
        if (this.model().parentFacilityId === parentId) return;

        this.model.update((draft) => ({ ...draft, parentFacilityId: parentId }));
      });
    });

    effect((): void => {
      const type = this.model().type;
      const parent = this.selectedParent();
      untracked(() => {
        if (
          this.model().parentFacilityId &&
          (type === 'site' ||
            (type && parent?.type && !this.parentTypes[type].includes(parent.type)))
        ) {
          this.model.update((draft) => ({ ...draft, parentFacilityId: '' }));
        }
        this.typeChanged.emit(type);
      });
    });

    effect((): void => {
      const dirty: boolean = this.createForm().dirty();

      untracked((): void => this.dirtyChanged.emit(dirty));
    });

    effect((): void => {
      const result: FacilityGeocodeOutput | null = this.geocodeResult();
      if (result === null) return;

      untracked((): void => {
        this.model.update((draft) => ({
          ...draft,
          latitude: String(result.latitude),
          longitude: String(result.longitude),
        }));
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method submit
   * @method submit
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

    if (
      this.pending() ||
      this.parentCallState().status === 'pending' ||
      this.createForm().invalid()
    )
      return;

    const draft: FacilityCreateFormDraft = this.model();
    if (draft.type === '') return;

    this.submitted.emit({
      type: draft.type,
      name: draft.name.trim(),
      parentFacilityId: draft.parentFacilityId === '' ? undefined : draft.parentFacilityId,
      code: trimmed(draft.code),
      address: trimmed(draft.address),
      latitude: parsedOptionalNumber(draft.latitude),
      longitude: parsedOptionalNumber(draft.longitude),
      levelIndex: draft.type === 'floor' ? parsedOptionalNumber(draft.levelIndex) : undefined,
      elevationMeters:
        draft.type === 'floor' ? parsedOptionalNumber(draft.elevationMeters) : undefined,
      heightMeters: draft.type === 'floor' ? parsedOptionalNumber(draft.heightMeters) : undefined,
    });
  }

  /**
   * Method locateAddress
   * @method locateAddress
   *
   * @description
   * Emits {@link geocodeRequested} with the trimmed address draft. A no-op
   * while a lookup is already in flight or while the address is blank — the
   * button stays focusable (`aria-disabled`, not `disabled`), so this guard
   * is what prevents a double request.
   *
   * @access protected
   * @since 1.2.0
   *
   * @returns {void}
   */
  protected locateAddress(): void {
    if (this.geocodePending()) return;

    const address: string = this.model().address.trim();
    if (address === '') return;

    this.geocodeRequested.emit(address);
  }

  /**
   * Method onMapPicked
   * @method onMapPicked
   *
   * @description
   * Fills the latitude/longitude drafts from the picker's click, leaving them editable.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {MapCoordinates} coordinates - The picked position.
   *
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
