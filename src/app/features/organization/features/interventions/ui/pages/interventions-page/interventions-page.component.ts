import type { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  signal,
  untracked,
  viewChild,
  type InputSignal,
  type Signal,
  type TemplateRef,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowDown,
  lucideArrowUp,
  lucideCalendarClock,
  lucideCircleAlert,
  lucideClipboardList,
  lucideDownload,
  lucidePlus,
  lucideSearch,
  lucideSlidersHorizontal,
  lucideTrash2,
  lucideUserCog,
} from '@ng-icons/lucide';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import { take } from 'rxjs';
import { isApiError } from '@core/api/utils';
import { FeedbackService } from '@core/feedback';
import { isCallPending, type CallState } from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import { InterventionService } from '@features/organization/features/interventions/data-access';
import {
  resolveInterventionTag,
  type InterventionAssignRequest,
  type InterventionAssignSubmittedEvent,
  type InterventionDuplicatePrefill,
  type InterventionListFilters,
  type InterventionListSort,
  type InterventionOutput,
  type InterventionSortField,
  type InterventionStatus,
  type InterventionTemplateInstantiateRequest,
  type MemberAvatar,
  type MemberSelectOption,
  type SelectOption,
} from '@features/organization/features/interventions/models';
import { INTERVENTION_SORT_OPTIONS } from '@features/organization/features/interventions/options';
import {
  BrowserDownloadService,
  InterventionListPreferencesService,
} from '@features/organization/features/interventions/services';
import {
  InterventionStore,
  type InterventionStoreType,
} from '@features/organization/features/interventions/state';
import { buildInterventionDuplicatePrefill } from '@features/organization/features/interventions/utils';
import {
  buildInterventionExportOptions,
  buildInterventionListOptions,
  parseInterventionListFilters,
} from '@features/organization/features/interventions/utils';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  OrganizationMemberAccessStore,
  type OrganizationMemberAccessStoreType,
} from '@features/organization/state';
import { CollectionPagination } from '@shared/collection-pagination';
import { EmptyState } from '@shared/empty-state';
import { ErrorState } from '@shared/error-state';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmCheckboxImports } from '@shared/ui/checkbox';
import { HlmDropdownMenuImports } from '@shared/ui/dropdown-menu';
import { HlmPopoverImports } from '@shared/ui/popover';
import { HlmSelectImports } from '@shared/ui/select';
import { HlmSeparatorImports } from '@shared/ui/separator';
import { HlmSpinner } from '@shared/ui/spinner';
import { InterventionToolbarActions } from '../../../services';
import {
  InterventionPlanningOptionsStore,
  type InterventionPlanningOptionsStoreType,
} from '../../../state/intervention-planning-options';
import {
  InterventionRecurrenceStore,
  type InterventionRecurrenceStoreType,
} from '../../../state/intervention-recurrence';
import { InterventionAssignDialog } from '../../dialogs/intervention-assign-dialog';
import { InterventionBulkDeleteDialog } from '../../dialogs/intervention-bulk-delete-dialog';
import type { InterventionCreateFormValues } from '../../forms/intervention-create-form';
import { InterventionCreateSheet } from '../../sheets/intervention-create-sheet';
import {
  InterventionRecurrencesSheet,
  type InterventionRecurrenceFormSubmittedEvent,
} from '../../sheets/intervention-recurrences-sheet';
import {
  INTERVENTION_TABLE_COLUMNS,
  InterventionTable,
  type InterventionTableColumn,
  type InterventionTransitionRequest,
} from '../../tables/intervention-table';
import type { InterventionListItemViewModel } from './models';

/** How close a deadline must be to count as "due soon". */
const DUE_SOON_WINDOW_MS: number = 48 * 60 * 60 * 1000;

/** The page sizes offered under the table — the server default first, its clamp last. */
const PAGE_SIZES: readonly [number, number, number] = [30, 60, 100];

/**
 * Component InterventionsPage
 * @class InterventionsPage
 *
 * @description
 * Route entry page for the organization's interventions: the grid in its
 * bordered shell, a footer carrying the row count, the page size and the
 * pager, and the row-level and bulk actions the table itself must not own
 * (transition, assign, duplicate, delete).
 *
 * The search box, the "My interventions"-adjacent filter toggle, the
 * eight-chip filter bar and the List/Board/Calendar switcher moved to
 * `InterventionsShellPage` (`ui/pages/interventions-shell-page/`), the
 * `component:` of the pathless route both this page and the board and
 * calendar leaves now nest under — one physical copy of that chrome instead
 * of three (`FEATURE.md`). This page still **reads** the URL's narrowing
 * through {@link filters}, exactly as it did before the shell existed: no
 * input channel or shared service connects it to the shell, only the same
 * URL both write to and read from independently.
 *
 * It owns what the table must not — the query it sends, the `?q=`/`?create=`
 * params it round-trips, the ordering, the column visibility and the page
 * window (`ARCHITECTURE.md` §2.5).
 *
 * Paging, filtering and sorting are server-side end to end: the loaded
 * entities ARE the current page, the footer derives its page count from the
 * server's `totalItems`, and any narrowing or search change restarts from
 * page one — {@link page} is a `linkedSignal` over {@link filters} and
 * {@link searchTerm}, resetting to `1` whenever either changes regardless of
 * which component (this page's own mutators, or the shell's) wrote the URL,
 * so the load effect fires exactly once per change. The selection clears on
 * every load: it only ever refers to rows of the page on screen, so the
 * bulk-delete dialog can never promise rows the operator no longer sees.
 *
 * `InterventionStore` is **not** provided here — it comes from the outer
 * pathless parent route, which keeps `orderedIds()` alive across list ↔
 * detail. `InterventionPlanningOptionsStore` is likewise not provided here
 * any more: the shell provides and loads the one shared instance this page,
 * the board and the shell's own filter bar all read.
 *
 * Deletion is confirm-gated: a row's Delete entry and the toolbar's "Delete
 * selected" both set a `pending*` target signal instead of calling the store
 * directly, driving the single `hlm-alert-dialog` shared by both paths. A
 * bulk selection is filtered to the rows whose server-computed
 * `allowedActions.canDelete` is true before the dialog opens, so the count it
 * shows is always what will actually delete — never a promise the API would
 * refuse with a 409.
 *
 * "Duplicate" reuses the same creation sheet, prefilled — from a row's own
 * menu, or from a cross-route handoff `InterventionStore.pendingDuplicatePrefill`
 * carries when a detail page navigates here with `?create=1`. Never a
 * server-side copy: it ends in the normal `create` call, and never carries
 * `status`, the planned window or the review note.
 *
 * Its title lives in the shell breadcrumb, not in-page — the route's
 * `data.breadcrumb` supplies it. "New intervention" now registers on the
 * shell header from `InterventionsShellPage` itself, shared across all three
 * views instead of this page's own copy.
 *
 * The "Display" toolbar button (6.7) is a `hlm-popover` trigger opening a
 * panel that groups every presentation preference this list owns — ordering
 * and column visibility — the way Linear's own Display control does. Both
 * sections read and write the same {@link sortOrder} and {@link hiddenColumns}
 * signals the table and the cookie already used.
 *
 * @version 10.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-interventions-page',
  imports: [
    NgIcon,
    EmptyState,
    ErrorState,
    HlmBadge,
    HlmButton,
    HlmSpinner,
    InterventionAssignDialog,
    InterventionBulkDeleteDialog,
    InterventionCreateSheet,
    InterventionRecurrencesSheet,
    InterventionTable,
    CollectionPagination,
    ...HlmCheckboxImports,
    ...HlmDropdownMenuImports,
    ...HlmPopoverImports,
    ...HlmSelectImports,
    ...HlmSeparatorImports,
  ],
  providers: [
    InterventionRecurrenceStore,
    provideIcons({
      lucideArrowDown,
      lucideArrowUp,
      lucideCalendarClock,
      lucideCircleAlert,
      lucideClipboardList,
      lucideDownload,
      lucidePlus,
      lucideSearch,
      lucideSlidersHorizontal,
      lucideTrash2,
      lucideUserCog,
    }),
  ],
  templateUrl: './interventions-page.component.html',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionsPage {
  //#region Inputs
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * The workspace whose interventions are listed, bound from the route.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /**
   * Property q
   * @readonly
   *
   * @description
   * The search term the URL carries, so a filtered list survives a reload.
   *
   * Optional because a query param that is absent — or that the page itself
   * just removed — binds as `undefined` rather than falling back to the input
   * default. Read {@link searchTerm} instead.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly q: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /**
   * Property create
   * @readonly
   *
   * @description
   * `?create=1` opens the creation sheet on arrival — the contract the parent
   * feature's landing page uses to start an intervention.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly create: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /**
   * Property status / type / priority / site / responsible / label / mine / due
   * @readonly
   *
   * @description
   * The narrowing the URL carries — one query param per filter, raw ids for
   * the IRI-valued ones — so a filtered list is shareable, bookmarkable and
   * survives a reload. Unknown values are ignored at parse time rather than
   * sent to the API.
   *
   * @access public
   * @since 5.2.0
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly status: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** The type filter the URL carries. See {@link status}. */
  public readonly type: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** The priority filter the URL carries. See {@link status}. */
  public readonly priority: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** The site filter the URL carries, as a raw facility id. See {@link status}. */
  public readonly site: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** The responsible filter the URL carries, as a raw member id. See {@link status}. */
  public readonly responsible: InputSignal<string | undefined> = input<string | undefined>(
    undefined,
  );

  /** The label filter the URL carries, as a raw label id. See {@link status}. */
  public readonly label: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** `?mine=1` narrows to the signed-in member (responsible OR participant). */
  public readonly mine: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** The named due-date window the URL carries — the segmented views' and the Today page's own legacy preset. See {@link status}. */
  public readonly due: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** The filter bar's "Deadline" chip lower bound, `YYYY-MM-DD`. See {@link status}. */
  public readonly dueAfter: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** The filter bar's "Deadline" chip upper bound, `YYYY-MM-DD`. See {@link status}. */
  public readonly dueBefore: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** The filter bar's "Planned start" chip lower bound, `YYYY-MM-DD`. See {@link status}. */
  public readonly plannedStartAfter: InputSignal<string | undefined> = input<string | undefined>(
    undefined,
  );

  /** The filter bar's "Planned start" chip upper bound, `YYYY-MM-DD`. See {@link status}. */
  public readonly plannedStartBefore: InputSignal<string | undefined> = input<string | undefined>(
    undefined,
  );
  //#endregion

  //#region Properties
  /** The list dataset, provided by the pathless parent route. */
  protected readonly store: InterventionStoreType =
    inject<InterventionStoreType>(InterventionStore);

  /** Site and member choices for the filters and the creation form. */
  protected readonly planningOptions: InterventionPlanningOptionsStoreType =
    inject<InterventionPlanningOptionsStoreType>(InterventionPlanningOptionsStore);

  /**
   * Property recurrenceStore
   * @readonly
   * @description The organization's recurring intervention schedules, backing the "Recurrences" sheet.
   * @access protected
   * @since 1.0.0
   * @type {InterventionRecurrenceStoreType}
   */
  protected readonly recurrenceStore: InterventionRecurrenceStoreType =
    inject<InterventionRecurrenceStoreType>(InterventionRecurrenceStore);

  /**
   * Property permissions
   * @readonly
   *
   * @description
   * Organization permission checks gating the write actions (create, delete)
   * this page offers.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationPermissionService}
   */
  private readonly permissions: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );

  /**
   * Property router
   * @readonly
   *
   * @description
   * Router used to open a created intervention's detail page and to
   * round-trip the `?q=`/`?create=` query params.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject(Router);

  /**
   * Property route
   * @readonly
   *
   * @description
   * Current route, anchoring the relative query-param navigations.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActivatedRoute}
   */
  private readonly route: ActivatedRoute = inject(ActivatedRoute);

  /** The cookie-backed memory of how this list was left (sort, columns, page size). */
  private readonly preferences: InterventionListPreferencesService =
    inject<InterventionListPreferencesService>(InterventionListPreferencesService);

  /**
   * Read directly rather than through {@link InterventionStore}: the export
   * is a one-shot, page-local drain of every matching row, and the store's
   * public surface only ever loads and caches one server page at a time
   * (mirroring `ChannelConversationPage`'s direct `ConversationService` call
   * for the one action its owning store has no method for).
   */
  private readonly interventionService: InterventionService = inject(InterventionService);

  /** Saves the generated CSV to the visitor's device, browser-only. */
  private readonly browserDownload: BrowserDownloadService = inject(BrowserDownloadService);

  /** Reports the export's outcome — a truncation warning or a failure. */
  private readonly feedback: FeedbackService = inject(FeedbackService);

  /** Unsubscribes the export's in-flight drain if the page is left mid-fetch. */
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  /** The shell's toolbar slot this view contributes its Display, Recurrences, Export and bulk controls to. */
  private readonly toolbarActionsSlot: InterventionToolbarActions = inject(
    InterventionToolbarActions,
  );

  /** Those controls, handed to {@link toolbarActionsSlot} so they render on the shell's single toolbar row. */
  private readonly toolbarActions = viewChild<TemplateRef<unknown>>('toolbarActions');

  /** The signed-in member, resolving the "my interventions" chip and the identity gates. */
  private readonly memberAccess: OrganizationMemberAccessStoreType =
    inject<OrganizationMemberAccessStoreType>(OrganizationMemberAccessStore);

  /**
   * Property memberIri
   * @readonly
   *
   * @description
   * The signed-in member's IRI in this organization, null until the profile
   * resolves — the same identity the detail page's submit gate reads.
   *
   * @access protected
   * @since 5.2.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly memberIri: Signal<string | null> = computed<string | null>(() => {
    const memberId: string | undefined = this.memberAccess.profile()?.id;

    return memberId === undefined
      ? null
      : `/api/organizations/${this.organizationId()}/members/${memberId}`;
  });

  /**
   * Property filters
   * @readonly
   *
   * @description
   * The active narrowing, parsed from the URL's query params — the URL is the
   * single source of truth, so a filtered list is shareable and the back
   * button restores it. Presentation preferences (sort, columns, page size)
   * stay in the cookie; filters never do.
   *
   * @access protected
   * @since 5.2.0
   *
   * @type {Signal<InterventionListFilters>}
   */
  protected readonly filters: Signal<InterventionListFilters> = computed<InterventionListFilters>(
    () =>
      parseInterventionListFilters(
        {
          status: this.status(),
          type: this.type(),
          priority: this.priority(),
          site: this.site(),
          responsible: this.responsible(),
          label: this.label(),
          mine: this.mine(),
          due: this.due(),
          dueAfter: this.dueAfter(),
          dueBefore: this.dueBefore(),
          plannedStartAfter: this.plannedStartAfter(),
          plannedStartBefore: this.plannedStartBefore(),
        },
        this.organizationId(),
      ),
  );

  /**
   * Property searchTerm
   * @readonly
   *
   * @description
   * The search as everything downstream reads it: trimmed, never `undefined`.
   * Declared ahead of {@link page}, which reads it synchronously while
   * establishing its own initial value.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly searchTerm: Signal<string> = computed<string>(() => this.q()?.trim() ?? '');

  /** The active ordering, restored from the preferences cookie. */
  protected readonly sortOrder: WritableSignal<InterventionListSort> = signal<InterventionListSort>(
    this.preferences.readSort(),
  );

  /** Which optional columns the operator has hidden, restored from the preferences cookie. */
  protected readonly hiddenColumns: WritableSignal<ReadonlySet<InterventionTableColumn>> = signal<
    ReadonlySet<InterventionTableColumn>
  >(this.restoreHiddenColumns());

  /** Whether an export request is currently in flight. */
  protected readonly exportBusy: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property page
   * @readonly
   *
   * @description
   * The page window, one-based — a `linkedSignal` over {@link filters} and
   * {@link searchTerm} rather than a plain signal, so it resets to `1`
   * whenever either changes regardless of which component wrote the URL: the
   * shell's chip picks, search box and "My interventions" toggle
   * and "Clear search". {@link goToPage} and {@link setPageSize} still `.set`
   * it directly between those resets, exactly as before.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<number>}
   */
  protected readonly page: WritableSignal<number> = linkedSignal<number>((): number => {
    this.filters();
    this.searchTerm();
    return 1;
  });

  /** How many rows a page holds, restored from the preferences cookie. */
  protected readonly pageSize: WritableSignal<number> = signal<number>(this.restorePageSize());

  /** Whether the creation sheet is open. */
  protected readonly createSheetVisible: WritableSignal<boolean> = signal<boolean>(false);

  /** Whether the "Recurrences" sheet is open. */
  protected readonly recurrencesVisible: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property duplicatePrefill
   * @readonly
   *
   * @description
   * What the creation sheet is currently prefilled with, from a "Duplicate"
   * request — a row's own menu, or the cross-route handoff a detail page
   * left on the store. `null` for a plain "New intervention". Cleared
   * whenever the sheet closes, so a later plain creation never reuses it.
   *
   * @access protected
   * @since 6.1.0
   *
   * @type {WritableSignal<InterventionDuplicatePrefill | null>}
   */
  protected readonly duplicatePrefill: WritableSignal<InterventionDuplicatePrefill | null> =
    signal<InterventionDuplicatePrefill | null>(null);

  /** Currently selected row ids, scoped to the loaded page — cleared on every load. */
  protected readonly selectedIds: WritableSignal<ReadonlySet<string>> = signal<ReadonlySet<string>>(
    new Set<string>(),
  );

  /** The intervention a row's menu asked to delete, pending confirmation. */
  protected readonly pendingDelete: WritableSignal<InterventionOutput | null> =
    signal<InterventionOutput | null>(null);

  /** The selected, deletable ids the toolbar asked to bulk-delete, pending confirmation. */
  protected readonly pendingBulkDeleteIds: WritableSignal<ReadonlyArray<string> | null> =
    signal<ReadonlyArray<string> | null>(null);

  /**
   * What `InterventionAssignDialog` is currently asking to assign, or `null`
   * to keep it closed. Opened either from a single row's menu or from the
   * bulk toolbar — {@link pendingBulkAssignIds} tells `submitAssign` which.
   */
  protected readonly assignRequest: WritableSignal<InterventionAssignRequest | null> =
    signal<InterventionAssignRequest | null>(null);

  /** The selected, assignable ids the toolbar asked to bulk-assign, pending the dialog. */
  protected readonly pendingBulkAssignIds: WritableSignal<ReadonlyArray<string> | null> =
    signal<ReadonlyArray<string> | null>(null);

  /** Every hideable column, for the Display popover's column list. */
  protected readonly allColumns: ReadonlyArray<InterventionTableColumn> =
    INTERVENTION_TABLE_COLUMNS;

  /** Orderings the Display popover's field select offers — the collection's own sort whitelist. */
  protected readonly sortOptions: SelectOption<InterventionSortField>[] = INTERVENTION_SORT_OPTIONS;

  /**
   * Property exportDisabled
   * @readonly
   *
   * @description
   * Whether the "Export" button should be inert: nothing loaded yet, nothing
   * matches the current query, or an export request is already in flight.
   *
   * @access protected
   * @since 6.2.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly exportDisabled: Signal<boolean> = computed(
    (): boolean =>
      this.store.isLoadingInterventions() ||
      this.exportBusy() ||
      this.store.totalInterventions() === 0,
  );

  /**
   * Property detailRouteBase
   * @readonly
   *
   * @description
   * Where a row's link points.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<readonly string[]>}
   */
  protected readonly detailRouteBase: Signal<readonly string[]> = computed<readonly string[]>(
    () => ['/organizations', this.organizationId(), 'interventions'],
  );

  /**
   * Property canTransition
   * @readonly
   *
   * @description
   * Whether the member may move an intervention along, which decides if the
   * row menu offers status changes at all.
   *
   * @access protected
   * @since 4.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canTransition: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasAnyPermission([
      ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN,
      ORGANIZATION_PERMISSION.INTERVENTIONS_EXECUTE,
      ORGANIZATION_PERMISSION.INTERVENTIONS_REVIEW,
    ]),
  );

  /**
   * Property canDelete
   * @readonly
   *
   * @description
   * Whether the member may delete an intervention, which decides if the row
   * menu and the bulk toolbar offer Delete at all. The backend routes DELETE
   * through the workflow handler's phase-derived gate — `plan` while draft,
   * `execute` otherwise — so the pair mirrors the detail page's delete gate;
   * `interventions.write` gates only the label catalog and never deletion.
   *
   * @access protected
   * @since 5.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canDelete: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasAnyPermission([
      ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN,
      ORGANIZATION_PERMISSION.INTERVENTIONS_EXECUTE,
    ]),
  );

  /**
   * Property canAssign
   * @readonly
   *
   * @description
   * Whether the member may assign a responsible, which decides if the row
   * menu and the bulk toolbar offer "Assign responsible…" at all. Assignment
   * is a planning action, gated on the same permission as scheduling.
   *
   * @access protected
   * @since 6.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canAssign: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN),
  );

  /**
   * Property canReadRecurrences
   * @readonly
   * @description Whether the "Recurrences" toolbar entry renders at all.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly canReadRecurrences: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_READ),
  );

  /**
   * Property canWriteRecurrences
   * @readonly
   * @description Whether the "Recurrences" sheet offers create/edit/delete/toggle, or renders read-only.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly canWriteRecurrences: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN),
  );

  /**
   * Property canDuplicate
   * @readonly
   *
   * @description
   * Whether the member may duplicate an intervention, which decides if the
   * row menu offers "Duplicate" at all. Unlike delete and assign, no status
   * narrows it further — duplicating an abandoned intervention is
   * legitimate — so this is the only gate.
   *
   * @access protected
   * @since 6.1.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canDuplicate: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN),
  );

  /** Site names keyed by facility IRI. */
  private readonly siteDisplayMap: Signal<ReadonlyMap<string, string>> = computed(
    (): ReadonlyMap<string, string> =>
      new Map(
        this.planningOptions
          .sites()
          .map((site: SelectOption): [string, string] => [site.value, site.label]),
      ),
  );

  /** Members keyed by IRI. */
  private readonly memberDisplayMap: Signal<ReadonlyMap<string, MemberSelectOption>> = computed(
    (): ReadonlyMap<string, MemberSelectOption> =>
      new Map(
        this.planningOptions
          .members()
          .map((member: MemberSelectOption): [string, MemberSelectOption] => [
            member.value,
            member,
          ]),
      ),
  );

  /**
   * Property items
   * @readonly
   *
   * @description
   * Every loaded intervention as a row view model.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {Signal<readonly InterventionListItemViewModel[]>}
   */
  protected readonly items: Signal<readonly InterventionListItemViewModel[]> = computed(() =>
    this.store
      .interventionList()
      .map((intervention: InterventionOutput) => this.toItemViewModel(intervention)),
  );

  /**
   * Property pageCount
   * @readonly
   *
   * @description
   * How many pages the whole server-side collection fills — derived from the
   * server's `totalItems`, not from the loaded rows, which ARE one page. At
   * least one, so the footer never reads "Page 1 of 0".
   *
   * @access protected
   * @since 4.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly pageCount: Signal<number> = computed<number>(() =>
    Math.max(1, Math.ceil(this.store.totalInterventions() / this.pageSize())),
  );

  /**
   * Property deletableSelectedIds
   * @readonly
   *
   * @description
   * Ids of the current selection that are actually deletable — the rows whose
   * server-computed `allowedActions.canDelete` is true, the same flag the
   * table's row menu gates on. What the bulk-delete action operates on and
   * shows a count for, never the raw selection size.
   *
   * @access protected
   * @since 5.0.0
   *
   * @type {Signal<ReadonlyArray<string>>}
   */
  protected readonly deletableSelectedIds: Signal<ReadonlyArray<string>> = computed(() => {
    const selected: ReadonlySet<string> = this.selectedIds();

    return this.items()
      .filter(
        (item: InterventionListItemViewModel): boolean =>
          selected.has(item.intervention.id) &&
          item.intervention.allowedActions?.canDelete === true,
      )
      .map((item: InterventionListItemViewModel): string => item.intervention.id);
  });

  /**
   * Property bulkDeleteLabel
   * @readonly
   *
   * @description
   * The bulk-delete button's label, counting only the deletable subset of
   * the selection.
   *
   * @access protected
   * @since 5.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly bulkDeleteLabel: Signal<string> = computed<string>(
    () =>
      $localize`:@@intervention.list.bulkDeleteButton:Delete (${this.deletableSelectedIds().length}:count:)`,
  );

  /**
   * Property assignableSelectedIds
   * @readonly
   *
   * @description
   * Ids of the current selection that are actually assignable — status
   * `draft` or `planned`, the same narrowing {@link InterventionTable} applies
   * per row. What the bulk-assign action operates on and shows a count for.
   *
   * @access protected
   * @since 6.0.0
   *
   * @type {Signal<ReadonlyArray<string>>}
   */
  protected readonly assignableSelectedIds: Signal<ReadonlyArray<string>> = computed(() => {
    const selected: ReadonlySet<string> = this.selectedIds();

    return this.items()
      .filter(
        (item: InterventionListItemViewModel): boolean =>
          selected.has(item.intervention.id) &&
          (item.intervention.status === 'draft' || item.intervention.status === 'planned'),
      )
      .map((item: InterventionListItemViewModel): string => item.intervention.id);
  });

  /**
   * Property bulkAssignLabel
   * @readonly
   *
   * @description
   * The bulk-assign menu entry's label, counting only the assignable subset
   * of the selection.
   *
   * @access protected
   * @since 6.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly bulkAssignLabel: Signal<string> = computed<string>(
    () =>
      $localize`:@@intervention.list.bulkAssignButton:Assign responsible… (${this.assignableSelectedIds().length}:count:)`,
  );

  /**
   * Property bulkTransitionTargets
   * @readonly
   *
   * @description
   * Every status the current selection could move to, as the union of each
   * selected row's own `allowedTransitions` — the bulk "Move to" menu's own
   * entries, each further narrowed by {@link transitionableSelectedIds}. A
   * row whose own transition is still in flight is skipped: its cached
   * `allowedTransitions` describe the pre-transition state.
   *
   * @access protected
   * @since 6.0.0
   *
   * @type {Signal<readonly InterventionStatus[]>}
   */
  protected readonly bulkTransitionTargets: Signal<readonly InterventionStatus[]> = computed(
    (): readonly InterventionStatus[] => {
      const selected: ReadonlySet<string> = this.selectedIds();
      const transitioning: readonly string[] = this.store.transitioningInterventionIds();
      const targets: Set<InterventionStatus> = new Set<InterventionStatus>();

      for (const item of this.items()) {
        if (!selected.has(item.intervention.id)) continue;
        if (transitioning.includes(item.intervention.id)) continue;
        for (const target of item.intervention.allowedTransitions) targets.add(target);
      }

      return [...targets];
    },
  );

  /**
   * Property assignDialogBusy
   * @readonly
   *
   * @description
   * Whether the store's assignment write is in flight, disabling the
   * dialog's submit while it runs.
   *
   * @access protected
   * @since 6.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly assignDialogBusy: Signal<boolean> = computed<boolean>(() =>
    isCallPending(this.store.assignCallState()),
  );

  /**
   * Property deleteDialogState
   * @readonly
   *
   * @description
   * The confirm dialog's open/closed state, derived from whichever `pending*`
   * target signal is set. A single `hlm-alert-dialog` serves both the
   * row-level and the bulk-delete flow.
   *
   * @access protected
   * @since 5.0.0
   *
   * @type {Signal<BrnDialogState>}
   */
  protected readonly deleteDialogState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.pendingDelete() !== null || this.pendingBulkDeleteIds() !== null ? 'open' : 'closed',
  );

  /**
   * Property deleteDialogTitle
   * @readonly
   *
   * @description
   * The confirm dialog's title, naming the count for a bulk deletion.
   *
   * @access protected
   * @since 5.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly deleteDialogTitle: Signal<string> = computed<string>(() => {
    const bulkIds: ReadonlyArray<string> | null = this.pendingBulkDeleteIds();

    if (bulkIds && bulkIds.length > 1) {
      return $localize`:@@intervention.list.deleteConfirmTitleMany:Delete ${bulkIds.length}:count: interventions?`;
    }

    return $localize`:@@intervention.list.deleteConfirmTitleOne:Delete intervention?`;
  });

  /**
   * Property deleteDialogDescription
   * @readonly
   *
   * @description
   * The confirm dialog's body: names the intervention for a single row,
   * counts them for a bulk selection.
   *
   * @access protected
   * @since 5.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly deleteDialogDescription: Signal<string> = computed<string>(() => {
    const bulkIds: ReadonlyArray<string> | null = this.pendingBulkDeleteIds();

    if (bulkIds) {
      return bulkIds.length > 1
        ? $localize`:@@intervention.list.deleteConfirmDescriptionMany:This will permanently delete ${bulkIds.length}:count: interventions. This action cannot be undone.`
        : $localize`:@@intervention.list.deleteConfirmDescriptionOne:This will permanently delete this intervention. This action cannot be undone.`;
    }

    const single: InterventionOutput | null = this.pendingDelete();

    return single
      ? $localize`:@@intervention.list.deleteConfirmDescriptionSingle:This will permanently delete "${single.name}:name:". This action cannot be undone.`
      : '';
  });

  /**
   * Property hasSearch
   * @readonly
   *
   * @description
   * Whether a search is active, which decides between the no-results and the
   * first-run empty state.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly hasSearch: Signal<boolean> = computed<boolean>(
    () => this.searchTerm().length > 0,
  );

  /**
   * Property hasError
   * @readonly
   *
   * @description
   * Whether the last load failed.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly hasError: Signal<boolean> = computed<boolean>(
    () => this.store.listError() !== null,
  );

  /** Names a status on a closed select trigger, in the column menu, and in the bulk "Move to" menu. */
  protected readonly statusLabelOf: (value: InterventionStatus) => string = (
    value: InterventionStatus,
  ): string => resolveInterventionTag('status', value).label;

  /** Names an ordering field on the Display popover's closed select trigger. */
  protected readonly sortFieldLabelOf: (value: InterventionSortField) => string = (
    value: InterventionSortField,
  ): string =>
    this.sortOptions.find(
      (option: SelectOption<InterventionSortField>): boolean => option.value === value,
    )?.label ?? '';

  /**
   * Property sortDirectionLabel
   * @readonly
   *
   * @description
   * The Display popover's direction toggle button label, naming the active
   * ordering rather than the action a click performs — screen readers get
   * the current state, sighted operators get the arrow glyph.
   *
   * @access protected
   * @since 6.7.0
   *
   * @type {Signal<string>}
   */
  protected readonly sortDirectionLabel: Signal<string> = computed<string>(() =>
    this.sortOrder().direction === 'asc'
      ? $localize`:@@intervention.list.sortAscending:Ascending`
      : $localize`:@@intervention.list.sortDescending:Descending`,
  );

  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Wires the load effect — the search debounce and its own URL round-trip
   * moved to `InterventionsShellPage` along with the rest of the toolbar; this
   * page only reads {@link searchTerm} back out of the same URL.
   * {@link page} resets to `1` itself, as a `linkedSignal`, whenever
   * {@link filters} or {@link searchTerm} changes, so the load effect fires
   * once, already on the first page of the new result set, regardless of
   * which component wrote the query params.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      const template: TemplateRef<unknown> | undefined = this.toolbarActions();

      if (template) this.toolbarActionsSlot.register(template);
    });

    this.destroyRef.onDestroy((): void => this.toolbarActionsSlot.clear(this.toolbarActions()));

    effect((): void => {
      const organizationId: string = this.organizationId();
      const filters: InterventionListFilters = this.filters();
      const sort: InterventionListSort = this.sortOrder();
      const search: string = this.searchTerm();
      const page: number = this.page();
      const pageSize: number = this.pageSize();
      const memberIri: string | null = filters.mine ? this.memberIri() : null;

      untracked((): void => {
        this.selectedIds.set(new Set<string>());
        this.store.load({
          organizationId,
          options: {
            ...buildInterventionListOptions(filters, sort, search, new Date(), memberIri),
            page,
            itemsPerPage: pageSize,
          },
        });
      });
    });

    effect((): void => {
      const requested: boolean = this.create() === '1';

      untracked((): void => {
        if (!requested) return;

        this.createSheetVisible.set(true);
        this.navigateQuery({ create: null });
      });
    });

    effect((): void => {
      const prefill: InterventionDuplicatePrefill | null = this.store.pendingDuplicatePrefill();

      untracked((): void => {
        if (!prefill) return;

        this.duplicatePrefill.set(prefill);
        this.createSheetVisible.set(true);
        this.store.clearPendingDuplicatePrefill();
      });
    });

    effect((): void => {
      const createdId: string | null = this.store.createdInterventionId();

      untracked((): void => {
        if (!createdId) return;

        this.createSheetVisible.set(false);
        this.store.clearCreatedIntervention();
        void this.router.navigate([...this.detailRouteBase(), createdId]);
      });
    });

    effect((): void => {
      const callState: CallState = this.store.deleteCallState();

      untracked((): void => {
        if (callState.status !== 'success') return;
        if (this.pendingDelete() !== null) this.pendingDelete.set(null);
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method clearSearch
   * @method clearSearch
   *
   * @description
   * Drops the search from the URL.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected clearSearch(): void {
    this.page.set(1);
    this.navigateQuery({ q: null });
  }

  /**
   * Method applySortField
   * @method applySortField
   *
   * @description
   * Orders by a column head. Re-picking the active field reverses it, which is
   * what a second click on a sorted column means everywhere else.
   *
   * @access protected
   * @since 4.0.0
   *
   * @param {InterventionSortField} field - The column's field.
   *
   * @returns {void}
   */
  protected applySortField(field: InterventionSortField): void {
    this.page.set(1);
    this.sortOrder.update((current: InterventionListSort) =>
      current.field === field
        ? { field, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { field, direction: current.direction },
    );
    this.persistListPreferences();
  }

  /**
   * Method onSortFieldPicked
   *
   * @description
   * The Display popover's field select emits `null`/`undefined` only while
   * clearing, which this select never does — every option maps to a real
   * field. The guard exists purely to satisfy `hlm-select`'s nullable output
   * type.
   *
   * @access protected
   * @since 6.7.0
   *
   * @param {InterventionSortField | null | undefined} field - The picked field.
   *
   * @returns {void}
   */
  protected onSortFieldPicked(field: InterventionSortField | null | undefined): void {
    if (field) this.applySortField(field);
  }

  /**
   * Method toggleSortDirection
   * @method toggleSortDirection
   *
   * @description
   * Flips the active ordering's direction without changing its field — the
   * Display popover's direction button, independent of {@link applySortField}
   * because a field pick there must never also reverse it.
   *
   * @access protected
   * @since 6.7.0
   *
   * @returns {void}
   */
  protected toggleSortDirection(): void {
    this.page.set(1);
    this.sortOrder.update((current: InterventionListSort) => ({
      field: current.field,
      direction: current.direction === 'asc' ? 'desc' : 'asc',
    }));
    this.persistListPreferences();
  }

  /**
   * Method toggleColumn
   * @method toggleColumn
   *
   * @description
   * Shows or hides an optional column.
   *
   * @access protected
   * @since 4.0.0
   *
   * @param {InterventionTableColumn} id - The column id.
   *
   * @returns {void}
   */
  protected toggleColumn(id: InterventionTableColumn): void {
    const next: Set<InterventionTableColumn> = new Set(this.hiddenColumns());

    if (!next.delete(id)) next.add(id);

    this.hiddenColumns.set(next);
    this.persistListPreferences();
  }

  /**
   * Method isColumnVisible
   * @method isColumnVisible
   *
   * @description
   * Whether a column currently renders, for the menu's checked state.
   *
   * @access protected
   * @since 4.0.0
   *
   * @param {InterventionTableColumn} id - The column id.
   *
   * @returns {boolean} True when shown.
   */
  protected isColumnVisible(id: InterventionTableColumn): boolean {
    return !this.hiddenColumns().has(id);
  }

  /**
   * Method columnLabelOf
   * @method columnLabelOf
   *
   * @description
   * Names a column in the visibility menu.
   *
   * @access protected
   * @since 4.0.0
   *
   * @param {InterventionTableColumn} id - The column id.
   *
   * @returns {string} Its localized label.
   */
  protected columnLabelOf(id: InterventionTableColumn): string {
    switch (id) {
      case 'status':
        return $localize`:@@intervention.list.columnStatus:Status`;
      case 'priority':
        return $localize`:@@intervention.list.columnPriority:Priority`;
      case 'type':
        return $localize`:@@intervention.list.columnType:Type`;
      case 'site':
        return $localize`:@@intervention.list.columnSite:Site`;
      default:
        return $localize`:@@intervention.list.columnDue:Due`;
    }
  }

  /**
   * Method goToPage
   * @method goToPage
   *
   * @description
   * Moves the page window, clamped to the available range.
   *
   * @access protected
   * @since 4.0.0
   *
   * @param {number} target - The one-based page to show.
   *
   * @returns {void}
   */
  protected goToPage(target: number): void {
    this.page.set(Math.min(Math.max(1, target), this.pageCount()));
  }

  /**
   * Method setPageSize
   * @method setPageSize
   *
   * @description
   * Changes how many rows a page holds and returns to the first one, so the
   * window never lands past the end.
   *
   * @access protected
   * @since 4.0.0
   *
   * @param {number} size - Rows per page.
   *
   * @returns {void}
   */
  protected setPageSize(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
    this.persistListPreferences();
  }

  /**
   * Method restoreHiddenColumns
   *
   * @description
   * Narrows the cookie's raw hidden-column ids to the columns this build
   * offers, so a column retired since the cookie was written is ignored.
   *
   * @access private
   * @since 4.6.0
   *
   * @returns {ReadonlySet<InterventionTableColumn>} The restored hidden set.
   */
  private restoreHiddenColumns(): ReadonlySet<InterventionTableColumn> {
    const stored: ReadonlySet<string> = this.preferences.readHiddenColumns();

    return new Set<InterventionTableColumn>(
      INTERVENTION_TABLE_COLUMNS.filter((column) => stored.has(column)),
    );
  }

  /**
   * Method restorePageSize
   *
   * @description
   * The remembered rows-per-page when it is one of the sizes this build
   * offers, or the default otherwise.
   *
   * @access private
   * @since 4.6.0
   *
   * @returns {number} The restored page size.
   */
  private restorePageSize(): number {
    const stored: number | null = this.preferences.readPageSize();

    return stored !== null && PAGE_SIZES.includes(stored) ? stored : PAGE_SIZES[0];
  }

  /**
   * Method persistListPreferences
   *
   * @description
   * Writes the list's current shape — sort, hidden columns, page size — to the
   * preferences cookie in one pass. Filters are deliberately not included.
   *
   * @access private
   * @since 4.6.0
   *
   * @returns {void}
   */
  private persistListPreferences(): void {
    this.preferences.write(this.sortOrder(), this.hiddenColumns(), this.pageSize());
  }

  /**
   * Method openCreate
   * @method openCreate
   *
   * @description
   * Opens the creation sheet blank — drops any prefill a previous
   * "Duplicate" left behind.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected openCreate(): void {
    this.duplicatePrefill.set(null);
    this.createSheetVisible.set(true);
  }

  /**
   * Method requestDuplicate
   * @method requestDuplicate
   *
   * @description
   * Opens the creation sheet prefilled from a row's own "Duplicate" entry.
   *
   * @access protected
   * @since 6.1.0
   *
   * @param {InterventionOutput} intervention - The row "Duplicate" was invoked on.
   *
   * @returns {void}
   */
  protected requestDuplicate(intervention: InterventionOutput): void {
    this.duplicatePrefill.set(buildInterventionDuplicatePrefill(intervention));
    this.createSheetVisible.set(true);
  }

  /**
   * Method onCreateSheetVisibleChange
   * @method onCreateSheetVisibleChange
   *
   * @description
   * Relays the sheet's open/closed state and, on close, drops any duplicate
   * prefill — mirroring how the sheet clears its own template-picker
   * selection on close, one level up since the prefill is this page's state.
   *
   * @access protected
   * @since 6.1.0
   *
   * @param {boolean} visible - The sheet's next visibility.
   *
   * @returns {void}
   */
  protected onCreateSheetVisibleChange(visible: boolean): void {
    this.createSheetVisible.set(visible);

    if (!visible) this.duplicatePrefill.set(null);
  }

  /**
   * Method createIntervention
   * @method createIntervention
   *
   * @description
   * Hands the form's values to the store. The sheet closes and the page
   * navigates once the store reports the new record.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionCreateFormValues} values - The validated draft.
   *
   * @returns {void}
   */
  protected createIntervention(values: InterventionCreateFormValues): void {
    this.store.create({
      organizationId: this.organizationId(),
      name: values.name,
      type: values.type,
      priority: values.priority,
      site: values.site || undefined,
      responsible: values.responsible || undefined,
      plannedStartAt: values.plannedStartAt ?? undefined,
      dueAt: values.dueAt ?? undefined,
    });
  }

  /**
   * Method instantiateFromTemplate
   * @method instantiateFromTemplate
   *
   * @description
   * Hands the chosen template, plus whichever overrides the sheet drafted,
   * to the store. The sheet closes and the page navigates once the store
   * reports the new draft, the same as {@link createIntervention}.
   *
   * @access protected
   * @since 4.3.0
   *
   * @param {InterventionTemplateInstantiateRequest} request - The chosen template and its overrides.
   *
   * @returns {void}
   */
  protected instantiateFromTemplate(request: InterventionTemplateInstantiateRequest): void {
    this.store.instantiateFromTemplate(request);
  }

  /**
   * Method applyTransition
   * @method applyTransition
   *
   * @description
   * Moves an intervention to the status its row menu offered. The store owns
   * the optimistic patch, the `If-Match` revision and the rollback.
   *
   * @access protected
   * @since 4.0.0
   *
   * @param {InterventionTransitionRequest} request - The intervention and its target.
   *
   * @returns {void}
   */
  protected applyTransition(request: InterventionTransitionRequest): void {
    this.store.transition({
      id: request.intervention.id,
      status: request.status,
      revision: request.intervention.revision,
    });
  }

  /**
   * Method copyReference
   * @method copyReference
   *
   * @description
   * Puts an intervention's `FG-…` reference on the clipboard.
   *
   * @access protected
   * @since 4.0.0
   *
   * @param {InterventionOutput} intervention - The row's intervention.
   *
   * @returns {void}
   */
  protected copyReference(intervention: InterventionOutput): void {
    void navigator.clipboard?.writeText(`FG-${intervention.number}`);
  }

  /**
   * Method onSelectionChanged
   * @method onSelectionChanged
   *
   * @description
   * Records the table's next row selection.
   *
   * @access protected
   * @since 5.0.0
   *
   * @param {ReadonlySet<string>} ids - The full next selection.
   *
   * @returns {void}
   */
  protected onSelectionChanged(ids: ReadonlySet<string>): void {
    this.selectedIds.set(ids);
  }

  /**
   * Method requestDelete
   * @method requestDelete
   *
   * @description
   * Opens the confirm dialog for a single row's Delete entry.
   *
   * @access protected
   * @since 5.0.0
   *
   * @param {InterventionOutput} intervention - The row's intervention.
   *
   * @returns {void}
   */
  protected requestDelete(intervention: InterventionOutput): void {
    this.store.resetDeleteState();
    this.pendingDelete.set(intervention);
  }

  /**
   * Method requestBulkDelete
   * @method requestBulkDelete
   *
   * @description
   * Opens the confirm dialog for the selection's deletable subset. A no-op
   * when nothing selected can actually be deleted.
   *
   * @access protected
   * @since 5.0.0
   *
   * @returns {void}
   */
  protected requestBulkDelete(): void {
    const ids: ReadonlyArray<string> = this.deletableSelectedIds();

    if (ids.length === 0) return;

    this.store.resetDeleteState();
    this.pendingBulkDeleteIds.set(ids);
  }

  /**
   * Method confirmDelete
   * @method confirmDelete
   *
   * @description
   * Sends the pending target(s) to the store. A single row's confirmation
   * stays open, busy-disabled, until `deleteCallState` settles — the
   * constructor effect closes it on success, and a failure surfaces inline
   * rather than closing under the operator. A bulk selection is fired and
   * forgotten instead: each id resolves back to its cached revision and
   * calls `store.delete` once, concurrently via the store's `mergeMap`, each
   * reporting its own success or failure as a toast — attributing one shared
   * call state to several in-flight writes would not reliably tell the
   * dialog when every one of them has settled.
   *
   * @access protected
   * @since 5.0.0
   *
   * @returns {void}
   */
  protected confirmDelete(): void {
    const single: InterventionOutput | null = this.pendingDelete();
    if (single) {
      this.store.delete({ interventionId: single.id, revision: single.revision });
    }

    const bulkIds: ReadonlyArray<string> | null = this.pendingBulkDeleteIds();
    if (bulkIds) {
      const byId: ReadonlyMap<string, InterventionOutput> = new Map(
        this.items().map((item: InterventionListItemViewModel): [string, InterventionOutput] => [
          item.intervention.id,
          item.intervention,
        ]),
      );

      for (const id of bulkIds) {
        const intervention: InterventionOutput | undefined = byId.get(id);
        if (intervention) {
          this.store.delete({ interventionId: intervention.id, revision: intervention.revision });
        }
      }

      this.selectedIds.set(new Set<string>());
    }

    this.pendingBulkDeleteIds.set(null);
  }

  /**
   * Method onDeleteDialogStateChanged
   * @method onDeleteDialogStateChanged
   *
   * @description
   * Clears both pending-delete signals on any dismissal — Cancel, the
   * backdrop or Escape — so the dialog and its target signals never drift
   * apart.
   *
   * @access protected
   * @since 5.0.0
   *
   * @param {BrnDialogState} state - The overlay's new state.
   *
   * @returns {void}
   */
  protected onDeleteDialogStateChanged(state: BrnDialogState): void {
    if (state === 'open') return;

    this.pendingDelete.set(null);
    this.pendingBulkDeleteIds.set(null);
  }

  /**
   * Method transitionableSelectedIds
   * @method transitionableSelectedIds
   *
   * @description
   * Ids of the current selection that may actually move to `target`: the
   * row's own transition must not be in flight (its cached
   * `allowedTransitions`/`revision` are stale until the server confirms),
   * its `allowedTransitions` must include the target, and — mirroring
   * `InterventionDetailPage`'s `canSubmit` identity gate — submitting or
   * withdrawing a submission is reserved to the row's own responsible.
   *
   * @access protected
   * @since 6.0.0
   *
   * @param {InterventionStatus} target - The status the bulk action targets.
   *
   * @returns {ReadonlyArray<string>} The eligible ids.
   */
  protected transitionableSelectedIds(target: InterventionStatus): ReadonlyArray<string> {
    const selected: ReadonlySet<string> = this.selectedIds();
    const transitioning: readonly string[] = this.store.transitioningInterventionIds();
    const currentMemberIri: string | null = this.memberIri();

    return this.items()
      .filter((item: InterventionListItemViewModel): boolean => selected.has(item.intervention.id))
      .filter(
        (item: InterventionListItemViewModel): boolean =>
          !transitioning.includes(item.intervention.id),
      )
      .filter((item: InterventionListItemViewModel): boolean =>
        item.intervention.allowedTransitions.includes(target),
      )
      .filter((item: InterventionListItemViewModel): boolean => {
        const requiresIdentity: boolean =
          target === 'submitted' ||
          (item.intervention.status === 'submitted' && target === 'in_progress');

        return !requiresIdentity || currentMemberIri === item.intervention.responsible;
      })
      .map((item: InterventionListItemViewModel): string => item.intervention.id);
  }

  /**
   * Method confirmBulkTransition
   * @method confirmBulkTransition
   *
   * @description
   * Sends the selection's eligible subset for `target` to the store, one
   * `transition` call per intervention with its own cached revision, and
   * clears the selection — mirroring `confirmDelete`'s bulk branch.
   *
   * @access protected
   * @since 6.0.0
   *
   * @param {InterventionStatus} target - The status to move the eligible rows to.
   *
   * @returns {void}
   */
  protected confirmBulkTransition(target: InterventionStatus): void {
    const ids: ReadonlyArray<string> = this.transitionableSelectedIds(target);
    if (ids.length === 0) return;

    const byId: ReadonlyMap<string, InterventionOutput> = new Map(
      this.items().map((item: InterventionListItemViewModel): [string, InterventionOutput] => [
        item.intervention.id,
        item.intervention,
      ]),
    );

    for (const id of ids) {
      const intervention: InterventionOutput | undefined = byId.get(id);
      if (intervention) {
        this.store.transition({
          id: intervention.id,
          status: target,
          revision: intervention.revision,
        });
      }
    }

    this.selectedIds.set(new Set<string>());
  }

  /**
   * Method requestAssign
   * @method requestAssign
   *
   * @description
   * Opens the assign dialog for a single row's "Assign responsible…" entry.
   *
   * @access protected
   * @since 6.0.0
   *
   * @param {InterventionOutput} intervention - The row's intervention.
   *
   * @returns {void}
   */
  protected requestAssign(intervention: InterventionOutput): void {
    this.pendingBulkAssignIds.set(null);
    this.assignRequest.set({
      interventionId: intervention.id,
      interventionName: intervention.name,
      currentResponsible: intervention.responsible,
    });
  }

  /**
   * Method requestBulkAssign
   * @method requestBulkAssign
   *
   * @description
   * Opens the assign dialog for the selection's assignable subset. A no-op
   * when nothing selected can actually be assigned.
   *
   * @access protected
   * @since 6.0.0
   *
   * @returns {void}
   */
  protected requestBulkAssign(): void {
    const ids: ReadonlyArray<string> = this.assignableSelectedIds();
    if (ids.length === 0) return;

    this.pendingBulkAssignIds.set(ids);
    this.assignRequest.set({
      interventionId: '',
      interventionName:
        ids.length === 1
          ? $localize`:@@intervention.list.bulkAssignNameOne:1 intervention`
          : $localize`:@@intervention.list.bulkAssignNameMany:${ids.length}:count: interventions`,
      currentResponsible: null,
    });
  }

  /**
   * Method submitAssign
   * @method submitAssign
   *
   * @description
   * Sends the picked responsible to the store: once for the single pending
   * row, or once per eligible id when the dialog was opened from the bulk
   * toolbar — each call carries that row's own cached revision, mirroring
   * `confirmDelete`'s bulk branch.
   *
   * @access protected
   * @since 6.0.0
   *
   * @param {InterventionAssignSubmittedEvent} event - The picked member.
   *
   * @returns {void}
   */
  protected submitAssign(event: InterventionAssignSubmittedEvent): void {
    const byId: ReadonlyMap<string, InterventionOutput> = new Map(
      this.items().map((item: InterventionListItemViewModel): [string, InterventionOutput] => [
        item.intervention.id,
        item.intervention,
      ]),
    );

    const bulkIds: ReadonlyArray<string> | null = this.pendingBulkAssignIds();
    if (bulkIds) {
      for (const id of bulkIds) {
        const intervention: InterventionOutput | undefined = byId.get(id);
        if (intervention) {
          this.store.assignResponsible({
            interventionId: intervention.id,
            responsible: event.responsible,
            revision: intervention.revision,
          });
        }
      }
      this.selectedIds.set(new Set<string>());
    } else {
      const intervention: InterventionOutput | undefined = byId.get(event.interventionId);
      if (intervention) {
        this.store.assignResponsible({
          interventionId: intervention.id,
          responsible: event.responsible,
          revision: intervention.revision,
        });
      }
    }

    this.assignRequest.set(null);
    this.pendingBulkAssignIds.set(null);
  }

  /**
   * Method dismissAssign
   * @method dismissAssign
   *
   * @description
   * Closes the assign dialog without submitting — Escape, the backdrop or Cancel.
   *
   * @access protected
   * @since 6.0.0
   *
   * @returns {void}
   */
  protected dismissAssign(): void {
    this.assignRequest.set(null);
    this.pendingBulkAssignIds.set(null);
  }

  /**
   * Method openRecurrences
   *
   * @description Opens the "Recurrences" sheet, fetching the organization's rules once on first open.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected openRecurrences(): void {
    this.recurrencesVisible.set(true);
    if (this.recurrenceStore.listCallState().status !== 'idle') return;

    this.recurrenceStore.load({ organizationIri: `/api/organizations/${this.organizationId()}` });
  }

  /** Closes the "Recurrences" sheet. */
  protected closeRecurrences(): void {
    this.recurrencesVisible.set(false);
  }

  /**
   * Method submitRecurrenceForm
   *
   * @description
   * Creates or updates a recurrence, depending on whether the sheet's draft
   * carries an existing row's id.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionRecurrenceFormSubmittedEvent} event - The submitted draft.
   *
   * @returns {void}
   */
  protected submitRecurrenceForm(event: InterventionRecurrenceFormSubmittedEvent): void {
    if (event.recurrenceId === null) {
      this.recurrenceStore.create({
        organization: `/api/organizations/${this.organizationId()}`,
        template: `/api/intervention-templates/${event.templateId}`,
        name: event.name,
        site: event.site ?? undefined,
        responsible: event.responsible ?? undefined,
        frequency: event.frequency,
        interval: event.interval,
        anchorDate: event.anchorDate,
        timezone: event.timezone,
        leadTimeDays: event.leadTimeDays,
        endAt: event.endAt ?? undefined,
      });
      return;
    }

    this.recurrenceStore.update({
      recurrenceId: event.recurrenceId,
      input: {
        name: event.name,
        site: event.site,
        responsible: event.responsible,
        frequency: event.frequency,
        interval: event.interval,
        anchorDate: event.anchorDate,
        timezone: event.timezone,
        leadTimeDays: event.leadTimeDays,
        endAt: event.endAt,
      },
    });
  }

  /** Deletes a recurrence the sheet's inline confirmation approved. */
  protected removeRecurrence(recurrenceId: string): void {
    this.recurrenceStore.remove(recurrenceId);
  }

  /** Pauses or resumes a recurrence from the sheet's table toggle. */
  protected toggleRecurrenceActive(event: {
    readonly recurrenceId: string;
    readonly isActive: boolean;
  }): void {
    this.recurrenceStore.update({
      recurrenceId: event.recurrenceId,
      input: { isActive: event.isActive },
    });
  }

  /**
   * Method reload
   * @method reload
   *
   * @description
   * Re-runs the current query after a failure.
   *
   * @access protected
   * @since 2.0.0
   *
   * @returns {void}
   */
  protected reload(): void {
    this.store.load({
      organizationId: this.organizationId(),
      options: {
        ...buildInterventionListOptions(
          this.filters(),
          this.sortOrder(),
          this.searchTerm(),
          new Date(),
          this.filters().mine ? this.memberIri() : null,
        ),
        page: this.page(),
        itemsPerPage: this.pageSize(),
      },
    });
  }

  /**
   * Method exportCsv
   * @method exportCsv
   *
   * @description
   * Downloads the current question as CSV, serialized server-side
   * (`InterventionService.exportCsv`, `GET /api/interventions/export`) —
   * the file is never wider than 50,000 rows, past which the endpoint
   * answers `422` instead. Filters the endpoint does not accept (`mine`,
   * `label`, a planned-start bound, …) are silently left out of the request
   * by {@link buildInterventionExportOptions}; when that narrows the export
   * below what the screen shows, a toast says so before the request fires.
   *
   * @access protected
   * @since 6.2.0
   *
   * @returns {void}
   */
  protected exportCsv(): void {
    if (this.store.totalInterventions() === 0) return;

    const { options, droppedFilterCount } = buildInterventionExportOptions(
      this.filters(),
      this.sortOrder(),
      this.searchTerm(),
      new Date(),
      this.filters().mine ? this.memberIri() : null,
    );

    if (droppedFilterCount > 0) {
      this.feedback.warn(
        $localize`:@@intervention.list.exportFiltersDropped:Some active filters aren't supported by the export and were left out.`,
      );
    }

    this.exportBusy.set(true);

    this.interventionService
      .exportCsv(this.organizationId(), options)
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob: Blob): void => {
          this.exportBusy.set(false);
          this.browserDownload.trigger(blob, this.exportFilename());
        },
        error: (error: HttpErrorResponse): void => {
          this.exportBusy.set(false);
          void this.resolveExportErrorDetail(error).then((detail: string | null): void => {
            this.feedback.error(
              detail ?? $localize`:@@intervention.list.exportFailed:Couldn't export interventions.`,
            );
          });
        },
      });
  }

  /**
   * Resolves the RFC 7807 `detail` a `422` export response carries — the
   * response is fetched as a blob, so a JSON error body arrives as one too
   * and must be read back through `Blob.text()` before it can be parsed.
   * `null` when the body isn't one (a network failure, a non-JSON body),
   * letting the caller fall back to the generic message.
   */
  private async resolveExportErrorDetail(error: HttpErrorResponse): Promise<string | null> {
    if (!(error.error instanceof Blob)) return null;

    try {
      const body: unknown = JSON.parse(await error.error.text());
      return isApiError(body) ? body.detail : null;
    } catch {
      return null;
    }
  }

  /** The export's filename: the organization, stamped with today's date (`yyyyMMdd`). */
  private exportFilename(): string {
    const now: Date = new Date();
    const yyyy: string = String(now.getFullYear());
    const mm: string = String(now.getMonth() + 1).padStart(2, '0');
    const dd: string = String(now.getDate()).padStart(2, '0');

    return `interventions-${this.organizationId()}-${yyyy}${mm}${dd}.csv`;
  }

  /** Merges query params into the URL without touching the path. */
  private navigateQuery(queryParams: Record<string, string | null>): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /** Projects one intervention into the row view model. */
  private toItemViewModel(intervention: InterventionOutput): InterventionListItemViewModel {
    const isTerminal: boolean =
      intervention.status === 'published' || intervention.status === 'abandoned';
    const dueTime: number | null = intervention.dueAt
      ? new Date(intervention.dueAt).getTime()
      : null;
    const isOverdue: boolean = dueTime !== null && !isTerminal && dueTime < Date.now();
    const isDueSoon: boolean =
      dueTime !== null && !isTerminal && !isOverdue && dueTime - Date.now() <= DUE_SOON_WINDOW_MS;

    const memberIris: readonly string[] = [
      intervention.responsible,
      ...intervention.participants,
    ].filter((iri, index, all): iri is string => !!iri && all.indexOf(iri) === index);

    return {
      intervention,
      isOverdue,
      isDueSoon,
      siteName: intervention.site ? (this.siteDisplayMap().get(intervention.site) ?? null) : null,
      people: memberIris.map((iri: string): MemberAvatar => this.toPerson(iri)),
    };
  }

  /** Resolves a member IRI to an avatar, naming them rather than showing a hole. */
  private toPerson(memberIri: string): MemberAvatar {
    const member: MemberSelectOption | undefined = this.memberDisplayMap().get(memberIri);

    if (!member) {
      return { label: $localize`:@@intervention.list.memberFallback:Member` };
    }

    return {
      label: member.displayName,
      image: member.avatarUrl ?? undefined,
      tooltip: member.roleLabel
        ? `${member.displayName} · ${member.roleLabel}`
        : member.displayName,
    };
  }
  //#endregion
}
