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
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleAlert, lucideCircleDot, lucideHistory } from '@ng-icons/lucide';
import type { BrnOverlayState } from '@spartan-ng/brain/overlay';
import type {
  InterventionTableSource,
  InterventionChangeOutput,
  InterventionChangeStatus,
  InterventionChangeTableQuery,
  InterventionWorkItemOutput,
} from '@features/organization/features/interventions/models';
import {
  formatInterventionChangePatch,
  interventionChangeResourceKind,
} from '@features/organization/features/interventions/utils';
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
import { HlmButton } from '@shared/ui/button';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmSpinnerImports } from '@shared/ui/spinner';
import { HlmTableImports } from '@shared/ui/table';
import { InterventionTableFeedback } from '../../components/intervention-table-feedback';
import { InterventionTag } from '../../components/intervention-tag';
import type { InterventionChangeRowViewModel } from './models';
import type { InterventionChangeGroup } from './models/intervention-change-group.interface';

/**
 * Component InterventionChangeTable
 * @class InterventionChangeTable
 *
 * @description
 * The changes a sub-resource applier proposed on this intervention's linked
 * facilities, equipment, or inspections, rendered in one collection table with
 * a row-level rejection action when the host grants it.
 *
 * Rejection is the one control this surface offers, and only when the host
 * grants it (`canReject`): `UpdateInterventionChangeInput.status` only ever
 * accepts `'proposed' | 'rejected'` — acceptance is not a client action, a
 * pending change is applied automatically at publication, and the caption
 * says so. A row locks and spins on **its own** write through
 * `pendingChangeIds`, mirroring the work-item table's per-row rule.
 *
 * @version 2.0.0
 *
 * @example
 * ```html
 * <app-intervention-change-table
 *   [changes]="store.changes()"
 *   [canReject]="canRejectChange()"
 *   [pendingChangeIds]="store.pendingChangeIds()"
 *   (rejected)="rejectChange($event)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-change-table',
  imports: [
    InterventionTableFeedback,
    InterventionTag,
    NgIcon,
    HlmButton,
    ...HlmEmptyImports,
    ...HlmSpinnerImports,
    ...HlmTableImports,
    CollectionFilterBar,
    CollectionFilterSelect,
    CollectionFilterToggle,
    CollectionSearchBox,
    CollectionToolbar,
    CollectionSurface,
  ],
  providers: [provideIcons({ lucideCircleAlert, lucideCircleDot, lucideHistory })],
  templateUrl: './intervention-change-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionChangeTable {
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
  /**
   * Property defaultFilter
   * @readonly
   * @description Published interventions open the applied history.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<InterventionChangeStatus>}
   */
  public readonly defaultFilter: InputSignal<InterventionChangeStatus> =
    input<InterventionChangeStatus>('proposed');
  /**
   * Property workItems
   * @readonly
   * @description Existing target summaries used to label changes without per-row requests.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly InterventionWorkItemOutput[]>}
   */
  public readonly workItems: InputSignal<readonly InterventionWorkItemOutput[]> = input<
    readonly InterventionWorkItemOutput[]
  >([]);
  /**
   * Property errors
   * @readonly
   * @description Per-change write errors.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<Readonly<Record<string, string | null>>>}
   */
  public readonly errors: InputSignal<Readonly<Record<string, string | null>>> = input({});
  /**
   * Property activeFilter
   * @readonly
   * @description Selected change history state, or null when the shared filter chip is removed.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<InterventionChangeStatus | null>}
   */
  protected readonly activeFilter: Signal<InterventionChangeStatus | null> = computed(() => {
    const query = this.query();
    return query ? query.status : this.defaultFilter();
  });

  /**
   * Property searchTerm
   * @readonly
   *
   * @description
   * The text query sent to the API by the host.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly searchTerm: Signal<string> = computed(() => this.query()?.search ?? '');

  /**
   * Property hasSearchQuery
   * @readonly
   *
   * @description
   * Whether the text query currently narrows the loaded change rows.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly hasSearchQuery: Signal<boolean> = computed<boolean>(
    () => this.searchTerm().trim().length > 0,
  );

  /**
   * Property filterFields
   * @readonly
   *
   * @description
   * The one history field offered by the shared collection filter bar.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly CollectionFilterField[]}
   */
  protected readonly filterFields: readonly CollectionFilterField[] = [
    {
      key: 'status',
      fieldLabel: $localize`:@@intervention.wit.filterStatus:Status`,
      icon: 'lucideCircleDot',
      operators: ['equals'],
    },
  ];

  /**
   * Property statusFilterAccessibleName
   * @readonly
   *
   * @description
   * Accessible name shared with the intervention collection filters.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   */
  protected readonly statusFilterAccessibleName: string = $localize`:@@intervention.list.changeFilter:Change filter: ${this.filterFields[0].fieldLabel}:field:`;

  /**
   * Property statusOptions
   * @readonly
   *
   * @description
   * History states offered by the shared filter value control.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly CollectionFilterOption[]}
   */
  protected readonly statusOptions: readonly CollectionFilterOption[] = [
    {
      value: 'proposed',
      label: $localize`:@@intervention.changes.proposed:Proposed`,
    },
    {
      value: 'rejected',
      label: $localize`:@@intervention.changes.rejected:Rejected`,
    },
    {
      value: 'applied',
      label: $localize`:@@intervention.changes.applied:Applied`,
    },
  ];

  /**
   * Property activeFilterKeys
   * @readonly
   *
   * @description
   * Which shared-filter fields currently narrow the history list.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly string[]>}
   */
  protected readonly activeFilterKeys: Signal<readonly string[]> = computed<readonly string[]>(
    () => (this.activeFilter() === null ? [] : ['status']),
  );

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
   * Property statusFilterValue
   * @readonly
   *
   * @description
   * The shared filter selector's scalar value, or null while its chip is absent.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly statusFilterValue: Signal<string | null> = computed<string | null>(() =>
    this.activeFilter(),
  );

  /**
   * Property statusFilterTemplate
   * @readonly
   *
   * @description
   * The status value control projected into the shared filter chip.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<TemplateRef<unknown> | undefined>}
   */
  private readonly statusFilterTemplate: Signal<TemplateRef<unknown> | undefined> =
    viewChild<TemplateRef<unknown>>('statusFilter');

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
  > = computed(() => ({ status: this.statusFilterTemplate() }));

  /**
   * Property openFilterKey
   * @readonly
   *
   * @description
   * The status field that the shared bar should open after a first pick.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<'status' | null>}
   */
  protected readonly openFilterKey: WritableSignal<'status' | null> = signal<'status' | null>(null);
  /**
   * Property groups
   * @readonly
   * @description Selected changes grouped internally only to resolve a readable resource label for the single table.
   * Resource identifiers are deliberately omitted from the fallback label so technical IRIs cannot leak into the intervention view.
   * @access protected
   * @since 1.0.0
   * @type {Signal<readonly InterventionChangeGroup[]>}
   */
  protected readonly groups: Signal<readonly InterventionChangeGroup[]> = computed(() => {
    const grouped = new Map<string, InterventionChangeRowViewModel[]>();
    for (const row of this.proposedRows())
      grouped.set(row.change.resource, [...(grouped.get(row.change.resource) ?? []), row]);
    return [...grouped.entries()].map(([resource, rows]) => {
      const item = this.workItems().find(
        (work) =>
          work.target === resource ||
          work.resultResource === resource ||
          rows.some((row) => row.change.workItem?.endsWith(`/${work.id}`)),
      );
      return {
        resource,
        rows,
        label: item?.targetSummary?.label ?? rows[0].resourceKind,
      };
    });
  });

  /**
   * Property showActionsColumn
   * @readonly
   * @description Whether the single table needs a rejection-actions column for the selected history.
   * @access protected
   * @since 2.0.0
   * @type {Signal<boolean>}
   */
  protected readonly showActionsColumn: Signal<boolean> = computed<boolean>(
    () => this.canReject() && (this.activeFilter() === null || this.activeFilter() === 'proposed'),
  );

  /**
   * Property skeletonColumnWidths
   * @readonly
   * @description Literal widths for the shared collection surface's projected table columns.
   * @access protected
   * @since 2.0.0
   * @type {Signal<readonly string[]>}
   */
  protected readonly skeletonColumnWidths: Signal<readonly string[]> = computed(() => [
    'w-24 max-w-full',
    'w-24 max-w-full',
    'w-40 max-w-full',
    'w-20 max-w-full',
    ...(this.showActionsColumn() ? ['ms-auto w-12 max-w-full'] : []),
  ]);
  /**
   * Method onFieldPicked
   * @description Opens the history status value control after the shared bar adds its field.
   * @access protected
   * @since 1.0.0
   * @param {string} key - Picked filter field.
   * @returns {void}
   */
  protected onFieldPicked(key: string): void {
    if (key === 'status') this.openFilterKey.set('status');
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
   * Method onFieldRemoved
   * @method onFieldRemoved
   *
   * @description
   * Clears the history status narrowing when its shared filter chip is removed.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} key - The filter field key.
   * @returns {void} No value is returned.
   */
  protected onFieldRemoved(key: string): void {
    if (key === 'status') this.clearFilter();
  }

  /**
   * Method clearFilter
   * @method clearFilter
   *
   * @description
   * Drops the history narrowing so all loaded changes are visible.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void} No value is returned.
   */
  protected clearFilter(): void {
    this.openFilterKey.set(null);
    this.emitQuery({ status: null });
  }

  /**
   * Method onStatusFilterChanged
   * @method onStatusFilterChanged
   *
   * @description
   * Applies a history state selected from the shared filter value control.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string | null} value - The selected filter value, or `null` when cleared.
   * @returns {void} No value is returned.
   */
  protected onStatusFilterChanged(value: string | null): void {
    const filter: InterventionChangeStatus | null =
      value === 'proposed' || value === 'rejected' || value === 'applied' ? value : null;

    this.openFilterKey.set(null);
    this.emitQuery({ status: filter });
  }

  /**
   * Method emitQuery
   * @method emitQuery
   *
   * @description
   * Emits the complete API query after an explicit search or filter interaction.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {Partial<InterventionChangeTableQuery>} overrides - Criteria to merge into the current table query.
   * @returns {void} No value is returned.
   */
  private emitQuery(overrides: Partial<InterventionChangeTableQuery> = {}): void {
    this.queryChanged.emit({
      search: this.searchTerm(),
      status: this.activeFilter(),
      ...overrides,
    });
  }

  /**
   * Method fieldPopoverState
   * @method fieldPopoverState
   *
   * @description
   * Returns the overlay state that the shared status value control should receive.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {BrnOverlayState} The current overlay state for the filter.
   */
  protected fieldPopoverState(): BrnOverlayState {
    return this.openFilterKey() === 'status' ? 'open' : 'closed';
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
   * @param {BrnOverlayState} state - The filter popover's next state.
   * @returns {void} No value is returned.
   */
  protected onFilterPopoverStateChanged(state: BrnOverlayState): void {
    if (state === 'open') {
      this.openFilterKey.set('status');
      return;
    }

    if (this.openFilterKey() === 'status') this.openFilterKey.set(null);
  }

  //#region Inputs
  /**
   * Property changes
   * @readonly
   * @description Every change the workspace loaded, narrowed by the selected history state.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly InterventionChangeOutput[]>}
   */
  public readonly changes: InputSignal<readonly InterventionChangeOutput[]> = input<
    readonly InterventionChangeOutput[]
  >([]);

  /**
   * Property queryChanges
   * @readonly
   *
   * @description
   * Rows returned by the current server query, or null before it resolves.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly InterventionChangeOutput[] | null>}
   */
  public readonly queryChanges: InputSignal<readonly InterventionChangeOutput[] | null> = input<
    readonly InterventionChangeOutput[] | null
  >(null);

  /**
   * Property loading
   * @readonly
   *
   * @description
   * Whether the server-filtered change query is in flight.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property error
   * @readonly
   *
   * @description
   * Normalized server-query failure, or null.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly error: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property canReject
   * @readonly
   * @description Whether the host grants rejecting a proposed change; the backend rules stay with the page.
   * @access public
   * @since 2.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly canReject: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property pendingChangeIds
   * @readonly
   * @description Ids of the changes whose rejection is in flight, so each row locks on its own write.
   * @access public
   * @since 2.0.0
   * @type {InputSignal<ReadonlySet<string>>}
   */
  public readonly pendingChangeIds: InputSignal<ReadonlySet<string>> = input<ReadonlySet<string>>(
    new Set<string>(),
  );
  //#endregion

  //#region Outputs
  /**
   * Property rejected
   * @readonly
   * @description Emits the id of the change the operator rejected; the page owns the store call.
   * @access public
   * @since 2.0.0
   * @type {OutputEmitterRef<string>}
   */
  public readonly rejected: OutputEmitterRef<string> = output<string>();
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
   * @type {OutputEmitterRef<InterventionChangeTableQuery>}
   */
  public readonly queryChanged: OutputEmitterRef<InterventionChangeTableQuery> =
    output<InterventionChangeTableQuery>();

  /**
   * Property query
   * @readonly
   * @description Authoritative criteria owned by the page store; the table emits user edits only.
   * @access public
   * @since 6.2.0
   * @type {InputSignal<InterventionChangeTableQuery | null>}
   */
  public readonly query: InputSignal<InterventionChangeTableQuery | null> =
    input<InterventionChangeTableQuery | null>(null);
  //#endregion

  //#region Properties
  /**
   * Property proposedRows
   * @readonly
   *
   * @description
   * The API-selected changes as fully derived row view models. Resource kind
   * and patch lines are resolved once per change instead of once per binding
   * per change-detection pass. Search and status filtering deliberately stay
   * outside this dataview and are owned by the API query store.
   *
   * @access protected
   * @since 2.1.0
   *
   * @type {Signal<readonly InterventionChangeRowViewModel[]>}
   */
  protected readonly proposedRows: Signal<readonly InterventionChangeRowViewModel[]> = computed<
    readonly InterventionChangeRowViewModel[]
  >(() => {
    const pending: ReadonlySet<string> = this.pendingChangeIds();
    const serverChanges: readonly InterventionChangeOutput[] | null = this.queryChanges();

    return (serverChanges ?? (this.query() ? [] : this.changes())).map(
      (change: InterventionChangeOutput) => {
        const resourceKind: string = interventionChangeResourceKind(change.resource);
        const patchLines = formatInterventionChangePatch(change.patch);

        return {
          change,
          resourceKind,
          patchLines: patchLines.length > 0 ? patchLines : [{ field: '—', value: '—' }],
          pending: pending.has(change.id),
        };
      },
    );
  });
  //#endregion
}
