import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { isCallSuccess } from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  CalendarFeedItem,
  CreateCalendarEventInput,
} from '@features/organization/features/calendar/models';
import {
  CalendarEventsStore,
  CalendarFeedStore,
  type CalendarEventsStoreType,
  type CalendarFeedRequest,
  type CalendarFeedStoreType,
} from '@features/organization/features/calendar/state';
import { CalendarEventDrawer } from '@features/organization/features/calendar/ui/drawers';
import type { CalendarEventFormValues } from '@features/organization/features/calendar/ui/forms';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import {
  Calendar,
  type CalendarCategoryGroup,
  type CalendarConfig,
  type CalendarEvent,
  type CalendarView,
} from '@shared/components';

/** Where a feed entry links to, by source. */
const TARGET_ROUTE: Readonly<Record<string, string | null>> = {
  intervention: 'interventions',
  inspection: 'inspections',
  maintenance: null,
  calendar_event: null,
};

/**
 * Component CalendarPage
 * @class CalendarPage
 *
 * @description
 * The organization calendar: interventions, inspections, maintenance and
 * standalone events on one grid.
 *
 * The window follows the focused month rather than a fixed range, so moving
 * through months refetches instead of loading a year nobody asked for.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  // `app-calendar` belongs to the shared grid component; a page reusing that
  // selector makes both match the same node (NG0300).
  selector: 'app-calendar-page',
  imports: [ButtonModule, Calendar, CalendarEventDrawer],
  providers: [CalendarFeedStore, CalendarEventsStore],
  host: { class: 'flex min-h-0 flex-1' },
  templateUrl: './calendar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarPage {
  //#region Properties
  /**
   * Property store
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {CalendarFeedStoreType}
   */
  protected readonly store: CalendarFeedStoreType =
    inject<CalendarFeedStoreType>(CalendarFeedStore);

  /**
   * Property eventStore
   * @readonly
   *
   * @description
   * Component-scoped mutation store backing the "New event" drawer.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {CalendarEventsStoreType}
   */
  protected readonly eventStore: CalendarEventsStoreType =
    inject<CalendarEventsStoreType>(CalendarEventsStore);

  /**
   * Property router
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property activeOrganizationStore
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActiveOrganizationStore}
   */
  private readonly activeOrganizationStore: ActiveOrganizationStore =
    inject<ActiveOrganizationStore>(ActiveOrganizationStore);

  /**
   * Property permissionService
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationPermissionService}
   */
  private readonly permissionService: OrganizationPermissionService =
    inject<OrganizationPermissionService>(OrganizationPermissionService);

  /**
   * Property focusedDate
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<Date>}
   */
  protected readonly focusedDate: WritableSignal<Date> = signal<Date>(new Date());

  /**
   * Property view
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<CalendarView>}
   */
  protected readonly view: WritableSignal<CalendarView> = signal<CalendarView>('month');

  /**
   * Property calendarConfig
   * @readonly
   *
   * @description
   * Restricts the toolbar to month/day and renders the calendar as a flush,
   * borderless working surface flowing into the page.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {CalendarConfig}
   */
  protected readonly calendarConfig: CalendarConfig = { views: ['month', 'day'], flush: true };

  /**
   * Property categoryGroups
   * @readonly
   *
   * @description
   * The four real sources. The mockup shows a fifth, "Audit", which has no
   * business existence in the backend — it is left out rather than stubbed.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<readonly CalendarCategoryGroup[]>}
   */
  protected readonly categoryGroups: WritableSignal<readonly CalendarCategoryGroup[]> = signal<
    readonly CalendarCategoryGroup[]
  >([
    {
      id: 'sources',
      label: $localize`:@@calendar.categories:Categories`,
      categories: [
        {
          id: 'intervention',
          label: $localize`:@@calendar.source.intervention:Interventions`,
          tone: 'info',
          active: true,
        },
        {
          id: 'inspection',
          label: $localize`:@@calendar.source.inspection:Inspections`,
          tone: 'success',
          active: true,
        },
        {
          id: 'maintenance',
          label: $localize`:@@calendar.source.maintenance:Maintenance`,
          tone: 'warn',
          active: true,
        },
        {
          id: 'calendar_event',
          label: $localize`:@@calendar.source.event:Events`,
          tone: 'secondary',
          active: true,
        },
      ],
    },
  ]);

  /**
   * Property request
   * @readonly
   *
   * @description
   * The window to fetch, widened to whole months so a grid that shows trailing
   * days of the neighbouring months is not left with holes.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<CalendarFeedRequest | null>}
   */
  private readonly request: Signal<CalendarFeedRequest | null> = computed(
    (): CalendarFeedRequest | null => {
      const organizationId: string | undefined =
        this.activeOrganizationStore.selectedOrganization()?.id;
      if (organizationId === undefined) return null;

      const focused: Date = this.focusedDate();
      const from = new Date(focused.getFullYear(), focused.getMonth() - 1, 1);
      const to = new Date(focused.getFullYear(), focused.getMonth() + 2, 0, 23, 59, 59);

      return { organizationId, from: from.toISOString(), to: to.toISOString() };
    },
  );

  /**
   * Property canCreateEvent
   * @readonly
   *
   * @description
   * Whether the active member may create standalone calendar events
   * (`organization.events.write`). Gates the "New event" button.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canCreateEvent: Signal<boolean> = computed<boolean>(() =>
    this.permissionService.hasPermission(ORGANIZATION_PERMISSION.EVENTS_WRITE),
  );

  /**
   * Property createDrawerVisible
   *
   * @description
   * Visibility of the "New event" creation drawer.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly createDrawerVisible: WritableSignal<boolean> = signal<boolean>(false);
  //#endregion

  //#region Lifecycle
  /**
   * Keeps the feed in step with the focused month, and watches the event
   * mutation store: on a successful creation, closes the drawer and
   * re-triggers the feed query so the new entry appears.
   *
   * @since 1.0.0
   */
  public constructor() {
    this.store.load(this.request);

    effect(() => {
      if (!isCallSuccess(this.eventStore.createCallState())) return;
      this.createDrawerVisible.set(false);
      this.store.load(this.request());
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method openEvent
   *
   * @description
   * Navigates to the record behind an entry. Maintenance and standalone events
   * have no detail page yet, so those are inert rather than dead links.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {CalendarEvent} event - The clicked entry.
   *
   * @returns {void}
   */
  protected openEvent(event: CalendarEvent): void {
    const item: CalendarFeedItem | undefined = event.data as CalendarFeedItem | undefined;
    const organizationId: string | undefined =
      this.activeOrganizationStore.selectedOrganization()?.id;

    if (item === undefined || organizationId === undefined) return;

    const segment: string | null = TARGET_ROUTE[item.sourceKey] ?? null;
    if (segment === null) return;

    void this.router.navigate(['/organizations', organizationId, segment, item.targetId]);
  }

  /**
   * Method openCreateDrawer
   *
   * @description
   * Opens the "New event" drawer.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected openCreateDrawer(): void {
    this.createDrawerVisible.set(true);
  }

  /**
   * Method submitEvent
   *
   * @description
   * Converts the submitted form values to a {@link CreateCalendarEventInput}
   * and dispatches the create action. The drawer closes itself once the
   * mutation succeeds (see the constructor's effect).
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {CalendarEventFormValues} values - The submitted form values.
   *
   * @returns {void}
   */
  protected submitEvent(values: CalendarEventFormValues): void {
    const organizationId: string | undefined =
      this.activeOrganizationStore.selectedOrganization()?.id;
    if (!organizationId || values.startsAt === null) return;

    const input: CreateCalendarEventInput = {
      title: values.title,
      startsAt: values.startsAt.toISOString(),
      allDay: values.allDay,
      ...(values.description ? { description: values.description } : {}),
      ...(values.endsAt !== null ? { endsAt: values.endsAt.toISOString() } : {}),
    };

    this.eventStore.create({ organizationId, input });
  }
  //#endregion
}
