import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  type InputSignal,
  type InputSignalWithTransform,
  signal,
  type Signal,
  untracked,
  viewChild,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AvatarModule, type AvatarPassThroughOptions } from 'primeng/avatar';
import { AvatarGroupModule } from 'primeng/avatargroup';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PanelModule, type PanelPassThroughOptions } from 'primeng/panel';
import { Popover, PopoverModule } from 'primeng/popover';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { OrganizationPermissionService } from '@features/organization/access';
import {
  COMPACT_AVATAR_PT,
  MEMBER_AVATAR_MAX,
} from '@features/organization/features/interventions/constants';
import {
  resolveInterventionTag,
  type InterventionCalendarFilters,
  type InterventionDueWindow,
  type InterventionListFilters,
  type InterventionListOptions,
  type InterventionListSort,
  type InterventionOutput,
  type InterventionSortField,
  type InterventionStatus,
  type InterventionType,
  type MemberAvatar,
  type MemberSelectOption,
  type SelectOption,
} from '@features/organization/features/interventions/models';
import { InterventionListPreferencesService } from '@features/organization/features/interventions/services';
import {
  InterventionStore,
  type InterventionStoreType,
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
import { OrganizationMemberAccessStore } from '@features/organization/state';
import {
  Board,
  BoardCardDirective,
  BoardColumnHeaderDirective,
  type BoardColumn,
  type BoardItemDropped,
} from '@shared/board';
import { EmptyState } from '@shared/empty-state';
import { ErrorBanner } from '@shared/error-state';
import { deriveInitials } from '@shared/initials';
import { PageHeader } from '@shared/page-header';
import { tagSeverityDotClass } from '@shared/tag-severity';
import {
  INTERVENTION_DUE_WINDOW_OPTIONS,
  INTERVENTION_SORT_OPTIONS,
  INTERVENTION_STATUS_FILTER_OPTIONS,
  INTERVENTION_TYPE_FILTER_OPTIONS,
} from './options';
import { buildInterventionListOptions, countActiveFilters } from './utils';

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
  readonly people: readonly MemberAvatar[];
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
 * @version 5.5.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-interventions-page',
  imports: [
    AvatarGroupModule,
    AvatarModule,
    Board,
    BoardCardDirective,
    BoardColumnHeaderDirective,
    ButtonModule,
    DatePipe,
    EmptyState,
    ErrorBanner,
    FormsModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    InterventionCalendar,
    InterventionCreateDrawer,
    InterventionLabelChip,
    InterventionPriorityIcon,
    InterventionTag,
    MessageModule,
    PageHeader,
    PanelModule,
    PopoverModule,
    ReactiveFormsModule,
    SelectButtonModule,
    SelectModule,
    SkeletonModule,
    TooltipModule,
  ],
  // InterventionStore is provided at the parent route level (interventions.routes.ts)
  // so it survives navigation into a detail page — do not re-provide it here.
  providers: [InterventionCalendarStore, InterventionPlanningOptionsStore],
  templateUrl: './interventions.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-0 flex-1 flex-col' },
})
export class InterventionsPage {
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Routed organization, bound from `:organizationId` by the router. The
   * parameter — not the store — is the source of truth: a page rendered under
   * this segment is, by construction, scoped to that organization.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  //#region Properties
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
   * Property preferences
   * @readonly
   *
   * @description
   * Feature service remembering how the operator left the list: sort order,
   * folded sections, and whether abandoned work was showing. Declared before
   * the signals it seeds, because field initializers run in order.
   *
   * @access private
   * @since 6.0.0
   *
   * @type {InterventionListPreferencesService}
   */
  private readonly preferences: InterventionListPreferencesService =
    inject<InterventionListPreferencesService>(InterventionListPreferencesService);

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
   * Input create
   * @readonly
   *
   * @description
   * Request to open the creation drawer on arrival, bound from the `?create=1`
   * query param via `withComponentInputBinding`. It lets another surface — the
   * landing page's primary action — offer "New intervention" and have it mean
   * it, instead of dropping the operator on the list to look for the button.
   *
   * The param is consumed once and cleared, so a reload or a back navigation
   * does not reopen the drawer.
   *
   * @access public
   * @since 6.0.0
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly create: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    { transform: (value: unknown): boolean => value === '1' || value === 'true' },
  );

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
   * Property listErrorMessage
   * @readonly
   *
   * @description
   * Failure message rendered by the List/Board error banner when the shared
   * {@link InterventionStoreType} load fails.
   *
   * @access protected
   * @since 5.5.0
   *
   * @type {string}
   */
  protected readonly listErrorMessage: string = $localize`:@@intervention.list.errorText:The interventions could not be loaded. Check your connection and try again.`;

  /**
   * Property calendarErrorMessage
   * @readonly
   *
   * @description
   * Failure message rendered by the Calendar view's error banner when the
   * windowed {@link InterventionCalendarStoreType} load fails.
   *
   * @access protected
   * @since 5.5.0
   *
   * @type {string}
   */
  protected readonly calendarErrorMessage: string = $localize`:@@intervention.calendar.errorText:The calendar could not be loaded. Check your connection and try again.`;

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
   * Property sortAscendingLabel
   * @readonly
   *
   * @description
   * Label of the direction toggle while the ordering runs ascending.
   *
   * @access protected
   * @since 6.0.0
   *
   * @type {string}
   */
  protected readonly sortAscendingLabel: string = $localize`:@@intervention.list.sortAscending:Ascending`;

  /**
   * Property sortDescendingLabel
   * @readonly
   *
   * @description
   * Label of the direction toggle while the ordering runs descending.
   *
   * @access protected
   * @since 6.0.0
   *
   * @type {string}
   */
  protected readonly sortDescendingLabel: string = $localize`:@@intervention.list.sortDescending:Descending`;

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
  protected readonly showAbandoned: WritableSignal<boolean> = signal<boolean>(
    this.preferences.readShowAbandoned(),
  );

  /**
   * Property filters
   * @readonly
   *
   * @description
   * The narrowing in force. Every field maps to a query parameter the API
   * already accepted and the page never sent.
   *
   * Not persisted: a filter is a question asked now, unlike the sort order and
   * the fold state, which are how the operator likes to read the list.
   *
   * @access protected
   * @since 6.0.0
   *
   * @type {WritableSignal<InterventionListFilters>}
   */
  protected readonly filters: WritableSignal<InterventionListFilters> =
    signal<InterventionListFilters>({
      status: null,
      type: null,
      site: null,
      responsible: null,
      dueWindow: null,
    });

  /**
   * Property sortOrder
   * @readonly
   *
   * @description
   * The ordering in force, restored from the last session. The page used to
   * hard-code `createdAt` descending with no control over it.
   *
   * @access protected
   * @since 6.0.0
   *
   * @type {WritableSignal<InterventionListSort>}
   */
  protected readonly sortOrder: WritableSignal<InterventionListSort> = signal<InterventionListSort>(
    this.preferences.readSort(),
  );

  /**
   * Property statusOptions
   * @readonly
   *
   * @description
   * Status choices for the filter surface, labelled from the tag registry.
   *
   * @access protected
   * @since 6.0.0
   *
   * @type {SelectOption<InterventionStatus>[]}
   */
  protected readonly statusOptions: SelectOption<InterventionStatus>[] =
    INTERVENTION_STATUS_FILTER_OPTIONS;

  /**
   * Property typeOptions
   * @readonly
   *
   * @description
   * Workflow-type choices for the filter surface.
   *
   * @access protected
   * @since 6.0.0
   *
   * @type {SelectOption<InterventionType>[]}
   */
  protected readonly typeOptions: SelectOption<InterventionType>[] =
    INTERVENTION_TYPE_FILTER_OPTIONS;

  /**
   * Property dueWindowOptions
   * @readonly
   *
   * @description
   * Named due-date windows for the filter surface.
   *
   * @access protected
   * @since 6.0.0
   *
   * @type {SelectOption<InterventionDueWindow>[]}
   */
  protected readonly dueWindowOptions: SelectOption<InterventionDueWindow>[] =
    INTERVENTION_DUE_WINDOW_OPTIONS;

  /**
   * Property sortOptions
   * @readonly
   *
   * @description
   * Orderings offered by the sort control.
   *
   * @access protected
   * @since 6.0.0
   *
   * @type {SelectOption<InterventionSortField>[]}
   */
  protected readonly sortOptions: SelectOption<InterventionSortField>[] = INTERVENTION_SORT_OPTIONS;

  /**
   * Property filterPopover
   * @readonly
   *
   * @description
   * The filter surface, anchored to the toolbar's "Filters" button — the same
   * shape the three neighbouring collection pages already use.
   *
   * @access protected
   * @since 6.0.0
   *
   * @type {Signal<Popover>}
   */
  protected readonly filterPopover: Signal<Popover> = viewChild.required<Popover>('filterPopover');

  /**
   * Property sortPopover
   * @readonly
   *
   * @description
   * The ordering surface, anchored to the toolbar's sort button.
   *
   * @access protected
   * @since 6.0.0
   *
   * @type {Signal<Popover>}
   */
  protected readonly sortPopover: Signal<Popover> = viewChild.required<Popover>('sortPopover');

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
    const memberId: string | undefined = this.memberAccess.profile()?.id;

    return memberId ? `/api/organizations/${this.organizationId()}/members/${memberId}` : null;
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
   * Property visibleItems
   * @readonly
   *
   * @description
   * The rows every render draws from, with abandoned work included only when
   * the operator asked for it.
   *
   * One gate for three renders: "Show abandoned" used to exist on the Board
   * alone, so the same dataset read three different ways depending on which
   * tab was open.
   *
   * @access protected
   * @since 6.0.0
   *
   * @type {Signal<readonly InterventionListItemViewModel[]>}
   */
  protected readonly visibleItems: Signal<readonly InterventionListItemViewModel[]> = computed(() =>
    this.showAbandoned()
      ? this.items()
      : this.items().filter((item) => item.intervention.status !== 'abandoned'),
  );

  /**
   * Property overdueCount
   * @readonly
   *
   * @description
   * How many of the loaded interventions are past their due date, for the
   * page subtitle.
   *
   * @access protected
   * @since 6.0.0
   *
   * @type {Signal<number>}
   */
  /**
   * Property calendarFilters
   * @readonly
   *
   * @description
   * The narrowing the calendar can honour. The due-date window is left out on
   * purpose: the calendar's visible month already is its date filter, and a
   * second bound would fight it.
   *
   * @access protected
   * @since 6.0.0
   *
   * @type {Signal<InterventionCalendarFilters>}
   */
  protected readonly calendarFilters: Signal<InterventionCalendarFilters> =
    computed<InterventionCalendarFilters>(() => {
      const active: InterventionListFilters = this.filters();
      const narrowing: {
        -readonly [Key in keyof InterventionCalendarFilters]: InterventionCalendarFilters[Key];
      } = {};

      if (active.status) narrowing.status = active.status;
      if (active.type) narrowing.type = active.type;
      if (active.site) narrowing.site = active.site;
      if (active.responsible) narrowing.responsible = active.responsible;

      return narrowing;
    });

  /**
   * Property calendarInterventions
   * @readonly
   *
   * @description
   * What the calendar draws, with abandoned work included only when the
   * operator asked for it — the same gate the list and board apply.
   *
   * @access protected
   * @since 6.0.0
   *
   * @type {Signal<readonly InterventionOutput[]>}
   */
  protected readonly calendarInterventions: Signal<readonly InterventionOutput[]> = computed<
    readonly InterventionOutput[]
  >(() =>
    this.showAbandoned()
      ? this.calendarStore.interventions()
      : this.calendarStore
          .interventions()
          .filter((intervention) => intervention.status !== 'abandoned'),
  );

  protected readonly overdueCount: Signal<number> = computed<number>(
    () => this.visibleItems().filter((item) => item.isOverdue).length,
  );

  /**
   * Property subtitle
   * @readonly
   *
   * @description
   * Sizes the list in one sentence, and says how much of it is late. Replaces
   * the bare count that was hidden below `lg` — the width at which it was
   * needed most.
   *
   * @access protected
   * @since 6.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly subtitle: Signal<string> = computed<string>(() => {
    const total: number = this.loadedCount();
    const overdue: number = this.overdueCount();

    const counted: string =
      total === 1
        ? $localize`:@@intervention.list.countOne:1 intervention`
        : $localize`:@@intervention.list.countMany:${total}:count: interventions`;

    if (overdue === 0) return counted;

    return overdue === 1
      ? $localize`:@@intervention.list.countOverdueOne:${counted}:counted: · 1 overdue`
      : $localize`:@@intervention.list.countOverdueMany:${counted}:counted: · ${overdue}:overdue: overdue`;
  });

  /**
   * Property activeFilterCount
   * @readonly
   *
   * @description
   * How many narrowings are in force, for the badge on the filters button.
   *
   * @access protected
   * @since 6.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly activeFilterCount: Signal<number> = computed<number>(() =>
    countActiveFilters(this.filters()),
  );

  /**
   * Property filterBadge
   * @readonly
   *
   * @description
   * The badge value PrimeNG renders on the filters button — empty when nothing
   * is filtered, since `p-button` draws a dot for any non-empty string.
   *
   * @access protected
   * @since 6.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly filterBadge: Signal<string> = computed<string>(() => {
    const count: number = this.activeFilterCount();

    return count > 0 ? String(count) : '';
  });

  /**
   * Property sortLabel
   * @readonly
   *
   * @description
   * Label of the active ordering, shown on the sort control.
   *
   * @access protected
   * @since 6.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly sortLabel: Signal<string> = computed<string>(() => {
    const field: InterventionSortField = this.sortOrder().field;

    return this.sortOptions.find((option) => option.value === field)?.label ?? field;
  });

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
      const items: readonly InterventionListItemViewModel[] = this.visibleItems();
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
      const items: readonly InterventionListItemViewModel[] = this.visibleItems();
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
   * Stable identifier resolver forwarded to `app-board`.
   *
   * @access protected
   * @since 5.0.0
   *
   * @type {(item: InterventionListItemViewModel) => string}
   */
  protected readonly itemId = (item: InterventionListItemViewModel): string => item.intervention.id;

  /**
   * Property collapsedGroups
   * @readonly
   *
   * @description
   * Ids of the collapsed list sections. Seeded with the terminal statuses so
   * `published` and `abandoned` start folded away.
   *
   * @access private
   * @since 5.4.0
   *
   * @type {WritableSignal<ReadonlySet<string>>}
   */
  private readonly collapsedGroups: WritableSignal<ReadonlySet<string>> = signal<
    ReadonlySet<string>
  >(this.preferences.readCollapsedGroups());

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

  /**
   * Property avatarPt
   * @readonly
   *
   * @description
   * Pass-through giving every stacked member avatar the compact ~20px
   * footprint.
   *
   * @access protected
   * @since 5.1.0
   *
   * @type {AvatarPassThroughOptions}
   */
  protected readonly avatarPt: AvatarPassThroughOptions = COMPACT_AVATAR_PT;

  /**
   * Property avatarMax
   * @readonly
   *
   * @description
   * How many member avatars render before the stack collapses the rest into
   * a `+N` avatar.
   *
   * @access protected
   * @since 5.1.0
   *
   * @type {number}
   */
  protected readonly avatarMax: number = MEMBER_AVATAR_MAX;
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
      const organizationId: string = this.organizationId();
      const options: InterventionListOptions = buildInterventionListOptions(
        this.filters(),
        this.sortOrder(),
        this.q().trim(),
        new Date(),
      );

      this.store.load({ organizationId, options });
    });

    effect(() => {
      const organizationId: string = this.organizationId();
      if (organizationId === this.lastPlanningOptionsOrganizationId) return;

      this.lastPlanningOptionsOrganizationId = organizationId;
      this.planningOptions.loadCreationOptions(organizationId);
    });

    effect(() => {
      const isCalendarActive: boolean = this.view() === 'calendar';
      const organizationId: string = this.organizationId();
      const focused: Date = this.calendarFocusedDate();
      if (!isCalendarActive) return;

      const filters: InterventionCalendarFilters = this.calendarFilters();
      const key = `${organizationId ?? ''}:${focused.getFullYear()}-${focused.getMonth()}:${JSON.stringify(filters)}`;
      if (key === this.lastCalendarWindowKey) return;

      this.lastCalendarWindowKey = key;
      this.calendarStore.load({
        organizationId,
        window: this.calendarWindowFor(focused),
        filters,
      });
    });

    effect(() => {
      if (!this.create()) return;

      untracked((): void => {
        this.openCreate();
        this.navigateQuery({ create: null });
      });
    });

    effect(() => {
      const created: InterventionOutput | null = this.store.createdIntervention();
      if (!created) return;

      this.store.clearCreatedIntervention();
      void this.router.navigate([
        '/organizations',
        this.organizationId(),
        'interventions',
        created.id,
      ]);
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
    const organizationId: string = this.organizationId();
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
    const organizationId: string = this.organizationId();

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
   * Method submitCreate
   * @method submitCreate
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
  protected submitCreate(values: InterventionCreateFormValues): void {
    const organizationId: string = this.organizationId();

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
   * Narrows a projected card template's implicit value back to
   * {@link InterventionListItemViewModel}. The `[appBoardCard]` directive is
   * generic with no input carrying `T`, so Angular's template checker infers
   * `T = unknown` inside it; this single cast keeps the rest of the template
   * typed.
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
   * Resolves a member IRI to an {@link MemberAvatar} through
   * {@link memberDisplayMap}, falling back to a generic label when the
   * planning-options member list hasn't loaded that member yet.
   *
   * @access private
   * @since 5.0.0
   *
   * @param {string} memberIri - Member IRI (`/api/organizations/.../members/...`).
   * @returns {MemberAvatar} The resolved (or generic fallback) person.
   */
  private toPerson(memberIri: string): MemberAvatar {
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
   * Method initialsFor
   * @method initialsFor
   *
   * @description
   * Derives up to two uppercase initials from a display label, for a stacked
   * avatar with no image.
   *
   * @access protected
   * @since 5.1.0
   *
   * @param {string} label - Display name to derive initials from.
   * @returns {string} The derived initials, or an empty string for a blank label.
   */
  protected initialsFor(label: string): string {
    return deriveInitials(label);
  }

  /**
   * Method isGroupCollapsed
   * @method isGroupCollapsed
   *
   * @description
   * Whether a list section currently renders folded.
   *
   * @access protected
   * @since 5.4.0
   *
   * @param {string} groupId - Status id of the section.
   * @returns {boolean} `true` when the section is collapsed.
   */
  protected isGroupCollapsed(groupId: string): boolean {
    return this.collapsedGroups().has(groupId);
  }

  /**
   * Method onGroupCollapsedChange
   * @method onGroupCollapsedChange
   *
   * @description
   * Records a section's fold state so it survives re-renders of the list.
   *
   * @access protected
   * @since 5.4.0
   *
   * @param {string} groupId - Status id of the section.
   * @param {boolean | undefined} collapsed - Whether the section is now
   *   collapsed. PrimeNG types the emission as optional; absent reads as open.
   * @returns {void}
   */
  /**
   * Method groupPanelPt
   * @method groupPanelPt
   *
   * @description
   * Names the section's toggle and exposes its expanded state on the focusable
   * `<button>`. `p-panel` derives its own `aria-label` from the plain `header`
   * input — unused here because the header is a template — and puts
   * `aria-expanded` on the non-focusable `p-button` host, so neither reaches
   * assistive tech without this.
   *
   * @access protected
   * @since 5.4.0
   *
   * @param {string} groupId - Status id of the section.
   * @param {string} label - Human status label announced for the toggle.
   * @returns {PanelPassThroughOptions} Pass-through carrying the ARIA state.
   */
  protected groupPanelPt(groupId: string, label: string): PanelPassThroughOptions {
    const expanded: boolean = !this.isGroupCollapsed(groupId);
    return {
      pcToggleButton: {
        root: {
          'aria-label': expanded
            ? $localize`:@@intervention.list.collapseGroup:Collapse ${label}:status: interventions`
            : $localize`:@@intervention.list.expandGroup:Expand ${label}:status: interventions`,
          'aria-expanded': String(expanded),
        },
      },
    };
  }

  protected onGroupCollapsedChange(groupId: string, collapsed: boolean | undefined): void {
    const next: Set<string> = new Set<string>(this.collapsedGroups());
    if (collapsed === true) {
      next.add(groupId);
    } else {
      next.delete(groupId);
    }
    this.collapsedGroups.set(next);
    this.persistPreferences();
  }

  /**
   * Method toggleAbandoned
   * @method toggleAbandoned
   *
   * @description
   * Shows or hides abandoned interventions, in every render rather than the
   * board alone, and remembers the choice.
   *
   * @access protected
   * @since 6.0.0
   *
   * @returns {void}
   */
  protected toggleAbandoned(): void {
    this.showAbandoned.set(!this.showAbandoned());
    this.persistPreferences();
  }

  /**
   * Method selectSortField
   * @method selectSortField
   *
   * @description
   * Reorders the collection on another field, keeping the current direction.
   *
   * @access protected
   * @since 6.0.0
   *
   * @param {InterventionSortField} field - Field to order by.
   * @returns {void}
   */
  protected selectSortField(field: InterventionSortField): void {
    this.sortOrder.set({ field, direction: this.sortOrder().direction });
    this.persistPreferences();
  }

  /**
   * Method toggleSortDirection
   * @method toggleSortDirection
   *
   * @description
   * Flips the ordering between ascending and descending.
   *
   * @access protected
   * @since 6.0.0
   *
   * @returns {void}
   */
  protected toggleSortDirection(): void {
    const current: InterventionListSort = this.sortOrder();
    this.sortOrder.set({
      field: current.field,
      direction: current.direction === 'asc' ? 'desc' : 'asc',
    });
    this.persistPreferences();
  }

  /**
   * Method applyFilter
   * @method applyFilter
   *
   * @description
   * Replaces one narrowing. An `undefined` value — what `p-select` emits when
   * its clear affordance is used — resets that field.
   *
   * @access protected
   * @since 6.0.0
   *
   * @param {Key} key - Field to change.
   * @param {InterventionListFilters[Key] | undefined} value - New value, or undefined to clear.
   * @returns {void}
   */
  protected applyFilter<Key extends keyof InterventionListFilters>(
    key: Key,
    value: InterventionListFilters[Key] | undefined,
  ): void {
    this.filters.set({ ...this.filters(), [key]: value ?? null });
  }

  /**
   * Method toggleFilterPopover
   * @method toggleFilterPopover
   *
   * @description
   * Opens or closes the filter surface, anchored to its toolbar button.
   *
   * @access protected
   * @since 6.0.0
   *
   * @param {Event} event - Click that anchors the popover.
   * @returns {void}
   */
  protected toggleFilterPopover(event: Event): void {
    this.filterPopover().toggle(event);
  }

  /**
   * Method toggleSortPopover
   * @method toggleSortPopover
   *
   * @description
   * Opens or closes the ordering surface, anchored to its toolbar button.
   *
   * @access protected
   * @since 6.0.0
   *
   * @param {Event} event - Click that anchors the popover.
   * @returns {void}
   */
  protected toggleSortPopover(event: Event): void {
    this.sortPopover().toggle(event);
  }

  /**
   * Method clearFilters
   * @method clearFilters
   *
   * @description
   * Drops every narrowing at once. The search box is deliberately left alone:
   * it is visible, so clearing it silently would be a surprise.
   *
   * @access protected
   * @since 6.0.0
   *
   * @returns {void}
   */
  protected clearFilters(): void {
    this.filters.set({
      status: null,
      type: null,
      site: null,
      responsible: null,
      dueWindow: null,
    });
  }

  /**
   * Method persistPreferences
   * @method persistPreferences
   *
   * @description
   * Writes the whole remembered shape after any of its parts changes.
   *
   * @access private
   * @since 6.0.0
   *
   * @returns {void}
   */
  private persistPreferences(): void {
    this.preferences.write(this.showAbandoned(), this.collapsedGroups(), this.sortOrder());
  }

  /**
   * Method overflowTooltip
   * @method overflowTooltip
   *
   * @description
   * Names the members hidden behind the stack's `+N` avatar, so the overflow
   * is not an opaque count.
   *
   * @access protected
   * @since 5.1.0
   *
   * @param {readonly MemberAvatar[]} people - Full member list of the stack.
   * @returns {string} Comma-separated labels of the hidden members.
   */
  protected overflowTooltip(people: readonly MemberAvatar[]): string {
    return people
      .slice(MEMBER_AVATAR_MAX)
      .map((person: MemberAvatar): string => person.tooltip ?? person.label)
      .join(', ');
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
