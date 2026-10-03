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
import { disabled, form, FormField, type FieldTree } from '@angular/forms/signals';
import { idleCallState, type CallState } from '@core/request-state';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import type { EquipmentLabelScope } from '@features/organization/features/equipments/models/equipment-labels';
import { EQUIPMENT_TYPE_OPTIONS } from '@features/organization/features/equipments/options';
import type { FacilityOption } from '@features/organization/features/facilities/models';
import { FacilityOptionPicker } from '@features/organization/features/facilities/ui/components';
import { sheetSide } from '@shared/sheet-side';
import { HlmButton } from '@shared/ui/button';
import { HlmCheckbox } from '@shared/ui/checkbox';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmSheetImports } from '@shared/ui/sheet';
import { HlmToggleGroupImports } from '@shared/ui/toggle-group';
import type { EquipmentLabelsDraft } from './models';

/**
 * Class EquipmentLabelsDialog
 * @class EquipmentLabelsDialog
 *
 * @description
 * Explicit QR printing scope with a server count preview and a safe empty-selection default.
 */
@Component({
  selector: 'app-equipment-labels-dialog',
  imports: [
    FormField,
    FacilityOptionPicker,
    HlmButton,
    HlmCheckbox,
    ...HlmFieldImports,
    ...HlmSheetImports,
    ...HlmToggleGroupImports,
  ],
  templateUrl: './equipment-labels-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentLabelsDialog {
  //#region Properties
  /**
   * Property visible
   * @readonly
   *
   * @description
   * Whether the QR printing sheet is open.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property items
   * @readonly
   *
   * @description
   * Current equipment page offered for explicit selection.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<readonly EquipmentOutput[]>}
   */
  public readonly items: InputSignal<readonly EquipmentOutput[]> = input<
    readonly EquipmentOutput[]
  >([]);

  /**
   * Property facilityOptions
   * @readonly
   *
   * @description
   * Current facility server page.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<readonly FacilityOption[]>}
   */
  public readonly facilityOptions: InputSignal<readonly FacilityOption[]> = input<
    readonly FacilityOption[]
  >([]);

  /**
   * Property facilityPage
   * @readonly
   *
   * @description
   * Current facility server page.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<number>}
   */
  public readonly facilityPage: InputSignal<number> = input<number>(1);

  /**
   * Property facilityPageCount
   * @readonly
   *
   * @description
   * Number of facility server pages.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<number>}
   */
  public readonly facilityPageCount: InputSignal<number> = input<number>(1);

  /**
   * Property facilityCallState
   * @readonly
   *
   * @description
   * Facility option request lifecycle.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<CallState>}
   */
  public readonly facilityCallState: InputSignal<CallState> = input<CallState>(idleCallState());

  /**
   * Property count
   * @readonly
   *
   * @description
   * Number of labels in the successfully previewed scope.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<number>}
   */
  public readonly count: InputSignal<number> = input<number>(0);

  /**
   * Property previewCallState
   * @readonly
   *
   * @description
   * Request lifecycle for the scope count.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<CallState>}
   */
  public readonly previewCallState: InputSignal<CallState> = input<CallState>(idleCallState());

  /**
   * Property printCallState
   * @readonly
   *
   * @description
   * PDF export lifecycle.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<CallState>}
   */
  public readonly printCallState: InputSignal<CallState> = input<CallState>(idleCallState());

  /**
   * Property canPrint
   * @readonly
   *
   * @description
   * Whether the preview fits the server label limit.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canPrint: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property visibleChange
   * @readonly
   *
   * @description
   * Changes sheet visibility.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly visibleChange: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Property scopeChanged
   * @readonly
   *
   * @description
   * Requests an exact inventory, site or selected-record count.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<EquipmentLabelScope>}
   */
  public readonly scopeChanged: OutputEmitterRef<EquipmentLabelScope> =
    output<EquipmentLabelScope>();

  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Requests the previewed PDF export.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<EquipmentLabelScope>}
   */
  public readonly submitted: OutputEmitterRef<EquipmentLabelScope> = output<EquipmentLabelScope>();

  /**
   * Property facilitySearchChanged
   * @readonly
   *
   * @description
   * Requests a server facility search.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly facilitySearchChanged: OutputEmitterRef<string> = output<string>();

  /**
   * Property facilityPageChanged
   * @readonly
   *
   * @description
   * Requests a facility server page.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<number>}
   */
  public readonly facilityPageChanged: OutputEmitterRef<number> = output<number>();

  /**
   * Property side
   * @readonly
   *
   * @description
   * Uses the central interaction mode for the sheet's presentation.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<'right' | 'bottom'>}
   */
  protected readonly side: Signal<'right' | 'bottom'> = sheetSide();

  /**
   * Property model
   * @readonly
   *
   * @description
   * Keeps selected ids and site scope in one Signal Forms draft.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<EquipmentLabelsDraft>}
   */
  protected readonly model: WritableSignal<EquipmentLabelsDraft> = signal<EquipmentLabelsDraft>({
    mode: 'selection',
    facilityId: '',
    ids: [],
  });

  /**
   * Property labelForm
   * @readonly
   *
   * @description
   * Owns the facility and explicit selection fields without initiating API calls.
   *
   * @access protected
   * @since unreleased
   *
   * @type {FieldTree<EquipmentLabelsDraft>}
   */
  protected readonly labelForm: FieldTree<EquipmentLabelsDraft> = form(this.model, (path) =>
    disabled(path, { when: () => this.printCallState().status === 'pending' }),
  );

  /**
   * Property scope
   * @readonly
   *
   * @description
   * Captures the exact target set sent for preview and printing.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<EquipmentLabelScope>}
   */
  protected readonly scope: Signal<EquipmentLabelScope> = computed<EquipmentLabelScope>(() => {
    const draft = this.model();
    if (draft.mode === 'inventory') return { kind: 'inventory' };
    if (draft.mode === 'facility') return { kind: 'facility', facilityId: draft.facilityId };
    return { kind: 'selection', ids: draft.ids };
  });
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Requests count previews only while the printing surface is visible.
   *
   * @access public
   * @since unreleased
   */
  public constructor() {
    effect(() => {
      const visible = this.visible();
      const scope = this.scope();
      if (visible) untracked(() => this.scopeChanged.emit(scope));
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method setMode
   * @method setMode
   *
   * @description
   * Keeps the scope choice valid when the toggle group's value is cleared.
   *
   * @access protected
   * @since unreleased
   *
   * @param {unknown} value - Native toggle choice.
   *
   * @returns {void}
   */
  protected setMode(value: unknown): void {
    if (this.printCallState().status === 'pending') return;
    if (value !== 'inventory' && value !== 'facility' && value !== 'selection') return;
    this.labelForm.mode().value.set(value);
  }

  /**
   * Method toggleId
   * @method toggleId
   *
   * @description
   * Adds or removes an explicitly chosen equipment id without changing inventory scope.
   *
   * @access protected
   * @since unreleased
   *
   * @param {string} id - Equipment identity from the visible page.
   *
   * @returns {void}
   */
  protected toggleId(id: string): void {
    if (this.printCallState().status === 'pending') return;
    const ids = this.model().ids;
    this.labelForm
      .ids()
      .value.set(ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]);
  }

  /**
   * Method equipmentLabel
   * @method equipmentLabel
   *
   * @description
   * Uses the equipment catalog's localized labels without exposing raw type keys.
   *
   * @access protected
   * @since unreleased
   *
   * @param {EquipmentOutput} item - Selected equipment candidate.
   *
   * @returns {string} Human-readable asset identity.
   */
  protected equipmentLabel(item: EquipmentOutput): string {
    return (
      item.serialNumber ||
      EQUIPMENT_TYPE_OPTIONS.find((option) => option.value === item.type)?.label ||
      $localize`:@@common.unknownType:Unknown type`
    );
  }
  //#endregion
}
