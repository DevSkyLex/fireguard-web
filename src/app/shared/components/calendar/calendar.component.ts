import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  inject,
  input,
  linkedSignal,
  LOCALE_ID,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type TemplateRef,
  type WritableSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { EmptyState } from '../empty-state';
import type { TagSeverity } from '../tag';
import { tagSeverityDotClass } from '../tag';
import { CalendarAgenda } from './components/calendar-agenda/calendar-agenda.component';
import { CalendarMonth } from './components/calendar-month/calendar-month.component';
import {
  CalendarSidebar,
  type CalendarCategoryToggle,
} from './components/calendar-sidebar/calendar-sidebar.component';
import { CalendarWeek } from './components/calendar-week/calendar-week.component';
import type {
  CalendarAgendaDay,
  CalendarCategory,
  CalendarCategoryGroup,
  CalendarConfig,
  CalendarDay,
  CalendarEvent,
  CalendarEventContext,
  CalendarView,
  CalendarWeekDay,
} from './models';
import {
  CALENDAR_DEFAULT_DAY_END_HOUR,
  CALENDAR_DEFAULT_DAY_START_HOUR,
  CALENDAR_DEFAULT_MAX_EVENTS_PER_DAY,
  CALENDAR_DEFAULT_WEEK_STARTS_ON,
  addMonths,
  addWeeks,
  buildAgendaDays,
  buildMonthDays,
  buildWeekDays,
  filterEventsByCategories,
  hoursRange,
  startOfDay,
  startOfWeek,
  weekdayLabels,
} from './utils';

/**
 * Interface ViewOption
 *
 * @description
 * Option backing the toolbar view-switch control: pairs a human-readable label
 * with the {@link CalendarView} it activates.
 *
 * @since 1.0.0
 */
interface ViewOption {
  /** Localized label shown on the switch button. */
  readonly label: string;

  /** View activated when the option is selected. */
  readonly value: CalendarView;
}

/**
 * Constant VIEW_LABELS
 *
 * @description
 * Human-readable labels for the offered views, keyed by {@link CalendarView}.
 *
 * @since 1.0.0
 *
 * @type {Readonly<Record<CalendarView, string>>}
 */
const VIEW_LABELS: Readonly<Record<CalendarView, string>> = {
  month: 'Month',
  week: 'Week',
  agenda: 'Agenda',
};

/**
 * Component Calendar
 * @class Calendar
 *
 * @description
 * Generic, domain-agnostic calendar. Plots {@link CalendarEvent}s in a month
 * grid, week time-grid, or agenda list, with a built-in configuration sidebar
 * (mini-calendar + toggleable category filters). It owns the active view,
 * focused date and category state internally, filters events by the active
 * categories, and emits navigation, toggle, event and create intents. Consumers
 * supply events, optional category groups, and optional chip templates projected
 * as content; the calendar carries no business knowledge.
 *
 * @example ```html
 * <app-calendar [events]="events()" [categoryGroups]="groups">
 *   <ng-template #actions><button>New</button></ng-template>
 *   <ng-template #event let-event>{{ event.title }}</ng-template>
 *   <ng-template #eventDetail let-event>{{ event.title }}</ng-template>
 * </app-calendar>
 * ```
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-calendar',
  imports: [
    ButtonModule,
    CalendarAgenda,
    CalendarMonth,
    CalendarSidebar,
    CalendarWeek,
    EmptyState,
    FormsModule,
    NgTemplateOutlet,
    SelectButtonModule,
  ],
  templateUrl: './calendar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Calendar {
  //#region Inputs
  /**
   * Property events
   * @readonly
   *
   * @description
   * Events to plot across the active view.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly CalendarEvent[]>}
   */
  public readonly events: InputSignal<readonly CalendarEvent[]> = input<readonly CalendarEvent[]>(
    [],
  );

  /**
   * Property view
   * @readonly
   *
   * @description
   * Initial view; the calendar owns the active view thereafter.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<CalendarView>}
   */
  public readonly view: InputSignal<CalendarView> = input<CalendarView>('month');

  /**
   * Property focusedDate
   * @readonly
   *
   * @description
   * Initial focused date; the calendar owns navigation thereafter.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<Date>}
   */
  public readonly focusedDate: InputSignal<Date> = input<Date>(startOfDay(new Date()));

  /**
   * Property categoryGroups
   * @readonly
   *
   * @description
   * Filter category groups rendered in the configuration sidebar.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly CalendarCategoryGroup[]>}
   */
  public readonly categoryGroups: InputSignal<readonly CalendarCategoryGroup[]> = input<
    readonly CalendarCategoryGroup[]
  >([]);

  /**
   * Property config
   * @readonly
   *
   * @description
   * Presentation configuration; every field has a sensible default.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<CalendarConfig>}
   */
  public readonly config: InputSignal<CalendarConfig> = input<CalendarConfig>({});

  /**
   * Property loading
   * @readonly
   *
   * @description
   * Whether the events are loading (reserved for skeleton states).
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Content templates
  /**
   * Property eventTemplate
   * @readonly
   *
   * @description
   * Compact chip template for month/week cells, projected as `<ng-template
   * #event let-event>`. Receives the event through {@link CalendarEventContext};
   * the calendar falls back to a built-in chip when absent.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Signal<TemplateRef<CalendarEventContext> | undefined>}
   */
  public readonly eventTemplate: Signal<TemplateRef<CalendarEventContext> | undefined> =
    contentChild<TemplateRef<CalendarEventContext>>('event');

  /**
   * Property eventDetailTemplate
   * @readonly
   *
   * @description
   * Richer row template for agenda rows, projected as `<ng-template #eventDetail
   * let-event>`. Falls back to {@link eventTemplate}, then to a built-in row.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Signal<TemplateRef<CalendarEventContext> | undefined>}
   */
  public readonly eventDetailTemplate: Signal<TemplateRef<CalendarEventContext> | undefined> =
    contentChild<TemplateRef<CalendarEventContext>>('eventDetail');

  /**
   * Property actionsTemplate
   * @readonly
   *
   * @description
   * Toolbar action template, projected as `<ng-template #actions>`. Rendered at
   * the trailing edge of the toolbar next to the view switch; receives no
   * context. Nothing is shown when absent.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Signal<TemplateRef<unknown> | undefined>}
   */
  public readonly actionsTemplate: Signal<TemplateRef<unknown> | undefined> =
    contentChild<TemplateRef<unknown>>('actions');
  //#endregion

  //#region Outputs
  /**
   * Property focusedDateChange
   * @readonly
   *
   * @description
   * Emits the newly focused date after navigation.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<Date>}
   */
  public readonly focusedDateChange: OutputEmitterRef<Date> = output<Date>();

  /**
   * Property viewChange
   * @readonly
   *
   * @description
   * Emits the newly active view after a switch.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<CalendarView>}
   */
  public readonly viewChange: OutputEmitterRef<CalendarView> = output<CalendarView>();

  /**
   * Property categoriesChange
   * @readonly
   *
   * @description
   * Emits the category groups after a sidebar toggle.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<readonly CalendarCategoryGroup[]>}
   */
  public readonly categoriesChange: OutputEmitterRef<readonly CalendarCategoryGroup[]> =
    output<readonly CalendarCategoryGroup[]>();

  /**
   * Property eventClick
   * @readonly
   *
   * @description
   * Emits the clicked event.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<CalendarEvent>}
   */
  public readonly eventClick: OutputEmitterRef<CalendarEvent> = output<CalendarEvent>();

  /**
   * Property dayCreate
   * @readonly
   *
   * @description
   * Emits the day whose create affordance was used.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<Date>}
   */
  public readonly dayCreate: OutputEmitterRef<Date> = output<Date>();
  //#endregion

  //#region State
  /**
   * Property locale
   * @readonly
   *
   * @description
   * Active locale, used to format the toolbar period label consistently with the
   * sidebar's `DatePipe` output.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {string}
   */
  private readonly locale: string = inject<string>(LOCALE_ID);

  /**
   * Property today
   * @readonly
   *
   * @description
   * Current local day, used to flag "today" across the views.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Date}
   */
  protected readonly today: Date = startOfDay(new Date());

  /**
   * Property activeView
   * @readonly
   *
   * @description
   * Active view, seeded from {@link view} and owned thereafter.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<CalendarView>}
   */
  protected readonly activeView: WritableSignal<CalendarView> = linkedSignal(() => this.view());

  /**
   * Property activeDate
   * @readonly
   *
   * @description
   * Focused date, seeded from {@link focusedDate} and owned thereafter.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<Date>}
   */
  protected readonly activeDate: WritableSignal<Date> = linkedSignal(() => this.focusedDate());

  /**
   * Property activeGroups
   * @readonly
   *
   * @description
   * Category groups, seeded from {@link categoryGroups} and toggled internally.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<readonly CalendarCategoryGroup[]>}
   */
  protected readonly activeGroups: WritableSignal<readonly CalendarCategoryGroup[]> = linkedSignal(
    () => this.categoryGroups(),
  );

  /**
   * Property sidebarOpen
   * @readonly
   *
   * @description
   * Whether the configuration sidebar is revealed on small screens.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly sidebarOpen: WritableSignal<boolean> = signal<boolean>(false);
  //#endregion

  //#region Derived configuration
  /**
   * Property weekStartsOn
   * @readonly
   *
   * @description
   * Effective first day of the week (Sunday or Monday).
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<0 | 1>}
   */
  protected readonly weekStartsOn: Signal<0 | 1> = computed<0 | 1>(
    () => this.config().weekStartsOn ?? CALENDAR_DEFAULT_WEEK_STARTS_ON,
  );

  /**
   * Property maxEventsPerDay
   * @readonly
   *
   * @description
   * Effective month-cell chip cap before the "+N more" affordance.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly maxEventsPerDay: Signal<number> = computed<number>(
    () => this.config().maxEventsPerDay ?? CALENDAR_DEFAULT_MAX_EVENTS_PER_DAY,
  );

  /**
   * Property dayStartHour
   * @readonly
   *
   * @description
   * Effective week-grid start hour.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly dayStartHour: Signal<number> = computed<number>(
    () => this.config().dayStartHour ?? CALENDAR_DEFAULT_DAY_START_HOUR,
  );

  /**
   * Property dayEndHour
   * @readonly
   *
   * @description
   * Effective week-grid end hour.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly dayEndHour: Signal<number> = computed<number>(
    () => this.config().dayEndHour ?? CALENDAR_DEFAULT_DAY_END_HOUR,
  );

  /**
   * Property showSidebar
   * @readonly
   *
   * @description
   * Whether the configuration sidebar is shown at all.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly showSidebar: Signal<boolean> = computed<boolean>(
    () => this.config().showSidebar ?? true,
  );

  /**
   * Property viewOptions
   * @readonly
   *
   * @description
   * Views offered by the toolbar switch, resolved from the configuration.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly ViewOption[]>}
   */
  protected readonly viewOptions: Signal<readonly ViewOption[]> = computed<readonly ViewOption[]>(
    () => {
      const views: readonly CalendarView[] = this.config().views ?? ['month', 'week', 'agenda'];
      return views.map((value: CalendarView): ViewOption => ({ label: VIEW_LABELS[value], value }));
    },
  );
  //#endregion

  //#region Derived view models
  /**
   * Property visibleEvents
   * @readonly
   *
   * @description
   * Events visible under the currently active categories.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly CalendarEvent[]>}
   */
  protected readonly visibleEvents: Signal<readonly CalendarEvent[]> = computed<
    readonly CalendarEvent[]
  >(() => filterEventsByCategories(this.events(), this.activeGroups()));

  /**
   * Property monthDays
   * @readonly
   *
   * @description
   * Month grid (42 cells) for the focused month.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly CalendarDay[]>}
   */
  protected readonly monthDays: Signal<readonly CalendarDay[]> = computed<readonly CalendarDay[]>(
    () => buildMonthDays(this.activeDate(), this.visibleEvents(), this.weekStartsOn(), this.today),
  );

  /**
   * Property weekDays
   * @readonly
   *
   * @description
   * Week columns (with lane-packed timed events) for the focused week.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly CalendarWeekDay[]>}
   */
  protected readonly weekDays: Signal<readonly CalendarWeekDay[]> = computed<
    readonly CalendarWeekDay[]
  >(() =>
    buildWeekDays(
      this.activeDate(),
      this.visibleEvents(),
      this.weekStartsOn(),
      this.today,
      this.dayStartHour(),
      this.dayEndHour(),
    ),
  );

  /**
   * Property agendaDays
   * @readonly
   *
   * @description
   * Agenda groups (one per day with events) for the focused month.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly CalendarAgendaDay[]>}
   */
  protected readonly agendaDays: Signal<readonly CalendarAgendaDay[]> = computed<
    readonly CalendarAgendaDay[]
  >(() => buildAgendaDays(this.activeDate(), this.visibleEvents()));

  /**
   * Property weekdayHeaders
   * @readonly
   *
   * @description
   * Weekday header labels ordered for the configured week start.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly string[]>}
   */
  protected readonly weekdayHeaders: Signal<readonly string[]> = computed<readonly string[]>(() =>
    weekdayLabels(this.weekStartsOn()),
  );

  /**
   * Property weekHours
   * @readonly
   *
   * @description
   * Hour marks for the week-grid gutter.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly number[]>}
   */
  protected readonly weekHours: Signal<readonly number[]> = computed<readonly number[]>(() =>
    hoursRange(this.dayStartHour(), this.dayEndHour() - 1),
  );

  /**
   * Property periodLabel
   * @readonly
   *
   * @description
   * Toolbar period label, adapting to the active view: a date range in the week
   * view, otherwise the focused month and year.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly periodLabel: Signal<string> = computed<string>(() => {
    const date: Date = this.activeDate();
    if (this.activeView() === 'week') {
      const start: Date = startOfWeek(date, this.weekStartsOn());
      const end: Date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
      const month: Intl.DateTimeFormat = new Intl.DateTimeFormat(this.locale, { month: 'short' });
      return start.getMonth() === end.getMonth()
        ? `${start.getDate()} – ${end.getDate()} ${month.format(end)} ${end.getFullYear()}`
        : `${start.getDate()} ${month.format(start)} – ${end.getDate()} ${month.format(end)} ${end.getFullYear()}`;
    }
    return new Intl.DateTimeFormat(this.locale, { month: 'long', year: 'numeric' }).format(date);
  });
  //#endregion

  //#region Methods
  /**
   * Method setView
   *
   * @description
   * Switches the active view and announces the change.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {CalendarView} view - View to activate.
   * @returns {void}
   */
  protected setView(view: CalendarView): void {
    this.activeView.set(view);
    this.viewChange.emit(view);
  }

  /**
   * Method focusDate
   *
   * @description
   * Sets the focused date and announces the change.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {Date} date - New focused date.
   * @returns {void}
   */
  protected focusDate(date: Date): void {
    this.activeDate.set(date);
    this.focusedDateChange.emit(date);
  }

  /**
   * Method previous
   *
   * @description
   * Steps back one period (week in week view, otherwise a month).
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected previous(): void {
    this.focusDate(
      this.activeView() === 'week'
        ? addWeeks(this.activeDate(), -1)
        : addMonths(this.activeDate(), -1),
    );
  }

  /**
   * Method next
   *
   * @description
   * Steps forward one period (week in week view, otherwise a month).
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected next(): void {
    this.focusDate(
      this.activeView() === 'week'
        ? addWeeks(this.activeDate(), 1)
        : addMonths(this.activeDate(), 1),
    );
  }

  /**
   * Method goToday
   *
   * @description
   * Focuses the period containing today.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected goToday(): void {
    this.focusDate(startOfDay(new Date()));
  }

  /**
   * Method openDay
   *
   * @description
   * Opens a day in the week view (used by the month "+N more" affordance).
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {Date} date - Day to open.
   * @returns {void}
   */
  protected openDay(date: Date): void {
    this.setView('week');
    this.focusDate(date);
  }

  /**
   * Method toggleCategory
   *
   * @description
   * Flips a category's active state, re-filtering events and announcing the new
   * category groups.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {CalendarCategoryToggle} toggle - Group and category to flip.
   * @returns {void}
   */
  protected toggleCategory(toggle: CalendarCategoryToggle): void {
    const updated: readonly CalendarCategoryGroup[] = this.activeGroups().map(
      (group: CalendarCategoryGroup): CalendarCategoryGroup => {
        if (group.id !== toggle.groupId) return group;
        return {
          id: group.id,
          label: group.label,
          categories: group.categories.map(
            (category: CalendarCategory): CalendarCategory =>
              category.id !== toggle.categoryId
                ? category
                : {
                    id: category.id,
                    label: category.label,
                    tone: category.tone,
                    active: !category.active,
                  },
          ),
        };
      },
    );
    this.activeGroups.set(updated);
    this.categoriesChange.emit(updated);
  }

  /**
   * Method dotClass
   *
   * @description
   * Resolves the bar/dot colour class for an event tone in the default chip.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {TagSeverity | undefined} tone - Event tone.
   * @returns {string} Background-colour utility class.
   */
  protected dotClass(tone: TagSeverity | undefined): string {
    return tagSeverityDotClass(tone ?? 'secondary');
  }
  //#endregion
}
