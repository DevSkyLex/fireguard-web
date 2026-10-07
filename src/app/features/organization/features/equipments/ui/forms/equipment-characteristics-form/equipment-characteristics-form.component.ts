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
  applyEach,
  disabled,
  form,
  FormField,
  maxLength,
  required,
  validate,
  type FieldTree,
} from '@angular/forms/signals';
import type {
  EquipmentOutput,
  EquipmentCriticality,
  UpdateEquipmentInput,
} from '@features/organization/features/equipments/models';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmSelectImports } from '@shared/ui/select';
import type { EquipmentCharacteristicsDraft } from './models/equipment-characteristics-draft.interface';

/**
 * Class EquipmentCharacteristicsForm
 * @class EquipmentCharacteristicsForm
 *
 * @description
 * Edits declarative equipment characteristics without making regulatory inferences.
 */
@Component({
  selector: 'app-equipment-characteristics-form',
  imports: [FormField, HlmButton, HlmInput, ...HlmFieldImports, ...HlmSelectImports],
  templateUrl: './equipment-characteristics-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentCharacteristicsForm {
  //#region Properties
  /**
   * Property equipment
   * @readonly
   *
   * @description
   * Equipment whose declared characteristics are being edited.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<EquipmentOutput>}
   */
  public readonly equipment: InputSignal<EquipmentOutput> = input.required<EquipmentOutput>();

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Locks the draft while the owning page persists it.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input(false);

  /**
   * Property error
   * @readonly
   *
   * @description
   * Recoverable server rejection; the draft is retained.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | null>}
   */
  public readonly error: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Complete normalized patch for the owning page to persist.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<UpdateEquipmentInput>}
   */
  public readonly submitted: OutputEmitterRef<UpdateEquipmentInput> =
    output<UpdateEquipmentInput>();

  /**
   * Property cancelled
   * @readonly
   *
   * @description
   * Operator closed the editor without saving.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly cancelled: OutputEmitterRef<void> = output<void>();

  /**
   * Property draft
   * @readonly
   *
   * @description
   * Editable characteristic rows and declared criticality.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<EquipmentCharacteristicsDraft>}
   */
  protected readonly draft: WritableSignal<EquipmentCharacteristicsDraft> = signal({
    criticality: '',
    properties: [],
  });

  /**
   * Property criticalityOptions
   * @readonly
   *
   * @description
   * Localized declared-impact choices.
   *
   * @access protected
   * @since unreleased
   *
   * @type {readonly { readonly value: EquipmentCriticality | ''; readonly label: string }[]}
   */
  protected readonly criticalityOptions: readonly {
    readonly value: EquipmentCriticality | '';
    readonly label: string;
  }[] = [
    { value: '', label: $localize`:@@equipment.criticality.unknown:Not specified` },
    { value: 'low', label: $localize`:@@equipment.criticality.low:Low` },
    { value: 'medium', label: $localize`:@@equipment.criticality.medium:Medium` },
    { value: 'high', label: $localize`:@@equipment.criticality.high:High` },
    { value: 'critical', label: $localize`:@@equipment.criticality.critical:Critical` },
  ];

  /**
   * Property characteristicsForm
   * @readonly
   *
   * @description
   * Signal Form enforcing transport limits and unique characteristic keys.
   *
   * @access protected
   * @since unreleased
   *
   * @type {FieldTree<EquipmentCharacteristicsDraft>}
   */
  protected readonly characteristicsForm: FieldTree<EquipmentCharacteristicsDraft> = form(
    this.draft,
    (path) => {
      disabled(path, { when: () => this.pending() });
      applyEach(path.properties, (row) => {
        required(row.key, {
          message: $localize`:@@equipment.characteristics.keyRequired:Enter a characteristic name.`,
        });
        required(row.value, {
          message: $localize`:@@equipment.characteristics.valueRequired:Enter a value.`,
        });
        maxLength(row.key, 64);
        maxLength(row.value, 255);
        maxLength(row.unit, 32);
        validate(row.value, ({ value }) =>
          value().trim()
            ? null
            : {
                kind: 'blank',
                message: $localize`:@@equipment.characteristics.valueRequired:Enter a value.`,
              },
        );
        validate(row.key, ({ value, valueOf }) => {
          const key = value().trim();
          if (!key)
            return {
              kind: 'blank',
              message: $localize`:@@equipment.characteristics.keyRequired:Enter a characteristic name.`,
            };
          const count = valueOf(path.properties).filter((entry) => entry.key.trim() === key).length;
          return count > 1
            ? {
                kind: 'duplicate',
                message: $localize`:@@equipment.characteristics.duplicateKey:Characteristic names must be unique.`,
              }
            : null;
        });
      });
    },
  );

  /**
   * Property canAdd
   * @readonly
   *
   * @description
   * API supports at most fifty declared characteristic rows.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canAdd: Signal<boolean> = computed(
    () => this.draft().properties.length < 50 && !this.pending(),
  );
  /**
   * Property seededEquipmentScope
   *
   * @description
   * Keeps unrelated updates of the same equipment from erasing an edited characteristics draft.
   *
   * @access private
   * @since unreleased
   *
   * @type {string | null}
   */
  private seededEquipmentScope: string | null = null;
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Seeds the draft from the equipment without making the initial form dirty.
   *
   * @access public
   * @since unreleased
   */
  public constructor() {
    effect(() => {
      const equipment = this.equipment();
      untracked(() => {
        const scope = `${equipment.organizationId}/${equipment.id}`;
        if (this.seededEquipmentScope === scope && this.characteristicsForm().dirty()) return;
        this.seededEquipmentScope = scope;
        this.characteristicsForm().reset({
          criticality: equipment.criticality ?? '',
          properties: (equipment.technicalProperties ?? []).map((entry) => ({
            key: entry.key,
            value: entry.value,
            unit: entry.unit ?? '',
          })),
        });
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method add
   * @method add
   *
   * @description
   * Adds a blank characteristic without exceeding the API limit.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} Result of the operation.
   */
  protected add(): void {
    if (!this.canAdd()) return;
    this.draft.update((draft) => ({
      ...draft,
      properties: [...draft.properties, { key: '', value: '', unit: '' }],
    }));
  }

  /**
   * Method remove
   * @method remove
   *
   * @description
   * Removes the selected draft row.
   *
   * @access protected
   * @since unreleased
   *
   * @param {number} index - index.
   *
   * @returns {void} Result of the operation.
   */
  protected remove(index: number): void {
    if (this.pending()) return;
    this.draft.update((draft) => ({
      ...draft,
      properties: draft.properties.filter((_, row) => row !== index),
    }));
  }

  /**
   * Method submit
   * @method submit
   *
   * @description
   * Validates and emits values while retaining the draft until server success.
   *
   * @access protected
   * @since unreleased
   *
   * @param {Event} event - event.
   *
   * @returns {void} Result of the operation.
   */
  protected submit(event: Event): void {
    event.preventDefault();
    this.characteristicsForm().markAsTouched();
    if (this.pending() || this.characteristicsForm().invalid()) return;
    const draft = this.draft();
    this.submitted.emit({
      criticality: draft.criticality || null,
      technicalProperties: draft.properties.map((entry) => ({
        key: entry.key.trim(),
        value: entry.value.trim(),
        unit: entry.unit.trim() || null,
      })),
    });
  }
  //#endregion
}
