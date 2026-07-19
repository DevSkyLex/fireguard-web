import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { Router } from '@angular/router';
import type { CalendarFeedItem } from '@features/organization/features/calendar/models';
import {
  CalendarFeedStore,
  type CalendarFeedRequest,
  type CalendarFeedStoreType,
} from '@features/organization/features/calendar/state';
import { ActiveOrganizationStore } from '@features/organization/state';
import {
  Calendar,
  type CalendarCategoryGroup,
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
  imports: [Calendar],
  providers: [CalendarFeedStore],
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
      label: $localize`:@@calendar.sources:Sources`,
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
  //#endregion

  //#region Lifecycle
  /**
   * Keeps the feed in step with the focused month.
   *
   * @since 1.0.0
   */
  public constructor() {
    this.store.load(this.request);
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
  //#endregion
}
