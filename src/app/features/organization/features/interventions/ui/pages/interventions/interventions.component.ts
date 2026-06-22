import {
  ChangeDetectionStrategy,
  Component,
  effect,
  HostListener,
  inject,
  input,
  numberAttribute,
  signal,
  type InputSignalWithTransform,
  type WritableSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TooltipModule } from 'primeng/tooltip';
import { InterventionService } from '@features/organization/features/interventions/data-access';
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
} from '@features/organization/features/interventions/state/intervention-calendar';
import {
  InterventionPlanningOptionsStore,
  type InterventionPlanningOptionsStoreType,
} from '@features/organization/features/interventions/state/intervention-planning-options';
import { InterventionCalendar } from '@features/organization/features/interventions/ui/components';
import { InterventionCreateDrawer } from '@features/organization/features/interventions/ui/drawers';
import type { InterventionCreateFormValues } from '@features/organization/features/interventions/ui/forms';
import { InterventionTable } from '@features/organization/features/interventions/ui/tables';
import { ActiveOrganizationStore } from '@features/organization/state';

/**
 * Default hour (local) pre-filled as the planned start when an intervention is
 * created from a calendar day.
 */
const DEFAULT_PLANNED_HOUR = 9;

/**
 * Type InterventionsView
 *
 * @description
 * The two presentations the interventions index can render: the paginated
 * planner table (`list`) and the scheduling calendar (`calendar`).
 *
 * @since 2.0.0
 */
export type InterventionsView = 'list' | 'calendar';

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
 * Route entry page for the organization interventions index. Hosts the planner
 * table and the scheduling calendar as two interchangeable views of the same
 * intervention collection, switched through a `?view=` query parameter, and
 * orchestrates the shared guided-creation flow (pre-filling the planned start
 * when created from a calendar day) and navigation into an intervention.
 *
 * The two views own different load shapes, so each keeps its own store: the
 * table paginates server-side through {@link InterventionStore}; the calendar
 * loads every scheduled intervention up front through
 * {@link InterventionCalendarStore}. Calendar data is fetched lazily, only while
 * its view is active.
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
    InterventionCalendar,
    InterventionCreateDrawer,
    InterventionTable,
    SelectButtonModule,
    TooltipModule,
  ],
  providers: [InterventionStore, InterventionCalendarStore, InterventionPlanningOptionsStore],
  templateUrl: './interventions.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
   * Property interventions
   * @readonly
   *
   * @description
   * Intervention data-access service used to submit the guided creation request.
   *
   * @access private
   * @since 1.2.0
   *
   * @type {InterventionService}
   */
  private readonly interventions: InterventionService =
    inject<InterventionService>(InterventionService);

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
  >('list', {
    transform: (value: unknown): InterventionsView => (value === 'calendar' ? 'calendar' : 'list'),
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
   * Property creating
   * @readonly
   *
   * @description
   * Whether a guided creation request is in flight; disables the drawer form.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly creating: WritableSignal<boolean> = signal<boolean>(false);

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
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Lazily loads the calendar dataset whenever the calendar view is active and
   * the active organization changes, so switching to the table never triggers
   * the load-all calendar query and vice versa.
   *
   * @since 2.0.0
   */
  public constructor() {
    effect(() => {
      if (this.view() !== 'calendar') return;
      this.calendarStore.load({
        organizationId: this.organization.selectedOrganization()?.id ?? null,
      });
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
      queryParams: { view: view === 'calendar' ? 'calendar' : null, page: null },
      queryParamsHandling: 'merge',
    });
  }

  /**
   * Method onViewShortcut
   * @method onViewShortcut
   *
   * @description
   * Toggles between the list and calendar views when the user presses `V`. The
   * accelerator stands down while a modifier is held, the creation drawer is
   * open, or focus sits in a text-entry surface, so it never hijacks typing.
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
    this.setView(this.view() === 'calendar' ? 'list' : 'calendar');
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
   * Method create
   * @method create
   *
   * @description
   * Submits the validated draft to the API and navigates into the newly created
   * intervention workspace on success.
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

    this.creating.set(true);
    this.interventions
      .create(organizationId, values.name.trim(), {
        type: values.type,
        priority: values.priority,
        participants: values.participants,
        ...(values.site ? { site: values.site } : {}),
        ...(values.responsible ? { responsible: values.responsible } : {}),
        ...(values.plannedStartAt ? { plannedStartAt: values.plannedStartAt } : {}),
        ...(values.dueAt ? { dueAt: values.dueAt } : {}),
      })
      .subscribe({
        next: (intervention: InterventionOutput) =>
          void this.router.navigate([
            '/organizations',
            organizationId,
            'interventions',
            intervention.id,
          ]),
        error: () => this.creating.set(false),
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
  //#endregion
}
