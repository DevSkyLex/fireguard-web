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
  FormRoot,
  maxLength,
  required,
  validate,
  type FieldTree,
} from '@angular/forms/signals';
import type { StoreError } from '@core/request-state';
import type {
  MaintenanceCostOutput,
  WriteMaintenanceCostPlanningInput,
} from '@features/organization/features/maintenance-costs/models';
import { isMaintenanceAmount } from '@features/organization/features/maintenance-costs/utils';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmSelectImports } from '@shared/ui/select';
import { HlmSpinner } from '@shared/ui/spinner';

/**
 * Interface PlanningResourceDraft
 * @interface PlanningResourceDraft
 *
 * @description
 * Editable text retains exact decimal precision and existing task associations.
 */
interface PlanningResourceDraft {
  /**
   * Property kind
   *
   * @description
   * Exact contract value for kind.
   *
   * @type {'time' | 'material' | 'external'}
   */
  kind: 'time' | 'material' | 'external';
  /**
   * Property description
   *
   * @description
   * Exact contract value for description.
   *
   * @type {string}
   */
  description: string;
  /**
   * Property quantity
   *
   * @description
   * Exact contract value for quantity.
   *
   * @type {string}
   */
  quantity: string;
  /**
   * Property unitCost
   *
   * @description
   * Exact contract value for unitCost.
   *
   * @type {string}
   */
  unitCost: string;
  /**
   * Property estimatedMinutes
   *
   * @description
   * Exact contract value for estimatedMinutes.
   *
   * @type {string}
   */
  estimatedMinutes: string;
  /**
   * Property amount
   *
   * @description
   * Exact contract value for amount.
   *
   * @type {string}
   */
  amount: string;
  /**
   * Property workItemId
   *
   * @description
   * Exact contract value for workItemId.
   *
   * @type {string | null}
   */
  workItemId: string | null;
}
/**
 * Interface PlanningDraft
 * @interface PlanningDraft
 *
 * @description
 * Draft values use blank strings for an explicit unknown forecast.
 */
interface PlanningDraft {
  /**
   * Property plannedBudget
   *
   * @description
   * Exact contract value for plannedBudget.
   *
   * @type {string}
   */
  plannedBudget: string;
  /**
   * Property estimatedMinutes
   *
   * @description
   * Exact contract value for estimatedMinutes.
   *
   * @type {string}
   */
  estimatedMinutes: string;
  /**
   * Property resources
   *
   * @description
   * Exact contract value for resources.
   *
   * @type {PlanningResourceDraft[]}
   */
  resources: PlanningResourceDraft[];
}
/**
 * Interface MaintenancePlanningIntent
 * @interface MaintenancePlanningIntent
 *
 * @description
 * Explicit independent revision accompanies the user's financial preparation.
 */
export interface MaintenancePlanningIntent {
  /**
   * Property revision
   * @readonly
   *
   * @description
   * Exact contract value for revision.
   *
   * @type {number}
   */
  readonly revision: number;
  /**
   * Property input
   * @readonly
   *
   * @description
   * Exact contract value for input.
   *
   * @type {WriteMaintenanceCostPlanningInput}
   */
  readonly input: WriteMaintenanceCostPlanningInput;
}

/**
 * Class MaintenancePlanningForm
 *
 * @description
 * Native financial preparation preserves local edits across refreshes and requires explicit
 * adoption of a changed revision.
 */
@Component({
  selector: 'app-maintenance-planning-form',
  templateUrl: './maintenance-planning-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    FormRoot,
    HlmButton,
    HlmInput,
    HlmSpinner,
    ...HlmFieldImports,
    ...HlmSelectImports,
    ...HlmAlertImports,
  ],
})
export class MaintenancePlanningForm {
  /**
   * Property kindLabelOf
   * @readonly
   *
   * @description
   * Supplies localized resource labels to the native select value and its accessible trigger.
   *
   * @access protected
   * @since unreleased
   *
   * @type {(value: unknown) => string}
   */
  protected readonly kindLabelOf: (value: unknown) => string = (value) => {
    switch (value) {
      case 'time':
        return $localize`:@@maintenanceCost.kind.time:Work time`;
      case 'external':
        return $localize`:@@maintenanceCost.kind.external:External service`;
      default:
        return $localize`:@@maintenanceCost.kind.material:Materials`;
    }
  };

  /**
   * Property cost
   * @readonly
   *
   * @description
   * Dedicated private financial dossier, including the separate closure snapshot.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<MaintenanceCostOutput>}
   */
  public readonly cost: InputSignal<MaintenanceCostOutput> =
    input.required<MaintenanceCostOutput>();
  /**
   * Property pending
   * @readonly
   *
   * @description
   * An accepted write is awaiting acknowledgement.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input(false);
  /**
   * Property locked
   * @readonly
   *
   * @description
   * The owning permission, connectivity or replay state prevents editing.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly locked: InputSignal<boolean> = input(false);
  /**
   * Property error
   * @readonly
   *
   * @description
   * Latest financial error, retained alongside the unchanged local draft.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<StoreError | null>}
   */
  public readonly error: InputSignal<StoreError | null> = input<StoreError | null>(null);
  /**
   * Property resetToken
   * @readonly
   *
   * @description
   * Changes only after confirmed save or replacement of the private session context.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<number>}
   */
  public readonly resetToken: InputSignal<number> = input(0);
  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Validated exact declaration for the owning page to save.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<MaintenancePlanningIntent>}
   */
  public readonly submitted: OutputEmitterRef<MaintenancePlanningIntent> =
    output<MaintenancePlanningIntent>();
  /**
   * Property sourceRevision
   * @readonly
   *
   * @description
   * Independent preparation revision associated with the local edits, including initial zero.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<number>}
   */
  protected readonly sourceRevision: WritableSignal<number> = signal(0);
  /**
   * Property draft
   * @readonly
   *
   * @description
   * Editable exact strings; blank forecasts remain explicitly unknown.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<PlanningDraft>}
   */
  protected readonly draft: WritableSignal<PlanningDraft> = signal<PlanningDraft>({
    plannedBudget: '',
    estimatedMinutes: '',
    resources: [],
  });
  /**
   * Property stale
   * @readonly
   *
   * @description
   * Whether a freshly read preparation revision requires explicit user adoption.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly stale: Signal<boolean> = computed(
    () => this.cost().planningRevision !== this.sourceRevision(),
  );
  /**
   * Property planningForm
   * @readonly
   *
   * @description
   * Native Signal Form with validation and kind-specific resource fields.
   *
   * @access protected
   * @since unreleased
   *
   * @type {FieldTree<PlanningDraft>}
   */
  protected readonly planningForm: FieldTree<PlanningDraft> = form(this.draft, (path) => {
    disabled(path, {
      when: () => this.pending() || this.locked() || !this.cost().planningEditable,
    });
    validate(path.plannedBudget, ({ value }) =>
      !value().trim() || isMaintenanceAmount(value()) ? null : this.amountError(),
    );
    validate(path.estimatedMinutes, ({ value }) =>
      this.validMinutes(value()) ? null : this.minutesError(),
    );
    applyEach(path.resources, (row) => {
      disabled(row.quantity, { when: ({ valueOf }) => valueOf(row.kind) !== 'material' });
      disabled(row.unitCost, { when: ({ valueOf }) => valueOf(row.kind) === 'external' });
      disabled(row.estimatedMinutes, { when: ({ valueOf }) => valueOf(row.kind) !== 'time' });
      disabled(row.amount, { when: ({ valueOf }) => valueOf(row.kind) !== 'external' });
      required(row.description, {
        message: $localize`:@@maintenanceCost.planning.descriptionRequired:Describe this estimated resource.`,
      });
      maxLength(row.description, 1000);
      validate(row.description, ({ value }) =>
        value().trim()
          ? null
          : {
              kind: 'required',
              message: $localize`:@@maintenanceCost.planning.descriptionRequired:Describe this estimated resource.`,
            },
      );
      validate(row.quantity, ({ value }) =>
        !value().trim() || isMaintenanceAmount(value()) ? null : this.amountError(),
      );
      validate(row.unitCost, ({ value }) =>
        !value().trim() || isMaintenanceAmount(value()) ? null : this.amountError(),
      );
      validate(row.amount, ({ value }) =>
        !value().trim() || isMaintenanceAmount(value()) ? null : this.amountError(),
      );
      validate(row.estimatedMinutes, ({ value }) =>
        this.validMinutes(value()) ? null : this.minutesError(),
      );
    });
  });
  /**
   * Property seededScope
   *
   * @description
   * Last draft initialization identity, preserving edits across ordinary reads and errors.
   *
   * @access private
   * @since unreleased
   *
   * @type {string}
   */
  private seededScope: string = '';
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Connects native draft initialization and private financial session transitions.
   *
   * @access public
   * @since unreleased
   */
  public constructor() {
    effect(() => {
      const cost = this.cost(),
        token = this.resetToken();
      const scope = `${cost.organizationId}/${cost.interventionId}/${token}`;
      if (scope === this.seededScope) return;
      this.seededScope = scope;
      untracked(() => {
        this.sourceRevision.set(cost.planningRevision);
        this.planningForm().reset({
          plannedBudget: cost.plannedBudget ?? '',
          estimatedMinutes: cost.estimatedMinutes?.toString() ?? '',
          resources: cost.resources.map((resource) => ({
            kind: resource.kind,
            description: resource.description,
            quantity: resource.quantity ?? '',
            unitCost: resource.unitCost ?? '',
            amount: resource.amount ?? '',
            estimatedMinutes: resource.estimatedMinutes?.toString() ?? '',
            workItemId: resource.workItemId ?? null,
          })),
        });
      });
    });
  }
  /**
   * Method addResource
   *
   * @description
   * Adds a blank material estimate while preserving existing resource/task associations.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} No return value.
   */
  protected addResource(): void {
    if (this.planningForm().disabled() || this.draft().resources.length >= 1000) return;
    this.draft.update((value) => ({
      ...value,
      resources: [
        ...value.resources,
        {
          kind: 'material',
          description: '',
          quantity: '',
          unitCost: '',
          estimatedMinutes: '',
          amount: '',
          workItemId: null,
        },
      ],
    }));
    this.planningForm().markAsDirty();
  }
  /**
   * Method removeResource
   *
   * @description
   * Removes the selected forecast row before any financial fact is recorded.
   *
   * @access protected
   * @since unreleased
   *
   * @param {number} index - Resource row position.
   *
   * @returns {void} No return value.
   */
  protected removeResource(index: number): void {
    if (this.planningForm().disabled()) return;
    this.draft.update((value) => ({
      ...value,
      resources: value.resources.filter((_, position) => position !== index),
    }));
    this.planningForm().markAsDirty();
  }
  /**
   * Method acceptRevision
   *
   * @description
   * Explicitly adopts the refreshed preparation revision while preserving the local values.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} No return value.
   */
  protected acceptRevision(): void {
    if (!this.planningForm().disabled()) this.sourceRevision.set(this.cost().planningRevision);
  }
  /**
   * Method submit
   *
   * @description
   * Validates the native form and emits exact strings with only the applicable resource tuple.
   *
   * @access protected
   * @since unreleased
   *
   * @param {Event} event - Native form submission event.
   *
   * @returns {void} No return value.
   */
  protected submit(event: Event): void {
    event.preventDefault();
    this.planningForm().markAsTouched();
    if (this.planningForm().invalid() || this.planningForm().disabled() || this.stale()) return;
    const value = this.draft();
    this.submitted.emit({
      revision: this.sourceRevision(),
      input: {
        plannedBudget: value.plannedBudget.trim() || null,
        estimatedMinutes: value.estimatedMinutes.trim() ? Number(value.estimatedMinutes) : null,
        resources: value.resources.map((resource) => ({
          kind: resource.kind,
          description: resource.description.trim(),
          workItemId: resource.workItemId,
          quantity: resource.kind === 'material' ? resource.quantity.trim() || null : null,
          unitCost: resource.kind !== 'external' ? resource.unitCost.trim() || null : null,
          estimatedMinutes:
            resource.kind === 'time' && resource.estimatedMinutes.trim()
              ? Number(resource.estimatedMinutes)
              : null,
          amount: resource.kind === 'external' ? resource.amount.trim() || null : null,
        })),
      },
    });
  }
  /**
   * Method validMinutes
   *
   * @description
   * Validates an optional bounded integral effort estimate independently of monetary strings.
   *
   * @access private
   * @since unreleased
   *
   * @param {string} value - Exact field text to validate.
   *
   * @returns {boolean} Validated financial contract result.
   */
  private validMinutes(value: string): boolean {
    return !value.trim() || (/^\d{1,9}$/.test(value.trim()) && Number(value) <= 100000000);
  }
  /**
   * Method amountError
   *
   * @description
   * Localized message for an invalid nonnegative exact decimal forecast.
   *
   * @access private
   * @since unreleased
   *
   * @returns {{ kind: string; message: string }} Validated financial contract result.
   */
  private amountError(): { kind: string; message: string } {
    return {
      kind: 'amount',
      message: $localize`:@@maintenanceCost.form.exactAmount:Enter a non-negative decimal with at most six decimal places.`,
    };
  }
  /**
   * Method minutesError
   *
   * @description
   * Localized message for an invalid bounded whole-minute forecast.
   *
   * @access private
   * @since unreleased
   *
   * @returns {{ kind: string; message: string }} Validated financial contract result.
   */
  private minutesError(): { kind: string; message: string } {
    return {
      kind: 'minutes',
      message: $localize`:@@maintenanceCost.form.minutes:Enter whole minutes between zero and 100000000.`,
    };
  }
}
