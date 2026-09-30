import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  LOCALE_ID,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import {
  INTERACTION_CAPABILITIES_PORT,
  type InteractionCapabilitiesPort,
} from '@core/interaction-capabilities';
import type {
  MemberWorkloadOutput,
  WorkloadDayOutput,
  WorkloadProjectionOutput,
} from '@features/organization/features/workload/models';
import type { MemberSelectOption } from '@features/organization/models';
import { formatDurationMinutes } from '@shared/duration-format';
import { HlmAvatarImports } from '@shared/ui/avatar';
import { HlmItemImports } from '@shared/ui/item';
import { HlmSeparatorImports } from '@shared/ui/separator';
import { HlmTableImports } from '@shared/ui/table';
import { HlmTooltip } from '@shared/ui/tooltip';
import { WorkloadDayCell } from './workload-day-cell.component';

/**
 * Component WorkloadTable
 * @class WorkloadTable
 *
 * @description
 * Daily member matrix on desktop and tactile member/day list in mobile interaction
 * mode. Percentages stay uncapped in text; the meter alone is bounded for geometry.
 * Zero-capacity days use a muted hatch without disabling contribution details. A shared
 * unavailable date paints one continuous column; individual absences fill only their cell.
 *
 * @version 1.0.0
 */
@Component({
  selector: 'app-workload-table',
  imports: [
    DatePipe,
    HlmAvatarImports,
    ...HlmItemImports,
    ...HlmSeparatorImports,
    HlmTableImports,
    HlmTooltip,
    WorkloadDayCell,
  ],
  templateUrl: './workload-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkloadTable {
  /**
   * Property projection
   * @readonly
   *
   * @description
   * Server projection; no client-side capacity calculation.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<WorkloadProjectionOutput>}
   */
  public readonly projection: InputSignal<WorkloadProjectionOutput> =
    input.required<WorkloadProjectionOutput>();

  /**
   * Property members
   * @readonly
   *
   * @description
   * Authorized organization identities, keyed by member id in each option's value.
   * Reuses the page's selector data without requesting the member directory.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly MemberSelectOption[]>}
   */
  public readonly members: InputSignal<readonly MemberSelectOption[]> =
    input.required<readonly MemberSelectOption[]>();

  /**
   * Property dayOpened
   * @readonly
   *
   * @description
   * Requests the contribution sheet for a day.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<{
   *   readonly member: MemberWorkloadOutput;
   *   readonly day: WorkloadDayOutput;
   * }>}
   */
  public readonly dayOpened: OutputEmitterRef<{
    readonly member: MemberWorkloadOutput;
    readonly day: WorkloadDayOutput;
  }> = output();

  /**
   * Property interaction
   * @readonly
   *
   * @description
   * Central desktop/tactile contract.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {InteractionCapabilitiesPort}
   */
  protected readonly interaction: InteractionCapabilitiesPort = inject(
    INTERACTION_CAPABILITIES_PORT,
  );

  /**
   * Property locale
   * @readonly
   *
   * @description
   * Active application locale, used to spell out a day for the desktop cell's accessible name.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {string}
   */
  private readonly locale: string = inject(LOCALE_ID);

  /**
   * Property unknownMemberLabel
   * @readonly
   *
   * @description
   * Accessible-name fallback when neither the authorized directory nor the projection row carries a
   * name — never the raw member id.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {string}
   */
  protected readonly unknownMemberLabel: string = $localize`:@@workload.unknownMember:Unknown member`;

  /**
   * Property membersById
   * @readonly
   *
   * @description
   * Resolves row identities independently of pagination and directory ordering.
   * Missing metadata keeps the projection's name and an unknown role placeholder.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ReadonlyMap<string, MemberSelectOption>>}
   */
  protected readonly membersById: Signal<ReadonlyMap<string, MemberSelectOption>> = computed(
    () => new Map(this.members().map((member) => [member.value, member])),
  );

  /**
   * Method memberName
   * @method memberName
   *
   * @description
   * The row's resolved display name — the authorized directory first, then the projected
   * row, and a localized "Unknown member" last resort — never the raw member id.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {MemberWorkloadOutput} member - The row's projection member.
   *
   * @returns {string} The resolved name.
   */
  protected memberName(member: MemberWorkloadOutput): string {
    return (
      this.membersById().get(member.memberId)?.displayName ||
      member.displayName ||
      this.unknownMemberLabel
    );
  }

  /**
   * Property unavailableDates
   * @readonly
   *
   * @description
   * Dates with explicit zero capacity for every displayed member. Missing days and unknown
   * capacity never imply a shared absence; this presentation grouping does not recalculate load.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ReadonlySet<string>>}
   */
  protected readonly unavailableDates: Signal<ReadonlySet<string>> = computed(() => {
    const members: readonly MemberWorkloadOutput[] = this.projection().members;
    return new Set(
      (members[0]?.days ?? [])
        .filter(({ date }) =>
          members.every((member) =>
            member.days.some((day) => day.date === date && day.capacityMinutes === 0),
          ),
        )
        .map(({ date }) => date),
    );
  });

  /**
   * Property duration
   * @readonly
   *
   * @description
   * Localized effort formatting.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {typeof formatDurationMinutes}
   */
  protected readonly duration: typeof formatDurationMinutes = formatDurationMinutes;

  /**
   * Method statusLabel
   * @method statusLabel
   *
   * @description
   * Names overload and uncertainty explicitly, independently of color.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {WorkloadDayOutput} day - Daily totals.
   *
   * @returns {string} Accessible availability label.
   */
  protected statusLabel(day: WorkloadDayOutput): string {
    if (day.capacityMinutes == null)
      return $localize`:@@workload.capacityUnknown:Capacity not configured`;
    if (day.capacityMinutes === 0) return $localize`:@@workload.unavailable:Unavailable`;
    if ((day.overloadMinutes ?? 0) > 0)
      return $localize`:@@workload.excess:Overload: ${this.duration(day.overloadMinutes)}:duration:`;
    if (day.completeness !== 'complete')
      return $localize`:@@workload.incomplete:Incomplete workload`;
    if (day.availability === 'fully_allocated')
      return $localize`:@@workload.fullyAllocated:Fully allocated`;
    return $localize`:@@workload.available:Available`;
  }

  /**
   * Method meterValue
   * @method meterValue
   *
   * @description
   * Bounds the visual meter only; overload remains an explicit numeric label.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {WorkloadDayOutput} day - Daily load.
   *
   * @returns {number} Visual percentage between zero and one hundred.
   */
  protected meterValue(day: WorkloadDayOutput): number {
    return Math.min(100, Math.max(0, day.utilizationPercent ?? 0));
  }

  /**
   * Method dayAriaLabel
   * @method dayAriaLabel
   *
   * @description
   * The desktop day button's accessible name: the resolved identity — never
   * the raw member id — a fully spelled-out date instead of a bare ISO
   * string, and the same status a sighted user reads.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {MemberWorkloadOutput} member - The row's projection member.
   * @param {WorkloadDayOutput} day - The cell's daily totals.
   *
   * @returns {string} The composed accessible name.
   */
  protected dayAriaLabel(member: MemberWorkloadOutput, day: WorkloadDayOutput): string {
    const name: string = this.memberName(member);
    const date: string = new Intl.DateTimeFormat(this.locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${day.date}T00:00:00Z`));

    return `${name}, ${date}, ${this.statusLabel(day)}`;
  }

  /**
   * Method overloadedDaysCount
   * @method overloadedDaysCount
   *
   * @description
   * Whole days this week the member's load exceeds capacity, counted from
   * the server's own `availability`/`overloadMinutes` fields — never a
   * weekly total, a bar, or a ratio (`workload/FEATURE.md`).
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {MemberWorkloadOutput} member - The row's projection member.
   *
   * @returns {number} Count of overloaded days, `0` when none.
   */
  protected overloadedDaysCount(member: MemberWorkloadOutput): number {
    return member.days.filter(
      (day) => day.availability === 'overloaded' || (day.overloadMinutes ?? 0) > 0,
    ).length;
  }
}
