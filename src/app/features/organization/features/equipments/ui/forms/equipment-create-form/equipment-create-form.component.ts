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
import { form, FormField, required, type FieldTree } from '@angular/forms/signals';
import { toServerFieldErrors, toUnmatchedViolations, type Violation } from '@core/api';
import type {
  CreateEquipmentInput,
  EquipmentType,
} from '@features/organization/features/equipments/models';
import { EQUIPMENT_TYPE_OPTIONS } from '@features/organization/features/equipments/options';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmSelectImports } from '@shared/ui/select';
import type { EquipmentCreateFormDraft } from './models';

/** A blank draft. */
const EMPTY_VALUES: EquipmentCreateFormDraft = {
  type: '',
  subType: '',
  brand: '',
  model: '',
  serialNumber: '',
  locationLabel: '',
  facility: '',
};

/** Builds the flat facility IRI the API validates (`^/api/facilities/{uuid}$`). */
function facilityIri(facilityId: string): string {
  return `/api/facilities/${facilityId}`;
}

/** Trims a free-text field, sending `undefined` rather than an empty string. */
function trimmed(value: string): string | undefined {
  const trimmedValue: string = value.trim();

  return trimmedValue === '' ? undefined : trimmedValue;
}

/**
 * Component EquipmentCreateForm
 * @class EquipmentCreateForm
 *
 * @description
 * The form that registers an equipment, composed from spartan's field
 * primitives: one `hlm-field-group`, one `hlm-field` per control, and
 * `hlm-field-error` for the messages.
 *
 * It owns its model, its rules and its own validity, and emits
 * {@link submitted} with the API-shaped payload — the page calls the store
 * (`ARCHITECTURE.md` §10.4). `type` is the only required field: the record
 * is completed progressively afterward, in place, on the detail page
 * (`FEATURE.md` "The record is the edit surface").
 *
 * Reports its own dirtiness through {@link dirtyChanged} so the hosting page
 * can implement `UnsavedChangesAware` (`DESIGN.md` § Action Surfaces)
 * without owning the field tree itself.
 *
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-equipment-create-form',
  imports: [FormField, HlmButton, HlmInput, ...HlmFieldImports, ...HlmSelectImports],
  templateUrl: './equipment-create-form.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentCreateForm {
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
   * Property facilityOptions
   * @readonly
   * @description
   * The organization's facilities, offered as the owning site. Empty while the
   * page is still loading them, which simply leaves the field with only its
   * "unassigned" choice rather than blocking the form.
   * @access public
   * @since 2.0.0
   * @type {InputSignal<ReadonlyArray<{ readonly value: string; readonly label: string }>>}
   */
  public readonly facilityOptions: InputSignal<
    ReadonlyArray<{ readonly value: string; readonly label: string }>
  > = input<ReadonlyArray<{ readonly value: string; readonly label: string }>>([]);

  /**
   * Property initialFacilityId
   * @readonly
   * @description
   * The site the equipment starts in, seeded from the caller's `?facility=`.
   * This is what lets "New equipment" from a selected site produce an assigned
   * record instead of an orphan the operator must then assign by hand.
   * @access public
   * @since 2.0.0
   * @type {InputSignal<string | null>}
   */
  public readonly initialFacilityId: InputSignal<string | null> = input<string | null>(null);
  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @readonly
   * @description Emits the API-shaped payload once the form is valid.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<CreateEquipmentInput>}
   */
  public readonly submitted: OutputEmitterRef<CreateEquipmentInput> =
    output<CreateEquipmentInput>();

  /**
   * Property cancelled
   * @readonly
   * @description The operator backed out without registering anything.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly cancelled: OutputEmitterRef<void> = output<void>();

  /**
   * Property dirtyChanged
   * @readonly
   * @description Emits whenever the field tree's dirtiness changes.
   * @access public
   * @since 1.1.0
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly dirtyChanged: OutputEmitterRef<boolean> = output<boolean>();
  //#endregion

  //#region Properties
  /** The edited draft. */
  protected readonly model: WritableSignal<EquipmentCreateFormDraft> =
    signal<EquipmentCreateFormDraft>(EMPTY_VALUES);

  /**
   * Property createForm
   * @readonly
   * @description The field tree and its rules.
   * @access protected
   * @since 1.0.0
   * @type {FieldTree<EquipmentCreateFormDraft>}
   */
  protected readonly createForm: FieldTree<EquipmentCreateFormDraft> = form(this.model, (path) => {
    required(path.type, {
      message: $localize`:@@equipment.form.typeRequired:Equipment type is required.`,
    });
  });

  /** The equipment types offered. */
  protected readonly typeOptions: typeof EQUIPMENT_TYPE_OPTIONS = EQUIPMENT_TYPE_OPTIONS;

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
      : [$localize`:@@equipment.cf.createFailed:The equipment could not be registered.`];
  });

  /** Names a type on the closed select trigger. */
  protected readonly typeLabelOf: (value: EquipmentType | '') => string = (value) =>
    this.typeOptions.find((option) => option.value === value)?.label ?? '';

  /** Names the picked site on the closed select trigger. */
  protected readonly facilityLabelOf: (value: string) => string = (value) =>
    this.facilityOptions().find((option) => option.value === value)?.label ?? '';
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   * @description Relays the field tree's dirtiness through {@link dirtyChanged}.
   * @access public
   * @since 1.1.0
   */
  public constructor() {
    effect((): void => {
      const dirty: boolean = this.createForm().dirty();

      untracked((): void => this.dirtyChanged.emit(dirty));
    });

    /*
     * Seeds the site once, from the caller's `?facility=`. It writes the model
     * rather than the field so the form does not start dirty: arriving with a
     * site preselected is not an edit, and the unsaved-changes guard must not
     * fire on a form nobody has touched.
     */
    effect((): void => {
      const facilityId: string | null = this.initialFacilityId();
      if (!facilityId) return;

      untracked((): void => {
        if (this.model().facility === facilityId) return;

        this.model.update((draft) => ({ ...draft, facility: facilityId }));
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method submit
   *
   * @description
   * Marks the tree touched so every unmet rule shows at once, then emits
   * when the form is valid. Blank optional fields are dropped rather than
   * sent as empty strings.
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

    const draft: EquipmentCreateFormDraft = this.model();
    if (draft.type === '') return;

    this.submitted.emit({
      type: draft.type,
      subType: trimmed(draft.subType),
      brand: trimmed(draft.brand),
      model: trimmed(draft.model),
      serialNumber: trimmed(draft.serialNumber),
      locationLabel: trimmed(draft.locationLabel),
      facility: draft.facility === '' ? undefined : facilityIri(draft.facility),
    });
  }
  //#endregion
}
