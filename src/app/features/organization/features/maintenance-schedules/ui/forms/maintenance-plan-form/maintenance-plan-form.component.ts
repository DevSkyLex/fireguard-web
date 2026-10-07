import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  linkedSignal,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import {
  disabled,
  form,
  FormField,
  maxLength,
  min,
  required,
  validate,
  type FieldTree,
} from '@angular/forms/signals';
import { idleCallState, type CallState, type StoreError } from '@core/request-state';
import { buildEquipmentTitle } from '@features/organization/features/equipments';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import type {
  CreateMaintenancePlanInput,
  MaintenancePlanOutput,
} from '@features/organization/features/maintenance-schedules/models';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmButton } from '@shared/ui/button';
import { HlmComboboxImports } from '@shared/ui/combobox';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmSelectImports } from '@shared/ui/select';
import { HlmSpinner } from '@shared/ui/spinner';
import type { MaintenancePlanDraft } from './models/maintenance-plan-draft.model';

/**
 * Class MaintenancePlanForm
 * @class MaintenancePlanForm
 *
 * @description
 * Presentational preparation form with explicit calendar cadence and server-paged equipment
 * choices. The page owns writes and calendar preview; rejection preserves the draft.
 */
@Component({
  selector: 'app-maintenance-plan-form',
  imports: [
    FormField,
    ...HlmFieldImports,
    ...HlmAlertImports,
    ...HlmSelectImports,
    ...HlmComboboxImports,
    HlmInput,
    HlmButton,
    HlmSpinner,
  ],
  templateUrl: './maintenance-plan-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaintenancePlanForm {
  //#region Properties
  /**
   * Property initialPlan
   * @readonly
   *
   * @description
   * Saved plan being configured, otherwise new preparation.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<MaintenancePlanOutput | null>}
   */
  public readonly initialPlan: InputSignal<MaintenancePlanOutput | null> =
    input<MaintenancePlanOutput | null>(null);

  /**
   * Property equipment
   * @readonly
   *
   * @description
   * Current authorized server page.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<readonly EquipmentOutput[]>}
   */
  public readonly equipment: InputSignal<readonly EquipmentOutput[]> = input<
    readonly EquipmentOutput[]
  >([]);

  /**
   * Property equipmentState
   * @readonly
   *
   * @description
   * Equipment search feedback.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<CallState<readonly EquipmentOutput[]>>}
   */
  public readonly equipmentState: InputSignal<CallState<readonly EquipmentOutput[]>> =
    input<CallState<readonly EquipmentOutput[]>>(idleCallState());

  /**
   * Property equipmentPage
   * @readonly
   *
   * @description
   * Current server option page.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<number>}
   */
  public readonly equipmentPage: InputSignal<number> = input<number>(1);

  /**
   * Property equipmentPageCount
   * @readonly
   *
   * @description
   * Exact number of server option pages.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<number>}
   */
  public readonly equipmentPageCount: InputSignal<number> = input<number>(1);

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Accepted write locks the form and dismissal.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property serverError
   * @readonly
   *
   * @description
   * Last command rejection retains entered values.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<StoreError | null>}
   */
  public readonly serverError: InputSignal<StoreError | null> = input<StoreError | null>(null);

  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Validated transport draft; inactive on creation.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<CreateMaintenancePlanInput>}
   */
  public readonly submitted: OutputEmitterRef<CreateMaintenancePlanInput> =
    output<CreateMaintenancePlanInput>();

  /**
   * Property cancelled
   * @readonly
   *
   * @description
   * Explicit draft dismissal.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly cancelled: OutputEmitterRef<void> = output<void>();

  /**
   * Property equipmentSearched
   * @readonly
   *
   * @description
   * Search text to send to the server.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly equipmentSearched: OutputEmitterRef<string> = output<string>();

  /**
   * Property equipmentPageChanged
   * @readonly
   *
   * @description
   * Requested server option page.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<number>}
   */
  public readonly equipmentPageChanged: OutputEmitterRef<number> = output<number>();

  /**
   * Property labels
   * @readonly
   *
   * @description
   * Retains a selected label when another search page arrives.
   *
   * @access private
   * @since unreleased
   *
   * @type {WritableSignal<Record<string, string>>}
   */
  private readonly labels: WritableSignal<Record<string, string>> = signal<Record<string, string>>(
    {},
  );

  /**
   * Property model
   * @readonly
   *
   * @description
   * Fresh draft follows explicit editor selection.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<MaintenancePlanDraft>}
   */
  protected readonly model: WritableSignal<MaintenancePlanDraft> = linkedSignal(() => {
    const plan: MaintenancePlanOutput | null = this.initialPlan();
    const interval: RegExpMatchArray | null = plan?.interval.match(/^P(\d+)([DWMY])$/) ?? null;
    return {
      equipmentId: plan?.equipmentId ?? '',
      name: plan?.name ?? '',
      operationKind: plan?.operationKind ?? 'control',
      every: interval ? Number(interval[1]) : 1,
      unit: interval?.[2] ?? '',
      anchorDate: plan?.anchorAt?.slice(0, 10) ?? '',
      firstDueDate: plan?.nextDueAt?.slice(0, 10) ?? '',
    };
  });

  /**
   * Property planForm
   * @readonly
   *
   * @description
   * Actual field state and validation rules.
   *
   * @access protected
   * @since unreleased
   *
   * @type {FieldTree<MaintenancePlanDraft>}
   */
  protected readonly planForm: FieldTree<MaintenancePlanDraft> = form(this.model, (path) => {
    disabled(path, { when: () => this.pending() });
    disabled(path.every, { when: () => this.calendarLocked() });
    disabled(path.unit, { when: () => this.calendarLocked() });
    disabled(path.anchorDate, { when: () => this.calendarLocked() });
    disabled(path.firstDueDate, { when: () => this.calendarLocked() });
    required(path.equipmentId, {
      message: $localize`:@@maintenance.plans.form.equipmentRequired:Select an equipment.`,
    });
    required(path.name, {
      message: $localize`:@@maintenance.plans.form.nameRequired:Enter an operation name.`,
    });
    maxLength(path.name, 160, {
      message: $localize`:@@maintenance.plans.form.nameTooLong:Use at most 160 characters.`,
    });
    required(path.unit, {
      message: $localize`:@@maintenance.plans.form.unitRequired:Choose a calendar unit.`,
    });
    min(path.every, 1, {
      message: $localize`:@@maintenance.plans.form.everyRequired:Enter a positive interval.`,
    });
    validate(path.every, ({ value }) =>
      Number.isInteger(value())
        ? null
        : {
            kind: 'integer',
            message: $localize`:@@maintenance.plans.form.integerRequired:Enter a whole number.`,
          },
    );
    required(path.anchorDate, {
      message: $localize`:@@maintenance.plans.form.anchorRequired:Choose an anchor date.`,
    });
  });

  /**
   * Property calendarLocked
   * @readonly
   *
   * @description
   * An open occurrence retains its cadence and original deadline while allowing renaming.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly calendarLocked: Signal<boolean> = computed(
    () => this.initialPlan()?.openOccurrence != null,
  );

  /**
   * Property units
   * @readonly
   *
   * @description
   * Calendar units supported by the server.
   *
   * @access protected
   * @since unreleased
   *
   * @type {readonly { value: string; label: string }[]}
   */
  protected readonly units: readonly { value: string; label: string }[] = [
    { value: 'D', label: $localize`:@@maintenance.plans.form.days:Days` },
    { value: 'W', label: $localize`:@@maintenance.plans.form.weeks:Weeks` },
    { value: 'M', label: $localize`:@@maintenance.plans.form.months:Months` },
    { value: 'Y', label: $localize`:@@maintenance.plans.form.years:Years` },
  ];

  /**
   * Property kinds
   * @readonly
   *
   * @description
   * Separate control and maintenance choices.
   *
   * @access protected
   * @since unreleased
   *
   * @type {readonly { value: string; label: string }[]}
   */
  protected readonly kinds: readonly { value: string; label: string }[] = [
    { value: 'control', label: $localize`:@@maintenance.plans.control:Control` },
    { value: 'maintenance', label: $localize`:@@maintenance.plans.maintenance:Maintenance` },
  ];

  /**
   * Property serverMessage
   * @readonly
   *
   * @description
   * Inline recoverable write error.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<string | null>}
   */
  protected readonly serverMessage: Signal<string | null> = computed(
    () =>
      this.serverError()?.message ??
      (this.serverError()
        ? $localize`:@@maintenance.plans.form.saveError:The plan could not be saved.`
        : null),
  );
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Keeps selected equipment labels across option pages.
   *
   * @access public
   * @since unreleased
   */
  public constructor() {
    effect(() => {
      const choices: readonly EquipmentOutput[] = this.equipment();
      this.labels.update((previous) => ({
        ...previous,
        ...Object.fromEntries(choices.map((item) => [item.id, buildEquipmentTitle(item)])),
      }));
    });
  }
  //#endregion

  //#region Methods
  /**
   * Property equipmentLabelOf
   * @readonly
   *
   * @description
   * Renders the selected server-authorized equipment label.
   *
   * @access protected
   * @since unreleased
   *
   * @type {(value: string) => string}
   */
  protected readonly equipmentLabelOf: (value: string) => string = (value) =>
    this.labels()[value] ?? value;

  /**
   * Property unitLabelOf
   * @readonly
   *
   * @description
   * Names the calendar unit on the select trigger.
   *
   * @access protected
   * @since unreleased
   *
   * @type {(value: string) => string}
   */
  protected readonly unitLabelOf: (value: string) => string = (value) =>
    this.units.find((option) => option.value === value)?.label ?? '';

  /**
   * Property kindLabelOf
   * @readonly
   *
   * @description
   * Names the operation kind on the select trigger.
   *
   * @access protected
   * @since unreleased
   *
   * @type {(value: string) => string}
   */
  protected readonly kindLabelOf: (value: string) => string = (value) =>
    this.kinds.find((option) => option.value === value)?.label ?? '';

  /**
   * Method submit
   * @method submit
   *
   * @description
   * Emits explicit configuration; calendar recurrence and activation belong to the server.
   *
   * @access protected
   * @since unreleased
   *
   * @param {Event} event - Native form submit.
   *
   * @returns {void} Emits only when fields are valid and no accepted write is pending.
   */
  protected submit(event: Event): void {
    event.preventDefault();
    this.planForm().markAsTouched();
    if (this.pending() || this.planForm().invalid()) return;
    const draft: MaintenancePlanDraft = this.model();
    if (
      !this.calendarLocked() &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(draft.anchorDate) ||
        (draft.firstDueDate && !/^\d{4}-\d{2}-\d{2}$/.test(draft.firstDueDate)))
    )
      return;
    this.submitted.emit({
      equipmentId: draft.equipmentId,
      name: draft.name.trim(),
      operationKind: draft.operationKind,
      interval: `P${draft.every}${draft.unit}`,
      anchorOn: draft.anchorDate,
      ...(draft.firstDueDate ? { nextDueOn: draft.firstDueDate } : {}),
    });
  }
  //#endregion
}
