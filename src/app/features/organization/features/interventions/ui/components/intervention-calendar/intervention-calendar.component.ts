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
import { ButtonModule } from 'primeng/button';
import {
  resolveInterventionTag,
  type InterventionOutput,
  type InterventionStatus,
} from '@features/organization/features/interventions/models';
import {
  Calendar,
  type CalendarCategoryGroup,
  type CalendarConfig,
  type CalendarEvent,
} from '@shared/calendar';
import { InterventionTag } from '../intervention-tag';

/**
 * Canonical intervention statuses, in workflow order, used to build the
 * calendar's status filter group. Every status an event can carry must appear
 * here so it remains filterable.
 */
const INTERVENTION_STATUSES: readonly InterventionStatus[] = [
  'draft',
  'planned',
  'in_progress',
  'submitted',
  'changes_requested',
  'published',
  'abandoned',
];

/**
 * Component InterventionCalendar
 * @class InterventionCalendar
 *
 * @description
 * Maps interventions onto the generic {@link Calendar}: it turns each
 * intervention into a calendar event (anchored on its planned start, falling
 * back to the due date), supplies the status and assignment filter groups and
 * the intervention-flavoured chip/row templates, and translates the calendar's
 * generic events back into intervention intents. It owns no calendar state — the
 * shared calendar manages the view, focused date and filtering.
 *
 * @version 2.3.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-calendar',
  imports: [ButtonModule, Calendar, DatePipe, InterventionTag],
  templateUrl: './intervention-calendar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionCalendar {
  //#region Inputs
  /**
   * Input interventions
   * @readonly
   *
   * @description
   * Every intervention to plot; the calendar handles the All/Mine and status
   * filtering through its category groups.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<readonly InterventionOutput[]>}
   */
  public readonly interventions: InputSignal<readonly InterventionOutput[]> = input<
    readonly InterventionOutput[]
  >([]);

  /**
   * Input loading
   * @readonly
   *
   * @description
   * Whether the calendar data is loading.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Input currentMemberIri
   * @readonly
   *
   * @description
   * IRI of the active member, used to tag each event as assigned to the user or
   * to others for the assignment filter.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly currentMemberIri: InputSignal<string | null> = input<string | null>(null);

  //#endregion

  //#region Outputs
  /**
   * Output selectIntervention
   * @readonly
   *
   * @description
   * Emits the intervention behind a clicked event.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {OutputEmitterRef<InterventionOutput>}
   */
  public readonly selectIntervention: OutputEmitterRef<InterventionOutput> =
    output<InterventionOutput>();

  /**
   * Output selectDay
   * @readonly
   *
   * @description
   * Emits a day chosen for intervention creation.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {OutputEmitterRef<Date>}
   */
  public readonly selectDay: OutputEmitterRef<Date> = output<Date>();

  /**
   * Output focusedDateChange
   * @readonly
   *
   * @description
   * Emits the calendar's newly focused date after navigation, forwarded from the
   * shared calendar so the host page can refetch a bounded interventions window
   * when the visible month changes.
   *
   * @access public
   * @since 2.2.0
   *
   * @type {OutputEmitterRef<Date>}
   */
  public readonly focusedDateChange: OutputEmitterRef<Date> = output<Date>();
  //#endregion

  //#region Properties
  /**
   * Property calendarConfig
   * @readonly
   *
   * @description
   * Shared-calendar presentation configuration: renders the status category
   * group as the card-footer colour legend so chip colours stay decodable even
   * when the filter sidebar is collapsed.
   *
   * @access protected
   * @since 2.3.0
   *
   * @type {CalendarConfig}
   */
  protected readonly calendarConfig: CalendarConfig = { legendGroupId: 'status' };

  /**
   * Property categoryGroups
   * @readonly
   *
   * @description
   * Stable sidebar filter groups: every intervention status (colour-dotted from
   * the tag registry) and an assignment group (mine / others). Kept constant so
   * the calendar preserves the user's toggles across data refreshes.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {readonly CalendarCategoryGroup[]}
   */
  protected readonly categoryGroups: readonly CalendarCategoryGroup[] = [
    {
      id: 'status',
      label: $localize`:@@common.status:Status`,
      categories: INTERVENTION_STATUSES.map((status: InterventionStatus) => {
        const descriptor = resolveInterventionTag('status', status);
        return {
          id: `status:${status}`,
          label: descriptor.label,
          tone: descriptor.severity,
          active: true,
        };
      }),
    },
    {
      id: 'assignment',
      label: $localize`:@@intervention.cal.assignment:Assignment`,
      categories: [
        {
          id: 'assignment:mine',
          label: $localize`:@@intervention.cal.mine:Assigned to me`,
          tone: 'info',
          active: true,
        },
        {
          id: 'assignment:others',
          label: $localize`:@@intervention.cal.others:Others`,
          tone: 'secondary',
          active: true,
        },
      ],
    },
  ];

  /**
   * Property events
   * @readonly
   *
   * @description
   * Interventions projected into calendar events, dropping any that carry no
   * schedulable date.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<readonly CalendarEvent[]>}
   */
  protected readonly events: Signal<readonly CalendarEvent[]> = computed<readonly CalendarEvent[]>(
    () =>
      this.interventions()
        .map((intervention: InterventionOutput): CalendarEvent | null => this.toEvent(intervention))
        .filter((event: CalendarEvent | null): event is CalendarEvent => event !== null),
  );
  //#endregion

  //#region Methods
  /**
   * Method onEventClick
   *
   * @description
   * Translates a clicked calendar event back into its intervention.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {CalendarEvent} event - Clicked event.
   * @returns {void}
   */
  protected onEventClick(event: CalendarEvent): void {
    this.selectIntervention.emit(event.data as InterventionOutput);
  }

  /**
   * Method interventionOf
   *
   * @description
   * Reads the intervention carried by a calendar event (used by the row
   * template).
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {CalendarEvent} event - Calendar event.
   * @returns {InterventionOutput} The underlying intervention.
   */
  protected interventionOf(event: CalendarEvent): InterventionOutput {
    return event.data as InterventionOutput;
  }

  /**
   * Method chipIcon
   *
   * @description
   * Resolves the status glyph for the compact chip from the intervention tag
   * registry; the icon inherits the chip's semantic ink colour via
   * `currentColor`.
   *
   * @access protected
   * @since 2.3.0
   *
   * @param {CalendarEvent} event - Calendar event.
   * @returns {string} Icon class string.
   */
  protected chipIcon(event: CalendarEvent): string {
    return resolveInterventionTag('status', this.interventionOf(event).status).icon;
  }

  /**
   * Method chipTime
   *
   * @description
   * Start instant rendered on the compact chip, or `null` when the event is
   * anchored at local midnight (a date-only planned start / due date carries no
   * meaningful time of day).
   *
   * @access protected
   * @since 2.3.0
   *
   * @param {CalendarEvent} event - Calendar event.
   * @returns {Date | null} The start instant, or `null` when time is not meaningful.
   */
  protected chipTime(event: CalendarEvent): Date | null {
    const start: Date = event.start;
    return start.getHours() === 0 && start.getMinutes() === 0 ? null : start;
  }

  /**
   * Method toEvent
   *
   * @description
   * Projects an intervention into a calendar event anchored on its planned start
   * (falling back to the due date), tagged with its status and assignment
   * categories. Returns null when the intervention has no schedulable date.
   *
   * @access private
   * @since 2.0.0
   *
   * @param {InterventionOutput} intervention - Intervention to project.
   * @returns {CalendarEvent | null} The event, or null when unscheduled.
   */
  private toEvent(intervention: InterventionOutput): CalendarEvent | null {
    const raw: string | null = intervention.plannedStartAt ?? intervention.dueAt;
    if (!raw) return null;

    const start: Date = new Date(raw);
    if (Number.isNaN(start.getTime())) return null;

    const assignment: string = this.isMine(intervention) ? 'mine' : 'others';
    return {
      id: intervention.id,
      title: intervention.name,
      start,
      tone: resolveInterventionTag('status', intervention.status).severity,
      categoryIds: [`status:${intervention.status}`, `assignment:${assignment}`],
      data: intervention,
    };
  }

  /**
   * Method isMine
   *
   * @description
   * Whether the active member is the responsible agent or a participant of the
   * intervention.
   *
   * @access private
   * @since 2.0.0
   *
   * @param {InterventionOutput} intervention - Intervention to test.
   * @returns {boolean} True when the intervention is assigned to the member.
   */
  private isMine(intervention: InterventionOutput): boolean {
    const member: string | null = this.currentMemberIri();
    if (!member) return false;
    return intervention.responsible === member || intervention.participants.includes(member);
  }
  //#endregion
}
