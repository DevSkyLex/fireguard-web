import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import type { TagSeverity } from '../../../tag';
import { tagSeverityDotClass } from '../../../tag';
import type { CalendarCategory, CalendarCategoryGroup, CalendarDay } from '../../models';
import { addMonths, buildMonthDays, weekdayLabels } from '../../utils';

/** A toggled category, identified within its group. */
export interface CalendarCategoryToggle {
  readonly groupId: string;
  readonly categoryId: string;
}

/**
 * Component CalendarSidebar
 * @class CalendarSidebar
 *
 * @description
 * Generic calendar configuration rail: a mini-calendar for quick navigation and
 * any number of toggleable category groups (colour-dotted filters). Holds no
 * domain knowledge — it renders the categories it is given and emits navigation
 * and toggle intents.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-calendar-sidebar',
  imports: [DatePipe],
  templateUrl: './calendar-sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarSidebar {
  //#region Inputs
  /** The currently displayed/selected date driving the mini-calendar. */
  public readonly focusedDate: InputSignal<Date> = input.required<Date>();

  /** Filter category groups rendered as toggle lists. */
  public readonly categoryGroups: InputSignal<readonly CalendarCategoryGroup[]> = input<
    readonly CalendarCategoryGroup[]
  >([]);

  /** First day of the week: 0 = Sunday, 1 = Monday. */
  public readonly weekStartsOn: InputSignal<0 | 1> = input<0 | 1>(1);

  /** The current local day, used to flag "today" in the mini-calendar. */
  public readonly today: InputSignal<Date> = input.required<Date>();
  //#endregion

  //#region Outputs
  /** Emits a newly focused date (mini-calendar day click or month navigation). */
  public readonly focusedDateChange: OutputEmitterRef<Date> = output<Date>();

  /** Emits the category whose switch was toggled. */
  public readonly categoryToggle: OutputEmitterRef<CalendarCategoryToggle> =
    output<CalendarCategoryToggle>();
  //#endregion

  //#region Properties
  /** Single-letter weekday headers for the mini-calendar. */
  protected readonly miniWeekdays: Signal<readonly string[]> = computed<readonly string[]>(() =>
    weekdayLabels(this.weekStartsOn()).map((label: string): string => label.charAt(0)),
  );

  /** Day cells of the mini-calendar for the focused month. */
  protected readonly miniDays: Signal<readonly CalendarDay[]> = computed<readonly CalendarDay[]>(
    () => buildMonthDays(this.focusedDate(), [], this.weekStartsOn(), this.today()),
  );
  //#endregion

  //#region Methods
  /**
   * Method previousMonth
   *
   * @description
   * Moves the mini-calendar (and focus) to the previous month.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected previousMonth(): void {
    this.focusedDateChange.emit(addMonths(this.focusedDate(), -1));
  }

  /**
   * Method nextMonth
   *
   * @description
   * Moves the mini-calendar (and focus) to the next month.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected nextMonth(): void {
    this.focusedDateChange.emit(addMonths(this.focusedDate(), 1));
  }

  /**
   * Method isFocused
   *
   * @description
   * Whether a mini-calendar cell is the currently focused day.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {Date} date - Cell date.
   * @returns {boolean} True when the cell is the focused day.
   */
  protected isFocused(date: Date): boolean {
    const focused: Date = this.focusedDate();
    return (
      date.getFullYear() === focused.getFullYear() &&
      date.getMonth() === focused.getMonth() &&
      date.getDate() === focused.getDate()
    );
  }

  /**
   * Method toggle
   *
   * @description
   * Emits a category toggle intent.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {CalendarCategoryGroup} group - Owning group.
   * @param {CalendarCategory} category - Toggled category.
   * @returns {void}
   */
  protected toggle(group: CalendarCategoryGroup, category: CalendarCategory): void {
    this.categoryToggle.emit({ groupId: group.id, categoryId: category.id });
  }

  /**
   * Method dotClass
   *
   * @description
   * Resolves the dot colour class for a category's tone.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {TagSeverity | undefined} tone - Category tone.
   * @returns {string} Background-colour utility class.
   */
  protected dotClass(tone: TagSeverity | undefined): string {
    return tagSeverityDotClass(tone ?? 'secondary');
  }
  //#endregion
}
