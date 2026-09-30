import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { form, FormField, required, type FieldTree } from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideAlarmSmoke,
  lucideBox,
  lucideCctv,
  lucideCheck,
  lucideDoorClosed,
  lucideDroplet,
  lucideDroplets,
  lucideFingerprint,
  lucideFireExtinguisher,
  lucideGauge,
  lucideLightbulb,
  lucideMapPin,
  lucidePackage,
  lucideSearch,
  lucideSiren,
  lucideThermometer,
} from '@ng-icons/lucide';
import { BrnCommandInput } from '@spartan-ng/brain/command';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import { ONBOARDING_FACILITY_TYPE_OPTIONS } from '@features/onboarding/options';
import { OnboardingStepFooter } from '@features/onboarding/ui/components';
import { EQUIPMENT_TYPE_OPTIONS } from '@features/organization/features/equipments';
import type { SetupCreateEquipmentInput, SetupFacilitySummary } from '@features/organization/setup';
import { RequiredMarker } from '@shared/required-marker';
import { HlmButton } from '@shared/ui/button';
import { HlmComboboxImports } from '@shared/ui/combobox';
import { HlmCommandImports } from '@shared/ui/command';
import { HlmDrawerImports } from '@shared/ui/drawer';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmInputGroupImports } from '@shared/ui/input-group';
import { HlmSelectImports } from '@shared/ui/select';
import type { OnboardingEquipmentFormDraft, OnboardingEquipmentTypeOption } from './models';

/**
 * Function trimmed
 *
 * @description
 * Trims a free-text field, sending `undefined` rather than an empty string.
 *
 * @access private
 * @since unreleased
 *
 * @param {string} value - User-entered field content.
 *
 * @returns {string | undefined} The trimmed value or `undefined` when blank.
 */
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
 * the wizard through a facility select that is rendered whenever at least one
 * exists and pre-selected on the first — a single facility is shown rather
 * than attached silently, so the operator sees where the equipment lands.
 * Each option names the facility and its type.
 *
 * It owns its model, its rules and its own validity, and emits
 * {@link submitted} with the setup-boundary-shaped payload — the wizard page
 * registers the equipment through `@features/organization/setup` and
 * confirms the step via the store (`ARCHITECTURE.md` §10.4).
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```html
 * <app-onboarding-equipment-form [pending]="isCreating()" (submitted)="createEquipment($event)" />
 * ```
 */
@Component({
  selector: 'app-onboarding-equipment-form',
  imports: [
    NgIcon,
    HlmButton,
    HlmCommandImports,
    BrnCommandInput,
    HlmInputGroupImports,
    HlmDrawerImports,
    ...HlmComboboxImports,
    RequiredMarker,
    FormField,
    HlmInput,
    OnboardingStepFooter,
    ...HlmFieldImports,
    ...HlmSelectImports,
  ],
  templateUrl: './onboarding-equipment-form.component.html',
  providers: [
    provideIcons({
      lucideAlarmSmoke,
      lucideBox,
      lucideCctv,
      lucideCheck,
      lucideDoorClosed,
      lucideDroplet,
      lucideDroplets,
      lucideFingerprint,
      lucideFireExtinguisher,
      lucideGauge,
      lucideLightbulb,
      lucideMapPin,
      lucidePackage,
      lucideSearch,
      lucideSiren,
      lucideThermometer,
    }),
  ],
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingEquipmentForm {
  /**
   * Property isMobileInteractionMode
   * @readonly
   *
   * @description
   * Central interaction mode; viewport width only controls geometry.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isMobileInteractionMode: Signal<boolean> = inject(
    INTERACTION_CAPABILITIES_PORT,
  ).isMobileInteractionMode;

  /**
   * Property restored
   * @readonly
   *
   * @description
   * Pending fields restored from the server before any durable creation result exists.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<SetupCreateEquipmentInput | null>}
   */
  public readonly restored: InputSignal<SetupCreateEquipmentInput | null> =
    input<SetupCreateEquipmentInput | null>(null);

  //#region Inputs
  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether the equipment is being registered, which locks the controls.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property facilities
   * @readonly
   *
   * @description
   * The facilities created earlier in the wizard. One pre-attaches silently; several offer a
   * pre-selected choice.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly SetupFacilitySummary[]>}
   */
  public readonly facilities: InputSignal<readonly SetupFacilitySummary[]> = input<
    readonly SetupFacilitySummary[]
  >([]);

  /**
   * Property skippable
   * @readonly
   *
   * @description
   * Whether the backend currently lets this step be skipped. The backend never does for the first
   * equipment, but every step form shares the footer contract.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly skippable: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Emits the setup-boundary payload once the form is valid.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<SetupCreateEquipmentInput>}
   */
  public readonly submitted: OutputEmitterRef<SetupCreateEquipmentInput> =
    output<SetupCreateEquipmentInput>();

  /**
   * Property skipped
   * @readonly
   *
   * @description
   * Relays the footer's skip request to the page.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly skipped: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /**
   * Property model
   * @readonly
   *
   * @description
   * Holds the equipment details edited by this form, including restored draft values.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<OnboardingEquipmentFormDraft>}
   */
  protected readonly model: WritableSignal<OnboardingEquipmentFormDraft> = linkedSignal(() => {
    const restored = this.restored();
    return {
      type: (restored?.type ?? '') as OnboardingEquipmentTypeOption | '',
      brand: restored?.brand ?? '',
      model: restored?.model ?? '',
      serialNumber: restored?.serialNumber ?? '',
      facilityId: restored?.facilityId ?? '',
    };
  });

  /**
   * Property equipmentForm
   * @readonly
   *
   * @description
   * The field tree and its one rule.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FieldTree<OnboardingEquipmentFormDraft>}
   */
  protected readonly equipmentForm: FieldTree<OnboardingEquipmentFormDraft> = form(
    this.model,
    (path) => {
      required(path.facilityId, {
        when: () => this.facilities().length > 0,
        message: $localize`:@@onboarding.equipmentForm.facilityRequired:Select the facility for this equipment.`,
      });
      required(path.type, {
        message: $localize`:@@onboarding.equipmentForm.typeRequired:Equipment type is required.`,
      });
    },
  );

  /**
   * Property typeOptions
   * @readonly
   *
   * @description
   * Uses the equipment subfeature's canonical set of selectable types.
   *
   * @access protected
   * @since unreleased
   *
   * @type {typeof EQUIPMENT_TYPE_OPTIONS}
   */
  protected readonly typeOptions: typeof EQUIPMENT_TYPE_OPTIONS = EQUIPMENT_TYPE_OPTIONS;

  /**
   * Property typeLabelOf
   * @readonly
   *
   * @description
   * Resolves the selected equipment type's label for the closed select trigger.
   *
   * @access protected
   * @since unreleased
   *
   * @type {(value: OnboardingEquipmentTypeOption | '') => string}
   */
  protected readonly typeLabelOf: (value: OnboardingEquipmentTypeOption | '') => string = (value) =>
    this.typeOptions.find((option) => option.value === value)?.label ?? '';

  /**
   * Property typeIconOf
   * @readonly
   *
   * @description
   * Resolves a decorative equipment icon, with a neutral fallback before selection.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {(value: OnboardingEquipmentTypeOption | '') => string}
   */
  protected readonly typeIconOf: (value: OnboardingEquipmentTypeOption | '') => string = (value) =>
    this.typeOptions.find((option) => option.value === value)?.icon ?? 'lucidePackage';

  /**
   * Property facilityRows
   * @readonly
   *
   * @description
   * The created facilities with their type resolved to its localized label, for the select options.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<readonly { id: string; name: string; typeLabel: string }[]>}
   */
  protected readonly facilityRows: Signal<
    readonly { readonly id: string; readonly name: string; readonly typeLabel: string }[]
  > = computed(() =>
    this.facilities().map((facility) => ({
      id: facility.id,
      name: facility.name,
      typeLabel:
        ONBOARDING_FACILITY_TYPE_OPTIONS.find((option) => option.value === facility.type)?.label ??
        '',
    })),
  );

  /**
   * Property facilityLabelOf
   * @readonly
   *
   * @description
   * Combines the selected facility's name and type for its closed select trigger.
   *
   * @access protected
   * @since unreleased
   *
   * @type {(value: string) => string}
   */
  protected readonly facilityLabelOf: (value: string) => string = (value) => {
    const row = this.facilityRows().find((facility) => facility.id === value);
    if (row === undefined) return '';

    return row.typeLabel === '' ? row.name : `${row.name} · ${row.typeLabel}`;
  };

  /**
   * Property submitLabel
   * @readonly
   *
   * @description
   * Supplies the footer action's label while submission is idle.
   *
   * @access protected
   * @since unreleased
   *
   * @type {string}
   */
  protected readonly submitLabel: string = $localize`:@@onboarding.equipmentForm.submit:Register equipment`;

  /**
   * Property pendingLabel
   * @readonly
   *
   * @description
   * Supplies the footer action's label while registration is pending.
   *
   * @access protected
   * @since unreleased
   *
   * @type {string}
   */
  protected readonly pendingLabel: string = $localize`:@@onboarding.equipmentForm.submitting:Registering…`;
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Keeps the selected facility valid as the available facility catalog changes.
   *
   * @access public
   * @since unreleased
   */
  constructor() {
    effect(() => {
      const facilities: readonly SetupFacilitySummary[] = this.facilities();
      if (facilities.length === 0) return;

      const current: string = this.model().facilityId;
      if (facilities.some((facility) => facility.id === current)) return;

      const firstId: string = facilities.length === 1 ? facilities[0].id : '';
      if (current === firstId) return;
      this.model.update((draft) => ({ ...draft, facilityId: firstId }));
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method submit
   * @method submit
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
