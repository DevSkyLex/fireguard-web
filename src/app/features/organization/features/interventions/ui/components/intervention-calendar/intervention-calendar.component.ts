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
  tagSeverityIconClass,
  type CalendarCategoryGroup,
  type CalendarEvent,
} from '@shared/components';
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
 * @version 2.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-calendar',
  imports: [ButtonModule, Calendar, InterventionTag],
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

  /**
   * Input showCreate
   * @readonly
   *
   * @description
   * Whether to render the calendar's built-in "New intervention" toolbar action.
   * Disabled when the host page owns a single creation action shared across its
   * views, to avoid a duplicated primary action.
   *
   * @access public
   * @since 2.1.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly showCreate: InputSignal<boolean> = input<boolean>(true);
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
   * Output create
   * @readonly
   *
   * @description
   * Emits the generic "New intervention" toolbar action.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly create: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
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
      label: 'Status',
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
      label: 'Assignment',
      categories: [
        { id: 'assignment:mine', label: 'Assigned to me', tone: 'info', active: true },
        { id: 'assignment:others', label: 'Others', tone: 'secondary', active: true },
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
   * Method chipIconClass
   *
   * @description
   * Resolves the status glyph and its colour for the compact chip, reusing the
   * intervention tag registry and the shared severity colour mapping.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {CalendarEvent} event - Calendar event.
   * @returns {string} Combined icon + colour class string.
   */
  protected chipIconClass(event: CalendarEvent): string {
    const descriptor = resolveInterventionTag('status', this.interventionOf(event).status);
    return `${descriptor.icon} ${tagSeverityIconClass(descriptor.severity)}`;
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
