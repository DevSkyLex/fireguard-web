import { DatePipe } from '@angular/common';
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
import { lucideCalendarDays, lucideChevronDown } from '@ng-icons/lucide';
import type {
  UnallocatedWorkOutput,
  WorkloadDaySelection,
} from '@features/organization/features/workload/models';
import type { MemberSelectOption } from '@features/organization/models';
import { formatDurationMinutes } from '@shared/duration-format';
import { sheetSide } from '@shared/sheet-side';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmAvatarImports } from '@shared/ui/avatar';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmCollapsibleImports } from '@shared/ui/collapsible';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmItemImports } from '@shared/ui/item';
import { HlmProgressImports } from '@shared/ui/progress';
import { HlmSheetImports } from '@shared/ui/sheet';
import type { WorkloadDayIntervention } from './models/workload-day-intervention.interface';

/**
 * Component WorkloadDaySheet
 * @class WorkloadDaySheet
 *
 * @description
 * Read-only daily summary with contributions grouped by intervention and member-wide excluded work
 * disclosed separately. Native focus starts at the container; only the body scrolls so the member
 * identity and dismissal actions stay visible with long translations.
 *
 * @version 1.0.0
 */
@Component({
  selector: 'app-workload-day-sheet',
  templateUrl: './workload-day-sheet.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    RouterLink,
    NgIcon,
    HlmAlertImports,
    HlmAvatarImports,
    HlmBadge,
    HlmButton,
    HlmCollapsibleImports,
    HlmEmptyImports,
    HlmItemImports,
    HlmProgressImports,
    HlmSheetImports,
  ],
  providers: [provideIcons({ lucideCalendarDays, lucideChevronDown })],
})
export class WorkloadDaySheet {
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Organization scope for intervention links.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /**
   * Property selection
   * @readonly
   *
   * @description
   * Authoritative member and day projection; null closes the sheet.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<WorkloadDaySelection | null>}
   */
  public readonly selection: InputSignal<WorkloadDaySelection | null> =
    input<WorkloadDaySelection | null>(null);

  /**
   * Property identity
   * @readonly
   *
   * @description
   * Authorized avatar and organization role supplied by the page.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<MemberSelectOption | null>}
   */
  public readonly identity: InputSignal<MemberSelectOption | null> =
    input<MemberSelectOption | null>(null);

  /**
   * Property closed
   * @readonly
   *
   * @description
   * Requests that the page clear its selected day after native dismissal.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly closed: OutputEmitterRef<void> = output<void>();

  /**
   * Property side
   * @readonly
   *
   * @description
   * Uses the application's mobile interaction classification for a bottom sheet.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<'right' | 'bottom'>}
   */
  protected readonly side: Signal<'right' | 'bottom'> = sheetSide();

  /**
   * Property duration
   * @readonly
   *
   * @description
   * Shared integral-minute formatter preserving missing values.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {typeof formatDurationMinutes}
   */
  protected readonly duration: typeof formatDurationMinutes = formatDurationMinutes;

  /**
   * Property isExcludedExpanded
   * @readonly
   *
   * @description
   * Disclosure resets whenever the selected member or day changes, including reopening.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly isExcludedExpanded: WritableSignal<boolean> = linkedSignal({
    source: this.selection,
    computation: () => false,
  });

  /**
   * Property progress
   * @readonly
   *
   * @description
   * Clamps only the native progress geometry; overload stays visible as its full server value.
   * Unknown and zero capacity never produce a utilization bar.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number | null>}
   */
  protected readonly progress: Signal<number | null> = computed(() => {
    const day = this.selection()?.day;
    return day && (day.capacityMinutes ?? 0) > 0 && day.utilizationPercent != null
      ? Math.min(100, Math.max(0, day.utilizationPercent))
      : null;
  });

  /**
   * Property interventions
   * @readonly
   *
   * @description
   * Sums existing daily contributions without reallocating work or counting draft demand as
   * committed. Entries from different tasks without an intervention remain distinct.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly WorkloadDayIntervention[]>}
   */
  protected readonly interventions: Signal<readonly WorkloadDayIntervention[]> = computed(() => {
    const groups = new Map<string, WorkloadDayIntervention>();
    for (const entry of this.selection()?.day.contributions ?? []) {
      const key = entry.interventionId
        ? 'intervention:' + entry.interventionId
        : 'task:' + entry.taskId;
      const previous = groups.get(key);
      const group: WorkloadDayIntervention = previous ?? {
        key,
        interventionId: entry.interventionId ?? null,
        label: entry.label || entry.taskId,
        actualMinutes: null,
        remainingMinutes: null,
        draftMinutes: null,
      };
      groups.set(key, {
        ...group,
        actualMinutes:
          entry.kind === 'actual'
            ? (group.actualMinutes ?? 0) + entry.minutes
            : group.actualMinutes,
        remainingMinutes:
          entry.kind === 'committed'
            ? (group.remainingMinutes ?? 0) + entry.minutes
            : group.remainingMinutes,
        draftMinutes:
          entry.kind === 'draft' ? (group.draftMinutes ?? 0) + entry.minutes : group.draftMinutes,
      });
    }
    return [...groups.values()];
  });

  /**
   * Method unallocatedLabel
   * @method unallocatedLabel
   *
   * @description
   * Explains why the server excluded a task from numerical totals.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {UnallocatedWorkOutput} task - Server-classified contribution.
   * @returns {string} Localized reason.
   */
  protected unallocatedLabel(task: UnallocatedWorkOutput): string {
    switch (task.reason) {
      case 'unassigned':
        return $localize`:@@workload.unassigned:To assign`;
      case 'unestimated':
        return $localize`:@@workload.unestimated:Remaining work not estimated`;
      case 'undated':
        return $localize`:@@workload.undated:Work period not set`;
      case 'overdue':
        return $localize`:@@workload.overdue:Overdue work`;
      case 'unknown_capacity':
        return $localize`:@@workload.capacityUnknown:Capacity not configured`;
      case 'no_available_day':
        return $localize`:@@workload.noAvailableDay:No available day in this work period.`;
    }
  }
}
