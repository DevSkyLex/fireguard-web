import { DatePipe } from '@angular/common';
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
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import {
  inspectionTagOptions,
  resolveInspectionTag,
  type InspectionOutput,
  type InspectionResult,
  type UpdateInspectionInput,
} from '@features/organization/features/inspections/models';
import { InplaceField } from '@shared/inplace-field';
import type { TagOption } from '@shared/tag';

/**
 * The properties this panel can write. Equipment, facility and checklist stay
 * read-only: `UpdateInspectionInput` accepts all three, but this page carries
 * none of their option lists, and a picker with nothing to pick from is worse
 * than a plain value.
 */
type EditableField =
  | 'result'
  | 'performedAt'
  | 'notes'
  | 'signature'
  | 'equipmentId'
  | 'facilityId'
  | 'checklistId';

/**
 * One entry of a relation picker. Structural on purpose: the page maps its
 * stores' entities into this shape, so the panel stays free of three more
 * domain models it would otherwise only pass through.
 */
type RelationOption = { readonly label: string; readonly value: string };

/** The subset of {@link EditableField} drafted as plain text. */
type TextField = 'notes' | 'signature';

/**
 * Component InspectionInformationPanel
 * @class InspectionInformationPanel
 *
 * @description
 * The inspection's descriptive properties, read and written in the same
 * place (ARCHITECTURE.md §10.5): each writable property opens where it sits,
 * keeps its draft here, and emits a patch for the page to persist. The panel
 * injects no store — it holds the drafts, the page owns the call and the
 * draft-only edit gate.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-inspection-information-panel',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    DatePickerModule,
    InputTextModule,
    SelectModule,
    TagModule,
    TextareaModule,
    InplaceField,
  ],
  templateUrl: './inspection-information-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InspectionInformationPanel {
  //#region Inputs
  /**
   * Property inspection
   * @readonly
   *
   * @description
   * The inspection whose information is displayed.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<InspectionOutput>}
   */
  public readonly inspection: InputSignal<InspectionOutput> = input.required<InspectionOutput>();

  /**
   * Property editable
   * @readonly
   *
   * @description
   * Whether the operator may change the writable properties. Read-only
   * renders plain values with no affordance, rather than controls that
   * refuse. The page decides this — write permission and the record's
   * draft-only lifecycle gate both live outside this panel.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly editable: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property saving
   * @readonly
   *
   * @description
   * Whether a save is in flight.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly saving: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property saveError
   * @readonly
   *
   * @description
   * Message from the last failed save, shown under the field that produced it.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly saveError: InputSignal<string | null> = input<string | null>(null);
  //#endregion

  //#region Outputs
  /**
   * Property changed
   * @readonly
   *
   * @description
   * A property was confirmed; carries the patch to persist.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {OutputEmitterRef<UpdateInspectionInput>}
   */
  /**
   * Property equipmentOptions
   * @readonly
   *
   * @description
   * Equipment to pick from, supplied by the page once a relation opens.
   *
   * @access public
   * @since 2.1.0
   *
   * @type {InputSignal<readonly RelationOption[]>}
   */
  public readonly equipmentOptions: InputSignal<readonly RelationOption[]> = input<
    readonly RelationOption[]
  >([]);

  /**
   * Property facilityOptions
   * @readonly
   *
   * @description
   * Sites to pick from.
   *
   * @access public
   * @since 2.1.0
   *
   * @type {InputSignal<readonly RelationOption[]>}
   */
  public readonly facilityOptions: InputSignal<readonly RelationOption[]> = input<
    readonly RelationOption[]
  >([]);

  /**
   * Property checklistOptions
   * @readonly
   *
   * @description
   * Checklists to pick from.
   *
   * @access public
   * @since 2.1.0
   *
   * @type {InputSignal<readonly RelationOption[]>}
   */
  public readonly checklistOptions: InputSignal<readonly RelationOption[]> = input<
    readonly RelationOption[]
  >([]);

  /**
   * Property optionsNeeded
   * @readonly
   *
   * @description
   * A relation was opened; the page loads the three option lists then.
   *
   * Deliberately lazy: reading the record is the common case and must not pay
   * for three option queries the pickers alone need.
   *
   * @access public
   * @since 2.1.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly optionsNeeded: OutputEmitterRef<void> = output<void>();

  public readonly changed: OutputEmitterRef<UpdateInspectionInput> =
    output<UpdateInspectionInput>();
  //#endregion

  //#region Properties
  /** Draft result. */
  protected readonly resultControl: FormControl<InspectionResult> =
    new FormControl<InspectionResult>('pass', { nonNullable: true });

  /** Draft performed-at. */
  protected readonly performedAtControl: FormControl<Date | null> = new FormControl<Date | null>(
    null,
  );

  /** Draft notes. */
  protected readonly notesControl: FormControl<string> = new FormControl<string>('', {
    nonNullable: true,
  });

  /** Draft signature. */
  protected readonly signatureControl: FormControl<string> = new FormControl<string>('', {
    nonNullable: true,
  });

  /** Draft equipment relation. */
  protected readonly equipmentControl: FormControl<string> = new FormControl<string>('', {
    nonNullable: true,
  });

  /** Draft site relation. */
  protected readonly facilityControl: FormControl<string> = new FormControl<string>('', {
    nonNullable: true,
  });

  /** Draft checklist relation. */
  protected readonly checklistControl: FormControl<string> = new FormControl<string>('', {
    nonNullable: true,
  });

  /**
   * Property resultOptions
   * @readonly
   *
   * @description
   * Result choices fed by the feature's tag registry, so the dropdown carries
   * the same label, severity and icon as every other result badge.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {TagOption[]}
   */
  protected readonly resultOptions: TagOption[] = inspectionTagOptions('result');

  /** Localized fallback shown when a reference field carries no value. */
  protected readonly noneLabel: string = $localize`:@@inspection.info.none:None`;

  /** Localized placeholder shown when no notes are recorded. */
  protected readonly noNotesLabel: string = $localize`:@@inspection.info.noNotes:No notes`;

  /**
   * Property openField
   *
   * @description
   * Which property is currently being edited, so a failed save shows its
   * message under the field that produced it rather than under all of them.
   *
   * @access private
   * @since 2.0.0
   *
   * @type {WritableSignal<EditableField | null>}
   */
  private readonly openField: WritableSignal<EditableField | null> = signal<EditableField | null>(
    null,
  );
  //#endregion

  //#region Methods
  /**
   * Method resultLabel
   *
   * @description
   * Resolves the localized label for a result value through the feature tag
   * registry, so the closed field never renders the raw enum literal.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {InspectionResult} result - Inspection result.
   * @returns {string} Localized label.
   */
  protected resultLabel(result: InspectionResult): string {
    return resolveInspectionTag('result', result).label;
  }

  /**
   * Method fieldError
   *
   * @description
   * The save message, but only under the field that is open.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {EditableField} field - Field asking.
   * @returns {string | null} The message, or null.
   */
  protected fieldError(field: EditableField): string | null {
    return this.openField() === field ? this.saveError() : null;
  }

  /**
   * Method seedResult
   *
   * @description
   * Fills the result draft from the stored value as the field opens.
   *
   * @access protected
   * @since 2.0.0
   *
   * @returns {void}
   */
  protected seedResult(): void {
    this.openField.set('result');
    this.resultControl.setValue(this.inspection().result);
  }

  /**
   * Method seedPerformedAt
   *
   * @description
   * Fills the performed-at draft from the stored value as the field opens.
   *
   * @access protected
   * @since 2.0.0
   *
   * @returns {void}
   */
  protected seedPerformedAt(): void {
    this.openField.set('performedAt');
    this.performedAtControl.setValue(new Date(this.inspection().performedAt));
  }

  /**
   * Method seed
   *
   * @description
   * Fills a text draft from the stored value as its field opens.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {TextField} field - Field being opened.
   * @param {string | null} value - Current stored value.
   * @returns {void}
   */
  protected seed(field: TextField, value: string | null): void {
    this.openField.set(field);
    this.textControlFor(field).setValue(value ?? '');
  }

  /**
   * Method seedRelation
   *
   * @description
   * Fills a relation draft and asks the page for the option lists its picker
   * needs, which is the first moment they are actually required.
   *
   * @access protected
   * @since 2.1.0
   *
   * @param {'equipmentId' | 'facilityId' | 'checklistId'} field - Relation being opened.
   * @param {string | null | undefined} value - Current stored value.
   * @returns {void}
   */
  protected seedRelation(
    field: 'equipmentId' | 'facilityId' | 'checklistId',
    value: string | null | undefined,
  ): void {
    this.openField.set(field);
    this.relationControl(field).setValue(value ?? '');
    this.optionsNeeded.emit();
  }

  /**
   * Method relationLabel
   *
   * @description
   * The human name behind a relation identifier, falling back to the raw value
   * while the option lists are still unloaded.
   *
   * @access protected
   * @since 2.1.0
   *
   * @param {readonly RelationOption[]} options - Candidate options.
   * @param {string | null | undefined} value - Stored identifier.
   * @returns {string | null} The label to display.
   */
  protected relationLabel(
    options: readonly RelationOption[],
    value: string | null | undefined,
  ): string | null {
    if (!value) return null;

    return options.find((option) => option.value === value)?.label ?? value;
  }

  /**
   * Method relationControl
   *
   * @description
   * The draft behind one relation.
   *
   * @access private
   * @since 2.1.0
   *
   * @param {'equipmentId' | 'facilityId' | 'checklistId'} field - Relation asking.
   * @returns {FormControl<string>} Its draft control.
   */
  private relationControl(
    field: 'equipmentId' | 'facilityId' | 'checklistId',
  ): FormControl<string> {
    switch (field) {
      case 'equipmentId':
        return this.equipmentControl;
      case 'facilityId':
        return this.facilityControl;
      case 'checklistId':
        return this.checklistControl;
    }
  }

  /**
   * Method save
   *
   * @description
   * Emits the patch for one property. A trimmed empty text clears the
   * property; an emptied performed-date draft is a no-op rather than
   * clearing a value the record always carries.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {EditableField} field - Field being confirmed.
   * @returns {void}
   */
  protected save(field: EditableField): void {
    switch (field) {
      case 'result':
        this.changed.emit({ result: this.resultControl.value });
        return;
      case 'performedAt': {
        const value: Date | null = this.performedAtControl.value;
        if (!value) return;

        this.changed.emit({ performedAt: value.toISOString() });
        return;
      }
      case 'notes':
      case 'signature': {
        const value: string = this.textControlFor(field).value.trim();
        this.changed.emit({ [field]: value ? value : null });
        return;
      }
      case 'equipmentId': {
        // An inspection with no equipment has nothing to inspect: an emptied
        // draft is a no-op rather than a clear.
        const value: string = this.equipmentControl.value;
        if (value) this.changed.emit({ equipmentId: value });

        return;
      }
      case 'facilityId':
      case 'checklistId': {
        const value: string = this.relationControl(field).value;
        this.changed.emit({ [field]: value ? value : null });

        return;
      }
    }
  }

  /**
   * Method clearError
   *
   * @description
   * Forgets which field was open, so a stale message does not reappear on the
   * next one.
   *
   * @access protected
   * @since 2.0.0
   *
   * @returns {void}
   */
  protected clearError(): void {
    this.openField.set(null);
  }

  /**
   * Method textControlFor
   *
   * @description
   * The draft behind one text property.
   *
   * @access private
   * @since 2.0.0
   *
   * @param {TextField} field - Field asking.
   * @returns {FormControl<string>} Its draft control.
   */
  private textControlFor(field: TextField): FormControl<string> {
    switch (field) {
      case 'notes':
        return this.notesControl;
      case 'signature':
        return this.signatureControl;
    }
  }
  //#endregion
}
