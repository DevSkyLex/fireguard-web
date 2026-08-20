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
import type { ChecklistOutput } from '@features/organization/features/checklists/models';
import type {
  CreateInspectionInput,
  InspectionResult,
  InspectorType,
  SelectOption,
} from '@features/organization/features/inspections/models';
import { HlmButton } from '@shared/ui/button';
import { HlmComboboxImports } from '@shared/ui/combobox';
import { HlmDatePickerImports } from '@shared/ui/date-picker';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmSelectImports } from '@shared/ui/select';
import { InspectionStatusTag } from '../../components/inspection-status-tag';
import type { InspectionCreateFormDraft } from './models';

/** A blank draft. */
const EMPTY_VALUES: InspectionCreateFormDraft = {
  equipmentId: '',
  result: '',
  performedAt: null,
  inspectorType: 'user',
  inspectorName: '',
  checklistId: '',
};

/** Every result the `result` field's select offers. */
const RESULT_VALUES: ReadonlyArray<InspectionResult> = ['pass', 'partial', 'fail'];

/** Every inspector type the `inspectorType` field's select offers. */
const INSPECTOR_TYPE_VALUES: ReadonlyArray<InspectorType> = ['user', 'external'];

/**
 * Component InspectionCreateForm
 * @class InspectionCreateForm
 *
 * @description
 * The form that opens an inspection, composed from spartan's field
 * primitives: one `hlm-field-group`, one `hlm-field` per control, and
 * `hlm-field-error` for the messages.
 *
 * It owns its model, its rules and its own validity, and emits
 * {@link submitted} with the API-shaped payload — the page calls the store
 * (`ARCHITECTURE.md` §10.4). Only the properties `CreateInspectionInput`
 * requires are asked here (`equipmentId`, `result`, `performedAt`,
 * `inspectorType`, `inspectorName`), plus the optional `checklistId` picker
 * fed by {@link checklists} — `notes` and `signature` are filled in
 * afterward, in place, on the created record
 * (`FEATURE.md` "The record is the edit surface"). Facility is still
 * deliberately not offered — see the feature's `FEATURE.md` for why.
 *
 * Reports its own dirtiness through {@link dirtyChanged} so the hosting page
 * can implement `UnsavedChangesAware` (`DESIGN.md` § Action Surfaces)
 * without owning the field tree itself.
 *
 * @version 1.2.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-inspection-create-form',
  imports: [
    FormField,
    InspectionStatusTag,
    HlmButton,
    HlmInput,
    ...HlmComboboxImports,
    ...HlmDatePickerImports,
    ...HlmFieldImports,
    ...HlmSelectImports,
  ],
  templateUrl: './inspection-create-form.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InspectionCreateForm {
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
   * Property equipmentOptions
   * @readonly
   * @description The organization's equipment, offered by the equipment combobox.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly SelectOption[]>}
   */
  public readonly equipmentOptions: InputSignal<readonly SelectOption[]> = input<
    readonly SelectOption[]
  >([]);

  /**
   * Property checklists
   * @readonly
   * @description The organization's active checklist templates, offered by the optional checklist select.
   * @access public
   * @since 1.2.0
   * @type {InputSignal<readonly ChecklistOutput[]>}
   */
  public readonly checklists: InputSignal<readonly ChecklistOutput[]> = input<
    readonly ChecklistOutput[]
  >([]);
  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @readonly
   * @description Emits the API-shaped payload once the form is valid.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<CreateInspectionInput>}
   */
  public readonly submitted: OutputEmitterRef<CreateInspectionInput> =
    output<CreateInspectionInput>();

  /**
   * Property cancelled
   * @readonly
   * @description The operator backed out without opening anything.
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
  protected readonly model: WritableSignal<InspectionCreateFormDraft> =
    signal<InspectionCreateFormDraft>(EMPTY_VALUES);

  /**
   * Property createForm
   * @readonly
   * @description The field tree and its rules.
   * @access protected
   * @since 1.0.0
   * @type {FieldTree<InspectionCreateFormDraft>}
   */
  protected readonly createForm: FieldTree<InspectionCreateFormDraft> = form(this.model, (path) => {
    required(path.equipmentId, {
      message: $localize`:@@inspection.cf.equipmentRequired:Choose the inspected equipment.`,
    });
    required(path.result, {
      message: $localize`:@@inspection.cf.resultRequired:Choose the inspection's result.`,
    });
    required(path.performedAt, {
      message: $localize`:@@inspection.cf.performedAtRequired:Pick the date the inspection was carried out.`,
    });
    required(path.inspectorName, {
      message: $localize`:@@inspection.cf.inspectorNameRequired:Name the inspector.`,
    });
  });

  /** The results offered. */
  protected readonly resultValues: ReadonlyArray<InspectionResult> = RESULT_VALUES;

  /** The inspector types offered. */
  protected readonly inspectorTypeValues: ReadonlyArray<InspectorType> = INSPECTOR_TYPE_VALUES;

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
      : [$localize`:@@inspection.cf.createFailed:The inspection could not be created.`];
  });

  /** Names a picked equipment on the closed combobox trigger. */
  protected readonly equipmentLabelOf: (value: string) => string = (value: string): string =>
    this.equipmentOptions().find((option: SelectOption): boolean => option.value === value)
      ?.label ?? '';

  /** Names an inspector type on the closed select trigger. */
  protected readonly inspectorTypeLabelOf: (value: InspectorType) => string = (
    value: InspectorType,
  ): string =>
    value === 'user'
      ? $localize`:@@inspection.form.inspectorTypeUser:Team member`
      : $localize`:@@inspection.form.inspectorTypeExternal:External inspector`;

  /** Names a picked checklist on the closed combobox trigger. */
  protected readonly checklistLabelOf: (value: string) => string = (value: string): string =>
    this.checklists().find((checklist: ChecklistOutput): boolean => checklist.id === value)?.name ??
    '';
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
  }
  //#endregion

  //#region Methods
  /**
   * Method submit
   *
   * @description
   * Marks the tree touched so every unmet rule shows at once, then emits
   * when the form is valid.
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

    const draft: InspectionCreateFormDraft = this.model();
    if (draft.equipmentId === '' || draft.result === '' || draft.performedAt === null) return;

    this.submitted.emit({
      equipmentId: draft.equipmentId,
      result: draft.result,
      performedAt: draft.performedAt.toISOString(),
      inspectorType: draft.inspectorType,
      inspectorName: draft.inspectorName.trim(),
      checklistId: draft.checklistId === '' ? null : draft.checklistId,
    });
  }
  //#endregion
}
