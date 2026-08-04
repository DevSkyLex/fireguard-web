import { DatePipe } from '@angular/common';
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
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import type {
  EquipmentOutput,
  UpdateEquipmentInput,
} from '@features/organization/features/equipments/models';
import { EQUIPMENT_TYPE_OPTIONS } from '@features/organization/features/equipments/options';
import { InplaceField } from '@shared/inplace-field';

/**
 * The properties this panel can write — exactly `UpdateEquipmentInput`'s
 * fields. `status`, `facilityId`, `installedAt`, `commissionedAt`, `tags` and
 * the identifiers are absent because the update endpoint accepts none of
 * them: status moves through the lifecycle band, assignment through its own
 * panel, and the rest is system-managed.
 */
type EditableField = 'type' | 'subType' | 'brand' | 'model' | 'serialNumber' | 'locationLabel';

/**
 * Component EquipmentInformationPanel
 * @class EquipmentInformationPanel
 *
 * @description
 * The equipment's descriptive properties, read and written in the same place.
 *
 * A record no longer needs a page to read it and another to write it
 * (ARCHITECTURE.md §10.5): each property opens where it sits, keeps its draft
 * here, and emits a patch for the page to persist. The panel injects no store —
 * it holds the drafts, the page owns the call.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-equipment-information-panel',
  imports: [DatePipe, ReactiveFormsModule, InputTextModule, SelectModule, InplaceField],
  templateUrl: './equipment-information-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentInformationPanel {
  //#region Inputs
  /**
   * Property equipment
   * @readonly
   *
   * @description
   * The equipment whose information is displayed.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<EquipmentOutput>}
   */
  public readonly equipment: InputSignal<EquipmentOutput> = input.required<EquipmentOutput>();

  /**
   * Property editable
   * @readonly
   *
   * @description
   * Whether the operator may change these properties. Read-only renders plain
   * values with no affordance, rather than controls that refuse.
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
   * @type {OutputEmitterRef<UpdateEquipmentInput>}
   */
  public readonly changed: OutputEmitterRef<UpdateEquipmentInput> = output<UpdateEquipmentInput>();
  //#endregion

  //#region Properties
  /** Draft type. */
  protected readonly typeControl: FormControl<string> = new FormControl<string>('', {
    nonNullable: true,
  });

  /** Draft subtype. */
  protected readonly subTypeControl: FormControl<string> = new FormControl<string>('', {
    nonNullable: true,
  });

  /** Draft brand. */
  protected readonly brandControl: FormControl<string> = new FormControl<string>('', {
    nonNullable: true,
  });

  /** Draft model. */
  protected readonly modelControl: FormControl<string> = new FormControl<string>('', {
    nonNullable: true,
  });

  /** Draft serial number. */
  protected readonly serialNumberControl: FormControl<string> = new FormControl<string>('', {
    nonNullable: true,
  });

  /** Draft location label. */
  protected readonly locationLabelControl: FormControl<string> = new FormControl<string>('', {
    nonNullable: true,
  });

  /**
   * Property typeOptions
   * @readonly
   *
   * @description
   * Localized equipment type choices for the type `p-select`, the same catalog
   * the create form uses — the backend `EquipmentType` value object is a
   * closed set, so this feeds the field rather than a free-text entry that
   * would risk a 400.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {ReadonlyArray<{ readonly label: string; readonly value: string }>}
   */
  protected readonly typeOptions: { readonly label: string; readonly value: string }[] = [
    ...EQUIPMENT_TYPE_OPTIONS,
  ];

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

  /**
   * Property typeDisplay
   * @readonly
   *
   * @description
   * The type's human label from {@link typeOptions}, so the closed field reads
   * "Fire extinguisher" rather than the raw `fire_extinguisher` wire value.
   * Falls back to the raw value for a type outside the known catalog.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly typeDisplay: Signal<string> = computed<string>(() => {
    const type: string = this.equipment().type;

    return this.typeOptions.find((option) => option.value === type)?.label ?? type;
  });
  //#endregion

  //#region Methods
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
   * Method seed
   *
   * @description
   * Fills a draft from the stored value as its field opens.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {EditableField} field - Field being opened.
   * @param {string | null} value - Current stored value.
   * @returns {void}
   */
  protected seed(field: EditableField, value: string | null): void {
    this.openField.set(field);
    this.controlFor(field).setValue(value ?? '');
  }

  /**
   * Method save
   *
   * @description
   * Emits the patch for one property. A trimmed empty text clears the
   * property rather than saving a blank string — except `type`, which is
   * required at creation and stays required, so an empty draft there is a
   * no-op rather than a clear: `UpdateEquipmentInput` has no null variant for it.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {EditableField} field - Field being confirmed.
   * @returns {void}
   */
  protected save(field: EditableField): void {
    const value: string = this.controlFor(field).value.trim();

    if (field === 'type') {
      if (!value) return;

      this.changed.emit({ type: value });
      return;
    }

    this.changed.emit({ [field]: value ? value : null });
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
   * Method controlFor
   *
   * @description
   * The draft behind one property.
   *
   * @access private
   * @since 2.0.0
   *
   * @param {EditableField} field - Field asking.
   * @returns {FormControl<string>} Its draft control.
   */
  private controlFor(field: EditableField): FormControl<string> {
    switch (field) {
      case 'type':
        return this.typeControl;
      case 'subType':
        return this.subTypeControl;
      case 'brand':
        return this.brandControl;
      case 'model':
        return this.modelControl;
      case 'serialNumber':
        return this.serialNumberControl;
      case 'locationLabel':
        return this.locationLabelControl;
    }
  }
  //#endregion
}
