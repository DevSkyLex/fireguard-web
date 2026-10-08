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
  required,
  validate,
  type FieldTree,
} from '@angular/forms/signals';
import { DateTime } from 'luxon';
import type {
  MaintenanceReportGroupBy,
  MaintenanceReportQuery,
  MaintenanceReportScopeKind,
  MaintenanceReportScopeSelection,
} from '@features/organization/features/maintenance-costs/models';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmSpinner } from '@shared/ui/spinner';
import { HlmToggleGroupImports } from '@shared/ui/toggle-group';

/**
 * Interface ReportFilterDraft
 * @interface ReportFilterDraft
 *
 * @description
 * Editable civil dates and one allocation dimension; named identity selections belong to the page.
 */
interface ReportFilterDraft {
  /**
   * Property from
   *
   * @description
   * Inclusive first civil date without timezone conversion.
   *
   * @type {string}
   */
  from: string;

  /**
   * Property to
   *
   * @description
   * Inclusive last civil date without timezone conversion.
   *
   * @type {string}
   */
  to: string;

  /**
   * Property groupBy
   *
   * @description
   * Server-supported allocation dimension.
   *
   * @type {MaintenanceReportGroupBy}
   */
  groupBy: MaintenanceReportGroupBy;
}

/**
 * Class MaintenanceReportFilterForm
 * @class MaintenanceReportFilterForm
 *
 * @description
 * Emits a bounded economic query while retaining date edits across directory searches and ordinary
 * reads.
 */
@Component({
  selector: 'app-maintenance-report-filter-form',
  templateUrl: './maintenance-report-filter-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    FormRoot,
    HlmButton,
    HlmInput,
    HlmSpinner,
    ...HlmFieldImports,
    ...HlmToggleGroupImports,
  ],
})
export class MaintenanceReportFilterForm {
  //#region Properties
  /**
   * Property query
   * @readonly
   *
   * @description
   * Last requested query supplies the initial dates and current server page size.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<MaintenanceReportQuery>}
   */
  public readonly query: InputSignal<MaintenanceReportQuery> =
    input.required<MaintenanceReportQuery>();

  /**
   * Property selectedScope
   * @readonly
   *
   * @description
   * Named financial-directory identities selected by the page, excluding ordinary resource lookups.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<MaintenanceReportScopeSelection>}
   */
  public readonly selectedScope: InputSignal<MaintenanceReportScopeSelection> =
    input<MaintenanceReportScopeSelection>({});

  /**
   * Property scope
   * @readonly
   *
   * @description
   * Organization and authenticated-session identity; replacement clears the previous private draft.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly scope: InputSignal<string> = input.required<string>();

  /**
   * Property resetToken
   * @readonly
   *
   * @description
   * Explicit page intent to adopt the requested query without discarding drafts on ordinary reads.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<number>}
   */
  public readonly resetToken: InputSignal<number> = input(0);

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Prevents duplicate query intent while the owning page is reading.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input(false);

  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Validated inclusive query starts at page one and carries the current named scope identities.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<MaintenanceReportQuery>}
   */
  public readonly submitted: OutputEmitterRef<MaintenanceReportQuery> =
    output<MaintenanceReportQuery>();

  /**
   * Property scopeCleared
   * @readonly
   *
   * @description
   * Requests removal of one or all named scope selections while preserving date edits.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<MaintenanceReportScopeKind>}
   */
  public readonly scopeCleared: OutputEmitterRef<MaintenanceReportScopeKind> =
    output<MaintenanceReportScopeKind>();

  /**
   * Property hasScope
   * @readonly
   *
   * @description
   * Indicates whether there is an explicit named filter to clear.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly hasScope: Signal<boolean> = computed(() => {
    const selected = this.selectedScope();
    return !!(selected.site || selected.customer || selected.equipment);
  });

  /**
   * Property draft
   * @readonly
   *
   * @description
   * Local date and grouping edits, independent of directory selection and result pagination.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<ReportFilterDraft>}
   */
  protected readonly draft: WritableSignal<ReportFilterDraft> = signal<ReportFilterDraft>({
    from: '',
    to: '',
    groupBy: 'equipment',
  });

  /**
   * Property filtersForm
   * @readonly
   *
   * @description
   * Native Signal Form enforces real civil dates and an inclusive window of at most 366 days.
   *
   * @access protected
   * @since unreleased
   *
   * @type {FieldTree<ReportFilterDraft>}
   */
  protected readonly filtersForm: FieldTree<ReportFilterDraft> = form(this.draft, (path) => {
    disabled(path, { when: () => this.pending() });
    required(path.from, {
      message: $localize`:@@maintenanceCost.report.filters.fromRequired:Choose the first report date.`,
    });
    required(path.to, {
      message: $localize`:@@maintenanceCost.report.filters.toRequired:Choose the last report date.`,
    });
    validate(path.from, ({ value }) =>
      this.validDate(value()) ? null : { kind: 'date', message: this.dateError() },
    );
    validate(path.to, ({ value, valueOf }) => {
      if (!this.validDate(value())) return { kind: 'date', message: this.dateError() };
      const start = valueOf(path.from);
      if (!this.validDate(start)) return null;
      const days = DateTime.fromISO(value(), { zone: 'UTC' }).diff(
        DateTime.fromISO(start, { zone: 'UTC' }),
        'days',
      ).days;
      return days >= 0 && days <= 365
        ? null
        : {
            kind: 'window',
            message: $localize`:@@maintenanceCost.report.filters.window:Choose an ordered date window of at most 366 days, including both dates.`,
          };
    });
    validate(path.groupBy, ({ value }) =>
      ['equipment', 'site', 'customer'].includes(value())
        ? null
        : {
            kind: 'grouping',
            message: $localize`:@@maintenanceCost.report.filters.groupRequired:Choose equipment, site or customer grouping.`,
          },
    );
  });

  /**
   * Property seededScope
   *
   * @description
   * Last explicit reset identity, so ordinary query replies never overwrite local edits.
   *
   * @access private
   * @since unreleased
   *
   * @type {string}
   */
  private seededScope: string = '';
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Adopts initial or explicitly reset query dates at the owning private session boundary.
   *
   * @access public
   * @since unreleased
   */
  public constructor() {
    effect(() => {
      const identity = `${this.scope()}/${this.resetToken()}`;
      const query = this.query();
      if (identity === this.seededScope) return;
      this.seededScope = identity;
      untracked(() =>
        this.filtersForm().reset({ from: query.from, to: query.to, groupBy: query.groupBy }),
      );
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method submit
   * @method submit
   *
   * @description
   * Emits validated draft dates with named selected identities and the current page size.
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
    this.filtersForm().markAsTouched();
    if (this.filtersForm().invalid() || this.filtersForm().disabled()) return;
    const draft = this.draft(),
      selected = this.selectedScope();
    this.submitted.emit({
      ...draft,
      page: 1,
      itemsPerPage: this.query().itemsPerPage,
      ...(selected.site ? { siteId: selected.site.id } : {}),
      ...(selected.customer ? { customerId: selected.customer.id } : {}),
      ...(selected.equipment ? { equipmentId: selected.equipment.id } : {}),
    });
  }

  /**
   * Method validDate
   * @method validDate
   *
   * @description
   * Rejects invalid or normalized dates before comparing civil days without DST offsets.
   *
   * @access private
   * @since unreleased
   *
   * @param {string} value - Civil date text supplied by the native field.
   *
   * @returns {boolean} Whether the value is an exact valid YYYY-MM-DD date.
   */
  private validDate(value: string): boolean {
    return (
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      DateTime.fromISO(value, { zone: 'UTC' }).toISODate() === value
    );
  }

  /**
   * Method dateError
   * @method dateError
   *
   * @description
   * Supplies the shared localized civil-date validation message.
   *
   * @access private
   * @since unreleased
   *
   * @returns {string} Field validation message.
   */
  private dateError(): string {
    return $localize`:@@maintenanceCost.report.filters.date:Choose a valid calendar date.`;
  }
  //#endregion
}
