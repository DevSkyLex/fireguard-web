import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
  type InputSignalWithTransform,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import type { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { Menu, MenuModule } from 'primeng/menu';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { OrganizationPermissionService } from '@features/organization/access';
import {
  resolveInterventionTag,
  type InterventionOutput,
  type InterventionStatus,
  type MemberSelectOption,
  type SelectOption,
} from '@features/organization/features/interventions/models';
import {
  InterventionStore,
  InterventionSummaryStore,
  type InterventionStoreType,
  type InterventionSummaryStoreType,
} from '@features/organization/features/interventions/state';
import {
  InterventionCalendarStore,
  type InterventionCalendarStoreType,
  type InterventionCalendarWindow,
} from '@features/organization/features/interventions/state/intervention-calendar';
import {
  InterventionPlanningOptionsStore,
  type InterventionPlanningOptionsStoreType,
} from '@features/organization/features/interventions/state/intervention-planning-options';
import {
  InterventionCalendar,
  InterventionLabelChip,
  InterventionPriorityIcon,
  InterventionTag,
} from '@features/organization/features/interventions/ui/components';
import { InterventionCreateDrawer } from '@features/organization/features/interventions/ui/drawers';
import type { InterventionCreateFormValues } from '@features/organization/features/interventions/ui/forms';
import {
  capabilityForTransition,
  resolveAllowedTransitions,
  type InterventionTransitionCapability,
} from '@features/organization/features/interventions/utils';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  ActiveOrganizationStore,
  OrganizationMemberAccessStore,
} from '@features/organization/state';
import {
  AvatarStack,
  Board,
  BoardCardDirective,
  BoardColumnHeaderDirective,
  EmptyState,
  GroupedList,
  GroupedListHeaderDirective,
  GroupedListRowDirective,
  MetricCard,
  Skeleton,
  tagSeverityDotClass,
  type AvatarStackPerson,
  type BoardColumn,
  type BoardItemDropped,
} from '@shared/components';

/**
 * Default hour (local) pre-filled as the planned start when an intervention is
 * created from a calendar day.
 */
const DEFAULT_PLANNED_HOUR = 9;

/**
 * Window before a due date (48 hours) during which a non-terminal, non-overdue
 * intervention is flagged as due soon on its board card.
 */
const DUE_SOON_WINDOW_MS = 48 * 60 * 60 * 1000;

/**
 * View toggle for the interventions index page, mirrored in the `?view=`
 * query param (default `list`).
 */
type InterventionListView = 'list' | 'board' | 'calendar';

/**
 * Lifecycle order the list view groups statuses in — the most actionable
 * statuses first, terminal statuses last.
 */
const LIST_STATUS_ORDER: readonly InterventionStatus[] = [
  'in_progress',
  'submitted',
  'changes_requested',
  'planned',
  'draft',
  'published',
  'abandoned',
];

/**
 * Interface InterventionListItemViewModel
 *
 * @description
 * Presentation view model wrapping one {@link InterventionOutput} for the
 * list row / board card templates: whether the intervention is overdue or due
 * soon, the resolved site display name and the resolved avatar-stack people.
 * Every other rendered field reads straight off the wrapped `intervention`.
 */
interface InterventionListItemViewModel {
  readonly intervention: InterventionOutput;
  readonly isOverdue: boolean;
  readonly isDueSoon: boolean;
  readonly siteName: string | null;
  readonly people: readonly AvatarStackPerson[];
}

/**
 * Component InterventionsPage
 * @class InterventionsPage
 *
 * @description
 * Route entry page for the organization interventions index, offering a
 * Linear-style List / Board / Calendar browsing experience over one shared
 * {@link InterventionStore} dataset (List and Board), plus the bounded-window
 * {@link InterventionCalendarStore} for the Calendar view. The active view and
 * the search query are synced to the `?view=`/`?q=` query params so the page
 * state survives navigation and sharing. The page orchestrates status-group
 * derivation, board drag-and-drop → status transition gating, and the shared
 * guided-creation drawer; every collection surface it composes stays
 * presentational.
 *
 * @version 5.3.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-interventions-page',
  imports: [
    AvatarStack,
    Board,
    MenuModule,
    BoardCardDirective,
    BoardColumnHeaderDirective,
    ButtonModule,
    DatePipe,
    EmptyState,
    GroupedList,
    GroupedListHeaderDirective,
    GroupedListRowDirective,
    MetricCard,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    InterventionCalendar,
    InterventionCreateDrawer,
    InterventionLabelChip,
    InterventionPriorityIcon,
    InterventionTag,
    MessageModule,
    ReactiveFormsModule,
    Skeleton,
    SkeletonModule,
  ],
  // InterventionStore is provided at the parent route level (interventions.routes.ts)
  // so it survives navigation into a detail page — do not re-provide it here.
  // InterventionSummaryStore is not root-provided; the page that renders the
  // KPI strip has to supply it.
  providers: [
    InterventionCalendarStore,
    InterventionPlanningOptionsStore,
    InterventionSummaryStore,
  ],
  templateUrl: './interventions.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-0 flex-1 flex-col' },
})
export class InterventionsPage {
  //#region Properties
  /**
   * Property organization
   * @readonly
   *
   * @description
   * Store exposing the active organization context.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActiveOrganizationStore}
   */
  private readonly organization: ActiveOrganizationStore =
    inject<ActiveOrganizationStore>(ActiveOrganizationStore);

  /**
   * Property memberAccess
   * @readonly
   *
   * @description
   * Root-provided store exposing the authenticated member's profile in the
   * active organization, used to derive the current member IRI for the
   * board's "review" drop gating (only the responsible agent may submit).
   *
   * @access private
   * @since 5.0.0
   *
   * @type {OrganizationMemberAccessStore}
   */
  private readonly memberAccess: OrganizationMemberAccessStore =
    inject<OrganizationMemberAccessStore>(OrganizationMemberAccessStore);

  /**
   * Property permissionService
   * @readonly
   *
   * @description
   * Organization-owned helper resolving the authenticated member's effective
   * intervention workflow permissions, used to gate board drag-and-drop.
   *
   * @access private
   * @since 5.0.0
   *
   * @type {OrganizationPermissionService}
   */
  private readonly permissionService: OrganizationPermissionService =
    inject<OrganizationPermissionService>(OrganizationPermissionService);

  /**
   * Property router
   * @readonly
   *
   * @description
   * Angular Router used to sync `?view=`/`?q=` and navigate into interventions.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property route
   * @readonly
   *
   * @description
   * Current activated route, used to update query params while preserving
   * the others.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {ActivatedRoute}
   */
  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);

  /**
   * Property store
   * @readonly
   *
   * @description
   * Component-scoped intervention store backing both the List and Board views.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {InterventionStoreType}
   */
  protected readonly store: InterventionStoreType =
    inject<InterventionStoreType>(InterventionStore);

  /**
   * Property summary
   * @readonly
   *
   * @description
   * Backs the kit's KPI strip. The store computed every metric and no surface
   * ever read it — it was dead code until the strip landed.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {InterventionSummaryStoreType}
   */
  protected readonly summary: InterventionSummaryStoreType =
    inject<InterventionSummaryStoreType>(InterventionSummaryStore);

  /**
   * Property calendarStore
   * @readonly
   *
   * @description
   * Component-scoped store providing the bounded-window interventions
   * rendered by the Calendar view.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {InterventionCalendarStoreType}
   */
  protected readonly calendarStore: InterventionCalendarStoreType =
    inject<InterventionCalendarStoreType>(InterventionCalendarStore);

  /**
   * Property planningOptions
   * @readonly
   *
   * @description
   * Component-scoped store providing site/member selector options for the
   * guided creation drawer and the member display names resolved onto the
   * list row / board card avatar stacks.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {InterventionPlanningOptionsStoreType}
   */
  protected readonly planningOptions: InterventionPlanningOptionsStoreType =
    inject<InterventionPlanningOptionsStoreType>(InterventionPlanningOptionsStore);

  /**
   * Input view
   * @readonly
   *
   * @description
   * Active browsing view, bound from the `?view=` query param via
   * `withComponentInputBinding`. Unrecognized values fall back to `list`.
   *
   * @access public
   * @since 5.0.0
   *
   * @type {InputSignalWithTransform<InterventionListView, unknown>}
   */
  public readonly view: InputSignalWithTransform<InterventionListView, unknown> = input<
    InterventionListView,
    unknown
  >('list', {
    transform: (value: unknown): InterventionListView =>
      value === 'board' || value === 'calendar' ? value : 'list',
  });

  /**
   * Input q
   * @readonly
   *
   * @description
   * Search query, bound from the `?q=` query param via
   * `withComponentInputBinding`. The transform coerces an absent param
   * (`undefined`) to an empty string so downstream `.trim()` calls stay safe.
   *
   * @access public
   * @since 5.0.0
   *
   * @type {InputSignalWithTransform<string, unknown>}
   */
  public readonly q: InputSignalWithTransform<string, unknown> = input<string, unknown>('', {
    transform: (value: unknown): string => (typeof value === 'string' ? value : ''),
  });

  /**
   * Property viewOptions
   * @readonly
   *
   * @description
   * List / Board / Calendar options rendered by the toolbar's segmented view
   * tabs.
   *
   * @access protected
   * @since 5.0.0
   *
   * @type {{ label: string; value: InterventionListView; icon: string }[]}
   */
  protected readonly viewOptions: { label: string; value: InterventionListView; icon: string }[] = [
    { label: $localize`:@@intervention.list.viewList:List`, value: 'list', icon: 'pi pi-bars' },
    {
      label: $localize`:@@intervention.list.viewBoard:Board`,
      value: 'board',
      icon: 'pi pi-th-large',
    },
    {
      label: $localize`:@@intervention.list.viewCalendar:Calendar`,
      value: 'calendar',
      icon: 'pi pi-calendar',
    },
  ];

  /**
   * Property showAbandonedLabel
   * @readonly
   *
   * @description
   * Label for the Board view's "Show abandoned" toggle in its off state.
   *
   * @access protected
   * @since 5.0.0
   *
   * @type {string}
   */
  protected readonly showAbandonedLabel: string = $localize`:@@intervention.board.showAbandoned:Show abandoned`;

  /**
   * Property hideAbandonedLabel
   * @readonly
   *
   * @description
   * Label for the Board view's "Show abandoned" toggle in its on state.
   *
   * @access protected
   * @since 5.0.0
   *
   * @type {string}
   */
  protected readonly hideAbandonedLabel: string = $localize`:@@intervention.board.hideAbandoned:Hide abandoned`;

  /**
   * Property searchControl
   * @readonly
   *
   * @description
   * Draft search value bound to the header search box; debounced 300ms into a
   * `?q=` navigation, which round-trips into {@link q} to trigger the reload.
   *
   * @access protected
   * @since 5.0.0
   *
   * @type {FormControl<string>}
   */
  protected readonly searchControl: FormControl<string> = new FormControl<string>('', {
    nonNullable: true,
  });

  /**
   * Property showAbandoned
   * @readonly
   *
   * @description
   * Whether the Board view's read-only `abandoned` column is appended.
   *
   * @access protected
   * @since 5.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly showAbandoned: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property createDrawerVisible
   * @readonly
   *
   * @description
   * Whether the guided creation drawer is currently open.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly createDrawerVisible: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property initialPlannedStartAt
   * @readonly
   *
   * @description
   * Planned start pre-filled in the creation drawer when a day is chosen in
   * the calendar; null when creating from the generic "New" action.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {WritableSignal<Date | null>}
   */
  protected readonly initialPlannedStartAt: WritableSignal<Date | null> = signal<Date | null>(null);

  /**
   * Property calendarFocusedDate
   * @readonly
   *
   * @description
   * Date the calendar is currently focused on, seeded to today and updated
   * from the calendar's `focusedDateChange` output. Drives the bounded window
   * the calendar dataset is fetched for.
   *
   * @access protected
   * @since 4.1.0
   *
   * @type {WritableSignal<Date>}
   */
  protected readonly calendarFocusedDate: WritableSignal<Date> = signal<Date>(
    InterventionsPage.startOfLocalDay(new Date()),
  );

  /**
   * Property memberDisplayMap
   * @readonly
   *
   * @description
   * Loaded organization members keyed by their member IRI, used to resolve
   * avatar-stack identities for a row/card's responsible and participants.
   *
   * @access protected
   * @since 5.0.0
   *
   * @type {Signal<ReadonlyMap<string, MemberSelectOption>>}
   */
  protected readonly memberDisplayMap: Signal<ReadonlyMap<string, MemberSelectOption>> = computed(
    (): ReadonlyMap<string, MemberSelectOption> =>
      new Map(
        this.planningOptions
          .members()
          .map((member): [string, MemberSelectOption] => [member.value, member]),
      ),
  );

  /**
   * Property siteDisplayMap
   * @readonly
   *
   * @description
   * Loaded site selector options keyed by facility IRI, used to resolve the
   * human-readable site name rendered on list rows and board cards.
   *
   * @access private
   * @since 5.3.0
   *
   * @type {Signal<ReadonlyMap<string, string>>}
   */
  private readonly siteDisplayMap: Signal<ReadonlyMap<string, string>> = computed(
    (): ReadonlyMap<string, string> =>
      new Map(
        this.planningOptions
          .sites()
          .map((site: SelectOption): [string, string] => [site.value, site.label]),
      ),
  );

  /**
   * Property currentMemberIri
   * @readonly
   *
   * @description
   * IRI of the authenticated member in the active organization, or `null`
   * while unresolved. Used to gate the board's `submitted` drop target to the
   * intervention's responsible agent.
   *
   * @access protected
   * @since 5.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly currentMemberIri: Signal<string | null> = computed<string | null>(() => {
    const organizationId: string | undefined = this.organization.selectedOrganization()?.id;
    const memberId: string | undefined = this.memberAccess.profile()?.id;
    return organizationId && memberId
      ? `/api/organizations/${organizationId}/members/${memberId}`
      : null;
  });

  /**
   * Property items
   * @readonly
   *
   * @description
   * Loaded interventions projected into {@link InterventionListItemViewModel}s,
   * shared by both the List and Board views.
   *
   * @access protected
   * @since 5.0.0
   *
   * @type {Signal<readonly InterventionListItemViewModel[]>}
   */
  protected readonly items: Signal<readonly InterventionListItemViewModel[]> = computed(() =>
    this.store.interventionList().map((intervention) => this.toItemViewModel(intervention)),
  );

  /**
   * Property hasSearch
   * @readonly
   *
   * @description
   * Whether a non-blank search query is active, used to branch the empty
   * state between "no results" and the true first-run empty state.
   *
   * @access protected
   * @since 5.1.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly hasSearch: Signal<boolean> = computed<boolean>(
    () => this.q().trim().length > 0,
  );

  /**
   * Property searchEmptyTitle
   * @readonly
   *
   * @description
   * Localized "No results for …" title echoing the active search query back
   * in the filtered-search empty state.
   *
   * @access protected
   * @since 5.1.0
   *
   * @type {Signal<string>}
   */
  protected readonly searchEmptyTitle: Signal<string> = computed<string>(
    () =>
      $localize`:@@intervention.list.searchEmptyTitle:No results for “${this.q().trim()}:query:”`,
  );

  /**
   * Property loadedCount
   * @readonly
   *
   * @description
   * Number of loaded interventions, exposed as a plain numeric signal so the
   * header count reads as a simple ICU plural switch value (a method-chain
   * expression breaks the `#` placeholder substitution).
   *
   * @access protected
   * @since 5.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly loadedCount: Signal<number> = computed(
    () => this.store.interventionList().length,
  );

  /**
   * Property listGroups
   * @readonly
   *
   * @description
   * List view sections in lifecycle order ({@link LIST_STATUS_ORDER}), empty
   * sections omitted.
   *
   * @access protected
   * @since 5.0.0
   *
   * @type {Signal<readonly BoardColumn<InterventionListItemViewModel>[]>}
   */
  protected readonly listGroups: Signal<readonly BoardColumn<InterventionListItemViewModel>[]> =
    computed(() => {
      const items: readonly InterventionListItemViewModel[] = this.items();
      return LIST_STATUS_ORDER.map(
        (status): BoardColumn<InterventionListItemViewModel> => ({
          id: status,
          items: items.filter((item) => item.intervention.status === status),
        }),
      ).filter((group) => group.items.length > 0);
    });

  /**
   * Property boardColumns
   * @readonly
   *
   * @description
   * Board view columns: draft / planned / in_progress / review (submitted +
   * changes_requested) / published, plus a read-only abandoned column when
   * {@link showAbandoned} is on.
   *
   * @access protected
   * @since 5.0.0
   *
   * @type {Signal<readonly BoardColumn<InterventionListItemViewModel>[]>}
   */
  protected readonly boardColumns: Signal<readonly BoardColumn<InterventionListItemViewModel>[]> =
    computed(() => {
      const items: readonly InterventionListItemViewModel[] = this.items();
      const byStatus = (status: InterventionStatus): InterventionListItemViewModel[] =>
        items.filter((item) => item.intervention.status === status);

      const columns: BoardColumn<InterventionListItemViewModel>[] = [
        { id: 'draft', items: byStatus('draft') },
        { id: 'planned', items: byStatus('planned') },
        { id: 'in_progress', items: byStatus('in_progress') },
        { id: 'review', items: [...byStatus('submitted'), ...byStatus('changes_requested')] },
        { id: 'published', items: byStatus('published') },
      ];
      if (this.showAbandoned()) {
        columns.push({ id: 'abandoned', items: byStatus('abandoned') });
      }
      return columns;
    });

  /**
   * Property dragDisabled
   * @readonly
   *
   * @description
   * Disables board dragging entirely when the member has none of the three
   * workflow capabilities (plan/execute/review).
   *
   * @access protected
   * @since 5.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly dragDisabled: Signal<boolean> = computed<boolean>(
    () =>
      !this.permissionService.hasAnyPermission([
        ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN,
        ORGANIZATION_PERMISSION.INTERVENTIONS_EXECUTE,
        ORGANIZATION_PERMISSION.INTERVENTIONS_REVIEW,
      ]),
  );

  /**
   * Property canDropCard
   * @readonly
   *
   * @description
   * `app-board`'s `canDrop` predicate: resolves the drop column to a target
   * status, checks it against the intervention's workflow-legal transitions,
   * requires the matching RBAC capability, and — for a drop into `review`
   * (→ `submitted`) — requires the current member to be the intervention's
   * responsible agent when that identity is known.
   *
   * @access protected
   * @since 5.0.0
   *
   * @type {(item: InterventionListItemViewModel, fromColumnId: string, toColumnId: string) => boolean}
   */
  /** Shared popup menu for row actions. */
  private readonly rowMenu: Signal<Menu> = viewChild.required<Menu>('rowMenu');

  /** Row the action menu was opened from. */
  private readonly rowMenuTarget: WritableSignal<InterventionOutput | null> =
    signal<InterventionOutput | null>(null);

  /**
   * Property rowMenuItems
   * @readonly
   *
   * @description
   * Row actions: open the record, then the status moves the board offers by
   * drag — a list has no equivalent gesture, so those moves were unreachable
   * outside the board.
   *
   * Gated by the same `resolveAllowedTransitions` + capability pair the drop
   * rule uses, so "may this move happen" has one answer rather than two that
   * can drift.
   *
   * Deliberately no Assign or Delete, which the inventory also listed: the
   * list store has no delete (FEATURE.md places it on the workspace store,
   * i.e. the detail page) and assignment needs the planning drawer's option
   * stores. Offering either here would be a menu entry that cannot work.
   *
   * @access protected
   * @since 5.4.0
   *
   * @type {Signal<MenuItem[]>}
   */
  protected readonly rowMenuItems: Signal<MenuItem[]> = computed((): MenuItem[] => {
    const intervention: InterventionOutput | null = this.rowMenuTarget();
    if (intervention === null) return [];

    const transitions: MenuItem[] = resolveAllowedTransitions(intervention)
      .filter((status: InterventionStatus): boolean =>
        this.hasCapability(capabilityForTransition(intervention.status, status)),
      )
      .map((status: InterventionStatus) => ({
        label: resolveInterventionTag('status', status).label,
        icon: resolveInterventionTag('status', status).icon,
        command: (): void =>
          void this.store.transition({
            id: intervention.id,
            status,
            revision: intervention.revision,
          }),
      }));

    return [
      {
        label: $localize`:@@common.open:Open`,
        icon: 'pi pi-arrow-up-right',
        command: (): void => this.onView(intervention),
      },
      ...(transitions.length > 0
        ? [{ label: $localize`:@@intervention.list.moveTo:Move to`, items: transitions }]
        : []),
    ];
  });

  protected readonly canDropCard = (
    item: InterventionListItemViewModel,
    _fromColumnId: string,
    toColumnId: string,
  ): boolean => {
    const targetStatus: InterventionStatus | null =
      InterventionsPage.targetStatusForColumn(toColumnId);
    if (!targetStatus) return false;

    const intervention: InterventionOutput = item.intervention;
    if (!resolveAllowedTransitions(intervention).includes(targetStatus)) return false;

    const capability: InterventionTransitionCapability = capabilityForTransition(
      intervention.status,
      targetStatus,
    );
    if (!this.hasCapability(capability)) return false;

    if (targetStatus === 'submitted') {
      const memberIri: string | null = this.currentMemberIri();
      if (memberIri && intervention.responsible !== memberIri) return false;
    }

    return true;
  };

  /**
   * Property itemId
   * @readonly
   *
   * @description
   * Stable identifier resolver forwarded to `app-grouped-list`/`app-board`.
   *
   * @access protected
   * @since 5.0.0
   *
   * @type {(item: InterventionListItemViewModel) => string}
   */
  protected readonly itemId = (item: InterventionListItemViewModel): string => item.intervention.id;

  /**
   * Property listInitiallyCollapsed
   * @readonly
   *
   * @description
   * Starts the `published` and `abandoned` list sections collapsed.
   *
   * @access protected
   * @since 5.0.0
   *
   * @type {(columnId: string) => boolean}
   */
  protected readonly listInitiallyCollapsed = (columnId: string): boolean =>
    columnId === 'published' || columnId === 'abandoned';

  /**
   * Property lastCalendarWindowKey
   *
   * @description
   * Organization-and-month key of the last calendar window loaded, used to
   * skip a redundant refetch when navigation stays inside the same month.
   *
   * @access private
   * @since 4.1.0
   *
   * @type {string | null}
   */
  private lastCalendarWindowKey: string | null = null;

  /**
   * Property lastPlanningOptionsOrganizationId
   *
   * @description
   * Organization the planning options (sites, members) were last loaded for,
   * used to skip a redundant refetch when the effect re-runs without an
   * organization change.
   *
   * @access private
   * @since 5.0.0
   *
   * @type {string | null}
   */
  private lastPlanningOptionsOrganizationId: string | null = null;
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Wires the search-box debounce into the `?q=` query param, the
   * organization/search-driven intervention load, the calendar's guarded
   * windowed load (Calendar view only), the planning-options load (feeding
   * avatar identities), and navigation into a newly created intervention.
   *
   * @since 2.0.0
   */
  public constructor() {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((value: string): void => this.navigateQuery({ q: value.trim() || null }));

    effect(() => {
      const query: string = this.q();
      if (this.searchControl.value !== query) {
        this.searchControl.setValue(query, { emitEvent: false });
      }
    });

    effect(() => {
      const organizationId: string | undefined = this.organization.selectedOrganization()?.id;
      const name: string = this.q().trim();
      if (!organizationId) return;

      this.store.load({ organizationId, options: name ? { name } : undefined });
    });

    // The summary store existed and nothing ever called it, so the KPI strip
    // the kit specifies had no data behind it.
    effect((): void => {
      this.summary.load(this.organization.selectedOrganization()?.id ?? null);
    });

    effect(() => {
      const organizationId: string | null = this.organization.selectedOrganization()?.id ?? null;
      if (organizationId === this.lastPlanningOptionsOrganizationId) return;

      this.lastPlanningOptionsOrganizationId = organizationId;
      this.planningOptions.loadCreationOptions(organizationId);
    });

    effect(() => {
      const isCalendarActive: boolean = this.view() === 'calendar';
      const organizationId: string | null = this.organization.selectedOrganization()?.id ?? null;
      const focused: Date = this.calendarFocusedDate();
      if (!isCalendarActive) return;

      const key = `${organizationId ?? ''}:${focused.getFullYear()}-${focused.getMonth()}`;
      if (key === this.lastCalendarWindowKey) return;

      this.lastCalendarWindowKey = key;
      this.calendarStore.load({ organizationId, window: this.calendarWindowFor(focused) });
    });

    effect(() => {
      const created: InterventionOutput | null = this.store.createdIntervention();
      if (!created) return;

      const organizationId: string | undefined = this.organizationId();
      this.store.clearCreatedIntervention();
      if (organizationId) {
        void this.router.navigate(['/organizations', organizationId, 'interventions', created.id]);
      }
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method selectView
   * @method selectView
   *
   * @description
   * Syncs the `?view=` query param when the user activates a List/Board/Calendar
   * view tab (`list` — the default — is omitted from the URL).
   *
   * @access protected
   * @since 5.3.0
   *
   * @param {InterventionListView} view - View tab activated.
   * @returns {void}
   */
  protected selectView(view: InterventionListView): void {
    this.navigateQuery({ view: view === 'list' ? null : view });
  }

  /**
   * Method onView
   * @method onView
   *
   * @description
   * Navigates to the detail page of the selected intervention.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionOutput} intervention - Intervention selected in any view.
   * @returns {void}
   */
  protected onView(intervention: InterventionOutput): void {
    void this.router.navigate([intervention.id], { relativeTo: this.route });
  }

  /**
   * Method onRowMenuToggle
   *
   * @description
   * Opens the row action menu for an intervention, without letting the click
   * reach the row underneath and navigate away.
   *
   * @access protected
   * @since 5.4.0
   *
   * @param {MouseEvent} event - Click event anchoring the popup.
   * @param {InterventionOutput} intervention - Row the menu acts on.
   *
   * @returns {void}
   */
  protected onRowMenuToggle(event: MouseEvent, intervention: InterventionOutput): void {
    event.stopPropagation();
    this.rowMenuTarget.set(intervention);
    this.rowMenu().toggle(event);
  }

  /**
   * Method onItemDropped
   * @method onItemDropped
   *
   * @description
   * Applies a board drag-and-drop as a status transition through
   * {@link InterventionStoreType.transition}, which owns the optimistic move,
   * rollback and failure toast; the column → status mapping mirrors
   * {@link canDropCard}.
   *
   * @access protected
   * @since 5.0.0
   *
   * @param {BoardItemDropped<InterventionListItemViewModel>} event - Board drop event.
   * @returns {void}
   */
  protected onItemDropped(event: BoardItemDropped<InterventionListItemViewModel>): void {
    const targetStatus: InterventionStatus | null = InterventionsPage.targetStatusForColumn(
      event.toColumnId,
    );
    if (!targetStatus) return;

    const { intervention } = event.item;
    this.store.transition({
      id: intervention.id,
      status: targetStatus,
      revision: intervention.revision,
    });
  }

  /**
   * Method onCalendarFocusChange
   * @method onCalendarFocusChange
   *
   * @description
   * Records the calendar's newly focused date so the windowed-load effect can
   * refetch the bounded interventions window whenever the visible month changes.
   *
   * @access protected
   * @since 4.1.0
   *
   * @param {Date} date - Date the calendar navigated to.
   * @returns {void}
   */
  protected onCalendarFocusChange(date: Date): void {
    this.calendarFocusedDate.set(date);
  }

  /**
   * Method retry
   * @method retry
   *
   * @description
   * Re-dispatches the interventions load with the current organization and
   * search query after a failed load (the error banner's Retry action).
   *
   * @access protected
   * @since 5.1.0
   *
   * @returns {void}
   */
  protected retry(): void {
    const organizationId: string | undefined = this.organizationId();
    if (!organizationId) return;

    const name: string = this.q().trim();
    this.store.load({ organizationId, options: name ? { name } : undefined });
  }

  /**
   * Method retryCalendar
   * @method retryCalendar
   *
   * @description
   * Re-dispatches the calendar's windowed load for the active organization and
   * currently focused month after a failed fetch (the calendar error banner's
   * Retry action).
   *
   * @access protected
   * @since 5.2.0
   *
   * @returns {void}
   */
  protected retryCalendar(): void {
    const organizationId: string | null = this.organization.selectedOrganization()?.id ?? null;
    this.calendarStore.load({
      organizationId,
      window: this.calendarWindowFor(this.calendarFocusedDate()),
    });
  }

  /**
   * Method clearSearch
   * @method clearSearch
   *
   * @description
   * Clears the active search by removing `?q=` from the URL, which
   * round-trips into {@link q} and reloads the unfiltered list.
   *
   * @access protected
   * @since 5.1.0
   *
   * @returns {void}
   */
  protected clearSearch(): void {
    this.navigateQuery({ q: null });
  }

  /**
   * Method openCreate
   * @method openCreate
   *
   * @description
   * Opens the creation drawer with no pre-filled day (page or calendar toolbar).
   *
   * @access protected
   * @since 2.0.0
   *
   * @returns {void}
   */
  protected openCreate(): void {
    this.initialPlannedStartAt.set(null);
    this.createDrawerVisible.set(true);
  }

  /**
   * Method openCreateOnDay
   * @method openCreateOnDay
   *
   * @description
   * Opens the creation drawer pre-filling the planned start to the chosen
   * calendar day at the default planning hour.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {Date} day - Day selected in the calendar.
   * @returns {void}
   */
  protected openCreateOnDay(day: Date): void {
    this.initialPlannedStartAt.set(
      new Date(day.getFullYear(), day.getMonth(), day.getDate(), DEFAULT_PLANNED_HOUR, 0, 0),
    );
    this.createDrawerVisible.set(true);
  }

  /**
   * Method create
   * @method create
   *
   * @description
   * Routes the validated draft through {@link InterventionStoreType.create}.
   * The store owns the request state and, on success, publishes the created
   * intervention through `createdIntervention`, which the constructor effect
   * consumes to navigate into the new workspace.
   *
   * @access protected
   * @since 1.2.0
   *
   * @param {InterventionCreateFormValues} values - Validated draft values.
   * @returns {void}
   */
  protected create(values: InterventionCreateFormValues): void {
    const organizationId: string | undefined = this.organizationId();
    if (!organizationId) return;

    this.store.create({
      organizationId,
      name: values.name.trim(),
      type: values.type,
      priority: values.priority,
      participants: values.participants,
      ...(values.site ? { site: values.site } : {}),
      ...(values.responsible ? { responsible: values.responsible } : {}),
      ...(values.plannedStartAt ? { plannedStartAt: values.plannedStartAt } : {}),
      ...(values.dueAt ? { dueAt: values.dueAt } : {}),
    });
  }

  /**
   * Method boardColumnLabel
   * @method boardColumnLabel
   *
   * @description
   * Board column title: the intervention tag registry's status label for a
   * column id that mirrors a real status, or the synthetic "Review" label for
   * the merged `review` column.
   *
   * @access protected
   * @since 5.0.0
   *
   * @param {string} columnId - Board column id.
   * @returns {string} Localized column title.
   */
  protected boardColumnLabel(columnId: string): string {
    if (columnId === 'review') {
      return $localize`:@@intervention.board.review:Review`;
    }
    return resolveInterventionTag('status', columnId).label;
  }

  /**
   * Method boardColumnDotClass
   * @method boardColumnDotClass
   *
   * @description
   * Background class of a board lane's status dot: the tag registry severity of
   * the column's status (the merged `review` column borrows the `submitted`
   * severity), resolved through the shared severity dot mapping.
   *
   * @access protected
   * @since 5.3.0
   *
   * @param {string} columnId - Board column id.
   * @returns {string} Tailwind `bg-*` utility class for the lane dot.
   */
  protected boardColumnDotClass(columnId: string): string {
    const status: string = columnId === 'review' ? 'submitted' : columnId;
    return tagSeverityDotClass(resolveInterventionTag('status', status).severity);
  }

  /**
   * Method asItem
   * @method asItem
   *
   * @description
   * Narrows a projected row/card template's implicit value back to
   * {@link InterventionListItemViewModel}. The `[appGroupedListRow]` and
   * `[appBoardCard]` directives are generic with no input carrying `T`, so
   * Angular's template checker infers `T = unknown` inside them; this single
   * cast keeps the rest of the template typed.
   *
   * @access protected
   * @since 5.0.0
   *
   * @param {unknown} value - Implicit template value.
   * @returns {InterventionListItemViewModel} The typed view model.
   */
  protected asItem(value: unknown): InterventionListItemViewModel {
    return value as InterventionListItemViewModel;
  }

  /**
   * Method organizationId
   * @method organizationId
   *
   * @description
   * Returns the active organization identifier, if any.
   *
   * @access private
   * @since 1.0.0
   *
   * @returns {string | undefined} Active organization identifier, if any.
   */
  private organizationId(): string | undefined {
    return this.organization.selectedOrganization()?.id;
  }

  /**
   * Method navigateQuery
   * @method navigateQuery
   *
   * @description
   * Merges the given query params into the current URL without pushing a new
   * history entry, used for both the view toggle and the debounced search.
   *
   * @access private
   * @since 5.0.0
   *
   * @param {Record<string, string | null>} queryParams - Params to merge; `null` removes a key.
   * @returns {void}
   */
  private navigateQuery(queryParams: Record<string, string | null>): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /**
   * Method hasCapability
   * @method hasCapability
   *
   * @description
   * Resolves an {@link InterventionTransitionCapability} to the matching
   * `INTERVENTIONS_{PLAN,EXECUTE,REVIEW}` permission check.
   *
   * @access private
   * @since 5.0.0
   *
   * @param {InterventionTransitionCapability} capability - Capability to check.
   * @returns {boolean} True when the member currently holds it.
   */
  private hasCapability(capability: InterventionTransitionCapability): boolean {
    switch (capability) {
      case 'plan':
        return this.permissionService.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN);
      case 'review':
        return this.permissionService.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_REVIEW);
      case 'execute':
      default:
        return this.permissionService.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_EXECUTE);
    }
  }

  /**
   * Method toItemViewModel
   * @method toItemViewModel
   *
   * @description
   * Maps a raw {@link InterventionOutput} into its
   * {@link InterventionListItemViewModel}: overdue/due-soon flags, resolved
   * site display name and resolved avatar-stack people.
   *
   * @access private
   * @since 5.0.0
   *
   * @param {InterventionOutput} intervention - Intervention to project.
   * @returns {InterventionListItemViewModel} The derived view model.
   */
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
      people: memberIris.map((iri) => this.toPerson(iri)),
    };
  }

  /**
   * Method toPerson
   * @method toPerson
   *
   * @description
   * Resolves a member IRI to an {@link AvatarStackPerson} through
   * {@link memberDisplayMap}, falling back to a generic label when the
   * planning-options member list hasn't loaded that member yet.
   *
   * @access private
   * @since 5.0.0
   *
   * @param {string} memberIri - Member IRI (`/api/organizations/.../members/...`).
   * @returns {AvatarStackPerson} The resolved (or generic fallback) person.
   */
  private toPerson(memberIri: string): AvatarStackPerson {
    const member: MemberSelectOption | undefined = this.memberDisplayMap().get(memberIri);
    if (!member) {
      return { label: $localize`:@@intervention.list.unknownMember:Member` };
    }
    return {
      label: member.displayName,
      image: member.avatarUrl ?? undefined,
      tooltip: member.roleLabel
        ? `${member.displayName} · ${member.roleLabel}`
        : member.displayName,
    };
  }

  /**
   * Method calendarWindowFor
   * @method calendarWindowFor
   *
   * @description
   * Bounded date window the calendar dataset is fetched for: the focused
   * month padded by one month on each side. Both bounds are inclusive local
   * instants.
   *
   * @access private
   * @since 4.1.0
   *
   * @param {Date} focused - Date the calendar is focused on.
   * @returns {InterventionCalendarWindow} Inclusive window to fetch.
   */
  private calendarWindowFor(focused: Date): InterventionCalendarWindow {
    return {
      after: new Date(focused.getFullYear(), focused.getMonth() - 1, 1, 0, 0, 0, 0),
      before: new Date(focused.getFullYear(), focused.getMonth() + 2, 0, 23, 59, 59, 999),
    };
  }

  /**
   * Method targetStatusForColumn
   * @static
   *
   * @description
   * Maps a board column id to the status a drop into it applies: `review` →
   * `submitted`, `published` → not a drop target (`null`), every other column
   * id is already a status.
   *
   * @access private
   * @since 5.0.0
   *
   * @param {string} columnId - Board column id.
   * @returns {InterventionStatus | null} Target status, or `null` when the column never accepts a drop.
   */
  private static targetStatusForColumn(columnId: string): InterventionStatus | null {
    if (columnId === 'review') return 'submitted';
    if (columnId === 'published') return null;
    return columnId as InterventionStatus;
  }

  /**
   * Method startOfLocalDay
   * @static
   *
   * @description
   * Returns midnight (local time) of the given date, dropping the time component.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {Date} date - Reference date.
   * @returns {Date} Local start-of-day for the date.
   */
  private static startOfLocalDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }
  //#endregion
}
