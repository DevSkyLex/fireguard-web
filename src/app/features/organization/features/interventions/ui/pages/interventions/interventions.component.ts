import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  numberAttribute,
  signal,
  type InputSignalWithTransform,
  type WritableSignal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import type {
  InterventionListOptions,
  InterventionOutput,
} from '@features/organization/features/interventions/models';
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
  InterventionSummaryStore,
  type InterventionSummaryStoreType,
} from '@features/organization/features/interventions/state/intervention-summary';
import { InterventionCalendar } from '@features/organization/features/interventions/ui/components';
import { InterventionCreateDrawer } from '@features/organization/features/interventions/ui/drawers';
import type { InterventionCreateFormValues } from '@features/organization/features/interventions/ui/forms';
import { InterventionTable } from '@features/organization/features/interventions/ui/tables';
import { ActiveOrganizationStore } from '@features/organization/state';
import { MetricCard } from '@shared/components';

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
 * Component InterventionsPage
 * @class InterventionsPage
 *
 * @description
 * Route entry page for the organization interventions index, laid out as a
 * dashboard rather than switchable views: a workflow-health metric strip
 * ({@link InterventionSummaryStore}), the paginated planner table
 * ({@link InterventionStore}) and the scheduling calendar
 * ({@link InterventionCalendarStore}) are shown together as adjacent cards. The
 * page orchestrates the shared guided-creation flow (pre-filling the planned
 * start when created from a calendar day) and navigation into an intervention.
 *
 * Each surface owns its own load shape: the table paginates server-side; the
 * calendar loads a bounded date window (the visible month ± one month, refetched
 * as the month changes); the metric strip loads the full organization set once.
 *
 * @version 4.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-interventions-page',
  imports: [
    ButtonModule,
    InterventionCalendar,
    InterventionCreateDrawer,
    InterventionTable,
    MetricCard,
  ],
  providers: [
    InterventionStore,
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
   * Property router
   * @readonly
   *
   * @description
   * Angular Router used to change page and navigate into interventions.
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
   * Property store
   * @readonly
   *
   * @description
   * Component-scoped intervention store powering the paginated table card.
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
   * Component-scoped store providing the bounded-window interventions and the
   * current member IRI used by the calendar card's assignment filter.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {InterventionCalendarStoreType}
   */
  protected readonly calendarStore: InterventionCalendarStoreType =
    inject<InterventionCalendarStoreType>(InterventionCalendarStore);

  /**
   * Property summaryStore
   * @readonly
   *
   * @description
   * Component-scoped store providing the organization-wide intervention set and
   * the workflow-health KPIs rendered in the dashboard metric strip.
   *
   * @access protected
   * @since 4.0.0
   *
   * @type {InterventionSummaryStoreType}
   */
  protected readonly summaryStore: InterventionSummaryStoreType =
    inject<InterventionSummaryStoreType>(InterventionSummaryStore);

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

  /**
   * Property lastSummaryOrganizationId
   *
   * @description
   * Organization the metric strip was last loaded for, used to skip a redundant
   * refetch when the effect re-runs without an organization change.
   *
   * @access private
   * @since 4.0.0
   *
   * @type {string | null}
   */
  private lastSummaryOrganizationId: string | null = null;
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Wires the calendar's windowed load (bounded to the visible month) and the
   * metric strip's organization-wide load, and navigates into a newly created
   * intervention once the store publishes it.
   *
   * @since 2.0.0
   */
  public constructor() {
    effect(() => {
      const organizationId: string | null = this.organization.selectedOrganization()?.id ?? null;
      const focused: Date = this.calendarFocusedDate();
      const key = `${organizationId ?? ''}:${focused.getFullYear()}-${focused.getMonth()}`;
      if (key === this.lastCalendarWindowKey) return;

      this.lastCalendarWindowKey = key;
      this.calendarStore.load({ organizationId, window: this.calendarWindowFor(focused) });
    });

    effect(() => {
      const organizationId: string | null = this.organization.selectedOrganization()?.id ?? null;
      if (organizationId === this.lastSummaryOrganizationId) return;

      this.lastSummaryOrganizationId = organizationId;
      this.summaryStore.load(organizationId);
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
   * Opens the creation drawer with no pre-filled day (page or card action).
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
   * store owns the request state and, on success, publishes the created
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
   * Method onView
   * @method onView
   *
   * @description
   * Navigates to the detail page of the selected intervention.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionOutput} intervention - Intervention selected in either card.
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
