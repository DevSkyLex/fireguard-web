import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  HostListener,
  inject,
  input,
  numberAttribute,
  signal,
  type InputSignalWithTransform,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TooltipModule } from 'primeng/tooltip';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  InterventionBoardColumnId,
  InterventionListOptions,
  InterventionOutput,
} from '@features/organization/features/interventions/models';
import {
  InterventionStore,
  type InterventionStoreType,
} from '@features/organization/features/interventions/state';
import {
  InterventionBoardStore,
  type InterventionBoardStoreType,
} from '@features/organization/features/interventions/state/intervention-board';
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
  InterventionBoard,
  InterventionCalendar,
  InterventionMetric,
  type InterventionBoardAdvanceEvent,
} from '@features/organization/features/interventions/ui/components';
import { InterventionCreateDrawer } from '@features/organization/features/interventions/ui/drawers';
import type { InterventionCreateFormValues } from '@features/organization/features/interventions/ui/forms';
import { InterventionTable } from '@features/organization/features/interventions/ui/tables';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';

/**
 * Default hour (local) pre-filled as the planned start when an intervention is
 * created from a calendar day.
 */
const DEFAULT_PLANNED_HOUR = 9;

/**
 * Returns midnight (local time) of the given date, dropping the time component.
 *
 * @param {Date} date - Reference date.
 * @returns {Date} Local start-of-day for the date.
 */
function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Type InterventionsView
 *
 * @description
 * The three presentations the interventions index can render: the workflow
 * pipeline board (`board`, the default), the paginated planner table (`list`)
 * and the scheduling calendar (`calendar`).
 *
 * @since 2.0.0
 */
export type InterventionsView = 'board' | 'list' | 'calendar';

/**
 * Interface InterventionsViewOption
 *
 * @description
 * A single entry of the page-level view switch, mapping a {@link InterventionsView}
 * value to its segmented-button label and icon.
 *
 * @since 2.0.0
 */
interface InterventionsViewOption {
  /**
   * Property label
   * @readonly
   *
   * @description
   * Human-readable label rendered inside the segmented button.
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property value
   * @readonly
   *
   * @description
   * View this option activates when selected.
   *
   * @type {InterventionsView}
   */
  readonly value: InterventionsView;

  /**
   * Property icon
   * @readonly
   *
   * @description
   * PrimeIcon class shown next to the label.
   *
   * @type {string}
   */
  readonly icon: string;
}

/**
 * Component InterventionsPage
 * @class InterventionsPage
 *
 * @description
 * Route entry page for the organization interventions index. Hosts the workflow
 * pipeline board, the planner table and the scheduling calendar as three
 * interchangeable views of the same intervention collection, switched through a
 * `?view=` query parameter, and orchestrates the shared guided-creation flow
 * (pre-filling the planned start when created from a calendar day) and
 * navigation into an intervention.
 *
 * The three views own different load shapes, so each keeps its own store: the
 * board fetches a bounded page of cards per lane through
 * {@link InterventionBoardStore}; the table paginates server-side through
 * {@link InterventionStore}; the calendar loads a bounded date window through
 * {@link InterventionCalendarStore}. Board cards and calendar data are fetched
 * lazily, only while their view is active, while the lightweight per-status
 * counts feeding the metric strip refresh on every view.
 *
 * @version 2.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-interventions-page',
  imports: [
    ButtonModule,
    FormsModule,
    InterventionBoard,
    InterventionCalendar,
    InterventionCreateDrawer,
    InterventionMetric,
    InterventionTable,
    SelectButtonModule,
    TooltipModule,
  ],
  providers: [
    InterventionStore,
    InterventionBoardStore,
    InterventionCalendarStore,
    InterventionPlanningOptionsStore,
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
   * Property router
   * @readonly
   *
   * @description
   * Angular Router used to switch view, page and navigate into interventions.
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
   * Current activated route, used to update the `?page=` query param while
   * preserving the other query params.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {ActivatedRoute}
   */
  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);

  /**
   * Property permissionService
   * @readonly
   *
   * @description
   * Resolves the current member's organization permissions used to derive the
   * board's `canPlan`/`canExecute`/`canReview`/`canPublish` capability inputs so
   * disallowed workflow moves are never offered.
   *
   * @access private
   * @since 2.3.0
   *
   * @type {OrganizationPermissionService}
   */
  private readonly permissionService: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );

  /**
   * Property confirmationService
   * @readonly
   *
   * @description
   * Confirmation service guarding the destructive "Abandon" action triggered
   * from the pipeline board card menu.
   *
   * @access private
   * @since 2.3.0
   *
   * @type {ConfirmationService}
   */
  private readonly confirmationService: ConfirmationService =
    inject<ConfirmationService>(ConfirmationService);

  /**
   * Property store
   * @readonly
   *
   * @description
   * Component-scoped intervention store powering the paginated table view.
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
   * Component-scoped store providing every organization intervention and the
   * current member IRI used by the calendar view's assignment filter.
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
   * Component-scoped store providing site and member selector options for the
   * guided creation drawer, loaded lazily when the drawer opens.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {InterventionPlanningOptionsStoreType}
   */
  protected readonly planningOptions: InterventionPlanningOptionsStoreType =
    inject<InterventionPlanningOptionsStoreType>(InterventionPlanningOptionsStore);

  /**
   * Property boardStore
   * @readonly
   *
   * @description
   * Component-scoped store powering the pipeline board view: a bounded page of
   * cards per workflow lane plus optimistic status moves. Loaded lazily while
   * the board view is active.
   *
   * @access protected
   * @since 2.2.0
   *
   * @type {InterventionBoardStoreType}
   */
  protected readonly boardStore: InterventionBoardStoreType =
    inject<InterventionBoardStoreType>(InterventionBoardStore);

  /**
   * Property plannedTotal
   * @readonly
   *
   * @description
   * Server-reported total of interventions in the `planned` lane, backing the
   * metric strip's "Planned" card.
   *
   * @access protected
   * @since 4.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly plannedTotal: Signal<number> = computed<number>(() =>
    this.laneTotal('planned'),
  );

  /**
   * Property inProgressTotal
   * @readonly
   *
   * @description
   * Server-reported total of interventions in the `in_progress` lane, backing
   * the metric strip's "In progress" card.
   *
   * @access protected
   * @since 4.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly inProgressTotal: Signal<number> = computed<number>(() =>
    this.laneTotal('in_progress'),
  );

  /**
   * Property inReviewTotal
   * @readonly
   *
   * @description
   * Server-reported total of interventions in the `review` lane (fusing the
   * `submitted` and `changes_requested` statuses), backing the metric strip's
   * "In review" card.
   *
   * @access protected
   * @since 4.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly inReviewTotal: Signal<number> = computed<number>(() =>
    this.laneTotal('review'),
  );

  /**
   * Property publishedTotal
   * @readonly
   *
   * @description
   * Server-reported total of interventions in the terminal `published` lane,
   * backing the metric strip's "Published" card.
   *
   * @access protected
   * @since 4.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly publishedTotal: Signal<number> = computed<number>(() =>
    this.laneTotal('published'),
  );

  /**
   * Property canPlan
   * @readonly
   *
   * @description
   * Whether the current user may plan interventions, forwarded to the board so a
   * read-only user is never offered a plan-gated drag or menu action.
   *
   * @access protected
   * @since 2.3.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canPlan: Signal<boolean> = computed<boolean>(() =>
    this.permissionService.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN),
  );

  /**
   * Property canExecute
   * @readonly
   *
   * @description
   * Whether the current user may execute interventions, forwarded to the board.
   *
   * @access protected
   * @since 2.3.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canExecute: Signal<boolean> = computed<boolean>(() =>
    this.permissionService.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_EXECUTE),
  );

  /**
   * Property canReview
   * @readonly
   *
   * @description
   * Whether the current user may review interventions, forwarded to the board.
   *
   * @access protected
   * @since 2.3.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canReview: Signal<boolean> = computed<boolean>(() =>
    this.permissionService.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_REVIEW),
  );

  /**
   * Property canPublish
   * @readonly
   *
   * @description
   * Whether the current user may publish interventions, forwarded to the board.
   *
   * @access protected
   * @since 2.3.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canPublish: Signal<boolean> = computed<boolean>(() =>
    this.permissionService.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_PUBLISH),
  );

  /**
   * Input view
   * @readonly
   *
   * @description
   * Active view, bound from the `?view=` query param (or the route `view` data on
   * the `/interventions/calendar` entry) via `withComponentInputBinding`. Any
   * value other than `calendar` resolves to `list`.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignalWithTransform<InterventionsView, unknown>}
   */
  public readonly view: InputSignalWithTransform<InterventionsView, unknown> = input<
    InterventionsView,
    unknown
  >('board', {
    transform: (value: unknown): InterventionsView =>
      value === 'calendar' ? 'calendar' : value === 'list' ? 'list' : 'board',
  });

  /**
   * Input page
   * @readonly
   *
   * @description
   * Current page number bound from the `?page=` query param via
   * `withComponentInputBinding`, forwarded to the table as `initialPage`.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignalWithTransform<number, unknown>}
   */
  public readonly page: InputSignalWithTransform<number, unknown> = input<number, unknown>(1, {
    transform: (value: unknown): number => Math.max(1, numberAttribute(value, 1)),
  });

  /**
   * Property viewOptions
   * @readonly
   *
   * @description
   * Segmented-button options driving the page-level view switch.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {InterventionsViewOption[]}
   */
  protected readonly viewOptions: InterventionsViewOption[] = [
    {
      label: $localize`:@@intervention.view.board:Pipeline`,
      value: 'board',
      icon: 'pi pi-objects-column',
    },
    { label: $localize`:@@intervention.view.list:List`, value: 'list', icon: 'pi pi-table' },
    {
      label: $localize`:@@intervention.view.calendar:Calendar`,
      value: 'calendar',
      icon: 'pi pi-calendar',
    },
  ];

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
   * Planned start pre-filled in the creation drawer when a day is chosen in the
   * calendar; null when creating from the generic "New intervention" action.
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
   * Date the calendar is currently focused on, seeded to today and updated from
   * the calendar's `focusedDateChange` output. Drives the bounded window the
   * calendar dataset is fetched for, so the calendar only loads the visible
   * month (± one month) instead of the whole organization history.
   *
   * @access protected
   * @since 4.1.0
   *
   * @type {WritableSignal<Date>}
   */
  protected readonly calendarFocusedDate: WritableSignal<Date> = signal<Date>(
    startOfLocalDay(new Date()),
  );

  /**
   * Property lastCalendarWindowKey
   *
   * @description
   * Organization-and-month key of the last calendar window loaded, used to skip
   * a redundant refetch when navigation stays inside the same month (or the same
   * window is otherwise re-derived).
   *
   * @access private
   * @since 4.1.0
   *
   * @type {string | null}
   */
  private lastCalendarWindowKey: string | null = null;
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Wires the three lazy data flows so each view only pays for what it renders:
   *
   * - the lightweight per-status counts feeding the metric strip refresh on
   *   every view whenever the active organization changes, so the strip stays
   *   populated on the list and calendar views without the board card fetch;
   * - the heavier board card pages load only while the board view is active;
   * - the calendar dataset loads only while the calendar view is active.
   *
   * @since 2.0.0
   */
  public constructor() {
    effect(() => {
      this.boardStore.loadCounts({
        organizationId: this.organization.selectedOrganization()?.id ?? null,
      });
    });

    effect(() => {
      if (this.view() !== 'board') return;
      this.boardStore.load({
        organizationId: this.organization.selectedOrganization()?.id ?? null,
      });
    });

    effect(() => {
      if (this.view() !== 'calendar') return;
      const organizationId: string | null = this.organization.selectedOrganization()?.id ?? null;
      const focused: Date = this.calendarFocusedDate();
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
   * Method setView
   * @method setView
   *
   * @description
   * Switches the active view by updating the `?view=` query param on the
   * interventions index (omitting it for the default list view) and dropping the
   * stale `?page=`.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {InterventionsView} view - View selected in the switch.
   * @returns {void}
   */
  protected setView(view: InterventionsView): void {
    const organizationId: string | undefined = this.organizationId();
    if (!organizationId) return;

    void this.router.navigate(['/organizations', organizationId, 'interventions'], {
      queryParams: { view: view === 'board' ? null : view, page: null },
      queryParamsHandling: 'merge',
    });
  }

  /**
   * Method onViewShortcut
   * @method onViewShortcut
   *
   * @description
   * Cycles through the pipeline, list and calendar views when the user presses
   * `V`. The accelerator stands down while a modifier is held, the creation
   * drawer is open, or focus sits in a text-entry surface, so it never hijacks
   * typing.
   *
   * @access protected
   * @since 2.1.0
   *
   * @param {KeyboardEvent} event - Originating keyboard event.
   * @returns {void}
   */
  @HostListener('document:keydown', ['$event'])
  protected onViewShortcut(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key.toLowerCase() !== 'v') return;
    if (this.createDrawerVisible() || this.isEditableTarget(event.target)) return;

    event.preventDefault();
    const order: readonly InterventionsView[] = ['board', 'list', 'calendar'];
    const next: InterventionsView = order[(order.indexOf(this.view()) + 1) % order.length];
    this.setView(next);
  }

  /**
   * Method isEditableTarget
   * @method isEditableTarget
   *
   * @description
   * Whether the event target is a text-entry surface (input, textarea, select or
   * contenteditable element), in which case keyboard accelerators must stand down.
   *
   * @access private
   * @since 2.1.0
   *
   * @param {EventTarget | null} target - Event target to test.
   * @returns {boolean} True when the target accepts text entry.
   */
  private isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    if (target.isContentEditable) return true;
    const tag: string = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  }

  /**
   * Method onLoad
   * @method onLoad
   *
   * @description
   * Forwards the table lazy-load params to the store for the active organization.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {InterventionListOptions} options - Pagination, filter and sort params emitted by the table.
   * @returns {void}
   */
  protected onLoad(options: InterventionListOptions): void {
    const organizationId: string | undefined = this.organizationId();
    if (organizationId) {
      this.store.load({ organizationId, options });
    }
  }

  /**
   * Method onPageChange
   * @method onPageChange
   *
   * @description
   * Updates the `?page=` query param when the user changes page, omitting page 1.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {number} page - One-based page number selected in the table.
   * @returns {void}
   */
  protected onPageChange(page: number): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: page > 1 ? page : null },
      queryParamsHandling: 'merge',
    });
  }

  /**
   * Method openCreate
   * @method openCreate
   *
   * @description
   * Opens the creation drawer with no pre-filled day (toolbar action of either view).
   *
   * @access protected
   * @since 2.0.0
   *
   * @returns {void}
   */
  protected openCreate(): void {
    this.initialPlannedStartAt.set(null);
    this.openDrawer();
  }

  /**
   * Method openCreateOnDay
   * @method openCreateOnDay
   *
   * @description
   * Opens the creation drawer pre-filling the planned start to the chosen calendar
   * day at the default planning hour.
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
    this.openDrawer();
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
   * Method create
   * @method create
   *
   * @description
   * Routes the validated draft through {@link InterventionStore.create}. The
   * store owns the request state (`isCreating` drives the drawer, `createFailed`
   * surfaces a toast) and, on success, publishes the created intervention through
   * `createdIntervention`, which the constructor effect consumes to navigate into
   * the new workspace.
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
   * Method onView
   * @method onView
   *
   * @description
   * Navigates to the detail page of the selected intervention.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionOutput} intervention - Intervention selected in either view.
   * @returns {void}
   */
  protected onView(intervention: InterventionOutput): void {
    const organizationId: string | undefined = this.organizationId();
    if (organizationId) {
      void this.router.navigate([
        '/organizations',
        organizationId,
        'interventions',
        intervention.id,
      ]);
    }
  }

  /**
   * Method onAdvance
   * @method onAdvance
   *
   * @description
   * Applies an optimistic workflow advance emitted by the pipeline board (drag
   * or action menu) through the board store.
   *
   * @access protected
   * @since 2.2.0
   *
   * @param {InterventionBoardAdvanceEvent} event - Card and target status.
   * @returns {void}
   */
  protected onAdvance(event: InterventionBoardAdvanceEvent): void {
    this.boardStore.move(event);
  }

  /**
   * Method onLoadMore
   * @method onLoadMore
   *
   * @description
   * Reveals the next bounded page of one pipeline lane through the board store's
   * incremental load, requested from the lane footer.
   *
   * @access protected
   * @since 4.1.0
   *
   * @param {InterventionBoardColumnId} columnId - Lane whose next page is requested.
   * @returns {void}
   */
  protected onLoadMore(columnId: InterventionBoardColumnId): void {
    this.boardStore.loadMore({ organizationId: this.organizationId() ?? null, columnId });
  }

  /**
   * Method onAbandon
   * @method onAbandon
   *
   * @description
   * Confirms then moves the intervention to `abandoned` through the board store's
   * optimistic status move, reusing the destructive-confirmation pattern from the
   * detail workspace. The board menu already gates the action by workflow
   * legality and RBAC, so the confirm is the final safety step.
   *
   * @access protected
   * @since 2.3.0
   *
   * @param {InterventionOutput} intervention - Intervention to abandon.
   * @returns {void}
   */
  protected onAbandon(intervention: InterventionOutput): void {
    this.confirmationService.confirm({
      header: $localize`:@@intervention.abandon.header:Abandon intervention`,
      message: $localize`:@@intervention.abandon.message:Abandon this intervention? It leaves the active workflow and cannot be resumed.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: {
        label: $localize`:@@intervention.abandon.accept:Abandon`,
        severity: 'danger',
      },
      rejectButtonProps: {
        label: $localize`:@@common.cancel:Cancel`,
        severity: 'secondary',
        outlined: true,
      },
      accept: (): void => void this.boardStore.move({ intervention, toStatus: 'abandoned' }),
    });
  }

  /**
   * Method retryBoard
   * @method retryBoard
   *
   * @description
   * Re-triggers the pipeline board load for the active organization after a
   * failed fetch, from the board's inline error surface.
   *
   * @access protected
   * @since 2.3.0
   *
   * @returns {void}
   */
  protected retryBoard(): void {
    this.boardStore.load({ organizationId: this.organizationId() ?? null });
  }

  /**
   * Method openDrawer
   * @method openDrawer
   *
   * @description
   * Lazily loads the creation selector options and opens the drawer.
   *
   * @access private
   * @since 2.0.0
   *
   * @returns {void}
   */
  private openDrawer(): void {
    this.planningOptions.loadCreationOptions(this.organizationId() ?? null);
    this.createDrawerVisible.set(true);
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
   * Method laneTotal
   * @method laneTotal
   *
   * @description
   * Server-reported total for one pipeline lane, read from the board store's
   * per-lane bucket. Backs the metric strip's four per-variant computed totals.
   *
   * @access private
   * @since 4.0.0
   *
   * @param {InterventionBoardColumnId} columnId - Lane identifier.
   *
   * @returns {number} Total for the lane, or `0` when the lane has not loaded.
   */
  private laneTotal(columnId: InterventionBoardColumnId): number {
    return this.boardStore.columns().find((column) => column.id === columnId)?.total ?? 0;
  }

  /**
   * Method calendarWindowFor
   * @method calendarWindowFor
   *
   * @description
   * Bounded date window the calendar dataset is fetched for: the focused month
   * padded by one month on each side, so navigating one step always keeps the
   * adjacent months populated. Both bounds are inclusive local instants.
   *
   * @access private
   * @since 4.1.0
   *
   * @param {Date} focused - Date the calendar is focused on.
   *
   * @returns {InterventionCalendarWindow} Inclusive window to fetch.
   */
  private calendarWindowFor(focused: Date): InterventionCalendarWindow {
    return {
      after: new Date(focused.getFullYear(), focused.getMonth() - 1, 1, 0, 0, 0, 0),
      before: new Date(focused.getFullYear(), focused.getMonth() + 2, 0, 23, 59, 59, 999),
    };
  }
  //#endregion
}
