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
import {
  lucideCircleAlert,
  lucideCircleDot,
  lucideCircleDotDashed,
  lucidePackage,
  lucideWrench,
} from '@ng-icons/lucide';
import type { BrnOverlayState } from '@spartan-ng/brain/overlay';
import type {
  EquipmentOutput,
  EquipmentStatus,
  EquipmentType,
} from '@features/organization/features/equipments/models';
import { EQUIPMENT_TYPE_OPTIONS } from '@features/organization/features/equipments/options';
import type { InterventionTableSource } from '@features/organization/features/interventions/models';
import {
  resolveInterventionTag,
  type InterventionEquipmentTableQuery,
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
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmTableImports } from '@shared/ui/table';
import { InterventionTableFeedback } from '../../components/intervention-table-feedback';
import { InterventionTag } from '../../components/intervention-tag';

/**
 * Type EquipmentFilterKey
 * @type EquipmentFilterKey
 *
 * @description
 * Filter keys owned by the linked-equipment table.
 *
 * @since 1.0.0
 */
type EquipmentFilterKey = 'type' | 'status';

/** Every equipment lifecycle state the linked table can display and filter. */
const EQUIPMENT_STATUS_VALUES: readonly EquipmentStatus[] = [
  'in_stock',
  'operational',
  'under_maintenance',
  'decommissioned',
];

/** Localized status options projected into the shared filter bar. */
const EQUIPMENT_STATUS_OPTIONS: readonly CollectionFilterOption[] = EQUIPMENT_STATUS_VALUES.map(
  (value: EquipmentStatus): CollectionFilterOption => ({
    value,
    label: resolveInterventionTag('equipmentStatus', value).label,
  }),
);

/**
 * Component InterventionEquipmentTable
 * @class InterventionEquipmentTable
 *
 * @description
 * The Equipment tab of the intervention detail page's "Linked" surface: a
 * read-only `hlmTable` of the equipment scoped to this intervention through
 * the backend's canonical `intervention` search filter, with a "Show more"
 * button appending further pages. It exposes local search and field filters,
 * but no row actions. A row's type
 * links to the equipment's own record, with an accessible name folding in
 * the serial number ({@link linkAriaLabelOf}) so repeated identical type
 * labels across rows stay distinguishable to assistive tech — unless the
 * row is still an intervention-scoped draft, which does not resolve on the
 * canonical route yet and renders as plain text with an outline "Draft"
 * badge instead (icon + label, never colour-only).
 *
 * @version 1.4.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-equipment-table',
  imports: [
    InterventionTableFeedback,
    NgIcon,
    ...HlmEmptyImports,
    NgTemplateOutlet,
    CollectionSurface,
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
  providers: [
    provideIcons({
      lucideCircleAlert,
      lucideCircleDot,
      lucideCircleDotDashed,
      lucidePackage,
      lucideWrench,
    }),
  ],
  templateUrl: './intervention-equipment-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionEquipmentTable {
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
   * @description The workspace owning the intervention, so a row can link into its equipment's own record.
   * @access public
   * @since 1.3.0
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /**
   * Property items
   * @readonly
   * @description The equipment linked to this intervention.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly EquipmentOutput[]>}
   */
  public readonly items: InputSignal<readonly EquipmentOutput[]> =
    input.required<readonly EquipmentOutput[]>();

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
   * @description Total linked equipment the server reports, across all pages.
   * @access public
   * @since 1.2.0
   * @type {InputSignal<number>}
   */
  public readonly totalItems: InputSignal<number> = input<number>(0);

  /**
   * Property loadingMore
   * @readonly
   * @description Whether the next page of linked equipment is being fetched.
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
   * @description Emits when the user asks for the next page of linked equipment.
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
   * @type {OutputEmitterRef<InterventionEquipmentTableQuery>}
   */
  public readonly queryChanged: OutputEmitterRef<InterventionEquipmentTableQuery> =
    output<InterventionEquipmentTableQuery>();

  /**
   * Property query
   * @readonly
   * @description Controlled search and filter criteria retained by the owning page store.
   * @access public
   * @since 6.2.0
   * @type {InputSignal<InterventionEquipmentTableQuery>}
   */
  public readonly query: InputSignal<InterventionEquipmentTableQuery> =
    input<InterventionEquipmentTableQuery>({ search: '', type: null, status: null });
  //#endregion

  //#region Properties
  /**
   * Property searchTerm
   * @readonly
   *
   * @description
   * The local text query applied to the loaded equipment rows.
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
   * The selected equipment type, or null when the field is not active.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<EquipmentType | null>}
   */
  protected readonly typeFilter: Signal<EquipmentType | null> = computed(() => this.query().type);

  /**
   * Property statusFilter
   * @readonly
   *
   * @description
   * The selected equipment lifecycle state, or null when the field is not active.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<EquipmentStatus | null>}
   */
  protected readonly statusFilter: Signal<EquipmentStatus | null> = computed(
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
   * Filter fields offered by the linked-equipment table.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly CollectionFilterField[]}
   */
  protected readonly filterFields: readonly CollectionFilterField[] = [
    {
      key: 'type',
      fieldLabel: $localize`:@@intervention.linked.equipment.filterType:Type`,
      icon: 'lucidePackage',
      operators: ['equals'],
    },
    {
      key: 'status',
      fieldLabel: $localize`:@@intervention.linked.equipment.filterStatus:Status`,
      icon: 'lucideCircleDot',
      operators: ['equals'],
    },
  ];

  /**
   * Property typeOptions
   * @readonly
   *
   * @description
   * Type choices offered by the linked-equipment filter.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly CollectionFilterOption[]}
   */
  protected readonly typeOptions: readonly CollectionFilterOption[] = EQUIPMENT_TYPE_OPTIONS;

  /**
   * Property statusOptions
   * @readonly
   *
   * @description
   * Lifecycle choices offered by the linked-equipment filter.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly CollectionFilterOption[]}
   */
  protected readonly statusOptions: readonly CollectionFilterOption[] = EQUIPMENT_STATUS_OPTIONS;

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
   * @type {Signal<readonly EquipmentFilterKey[]>}
   */
  protected readonly activeFilterKeys: Signal<readonly EquipmentFilterKey[]> = computed<
    readonly EquipmentFilterKey[]
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
   * @type {WritableSignal<EquipmentFilterKey | null>}
   */
  protected readonly openFilterKey: WritableSignal<EquipmentFilterKey | null> =
    signal<EquipmentFilterKey | null>(null);

  /**
   * Property filteredItems
   * @readonly
   *
   * @description
   * The visible linked equipment after applying the local query and fields.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly EquipmentOutput[]>}
   */
  protected readonly filteredItems: Signal<readonly EquipmentOutput[]> = computed<
    readonly EquipmentOutput[]
  >(() => {
    if (this.serverFiltering()) return this.items();
    const query: string = this.searchTerm().trim().toLowerCase();
    const type: EquipmentType | null = this.typeFilter();
    const status: EquipmentStatus | null = this.statusFilter();

    return this.items().filter((item: EquipmentOutput): boolean => {
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
  protected readonly skeletonColumnWidths: readonly string[] = [
    'w-40 max-w-full',
    'w-28',
    'w-20',
    'w-24',
  ];
  //#endregion

  //#region Methods
  /**
   * Method typeLabelOf
   *
   * @description
   * The equipment's type, humanized. The backend field is a free-form string
   * (organization-configurable equipment types), not a closed enum, so this
   * only normalizes punctuation rather than resolving a registry entry.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {EquipmentOutput} item - The equipment being rendered.
   *
   * @returns {string} The humanized type.
   */
  protected typeLabelOf(item: EquipmentOutput): string {
    return item.type.replace(/_/g, ' ');
  }

  /**
   * Method searchableTextOf
   * @description Builds the visible equipment fields an operator can search.
   * @access protected
   * @since 6.2.0
   * @param {EquipmentOutput} item - The equipment being indexed.
   * @returns {string} Normalized searchable row text.
   */
  protected searchableTextOf(item: EquipmentOutput): string {
    return [
      this.typeLabelOf(item),
      item.type,
      item.subType,
      this.brandModelOf(item),
      item.serialNumber,
      item.locationLabel,
      item.facilityName,
      item.status,
      resolveInterventionTag('equipmentStatus', item.status).label,
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
   * Clears all linked-equipment field selections.
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
   * Applies the selected equipment type, or removes the field when cleared.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string | null} value - The selected filter value, or `null` when cleared.
   * @returns {void} No value is returned.
   */
  protected onTypeFilterChanged(value: string | null): void {
    const selected: EquipmentType | null =
      EQUIPMENT_TYPE_OPTIONS.find((option) => option.value === value)?.value ?? null;
    this.openFilterKey.set(null);
    this.emitQuery({ type: selected });
  }

  /**
   * Method onStatusFilterChanged
   * @method onStatusFilterChanged
   *
   * @description
   * Applies the selected equipment status, or removes the field when cleared.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string | null} value - The selected filter value, or `null` when cleared.
   * @returns {void} No value is returned.
   */
  protected onStatusFilterChanged(value: string | null): void {
    const selected =
      EQUIPMENT_STATUS_VALUES.find((candidate: EquipmentStatus): boolean => candidate === value) ??
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
   * @param {Partial<InterventionEquipmentTableQuery>} overrides - Criteria to merge into the current table query.
   * @returns {void} No value is returned.
   */
  private emitQuery(overrides: Partial<InterventionEquipmentTableQuery> = {}): void {
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
   * @param {EquipmentFilterKey} key - The filter field key.
   * @returns {BrnOverlayState} The current overlay state for the filter.
   */
  protected fieldPopoverState(key: EquipmentFilterKey): BrnOverlayState {
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
   * @param {EquipmentFilterKey} key - The filter field key.
   * @param {BrnOverlayState} state - The filter popover's next state.
   * @returns {void} No value is returned.
   */
  protected onFilterPopoverStateChanged(key: EquipmentFilterKey, state: BrnOverlayState): void {
    if (state === 'open') {
      this.openFilterKey.set(key);
      return;
    }

    if (this.openFilterKey() === key) this.openFilterKey.set(null);
  }

  /**
   * Method brandModelOf
   * @description The brand and model, joined for one cell, or `null` when neither is set.
   * @access protected
   * @since 1.0.0
   * @param {EquipmentOutput} item - The equipment being rendered.
   * @returns {string | null} The joined label, or `null`.
   */
  protected brandModelOf(item: EquipmentOutput): string | null {
    const parts: readonly string[] = [item.brand, item.model].filter(
      (part): part is string => !!part,
    );

    return parts.length > 0 ? parts.join(' ') : null;
  }

  /**
   * Method isDraftRecord
   *
   * @description
   * Whether the row is an intervention-scoped draft, which does not resolve
   * on the canonical `/equipments/:id` route — such a row renders as plain
   * text instead of a broken link.
   *
   * @access protected
   * @since 1.3.0
   *
   * @param {EquipmentOutput} item - The equipment being rendered.
   *
   * @returns {boolean} `true` while the record is still a draft.
   */
  protected isDraftRecord(item: EquipmentOutput): boolean {
    return item.recordStatus === 'draft';
  }

  /**
   * Method linkAriaLabelOf
   *
   * @description
   * The row's link accessible name, folding in the serial number so two
   * rows sharing the same type — the link's own visible text — stay
   * distinguishable to assistive tech. `null` when there is no serial to
   * disambiguate with, which drops the attribute and falls back to the
   * link's own text content.
   *
   * @access protected
   * @since 1.4.0
   *
   * @param {EquipmentOutput} item - The equipment being rendered.
   *
   * @returns {string | null} The accessible name, or `null`.
   */
  protected linkAriaLabelOf(item: EquipmentOutput): string | null {
    if (!item.serialNumber) return null;

    const type: string = this.typeLabelOf(item);
    const serial: string = item.serialNumber;

    return $localize`:@@intervention.linked.equipment.linkAriaLabel:${type}:type: (${serial}:serial:)`;
  }
  //#endregion
}
