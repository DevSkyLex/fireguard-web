import { formatDate } from '@angular/common';
import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  LOCALE_ID,
  output,
  signal,
  viewChild,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type TemplateRef,
  type WritableSignal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCircleAlert,
  lucideCircleDot,
  lucideCircleDotDashed,
  lucideClipboardCheck,
  lucideGauge,
} from '@ng-icons/lucide';
import type { BrnOverlayState } from '@spartan-ng/brain/overlay';
import type {
  InspectionOutput,
  InspectionResult,
  InspectionStatus,
} from '@features/organization/features/inspections/models';
import type { InterventionTableSource } from '@features/organization/features/interventions/models';
import {
  resolveInterventionTag,
  type InterventionInspectionsTableQuery,
} from '@features/organization/features/interventions/models';
import {
  CollectionFilterBar,
  CollectionFilterSelect,
  CollectionFilterToggle,
  initialCollectionFilterBarVisibility,
  type CollectionFilterField,
  type CollectionFilterOption,
} from '@shared/collection-filters';
import { CollectionSurface } from '@shared/collection-surface';
import { CollectionSearchBox, CollectionToolbar } from '@shared/collection-toolbar';
import {
  DEFAULT_REGIONAL_FORMAT_SETTINGS,
  OrgDatePipe,
  type RegionalFormatSettings,
} from '@shared/regional-format';
import { ResourceIllustration } from '@shared/resource-illustration';
import { HlmAvatarImports } from '@shared/ui/avatar';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmTableImports } from '@shared/ui/table';
import { InterventionTableFeedback } from '../../components/intervention-table-feedback';
import { InterventionTag } from '../../components/intervention-tag';

/**
 * Type InspectionFilterKey
 * @type InspectionFilterKey
 *
 * @description
 * Filter keys owned by the linked-inspections table.
 *
 * @since 1.0.0
 */
type InspectionFilterKey = 'status' | 'result';

/** Every inspection workflow status the linked table can display and filter. */
const INSPECTION_STATUS_VALUES: readonly InspectionStatus[] = [
  'draft',
  'submitted',
  'closed',
  'cancelled',
];

/** Every inspection result the linked table can display and filter. */
const INSPECTION_RESULT_VALUES: readonly InspectionResult[] = ['pass', 'partial', 'fail'];

/** Localized workflow options projected into the shared filter bar. */
const INSPECTION_STATUS_OPTIONS: readonly CollectionFilterOption[] = INSPECTION_STATUS_VALUES.map(
  (value: InspectionStatus): CollectionFilterOption => ({
    value,
    label: resolveInterventionTag('inspectionStatus', value).label,
  }),
);

/** Localized result options projected into the shared filter bar. */
const INSPECTION_RESULT_OPTIONS: readonly CollectionFilterOption[] = INSPECTION_RESULT_VALUES.map(
  (value: InspectionResult): CollectionFilterOption => ({
    value,
    label: resolveInterventionTag('inspectionResult', value).label,
  }),
);

/**
 * Component InterventionInspectionsTable
 * @class InterventionInspectionsTable
 *
 * @description
 * The Inspections tab of the intervention detail page's "Linked" surface: a
 * read-only `hlmTable` of the inspections scoped to this intervention
 * through the backend's canonical `intervention` search filter, with a
 * "Show more" button appending further pages. It exposes local search and
 * field filters, but no row actions. A row's performed date links to the
 * inspection's own record, unless it is
 * still an intervention-scoped draft — those do not resolve on the
 * canonical route yet, so they render as plain text with an outline "Draft"
 * badge beside it (icon + label, never colour-only). The link's accessible
 * name folds in the result label since a bare date repeats across rows.
 *
 * @version 1.4.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-inspections-table',
  imports: [
    InterventionTableFeedback,
    NgIcon,
    ...HlmEmptyImports,
    NgTemplateOutlet,
    CollectionSurface,
    ResourceIllustration,
    OrgDatePipe,
    RouterLink,
    HlmBadge,
    HlmButton,
    InterventionTag,
    ...HlmAvatarImports,
    ...HlmTableImports,
    CollectionFilterBar,
    CollectionFilterSelect,
    CollectionFilterToggle,
    CollectionSearchBox,
    CollectionToolbar,
  ],
  providers: [
    provideIcons({
      lucideCircleAlert,
      lucideCircleDot,
      lucideCircleDotDashed,
      lucideClipboardCheck,
      lucideGauge,
    }),
  ],
  templateUrl: './intervention-inspections-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionInspectionsTable {
  /**
   * Property source
   * @readonly
   *
   * @description
   * Explicit result provenance supplied by the page.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<InterventionTableSource>}
   */
  public readonly source: InputSignal<InterventionTableSource> =
    input<InterventionTableSource>('api');
  /**
   * Property hasLoaded
   * @readonly
   *
   * @description
   * Whether the page has a completed result, even if it is empty.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly hasLoaded: InputSignal<boolean> = input(false);
  /**
   * Property retryRequested
   * @readonly
   *
   * @description
   * Retries the same query or failed page without changing criteria.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly retryRequested: OutputEmitterRef<void> = output<void>();
  //#region Inputs
  /**
   * Property organizationId
   * @readonly
   * @description The workspace owning the intervention, so a row can link into its inspection's own record.
   * @access public
   * @since 1.3.0
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /**
   * Property items
   * @readonly
   * @description The inspections linked to this intervention.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly InspectionOutput[]>}
   */
  public readonly items: InputSignal<readonly InspectionOutput[]> =
    input.required<readonly InspectionOutput[]>();

  /**
   * Property loading
   * @readonly
   * @description Whether the tab's own fetch is in flight.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property error
   * @readonly
   * @description The tab's own fetch error, or `null`.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | null>}
   */
  public readonly error: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property totalItems
   * @readonly
   * @description Total linked inspections the server reports, across all pages.
   * @access public
   * @since 1.2.0
   * @type {InputSignal<number>}
   */
  public readonly totalItems: InputSignal<number> = input<number>(0);

  /**
   * Property loadingMore
   * @readonly
   * @description Whether the next page of linked inspections is being fetched.
   * @access public
   * @since 1.2.0
   * @type {InputSignal<boolean>}
   */
  public readonly loadingMore: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property regionalFormatting
   * @readonly
   * @description The active organization's date pattern and timezone, bound by the page. The default keeps the component renderable with no context wired.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<RegionalFormatSettings>}
   */
  public readonly regionalFormatting: InputSignal<RegionalFormatSettings> =
    input<RegionalFormatSettings>(DEFAULT_REGIONAL_FORMAT_SETTINGS);
  /**
   * Property serverFiltering
   * @readonly
   *
   * @description
   * Whether search and filters are evaluated by the host API query.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly serverFiltering: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property loadMoreRequested
   * @readonly
   * @description Emits when the user asks for the next page of linked inspections.
   * @access public
   * @since 1.2.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly loadMoreRequested: OutputEmitterRef<void> = output<void>();
  /**
   * Property queryChanged
   * @readonly
   *
   * @description
   * Emits the complete query that the host must evaluate through the API.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<InterventionInspectionsTableQuery>}
   */
  public readonly queryChanged: OutputEmitterRef<InterventionInspectionsTableQuery> =
    output<InterventionInspectionsTableQuery>();

  /**
   * Property query
   * @readonly
   * @description Controlled search and filter criteria retained by the owning page store.
   * @access public
   * @since 6.2.0
   * @type {InputSignal<InterventionInspectionsTableQuery>}
   */
  public readonly query: InputSignal<InterventionInspectionsTableQuery> =
    input<InterventionInspectionsTableQuery>({ search: '', status: null, result: null });
  //#endregion

  //#region Properties
  /**
   * Property searchTerm
   * @readonly
   *
   * @description
   * The local text query applied to the loaded inspection rows.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly searchTerm: Signal<string> = computed(() => this.query().search);

  /**
   * Property statusFilter
   * @readonly
   *
   * @description
   * The selected inspection workflow status, or null when the field is not active.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<InspectionStatus | null>}
   */
  protected readonly statusFilter: Signal<InspectionStatus | null> = computed(
    () => this.query().status,
  );

  /**
   * Property resultFilter
   * @readonly
   *
   * @description
   * The selected inspection result, or null when the field is not active.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<InspectionResult | null>}
   */
  protected readonly resultFilter: Signal<InspectionResult | null> = computed(
    () => this.query().result,
  );

  /**
   * Property hasActiveQuery
   * @readonly
   *
   * @description
   * Whether the current query or field selections narrow the loaded rows.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly hasActiveQuery: Signal<boolean> = computed<boolean>(
    () => this.searchTerm().trim().length > 0 || this.activeFilterKeys().length > 0,
  );

  /**
   * Property filterFields
   * @readonly
   *
   * @description
   * Filter fields offered by the linked-inspections table.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly CollectionFilterField[]}
   */
  protected readonly filterFields: readonly CollectionFilterField[] = [
    {
      key: 'status',
      fieldLabel: $localize`:@@intervention.linked.inspections.filterStatus:Status`,
      icon: 'lucideCircleDot',
      operators: ['equals'],
    },
    {
      key: 'result',
      fieldLabel: $localize`:@@intervention.linked.inspections.filterResult:Result`,
      icon: 'lucideGauge',
      operators: ['equals'],
    },
  ];

  /**
   * Property statusOptions
   * @readonly
   *
   * @description
   * Workflow choices offered by the linked-inspections filter.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly CollectionFilterOption[]}
   */
  protected readonly statusOptions: readonly CollectionFilterOption[] = INSPECTION_STATUS_OPTIONS;

  /**
   * Property resultOptions
   * @readonly
   *
   * @description
   * Result choices offered by the linked-inspections filter.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly CollectionFilterOption[]}
   */
  protected readonly resultOptions: readonly CollectionFilterOption[] = INSPECTION_RESULT_OPTIONS;

  /**
   * Property activeFilterKeys
   * @readonly
   *
   * @description
   * Which filter fields currently carry a value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly InspectionFilterKey[]>}
   */
  protected readonly activeFilterKeys: Signal<readonly InspectionFilterKey[]> = computed<
    readonly InspectionFilterKey[]
  >(() => [
    ...(this.statusFilter() === null ? [] : (['status'] as const)),
    ...(this.resultFilter() === null ? [] : (['result'] as const)),
  ]);

  /**
   * Property filtersVisible
   * @readonly
   *
   * @description
   * Whether the shared filter bar is currently mounted below the table toolbar.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly filtersVisible: WritableSignal<boolean> = initialCollectionFilterBarVisibility(
    computed<boolean>(() => this.activeFilterKeys().length > 0),
  );

  /**
   * Property statusFilterTemplate
   * @readonly
   *
   * @description
   * The status value control projected into the shared filter bar.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<TemplateRef<unknown> | undefined>}
   */
  private readonly statusFilterTemplate: Signal<TemplateRef<unknown> | undefined> =
    viewChild<TemplateRef<unknown>>('statusFilterControl');

  /**
   * Property resultFilterTemplate
   * @readonly
   *
   * @description
   * The result value control projected into the shared filter bar.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<TemplateRef<unknown> | undefined>}
   */
  private readonly resultFilterTemplate: Signal<TemplateRef<unknown> | undefined> =
    viewChild<TemplateRef<unknown>>('resultFilterControl');

  /**
   * Property filterTemplates
   * @readonly
   *
   * @description
   * Value-control templates keyed for `CollectionFilterBar`.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal< Readonly<Record<string, TemplateRef<unknown> | undefined>> >}
   */
  protected readonly filterTemplates: Signal<
    Readonly<Record<string, TemplateRef<unknown> | undefined>>
  > = computed(() => ({
    status: this.statusFilterTemplate(),
    result: this.resultFilterTemplate(),
  }));

  /**
   * Property openFilterKey
   * @readonly
   *
   * @description
   * The field whose value control should open after a first pick.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<InspectionFilterKey | null>}
   */
  protected readonly openFilterKey: WritableSignal<InspectionFilterKey | null> =
    signal<InspectionFilterKey | null>(null);

  /**
   * Property filteredItems
   * @readonly
   *
   * @description
   * The visible linked inspections after applying the local query and fields.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly InspectionOutput[]>}
   */
  protected readonly filteredItems: Signal<readonly InspectionOutput[]> = computed<
    readonly InspectionOutput[]
  >(() => {
    if (this.serverFiltering()) return this.items();
    const query: string = this.searchTerm().trim().toLowerCase();
    const status: InspectionStatus | null = this.statusFilter();
    const result: InspectionResult | null = this.resultFilter();

    return this.items().filter((item: InspectionOutput): boolean => {
      if (status !== null && item.status !== status) return false;
      if (result !== null && item.result !== result) return false;
      if (query.length === 0) return true;

      return this.searchableTextOf(item).includes(query);
    });
  });

  /**
   * Property skeletonColumnWidths
   * @readonly
   * @description One literal width or alignment class per rendered column, handed to the shared skeleton rows.
   * @access protected
   * @since 2.0.0
   * @type {readonly string[]}
   */
  protected readonly skeletonColumnWidths: readonly string[] = ['w-24', 'w-20', 'w-20', 'w-32'];

  /**
   * Property locale
   * @readonly
   *
   * @description
   * The active locale, for formatting the link accessible name's date.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {string}
   */
  private readonly locale: string = inject(LOCALE_ID);
  //#endregion

  //#region Methods
  /**
   * Method inspectorInitialsOf
   * @description Avatar fallback initials derived from the inspector's display name.
   * @access protected
   * @since 1.0.0
   * @param {InspectionOutput} item - The inspection being rendered.
   * @returns {string} Up to two uppercase initials, or an empty string when there is no inspector.
   */
  protected inspectorInitialsOf(item: InspectionOutput): string {
    const name: string | undefined = item.inspector?.displayName;
    if (!name) return '';

    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part: string): string => part.charAt(0).toUpperCase())
      .join('');
  }

  /**
   * Method isDraftRecord
   *
   * @description
   * Whether the row is an intervention-scoped draft, which does not resolve
   * on the canonical `/inspections/:id` route — such a row renders as plain
   * text instead of a broken link.
   *
   * @access protected
   * @since 1.3.0
   *
   * @param {InspectionOutput} item - The inspection being rendered.
   *
   * @returns {boolean} `true` while the record is still a draft.
   */
  protected isDraftRecord(item: InspectionOutput): boolean {
    return item.recordStatus === 'draft';
  }

  /**
   * Method searchableTextOf
   * @description Builds the visible inspection fields an operator can search.
   * @access protected
   * @since 6.2.0
   * @param {InspectionOutput} item - The inspection being indexed.
   * @returns {string} Normalized searchable row text.
   */
  protected searchableTextOf(item: InspectionOutput): string {
    return [
      formatDate(item.performedAt, 'mediumDate', this.locale),
      item.performedAt,
      item.result,
      resolveInterventionTag('inspectionResult', item.result).label,
      item.status,
      resolveInterventionTag('inspectionStatus', item.status).label,
      item.inspector?.displayName,
      item.notes,
      item.id,
    ]
      .filter((value): value is string => !!value)
      .join(' ')
      .toLowerCase();
  }

  /**
   * Method onSearchQueryChanged
   * @description Keeps the table-local search in sync with the shared search box.
   * @access protected
   * @since 6.2.0
   * @param {string} query - The text entered by the operator.
   * @returns {void}
   */
  protected onSearchQueryChanged(query: string): void {
    this.emitQuery({ search: query });
  }

  /**
   * Method toggleFiltersVisible
   * @description Reacts to the shared filter toggle's requested visibility.
   * @access protected
   * @since 6.2.0
   * @param {boolean} visible - Whether the filter bar should be mounted.
   * @returns {void}
   */
  protected toggleFiltersVisible(visible: boolean): void {
    this.filtersVisible.set(visible);
  }

  /**
   * Method onFieldPicked
   * @method onFieldPicked
   *
   * @description
   * Opens the value control for a field picked from the shared filter menu.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} key - The filter field key.
   * @returns {void} No value is returned.
   */
  protected onFieldPicked(key: string): void {
    if (key === 'status' || key === 'result') this.openFilterKey.set(key);
  }

  /**
   * Method onFieldRemoved
   * @method onFieldRemoved
   *
   * @description
   * Removes the selected value for a field removed from the shared filter bar.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} key - The filter field key.
   * @returns {void} No value is returned.
   */
  protected onFieldRemoved(key: string): void {
    if (key !== 'status' && key !== 'result') return;
    this.openFilterKey.set(null);
    this.emitQuery({ [key]: null });
  }

  /**
   * Method clearFilters
   * @method clearFilters
   *
   * @description
   * Clears all linked-inspection field selections.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void} No value is returned.
   */
  protected clearFilters(): void {
    this.openFilterKey.set(null);
    this.emitQuery({ status: null, result: null });
  }

  /**
   * Method onStatusFilterChanged
   * @method onStatusFilterChanged
   *
   * @description
   * Applies the selected inspection status, or removes the field when cleared.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string | null} value - The selected filter value, or `null` when cleared.
   * @returns {void} No value is returned.
   */
  protected onStatusFilterChanged(value: string | null): void {
    const selected =
      INSPECTION_STATUS_VALUES.find(
        (candidate: InspectionStatus): boolean => candidate === value,
      ) ?? null;
    this.openFilterKey.set(null);
    this.emitQuery({ status: selected });
  }

  /**
   * Method onResultFilterChanged
   * @method onResultFilterChanged
   *
   * @description
   * Applies the selected inspection result, or removes the field when cleared.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string | null} value - The selected filter value, or `null` when cleared.
   * @returns {void} No value is returned.
   */
  protected onResultFilterChanged(value: string | null): void {
    const selected =
      INSPECTION_RESULT_VALUES.find(
        (candidate: InspectionResult): boolean => candidate === value,
      ) ?? null;
    this.openFilterKey.set(null);
    this.emitQuery({ result: selected });
  }

  /**
   * Method emitQuery
   * @method emitQuery
   *
   * @description
   * Emits the complete server query after an explicit search or filter interaction.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {Partial<InterventionInspectionsTableQuery>} overrides - Criteria to merge into the current table query.
   * @returns {void} No value is returned.
   */
  private emitQuery(overrides: Partial<InterventionInspectionsTableQuery> = {}): void {
    this.queryChanged.emit({ ...this.query(), ...overrides });
  }

  /**
   * Method fieldPopoverState
   * @method fieldPopoverState
   *
   * @description
   * Returns the overlay state for one shared filter value control.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InspectionFilterKey} key - The filter field key.
   * @returns {BrnOverlayState} The current overlay state for the filter.
   */
  protected fieldPopoverState(key: InspectionFilterKey): BrnOverlayState {
    return this.openFilterKey() === key ? 'open' : 'closed';
  }

  /**
   * Method onFilterPopoverStateChanged
   * @method onFilterPopoverStateChanged
   *
   * @description
   * Keeps the shared bar's pending-field memory aligned with its value control.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InspectionFilterKey} key - The filter field key.
   * @param {BrnOverlayState} state - The filter popover's next state.
   * @returns {void} No value is returned.
   */
  protected onFilterPopoverStateChanged(key: InspectionFilterKey, state: BrnOverlayState): void {
    if (state === 'open') {
      this.openFilterKey.set(key);
      return;
    }

    if (this.openFilterKey() === key) this.openFilterKey.set(null);
  }

  /**
   * Method linkAriaLabelOf
   *
   * @description
   * The row's link accessible name: the visible text is a bare date, which
   * repeats across same-day rows and says nothing standalone in a
   * screen-reader link list — so the name folds in "Inspection" and the
   * result label alongside the localized date.
   *
   * @access protected
   * @since 1.4.0
   *
   * @param {InspectionOutput} item - The inspection being rendered.
   *
   * @returns {string} The accessible name.
   */
  protected linkAriaLabelOf(item: InspectionOutput): string {
    const performed: string = formatDate(item.performedAt, 'mediumDate', this.locale);
    const result: string = resolveInterventionTag('inspectionResult', item.result).label;

    return $localize`:@@intervention.linked.inspections.linkAriaLabel:Inspection performed ${performed}:performed:, ${result}:result:`;
  }
  //#endregion
}
