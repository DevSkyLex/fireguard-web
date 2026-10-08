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
  disabled,
  form,
  FormField,
  FormRoot,
  maxLength,
  required,
  validate,
  type FieldTree,
} from '@angular/forms/signals';
import { DateTime } from 'luxon';
import type { StoreError } from '@core/request-state';
import type {
  CreateMaintenanceExpenseInput,
  MaintenanceCostItem,
} from '@features/organization/features/maintenance-costs/models';
import { isMaintenanceAmount } from '@features/organization/features/maintenance-costs/utils';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmSelectImports } from '@shared/ui/select';
import { HlmSpinner } from '@shared/ui/spinner';
import { HlmTextarea } from '@shared/ui/textarea';

/**
 * Interface ExpenseDraft
 * @interface ExpenseDraft
 *
 * @description
 * Text fields retain exact amounts; the actual date is entered in the organization timezone.
 */
interface ExpenseDraft {
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
   * Property description
   *
   * @description
   * Exact contract value for description.
   *
   * @type {string}
   */
  description: string;
  /**
   * Property incurredAt
   *
   * @description
   * Exact contract value for incurredAt.
   *
   * @type {string}
   */
  incurredAt: string;

  /**
   * Property offsetChoice
   *
   * @description
   * Explicit UTC offset distinguishing the two possible instants of a repeated local hour.
   *
   * @type {string}
   */
  offsetChoice: string;
}

/**
 * Class MaintenanceExpenseForm
 * @class MaintenanceExpenseForm
 *
 * @description
 * Emits a motivated append-only expense or signed correction, leaving replay identity to the owning
 * store/page.
 */
@Component({
  selector: 'app-maintenance-expense-form',
  templateUrl: './maintenance-expense-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    FormRoot,
    HlmButton,
    HlmInput,
    HlmSpinner,
    HlmTextarea,
    ...HlmFieldImports,
    ...HlmSelectImports,
  ],
})
export class MaintenanceExpenseForm {
  //#region Properties
  /**
   * Property scope
   * @readonly
   *
   * @description
   * Private organization and intervention context for this draft.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly scope: InputSignal<string> = input.required<string>();
  /**
   * Property timezone
   * @readonly
   *
   * @description
   * Organization timezone used to interpret the actual local expense timestamp.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly timezone: InputSignal<string> = input('UTC');
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
   * Property originalExpense
   * @readonly
   *
   * @description
   * Original immutable expense linked by a signed correcting declaration.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<MaintenanceCostItem | null>}
   */
  public readonly originalExpense: InputSignal<MaintenanceCostItem | null> =
    input<MaintenanceCostItem | null>(null);
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
   * @type {OutputEmitterRef<Omit<CreateMaintenanceExpenseInput, 'clientId'>>}
   */
  public readonly submitted: OutputEmitterRef<Omit<CreateMaintenanceExpenseInput, 'clientId'>> =
    output<Omit<CreateMaintenanceExpenseInput, 'clientId'>>();
  /**
   * Property cancelled
   * @readonly
   *
   * @description
   * Intent to dismiss the original expense adjustment.
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
   * Editable exact strings; blank forecasts remain explicitly unknown.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<ExpenseDraft>}
   */
  protected readonly draft: WritableSignal<ExpenseDraft> = signal<ExpenseDraft>({
    amount: '',
    description: '',
    incurredAt: '',
    offsetChoice: '',
  });

  /**
   * Property possibleTimes
   * @readonly
   *
   * @description
   * Keeps every possible instant in the organization timezone while rejecting normalized local
   * hours that never occurred.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<readonly DateTime[]>}
   */
  protected readonly possibleTimes: Signal<readonly DateTime[]> = computed(() => {
    const local: string = this.draft().incurredAt.replace(/\.0{1,3}$/, '');
    const date: DateTime = DateTime.fromISO(local, { zone: this.timezone() });
    const format: string = local.length === 16 ? "yyyy-MM-dd'T'HH:mm" : "yyyy-MM-dd'T'HH:mm:ss";
    return date.isValid &&
      /^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}(?::\d{2})?$/.test(local) &&
      date.toFormat(format) === local
      ? date.getPossibleOffsets()
      : [];
  });

  /**
   * Property resolvedTime
   * @readonly
   *
   * @description
   * Repeated local hours stay unresolved until their actual UTC offset is explicitly selected.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<DateTime | null>}
   */
  protected readonly resolvedTime: Signal<DateTime | null> = computed(() => {
    const times: readonly DateTime[] = this.possibleTimes();
    return times.length === 1
      ? (times[0] ?? null)
      : (times.find((date) => date.toFormat('ZZ') === this.draft().offsetChoice) ?? null);
  });
  /**
   * Property expenseForm
   * @readonly
   *
   * @description
   * Native Signal Form for a motivated expense or append-only correction.
   *
   * @access protected
   * @since unreleased
   *
   * @type {FieldTree<ExpenseDraft>}
   */
  protected readonly expenseForm: FieldTree<ExpenseDraft> = form(this.draft, (path) => {
    disabled(path, { when: () => this.pending() || this.locked() });
    required(path.amount, {
      message: $localize`:@@maintenanceCost.expense.amountRequired:Enter the exact expense amount.`,
    });
    validate(path.amount, ({ value }) =>
      isMaintenanceAmount(value(), !!this.originalExpense())
        ? null
        : {
            kind: 'amount',
            message: $localize`:@@maintenanceCost.expense.exactAmount:Enter an exact decimal with at most six decimal places. A negative correction requires its original expense.`,
          },
    );
    required(path.description, {
      message: $localize`:@@maintenanceCost.expense.reasonRequired:Describe the expense or explain its correction.`,
    });
    maxLength(path.description, 2000);
    validate(path.description, ({ value }) =>
      value().trim()
        ? null
        : {
            kind: 'required',
            message: $localize`:@@maintenanceCost.expense.reasonRequired:Describe the expense or explain its correction.`,
          },
    );
    required(path.incurredAt, {
      message: $localize`:@@maintenanceCost.expense.dateRequired:Enter the actual expense date and time.`,
    });
    validate(path.incurredAt, () => {
      const date: DateTime | null =
        this.resolvedTime() ??
        this.possibleTimes().find((candidate) => candidate <= DateTime.now()) ??
        null;
      return date !== null && date <= DateTime.now()
        ? null
        : {
            kind: 'date',
            message: $localize`:@@maintenanceCost.expense.actualDate:Enter a valid actual date that is not in the future.`,
          };
    });
    validate(path.offsetChoice, () =>
      this.possibleTimes().length <= 1 || this.resolvedTime() !== null
        ? null
        : {
            kind: 'offset',
            message: $localize`:@@maintenanceCost.expense.offsetRequired:This local hour occurs twice. Choose the UTC offset of the actual expense.`,
          },
    );
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
   * Property offsetTime
   *
   * @description
   * Local timestamp and timezone already considered; changing either clears the offset decision.
   *
   * @access private
   * @since unreleased
   *
   * @type {string}
   */
  private offsetTime: string = '';
  //#endregion

  //#region Constructor
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
      const scope = this.scope(),
        token = this.resetToken(),
        original = this.originalExpense(),
        timezone = this.timezone();
      const identity = `${scope}/${token}/${original?.sourceId ?? 'new'}`;
      if (identity === this.seededScope) return;
      this.seededScope = identity;
      untracked(() =>
        this.expenseForm().reset({
          amount: '',
          description: '',
          incurredAt: DateTime.now().setZone(timezone).toFormat("yyyy-MM-dd'T'HH:mm:ss"),
          offsetChoice: '',
        }),
      );
    });
    effect(() => {
      const identity: string = `${this.timezone()}/${this.draft().incurredAt}`;
      if (identity === this.offsetTime) return;
      this.offsetTime = identity;
      untracked(() => this.draft.update((draft) => ({ ...draft, offsetChoice: '' })));
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method submit
   * @method submit
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
    this.expenseForm().markAsTouched();
    if (this.expenseForm().invalid() || this.expenseForm().disabled()) return;
    const value = this.draft(),
      original = this.originalExpense();
    const incurredAt: string | null =
      this.resolvedTime()?.toUTC().toISO({ suppressMilliseconds: true }) ?? null;
    if (!incurredAt) return;
    this.submitted.emit({
      amount: value.amount.trim(),
      description: value.description.trim(),
      incurredAt,
      adjustmentOf: original?.sourceId ?? null,
      workItemId: original?.workItemId ?? null,
    });
  }
  //#endregion
}
