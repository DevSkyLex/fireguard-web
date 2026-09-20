import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
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
import { lucideCircleAlert, lucideCircleDotDashed, lucideMapPin } from '@ng-icons/lucide';
import type { BrnOverlayState } from '@spartan-ng/brain/overlay';
import type {
  FacilityOutput,
  FacilityStatus,
  FacilityType,
} from '@features/organization/features/facilities/models';
import type { InterventionTableSource } from '@features/organization/features/interventions/models';
import {
  resolveInterventionTag,
  type InterventionFacilitiesTableQuery,
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
import { ResourceIllustration } from '@shared/resource-illustration';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmTableImports } from '@shared/ui/table';
import { InterventionTableFeedback } from '../../components/intervention-table-feedback';
import { InterventionTag } from '../../components/intervention-tag';

/** Placeholder rows drawn while the tab's own fetch is in flight. */
/**
 * The localized label for each facility type, resolved through a component
 * method rather than a template branch — a plain taxonomy, not a severity
 * status, so it renders as an outline badge with no tag-registry entry, the
 * same treatment `InterventionWorkItemTable` gives a work item's `source`.
 */
const FACILITY_TYPE_LABEL: Readonly<Record<FacilityType, string>> = {
  site: $localize`:@@facilityType.site:Site`,
  building: $localize`:@@facilityType.building:Building`,
  floor: $localize`:@@facilityType.floor:Floor`,
  zone: $localize`:@@facilityType.zone:Zone`,
  area: $localize`:@@facilityType.area:Area`,
};

/**
 * Type FacilityFilterKey
 * @type FacilityFilterKey
 *
 * @description
 * Filter keys owned by the linked-facilities table.
 *
 * @since 1.0.0
 */
type FacilityFilterKey = 'type' | 'status';

/** Every facility type the linked table can display and filter. */
const FACILITY_TYPE_VALUES: readonly FacilityType[] = ['site', 'building', 'floor', 'zone', 'area'];

/** Every facility lifecycle state the linked table can display and filter. */
const FACILITY_STATUS_VALUES: readonly FacilityStatus[] = ['active', 'archived'];

/** Localized type options projected into the shared filter bar. */
const FACILITY_TYPE_OPTIONS: readonly CollectionFilterOption[] = FACILITY_TYPE_VALUES.map(
  (value: FacilityType): CollectionFilterOption => ({
    value,
    label: FACILITY_TYPE_LABEL[value],
  }),
);

/** Localized status options projected into the shared filter bar. */
const FACILITY_STATUS_OPTIONS: readonly CollectionFilterOption[] = FACILITY_STATUS_VALUES.map(
  (value: FacilityStatus): CollectionFilterOption => ({
    value,
    label: resolveInterventionTag('facilityStatus', value).label,
  }),
);

/**
 * Component InterventionFacilitiesTable
 * @class InterventionFacilitiesTable
 *
 * @description
 * The Facilities tab of the intervention detail page's "Linked" surface: a
 * read-only `hlmTable` of the facilities scoped to this intervention through
 * the backend's canonical `intervention` search filter, with a "Show more"
 * button appending further pages. It exposes local search and field filters,
 * but no row actions — the linked set is a lookup, not a management surface (that stays in the facilities
 * feature's own upcoming pages). A row's name links to the facility's own
 * record, unless it is still an intervention-scoped draft — those do not
 * resolve on the canonical route yet, so they render as plain text with an
 * outline "Draft" badge beside it (icon + label, never colour-only).
 *
 * @version 1.4.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-facilities-table',
  imports: [
    InterventionTableFeedback,
    NgIcon,
    ...HlmEmptyImports,
    NgTemplateOutlet,
    CollectionSurface,
    ResourceIllustration,
    RouterLink,
    HlmBadge,
    HlmButton,
    InterventionTag,
    ...HlmTableImports,
    CollectionFilterBar,
    CollectionFilterSelect,
    CollectionFilterToggle,
    CollectionSearchBox,
    CollectionToolbar,
  ],
  providers: [provideIcons({ lucideCircleAlert, lucideCircleDotDashed, lucideMapPin })],
  templateUrl: './intervention-facilities-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionFacilitiesTable {
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
   * @description The workspace owning the intervention, so a row can link into its facility's own record.
   * @access public
   * @since 1.3.0
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /**
   * Property items
   * @readonly
   * @description The facilities linked to this intervention.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly FacilityOutput[]>}
   */
  public readonly items: InputSignal<readonly FacilityOutput[]> =
    input.required<readonly FacilityOutput[]>();

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
   * @description Total linked facilities the server reports, across all pages.
   * @access public
   * @since 1.2.0
   * @type {InputSignal<number>}
   */
  public readonly totalItems: InputSignal<number> = input<number>(0);

  /**
   * Property loadingMore
   * @readonly
   * @description Whether the next page of linked facilities is being fetched.
   * @access public
   * @since 1.2.0
   * @type {InputSignal<boolean>}
   */
  public readonly loadingMore: InputSignal<boolean> = input<boolean>(false);
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
   * @description Emits when the user asks for the next page of linked facilities.
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
   * @type {OutputEmitterRef<InterventionFacilitiesTableQuery>}
   */
  public readonly queryChanged: OutputEmitterRef<InterventionFacilitiesTableQuery> =
    output<InterventionFacilitiesTableQuery>();

  /**
   * Property query
   * @readonly
   * @description Controlled search and filter criteria retained by the owning page store.
   * @access public
   * @since 6.2.0
   * @type {InputSignal<InterventionFacilitiesTableQuery>}
   */
  public readonly query: InputSignal<InterventionFacilitiesTableQuery> =
    input<InterventionFacilitiesTableQuery>({ search: '', type: null, status: null });
  //#endregion

  //#region Properties
  /**
   * Property searchTerm
   * @readonly
   *
   * @description
   * The local text query applied to the loaded facility rows.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly searchTerm: Signal<string> = computed(() => this.query().search);

  /**
   * Property typeFilter
   * @readonly
   *
   * @description
   * The selected facility type, or null when the field is not active.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<FacilityType | null>}
   */
  protected readonly typeFilter: Signal<FacilityType | null> = computed(() => this.query().type);

  /**
   * Property statusFilter
   * @readonly
   *
   * @description
   * The selected facility lifecycle state, or null when the field is not active.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<FacilityStatus | null>}
   */
  protected readonly statusFilter: Signal<FacilityStatus | null> = computed(
    () => this.query().status,
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
   * Filter fields offered by the linked-facilities table.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly CollectionFilterField[]}
   */
  protected readonly filterFields: readonly CollectionFilterField[] = [
    {
      key: 'type',
      fieldLabel: $localize`:@@intervention.linked.facilities.filterType:Type`,
      icon: 'lucideMapPin',
      operators: ['equals'],
    },
    {
      key: 'status',
      fieldLabel: $localize`:@@intervention.linked.facilities.filterStatus:Status`,
      icon: 'lucideCircleDotDashed',
      operators: ['equals'],
    },
  ];

  /**
   * Property typeOptions
   * @readonly
   *
   * @description
   * Type choices offered by the linked-facilities filter.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly CollectionFilterOption[]}
   */
  protected readonly typeOptions: readonly CollectionFilterOption[] = FACILITY_TYPE_OPTIONS;

  /**
   * Property statusOptions
   * @readonly
   *
   * @description
   * Lifecycle choices offered by the linked-facilities filter.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly CollectionFilterOption[]}
   */
  protected readonly statusOptions: readonly CollectionFilterOption[] = FACILITY_STATUS_OPTIONS;

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
   * @type {Signal<readonly FacilityFilterKey[]>}
   */
  protected readonly activeFilterKeys: Signal<readonly FacilityFilterKey[]> = computed<
    readonly FacilityFilterKey[]
  >(() => [
    ...(this.typeFilter() === null ? [] : (['type'] as const)),
    ...(this.statusFilter() === null ? [] : (['status'] as const)),
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
   * Property typeFilterTemplate
   * @readonly
   *
   * @description
   * The type value control projected into the shared filter bar.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<TemplateRef<unknown> | undefined>}
   */
  private readonly typeFilterTemplate: Signal<TemplateRef<unknown> | undefined> =
    viewChild<TemplateRef<unknown>>('typeFilterControl');

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
    type: this.typeFilterTemplate(),
    status: this.statusFilterTemplate(),
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
   * @type {WritableSignal<FacilityFilterKey | null>}
   */
  protected readonly openFilterKey: WritableSignal<FacilityFilterKey | null> =
    signal<FacilityFilterKey | null>(null);

  /**
   * Property filteredItems
   * @readonly
   *
   * @description
   * The visible linked facilities after applying the local query and fields.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly FacilityOutput[]>}
   */
  protected readonly filteredItems: Signal<readonly FacilityOutput[]> = computed<
    readonly FacilityOutput[]
  >(() => {
    if (this.serverFiltering()) return this.items();
    const query: string = this.searchTerm().trim().toLowerCase();
    const type: FacilityType | null = this.typeFilter();
    const status: FacilityStatus | null = this.statusFilter();

    return this.items().filter((item: FacilityOutput): boolean => {
      if (type !== null && item.type !== type) return false;
      if (status !== null && item.status !== status) return false;
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
  protected readonly skeletonColumnWidths: readonly string[] = ['w-40 max-w-full', 'w-20', 'w-20'];
  //#endregion

  //#region Methods
  /**
   * Method typeLabelOf
   * @description The facility's type, resolved to its display label.
   * @access protected
   * @since 1.0.0
   * @param {FacilityOutput} item - The facility being rendered.
   * @returns {string} The localized type label.
   */
  protected typeLabelOf(item: FacilityOutput): string {
    return FACILITY_TYPE_LABEL[item.type];
  }

  /**
   * Method searchableTextOf
   * @description Builds the visible facility fields an operator can search.
   * @access protected
   * @since 6.2.0
   * @param {FacilityOutput} item - The facility being indexed.
   * @returns {string} Normalized searchable row text.
   */
  protected searchableTextOf(item: FacilityOutput): string {
    return [
      item.name,
      item.code,
      this.typeLabelOf(item),
      item.type,
      item.status,
      resolveInterventionTag('facilityStatus', item.status).label,
      item.address,
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
    if (key === 'type' || key === 'status') this.openFilterKey.set(key);
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
    if (key !== 'type' && key !== 'status') return;
    this.openFilterKey.set(null);
    this.emitQuery({ [key]: null });
  }

  /**
   * Method clearFilters
   * @method clearFilters
   *
   * @description
   * Clears all linked-facility field selections.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void} No value is returned.
   */
  protected clearFilters(): void {
    this.openFilterKey.set(null);
    this.emitQuery({ type: null, status: null });
  }

  /**
   * Method onTypeFilterChanged
   * @method onTypeFilterChanged
   *
   * @description
   * Applies the selected facility type, or removes the field when cleared.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string | null} value - The selected filter value, or `null` when cleared.
   * @returns {void} No value is returned.
   */
  protected onTypeFilterChanged(value: string | null): void {
    const selected =
      FACILITY_TYPE_VALUES.find((candidate: FacilityType): boolean => candidate === value) ?? null;
    this.openFilterKey.set(null);
    this.emitQuery({ type: selected });
  }

  /**
   * Method onStatusFilterChanged
   * @method onStatusFilterChanged
   *
   * @description
   * Applies the selected facility status, or removes the field when cleared.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string | null} value - The selected filter value, or `null` when cleared.
   * @returns {void} No value is returned.
   */
  protected onStatusFilterChanged(value: string | null): void {
    const selected =
      FACILITY_STATUS_VALUES.find((candidate: FacilityStatus): boolean => candidate === value) ??
      null;
    this.openFilterKey.set(null);
    this.emitQuery({ status: selected });
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
   * @param {Partial<InterventionFacilitiesTableQuery>} overrides - Criteria to merge into the current table query.
   * @returns {void} No value is returned.
   */
  private emitQuery(overrides: Partial<InterventionFacilitiesTableQuery> = {}): void {
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
   * @param {FacilityFilterKey} key - The filter field key.
   * @returns {BrnOverlayState} The current overlay state for the filter.
   */
  protected fieldPopoverState(key: FacilityFilterKey): BrnOverlayState {
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
   * @param {FacilityFilterKey} key - The filter field key.
   * @param {BrnOverlayState} state - The filter popover's next state.
   * @returns {void} No value is returned.
   */
  protected onFilterPopoverStateChanged(key: FacilityFilterKey, state: BrnOverlayState): void {
    if (state === 'open') {
      this.openFilterKey.set(key);
      return;
    }

    if (this.openFilterKey() === key) this.openFilterKey.set(null);
  }

  /**
   * Method isDraftRecord
   *
   * @description
   * Whether the row is an intervention-scoped draft, which does not resolve
   * on the canonical `/facilities/:id` route — such a row renders as plain
   * text instead of a broken link.
   *
   * @access protected
   * @since 1.3.0
   *
   * @param {FacilityOutput} item - The facility being rendered.
   *
   * @returns {boolean} `true` while the record is still a draft.
   */
  protected isDraftRecord(item: FacilityOutput): boolean {
    return item.recordStatus === 'draft';
  }
  //#endregion
}
