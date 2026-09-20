import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowRight,
  lucideCalendarClock,
  lucideCalendarDays,
  lucideCalendarOff,
  lucideCalendarRange,
  lucideChevronRight,
  lucideTimer,
  lucideUserRoundPlus,
} from '@ng-icons/lucide';
import type {
  UnallocatedWorkOutput,
  WorkloadProjectionOutput,
} from '@features/organization/features/workload/models';
import type { MemberSelectOption } from '@features/organization/models';
import { formatDurationMinutes } from '@shared/duration-format';
import { HlmAvatarImports } from '@shared/ui/avatar';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmCollapsibleImports } from '@shared/ui/collapsible';
import { HlmItem, HlmItemContent, HlmItemGroup } from '@shared/ui/item';
import type { WorkloadPlanningGroup } from './models/workload-planning-group.interface';
import type { WorkloadPlanningRow } from './models/workload-planning-row.interface';

/**
 * Component WorkloadPlanningPanel
 * @class WorkloadPlanningPanel
 *
 * @description
 * Compact, progressively disclosed planning issues for the current projection. Repeated
 * intervention rows are consolidated without mixing assignees, drafts or missing effort.
 * Bounded reason groups contain full-row intervention links; capacity actions remain separate.
 *
 * @version 1.0.0
 */
@Component({
  selector: 'app-workload-planning-panel',
  imports: [
    RouterLink,
    NgIcon,
    HlmAvatarImports,
    HlmBadge,
    HlmButton,
    HlmCollapsibleImports,
    HlmItem,
    HlmItemContent,
    HlmItemGroup,
  ],
  providers: [
    provideIcons({
      lucideArrowRight,
      lucideCalendarClock,
      lucideCalendarDays,
      lucideCalendarOff,
      lucideCalendarRange,
      lucideChevronRight,
      lucideTimer,
      lucideUserRoundPlus,
    }),
  ],
  templateUrl: './workload-planning-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
})
export class WorkloadPlanningPanel {
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Organization scope for intervention navigation.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /**
   * Property projection
   * @readonly
   *
   * @description
   * Current server member page and separately returned unassigned work.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<WorkloadProjectionOutput>}
   */
  public readonly projection: InputSignal<WorkloadProjectionOutput> = input.required();

  /**
   * Property members
   * @readonly
   *
   * @description
   * Already-authorized organization identities; no extra directory read is needed.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly MemberSelectOption[]>}
   */
  public readonly members: InputSignal<readonly MemberSelectOption[]> = input.required();

  /**
   * Property canManageCapacity
   * @readonly
   *
   * @description
   * Allows the missing-capacity recovery action when the parent is online and authorized.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canManageCapacity: InputSignal<boolean> = input(false);

  /**
   * Property capacityRequested
   * @readonly
   *
   * @description
   * Requests configuration for the affected member without owning the editing workflow.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly capacityRequested: OutputEmitterRef<string> = output();

  /**
   * Property expandedReason
   * @readonly
   *
   * @description
   * Keeps one reason open and resets disclosure when the server view changes.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<UnallocatedWorkOutput['reason'] | null>}
   */
  protected readonly expandedReason: WritableSignal<UnallocatedWorkOutput['reason'] | null> =
    linkedSignal({ source: this.projection, computation: () => null });

  /**
   * Property membersById
   * @readonly
   *
   * @description
   * Identity lookup independent of member ordering and pagination.
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
   * Property duration
   * @readonly
   *
   * @description
   * Formats known remaining effort without manufacturing a value for missing estimates.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {typeof formatDurationMinutes}
   */
  protected readonly duration: typeof formatDurationMinutes = formatDurationMinutes;

  /**
   * Property groups
   * @readonly
   *
   * @description
   * Groups server reasons into actionable disclosures; only known effort is summed.
   * Task ids are deduplicated before counting or grouping repeated intervention links.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly WorkloadPlanningGroup[]>}
   */
  protected readonly groups: Signal<readonly WorkloadPlanningGroup[]> = computed(() => {
    const projection = this.projection();
    const entries = [
      ...projection.members.flatMap((member) =>
        member.unallocated.map((task) => ({
          task,
          memberId: member.memberId,
          displayName: member.displayName || member.memberId,
        })),
      ),
      ...projection.unassigned.map((task) => ({ task, memberId: null, displayName: '' })),
    ];
    const seen = new Set<string>();
    const buckets = new Map<UnallocatedWorkOutput['reason'], Map<string, WorkloadPlanningRow>>();
    for (const { task, memberId, displayName } of entries) {
      if (seen.has(task.taskId)) continue;
      seen.add(task.taskId);
      const rows = buckets.get(task.reason) ?? new Map<string, WorkloadPlanningRow>();
      buckets.set(task.reason, rows);
      const key = JSON.stringify([task.interventionId, memberId, task.commitment]);
      const previous = rows.get(key);
      rows.set(key, {
        key,
        interventionId: task.interventionId,
        label: task.label,
        memberId,
        displayName,
        isDraft: task.commitment === 'draft',
        taskCount: (previous?.taskCount ?? 0) + 1,
        remainingMinutes:
          task.remainingMinutes == null || (previous && previous.remainingMinutes == null)
            ? null
            : (previous?.remainingMinutes ?? 0) + task.remainingMinutes,
        capacityMemberId:
          task.reason === 'unknown_capacity' && this.canManageCapacity() ? memberId : null,
      });
    }
    return this.reasonLabels
      .map((definition) => {
        const rows = [...(buckets.get(definition.reason)?.values() ?? [])];
        return {
          ...definition,
          rows,
          taskCount: rows.reduce((count, row) => count + row.taskCount, 0),
        };
      })
      .filter((group) => group.taskCount > 0);
  });

  /**
   * Property reasonLabels
   * @readonly
   *
   * @description
   * Stable action order and recovery copy, kept local to this planning surface.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {readonly Pick<WorkloadPlanningGroup, 'reason' | 'title' | 'icon' | 'description'>[]}
   */
  private readonly reasonLabels: readonly Pick<
    WorkloadPlanningGroup,
    'reason' | 'title' | 'icon' | 'description'
  >[] = [
    {
      reason: 'unestimated',
      icon: 'lucideTimer',
      title: $localize`:@@workload.planning.estimates:Estimates to add`,
      description: $localize`:@@workload.planning.estimatesHint:Open an intervention and estimate the remaining work on its tasks. Recording time alone does not update the remaining work.`,
    },
    {
      reason: 'undated',
      icon: 'lucideCalendarDays',
      title: $localize`:@@workload.planning.dates:Dates to set`,
      description: $localize`:@@workload.planning.datesHint:Set a work period on the intervention or its tasks so the remaining work can be distributed across days.`,
    },
    {
      reason: 'overdue',
      icon: 'lucideCalendarClock',
      title: $localize`:@@workload.planning.overdue:Overdue work to replan`,
      description: $localize`:@@workload.planning.overdueHint:The work period has ended. Review the remaining work and move it to a current or future period.`,
    },
    {
      reason: 'unknown_capacity',
      icon: 'lucideCalendarRange',
      title: $localize`:@@workload.planning.capacity:Capacity to configure`,
      description: $localize`:@@workload.planning.capacityHint:Availability is missing for the work period. An authorized manager can configure it for the affected members.`,
    },
    {
      reason: 'no_available_day',
      icon: 'lucideCalendarOff',
      title: $localize`:@@workload.planning.availability:Periods without availability`,
      description: $localize`:@@workload.planning.availabilityHint:No day is available in the work period. Review the dates, assignee or availability; the work has not been placed on a day.`,
    },
    {
      reason: 'unassigned',
      icon: 'lucideUserRoundPlus',
      title: $localize`:@@workload.planning.unassigned:Tasks to assign`,
      description: $localize`:@@workload.planning.unassignedHint:These tasks have no assignee. Open an intervention to assign them before checking the member's workload.`,
    },
  ];
}
