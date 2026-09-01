import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { form, FormField, required, type FieldTree } from '@angular/forms/signals';
import { toServerFieldErrors, toUnmatchedViolations, type Violation } from '@core/api';
import { storeErrorMessage } from '@features/onboarding/utils';
import { EQUIPMENT_TYPE_OPTIONS } from '@features/organization/features/equipments';
import type { SetupCreateEquipmentInput, SetupFacilitySummary } from '@features/organization/setup';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmSelectImports } from '@shared/ui/select';
import type { OnboardingEquipmentFormDraft, OnboardingEquipmentTypeOption } from './models';

/** A blank draft. */
const EMPTY_VALUES: OnboardingEquipmentFormDraft = {
  type: '',
  brand: '',
  model: '',
  serialNumber: '',
  facilityId: '',
};

/** Trims a free-text field, sending `undefined` rather than an empty string. */
function trimmed(value: string): string | undefined {
  const trimmedValue: string = value.trim();

  return trimmedValue === '' ? undefined : trimmedValue;
}

/**
 * Component OnboardingEquipmentForm
 * @class OnboardingEquipmentForm
 *
 * @description
 * The `create_first_equipment` wizard step: one piece of fire-safety gear,
 * enough to prove the workflow before the operator leaves the wizard. The
 * type catalog is the equipments subfeature's own canonical
 * `EQUIPMENT_TYPE_OPTIONS`, not a local copy (`FEATURE.md` "Cross-Feature
 * Dependencies"). The equipment is attached to a facility created earlier in
 * the wizard: silently when there is exactly one, through a pre-selected
 * facility select when there are several.
 *
 * It owns its model, its rules and its own validity, and emits
 * {@link submitted} with the setup-boundary-shaped payload — the wizard page
 * registers the equipment through `@features/organization/setup` and
 * confirms the step via the store (`ARCHITECTURE.md` §10.4).
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-onboarding-equipment-form [pending]="isCreating()" (submitted)="createEquipment($event)" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-onboarding-equipment-form',
  imports: [FormField, HlmButton, HlmInput, ...HlmFieldImports, ...HlmSelectImports],
  templateUrl: './onboarding-equipment-form.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingEquipmentForm {
  //#region Inputs
  /**
   * Property pending
   * @readonly
   * @description Whether the equipment is being registered, which locks the controls.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property facilities
   * @readonly
   * @description The facilities created earlier in the wizard. One pre-attaches silently; several offer a pre-selected choice.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly SetupFacilitySummary[]>}
   */
  public readonly facilities: InputSignal<readonly SetupFacilitySummary[]> = input<
    readonly SetupFacilitySummary[]
  >([]);

  /**
   * Property serverError
   * @readonly
   * @description Whatever the creation request failed with.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<unknown>}
   */
  public readonly serverError: InputSignal<unknown> = input<unknown>(null);
  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @readonly
   * @description Emits the setup-boundary payload once the form is valid.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<SetupCreateEquipmentInput>}
   */
  public readonly submitted: OutputEmitterRef<SetupCreateEquipmentInput> =
    output<SetupCreateEquipmentInput>();
  //#endregion

  //#region Properties
  /** The edited draft. */
  protected readonly model: WritableSignal<OnboardingEquipmentFormDraft> =
    signal<OnboardingEquipmentFormDraft>(EMPTY_VALUES);

  /**
   * Property equipmentForm
   * @readonly
   * @description The field tree and its one rule.
   * @access protected
   * @since 1.0.0
   * @type {FieldTree<OnboardingEquipmentFormDraft>}
   */
  protected readonly equipmentForm: FieldTree<OnboardingEquipmentFormDraft> = form(
    this.model,
    (path) => {
      required(path.type, {
        message: $localize`:@@onboarding.equipmentForm.typeRequired:Equipment type is required.`,
      });
    },
  );

  /** The equipment types offered, owned by the equipments subfeature. */
  protected readonly typeOptions: typeof EQUIPMENT_TYPE_OPTIONS = EQUIPMENT_TYPE_OPTIONS;

  /**
   * Property serverMessages
   * @readonly
   * @description Everything the API said about the rejected request, as flat lines above the form.
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

    if (combined.length > 0) return combined;

    const storeMessage: string | null = storeErrorMessage(error);

    return storeMessage !== null
      ? [storeMessage]
      : [
          $localize`:@@onboarding.equipmentForm.createFailed:The equipment could not be registered.`,
        ];
  });

  /** Names a type on the closed select trigger. */
  protected readonly typeLabelOf: (value: OnboardingEquipmentTypeOption | '') => string = (value) =>
    this.typeOptions.find((option) => option.value === value)?.label ?? '';

  /** Names a facility on the closed select trigger. */
  protected readonly facilityLabelOf: (value: string) => string = (value) =>
    this.facilities().find((facility) => facility.id === value)?.name ?? '';
  //#endregion

  //#region Lifecycle
  constructor() {
    effect(() => {
      const facilities: readonly SetupFacilitySummary[] = this.facilities();
      if (facilities.length === 0) return;

      const current: string = this.model().facilityId;
      if (facilities.some((facility) => facility.id === current)) return;

      const firstId: string = facilities[0].id;
      this.model.update((draft) => ({ ...draft, facilityId: firstId }));
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method submit
   *
   * @description
   * Marks the tree touched so the unmet rule shows, then emits when valid.
   * Blank optional fields are dropped rather than sent as empty strings.
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

    this.equipmentForm().markAsTouched();

    if (this.equipmentForm().invalid() || this.pending()) return;

    const draft: OnboardingEquipmentFormDraft = this.model();
    if (draft.type === '') return;

    this.submitted.emit({
      type: draft.type,
      brand: trimmed(draft.brand),
      model: trimmed(draft.model),
      serialNumber: trimmed(draft.serialNumber),
      facilityId: draft.facilityId === '' ? undefined : draft.facilityId,
    });
  }
  //#endregion
}
