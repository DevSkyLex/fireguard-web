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
import { form, FormField, maxLength, type FieldTree } from '@angular/forms/signals';
import type {
  EquipmentEditState,
  EquipmentEditTarget,
  EquipmentOutput,
  UpdateEquipmentInput,
} from '@features/organization/features/equipments/models';
import { EQUIPMENT_TYPE_OPTIONS } from '@features/organization/features/equipments/options';
import { InplaceField } from '@shared/inplace-field';
import {
  DEFAULT_REGIONAL_FORMAT_SETTINGS,
  OrgDatePipe,
  type RegionalFormatSettings,
} from '@shared/regional-format';
import { HlmInput } from '@shared/ui/input';
import { HlmSelectImports } from '@shared/ui/select';

/**
 * Component EquipmentInformationPanel
 * @class EquipmentInformationPanel
 *
 * @description
 * The equipment's identification properties — type, subtype, brand, model,
 * serial number, location — each edited where it is displayed
 * (`ARCHITECTURE.md` §10.5, `FEATURE.md` "The record is the edit surface").
 * There is no separate edit page: `type` commits on selection (`pick`); the
 * five free-text fields keep an explicit Save (`confirm`) since text has no
 * single "done" gesture.
 * Only one field is ever open at a time (`editState`), so the five confirm
 * fields share a single draft signal rather than one each. Grouped into an
 * "Identification" and a "Placement & lifecycle" fieldset, the second
 * carrying two read-only rows — Installed, Commissioned — since neither is
 * an {@link EquipmentEditTarget}.
 *
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-equipment-information-panel',
  imports: [InplaceField, OrgDatePipe, HlmInput, FormField, ...HlmSelectImports],
  templateUrl: './equipment-information-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentInformationPanel {
  //#region Inputs
  /**
   * Property typeOptions
   * @readonly
   *
   * @description
   * Server catalog containing both active and archived labels.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<typeof EQUIPMENT_TYPE_OPTIONS>}
   */
  public readonly typeOptions: InputSignal<typeof EQUIPMENT_TYPE_OPTIONS> =
    input<typeof EQUIPMENT_TYPE_OPTIONS>(EQUIPMENT_TYPE_OPTIONS);
  /**
   * Property equipment
   * @readonly
   *
   * @description
   * The loaded equipment whose properties this panel edits.
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
   * Whether the member may write to this equipment at all.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignalWithTransform<boolean, BooleanInput>}
   */
  public readonly editable: InputSignalWithTransform<boolean, BooleanInput> = input<
    boolean,
    BooleanInput
  >(false, { transform: booleanAttribute });

  /**
   * Property editState
   * @readonly
   *
   * @description
   * Which field the page has open, writing, or showing a rejection.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<EquipmentEditState>}
   */
  public readonly editState: InputSignal<EquipmentEditState> = input.required<EquipmentEditState>();

  /**
   * Property regionalFormatting
   * @readonly
   *
   * @description
   * The organization's date pattern and timezone, for the Installed/Commissioned rows' `appOrgDate`
   * binding.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<RegionalFormatSettings>}
   */
  public readonly regionalFormatting: InputSignal<RegionalFormatSettings> =
    input<RegionalFormatSettings>(DEFAULT_REGIONAL_FORMAT_SETTINGS);
  //#endregion

  //#region Outputs
  /**
   * Property detailsChanged
   * @readonly
   *
   * @description
   * A patch the page should send. Never emitted for an unchanged value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<UpdateEquipmentInput>}
   */
  public readonly detailsChanged: OutputEmitterRef<UpdateEquipmentInput> =
    output<UpdateEquipmentInput>();

  /**
   * Property editTargetChanged
   * @readonly
   *
   * @description
   * Asks the page to open or close an editor.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<EquipmentEditTarget | null>}
   */
  public readonly editTargetChanged: OutputEmitterRef<EquipmentEditTarget | null> =
    output<EquipmentEditTarget | null>();
  //#endregion

  //#region Properties
  /**
   * Property editableTypeOptions
   * @readonly
   *
   * @description
   * Active catalog choices plus the record's archived historical type.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<typeof EQUIPMENT_TYPE_OPTIONS>}
   */
  protected readonly editableTypeOptions: Signal<typeof EQUIPMENT_TYPE_OPTIONS> = computed(() =>
    this.typeOptions().filter(
      (option) =>
        !('archived' in option) || !option.archived || option.value === this.equipment().type,
    ),
  );

  /**
   * Property textModel
   * @readonly
   *
   * @description
   * The in-flight value for whichever confirm-mode text field is open,
   * seeded when that field opens. A single signal is enough because
   * `InplaceField`'s `editing` is controlled and only one field opens at a
   * time.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<{ value: string }>}
   */
  protected readonly textModel: WritableSignal<{ value: string }> = signal({ value: '' });

  /**
   * Property textForm
   * @readonly
   *
   * @description
   * Signal Form for the currently open identity field.
   *
   * @access protected
   * @since unreleased
   *
   * @type {FieldTree<{ value: string }>}
   */
  protected readonly textForm: FieldTree<{ value: string }> = form(this.textModel, (path) =>
    maxLength(path.value, () => (this.editState().open === 'assetCode' ? 100 : 255)),
  );

  /**
   * Property canSaveText
   * @readonly
   *
   * @description
   * Whether the open text field's draft differs from its stored value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canSaveText: Signal<boolean> = computed<boolean>(() => {
    const stored: string = this.storedValueOf(this.editState().open) ?? '';

    return this.textModel().value.trim() !== stored && this.textForm().valid();
  });

  /**
   * Property typeLabelOf
   * @readonly
   *
   * @description
   * Names server catalog choices and preserves readable custom-code fallbacks.
   *
   * @access protected
   * @since unreleased
   *
   * @type {(value: string) => string}
   */
  protected readonly typeLabelOf: (value: string) => string = (value) =>
    this.typeOptions().find((option) => option.value === value)?.label ??
    value.replaceAll('_', ' ');
  //#endregion

  //#region Methods
  /**
   * Method isEditing
   * @method isEditing
   *
   * @description
   * Whether the page has this field open.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {EquipmentEditTarget} target - The field in question.
   *
   * @returns {boolean} True when it is the open one.
   */
  protected isEditing(target: EquipmentEditTarget): boolean {
    return this.editState().open === target;
  }

  /**
   * Method isSaving
   * @method isSaving
   *
   * @description
   * Whether this field's own write is in flight.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {EquipmentEditTarget} target - The field in question.
   *
   * @returns {boolean} True while its patch is pending.
   */
  protected isSaving(target: EquipmentEditTarget): boolean {
    return this.editState().saving === target;
  }

  /**
   * Method errorFor
   * @method errorFor
   *
   * @description
   * The rejection message attributed to this field, if any.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {EquipmentEditTarget} target - The field in question.
   *
   * @returns {string | null} Its failure message, or null.
   */
  protected errorFor(target: EquipmentEditTarget): string | null {
    const state: EquipmentEditState = this.editState();

    return state.failed === target ? state.failure : null;
  }

  /**
   * Method onTextEditing
   * @method onTextEditing
   *
   * @description
   * Seeds the shared draft on open and forwards the open/close request to the
   * page, which owns which field is open.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {EquipmentEditTarget} target - The text field being opened or closed.
   * @param {boolean} open - Whether it is being opened.
   *
   * @returns {void}
   */
  protected onTextEditing(target: EquipmentEditTarget, open: boolean): void {
    if (open) this.textForm().reset({ value: this.storedValueOf(target) ?? '' });

    this.editTargetChanged.emit(open ? target : null);
  }

  /**
   * Method saveText
   * @method saveText
   *
   * @description
   * Emits the drafted value for the currently open text field, trimmed and nulled if blank.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected saveText(): void {
    const target: EquipmentEditTarget | null = this.editState().open;
    if (
      target === null ||
      target === 'type' ||
      target === 'technicalProperties' ||
      this.textForm().invalid()
    )
      return;

    const trimmed: string = this.textModel().value.trim();

    this.detailsChanged.emit({ [target]: trimmed === '' ? null : trimmed });
  }

  /**
   * Method pickType
   * @method pickType
   *
   * @description
   * Commits a picked type, unless it is the one already stored.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} type - The chosen type.
   *
   * @returns {void}
   */
  protected pickType(type: string): void {
    if (type === this.equipment().type) return;

    this.detailsChanged.emit({ type });
  }

  /**
   * Method onTypeEditing
   * @method onTypeEditing
   *
   * @description
   * Forwards the `type` field's open/close request.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {boolean} open - Whether it is being opened.
   *
   * @returns {void}
   */
  protected onTypeEditing(open: boolean): void {
    this.editTargetChanged.emit(open ? 'type' : null);
  }

  /**
   * Method storedValueOf
   * @method storedValueOf
   *
   * @description
   * The currently stored value for a text edit target, or null for `type`/unset.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {EquipmentEditTarget | null} target - The field in question.
   *
   * @returns {string | null} The stored value.
   */
  private storedValueOf(target: EquipmentEditTarget | null): string | null {
    if (target === null || target === 'type' || target === 'technicalProperties') return null;

    return this.equipment()[target] ?? null;
  }
  //#endregion
}
