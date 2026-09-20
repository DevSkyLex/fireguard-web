import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  type InputSignal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { DateTime } from 'luxon';
import { ConnectivityService } from '@core/connectivity';
import type {
  MemberWorkloadOutput,
  WorkloadDayOutput,
} from '@features/organization/features/workload/models';
import {
  WorkloadStore,
  type WorkloadStoreType,
} from '@features/organization/features/workload/state';
import {
  REGIONAL_FORMATTING_PORT,
  type RegionalFormattingPort,
} from '@features/organization/ports';
import { formatDurationMinutes } from '@shared/duration-format';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmSkeleton } from '@shared/ui/skeleton';

/**
 * Component WorkloadAssigneeIndicator
 * @class WorkloadAssigneeIndicator
 *
 * @description
 * Feature-owned, cancellable read widget. Shows current load only; mutation-time evaluation remains authoritative for the proposed change.
 *
 * @version 1.0.0
 */
@Component({
  selector: 'app-workload-assignee-indicator',
  templateUrl: './workload-assignee-indicator.component.html',
  imports: [DatePipe, HlmAlertImports, HlmSkeleton],
  providers: [WorkloadStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkloadAssigneeIndicator {
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Organization boundary.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input('');

  /**
   * Property member
   * @readonly
   *
   * @description
   * Selected member IRI or identifier.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly member: InputSignal<string> = input('');

  /**
   * Property startsOn
   * @readonly
   *
   * @description
   * Task period or inherited intervention start.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly startsOn: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property endsOn
   * @readonly
   *
   * @description
   * Task period or inherited intervention end.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly endsOn: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property store
   * @readonly
   *
   * @description
   * Widget-scoped cancellable query.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WorkloadStoreType}
   */
  protected readonly store: WorkloadStoreType = inject(WorkloadStore);

  /**
   * Property connectivity
   * @readonly
   *
   * @description
   * No assumed availability offline.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {ConnectivityService}
   */
  protected readonly connectivity: ConnectivityService = inject(ConnectivityService);

  /**
   * Property regional
   * @readonly
   *
   * @description
   * Organization-local dates.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {RegionalFormattingPort}
   */
  private readonly regional: RegionalFormattingPort = inject(REGIONAL_FORMATTING_PORT);

  /**
   * Property ready
   * @readonly
   *
   * @description
   * Secondary browser-only loading.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  private readonly ready: WritableSignal<boolean> = signal(false);

  /**
   * Property period
   * @readonly
   *
   * @description
   * Validated local inclusive period.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<{from: string; to: string} | null>}
   */
  protected readonly period: Signal<{ from: string; to: string } | null> = computed(() => {
    const from = this.startsOn();
    const to = this.endsOn();
    const zone = this.regional.regionalFormatting().timezone;
    if (!from || !to) return null;
    const start = DateTime.fromISO(from, { zone }).setZone(zone).toISODate();
    const end = DateTime.fromISO(to, { zone }).setZone(zone).toISODate();
    return start && end && start <= end ? { from: start, to: end } : null;
  });

  /**
   * Property data
   * @readonly
   *
   * @description
   * Only current, completed responses can describe the selected person.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<MemberWorkloadOutput | null>}
   */
  protected readonly data: Signal<MemberWorkloadOutput | null> = computed(() =>
    this.connectivity.online() && this.store.projectionCallState().status === 'success'
      ? (this.store
          .projectionCallState()
          .data?.projection.members.find(
            (row) => row.memberId === this.member().split('/').at(-1),
          ) ?? null)
      : null,
  );

  /**
   * Property problemDays
   * @readonly
   *
   * @description
   * Daily overload must not be hidden by a weekly total.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly WorkloadDayOutput[]>}
   */
  protected readonly problemDays: Signal<readonly WorkloadDayOutput[]> = computed(
    () =>
      this.data()?.days.filter(
        (day) => day.availability === 'overloaded' || day.availability === 'unavailable',
      ) ?? [],
  );

  /**
   * Property capacity
   * @readonly
   *
   * @description
   * Total only when every daily capacity is known.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number | null>}
   */
  protected readonly capacity: Signal<number | null> = computed(() => {
    const days = this.data()?.days;
    return days?.length &&
      days.every((day) => day.capacityMinutes !== null && day.capacityMinutes !== undefined)
      ? days.reduce((sum, day) => sum + (day.capacityMinutes ?? 0), 0)
      : null;
  });

  /**
   * Property load
   * @readonly
   *
   * @description
   * Current actual and committed load.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly load: Signal<number> = computed(
    () =>
      this.data()?.days.reduce((sum, day) => sum + day.actualMinutes + day.remainingMinutes, 0) ??
      0,
  );

  /**
   * Property duration
   * @readonly
   *
   * @description
   * Shared duration formatting.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {typeof formatDurationMinutes}
   */
  protected readonly duration: typeof formatDurationMinutes = formatDurationMinutes;

  /**
   * Constructor
   * @constructor
   *
   * @description
   * Loads only selected assignments, cancelling obsolete periods or members.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    afterNextRender(() => this.ready.set(true));
    effect(() => {
      const organizationId = this.organizationId();
      const member = this.member().split('/').at(-1);
      const period = this.period();
      const canRead =
        this.ready() && this.connectivity.online() && organizationId && member && period;
      untracked(() => this.store.load(canRead ? { organizationId, member, ...period } : null));
    });
  }
}
