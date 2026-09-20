import { DatePipe, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  LOCALE_ID,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
  type TemplateRef,
  type InputSignal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChevronLeft,
  lucideChevronRight,
  lucideCalendarDays,
  lucideUser,
  lucideUsers,
  lucideGauge,
} from '@ng-icons/lucide';
import { Events } from '@ngrx/signals/events';
import { DateTime } from 'luxon';
import { ConnectivityService } from '@core/connectivity';
import type {
  WorkloadDaySelection,
  WorkloadOutput,
  WorkloadQuery,
} from '@features/organization/features/workload/models';
import {
  WorkloadStore,
  workloadStoreEvents,
  type WorkloadStoreType,
} from '@features/organization/features/workload/state';
import { WorkloadDaySheet } from '@features/organization/features/workload/ui/sheets/workload-day-sheet';
import { workloadWeekStart } from '@features/organization/features/workload/utils';
import type { MemberSelectOption } from '@features/organization/models';
import {
  ORGANIZATION_CONTEXT_PORT,
  REGIONAL_FORMATTING_PORT,
  type OrganizationContextPort,
  type RegionalFormattingPort,
} from '@features/organization/ports';
import { toMemberSelectOption } from '@features/organization/utils';
import {
  CollectionFilterBar,
  CollectionFilterSelect,
  CollectionFilterToggle,
  initialCollectionFilterBarVisibility,
  type CollectionFilterField,
  type CollectionFilterOption,
  type CollectionFilterPopoverState,
} from '@shared/collection-filters';
import { CollectionPagination } from '@shared/collection-pagination';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmAvatarImports } from '@shared/ui/avatar';
import { HlmButton } from '@shared/ui/button';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { WorkloadPlanningPanel } from '../../components/workload-planning-panel';
import { WorkloadCapacitySheet } from '../../sheets/workload-capacity-sheet';
import { WorkloadTable } from '../../tables/workload-table';

/**
 * Component WorkloadPage
 * @class WorkloadPage
 *
 * @description
 * Organization-local weekly view with browser-only reads and grouped daily contributions.
 * Day sheets initially focus their container to keep the summary visible; unknown or offline
 * capacity never implies availability, and editing remains an online workflow.
 *
 * @version 1.0.0
 */
@Component({
  selector: 'app-workload-page',
  templateUrl: './workload-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    NgIcon,
    HlmButton,
    HlmAvatarImports,
    CollectionFilterBar,
    CollectionFilterSelect,
    CollectionFilterToggle,
    CollectionPagination,
    HlmAlertImports,
    HlmEmptyImports,
    HlmSkeleton,
    WorkloadTable,
    WorkloadPlanningPanel,
    WorkloadCapacitySheet,
    WorkloadDaySheet,
  ],
  providers: [
    WorkloadStore,
    provideIcons({
      lucideChevronLeft,
      lucideChevronRight,
      lucideCalendarDays,
      lucideUser,
      lucideUsers,
      lucideGauge,
    }),
  ],
  host: { class: 'block min-w-0' },
})
export class WorkloadPage {
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Organization route scope.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /**
   * Property store
   * @readonly
   *
   * @description
   * Page-scoped request state.
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
   * Shared connectivity state.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {ConnectivityService}
   */
  protected readonly connectivity: ConnectivityService = inject(ConnectivityService);

  /**
   * Property context
   * @readonly
   *
   * @description
   * Regional organization context.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationContextPort}
   */
  private readonly context: OrganizationContextPort = inject(ORGANIZATION_CONTEXT_PORT);

  /**
   * Property regional
   * @readonly
   *
   * @description
   * Organization timezone.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {RegionalFormattingPort}
   */
  private readonly regional: RegionalFormattingPort = inject(REGIONAL_FORMATTING_PORT);

  /**
   * Property platformId
   * @readonly
   *
   * @description
   * SSR loading boundary.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {object}
   */
  private readonly platformId: object = inject(PLATFORM_ID);

  /**
   * Property locale
   * @readonly
   *
   * @description
   * Active application locale for organization-zoned timestamps.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {string}
   */
  private readonly locale: string = inject(LOCALE_ID);

  /**
   * Property weekOffset
   * @readonly
   *
   * @description
   * Navigation relative to the current organization week.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<number>}
   */
  protected readonly weekOffset: WritableSignal<number> = signal(0);

  /**
   * Property memberFilter
   * @readonly
   *
   * @description
   * Optional authorized member.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string | null>}
   */
  protected readonly memberFilter: WritableSignal<string | null> = signal(null);

  /**
   * Property teamFilter
   * @readonly
   *
   * @description
   * Team selects members, not a subset of their work.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string | null>}
   */
  protected readonly teamFilter: WritableSignal<string | null> = signal(null);

  /**
   * Property overloadedOnly
   * @readonly
   *
   * @description
   * Daily overload filter.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly overloadedOnly: WritableSignal<boolean> = signal(false);

  /**
   * Property page
   * @readonly
   *
   * @description
   * One-based member page requested from the API.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<number>}
   */
  protected readonly page: WritableSignal<number> = signal(1);

  /**
   * Property pageSize
   * @readonly
   *
   * @description
   * Ten members per page keep weekly rows scannable.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<number>}
   */
  protected readonly pageSize: WritableSignal<number> = signal(10);

  /**
   * Property pageCount
   * @readonly
   *
   * @description
   * Number of pages in the full server-filtered result.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly pageCount: Signal<number> = computed(() =>
    Math.max(1, Math.ceil((this.data()?.totalItems ?? 0) / this.pageSize())),
  );

  /**
   * Property openFilterKey
   * @readonly
   *
   * @description
   * Filter whose native picker is open.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string | null>}
   */
  protected readonly openFilterKey: WritableSignal<string | null> = signal(null);

  /**
   * Property activeFilterKeys
   * @readonly
   *
   * @description
   * Committed narrowing counted by the shared filter badge.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly string[]>}
   */
  protected readonly activeFilterKeys: Signal<readonly string[]> = computed(() => [
    ...(this.memberFilter() ? ['member'] : []),
    ...(this.teamFilter() ? ['team'] : []),
    ...(this.overloadedOnly() ? ['overloaded'] : []),
  ]);

  /**
   * Property filtersVisible
   * @readonly
   *
   * @description
   * Disclosure state shared with other collection surfaces.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly filtersVisible: WritableSignal<boolean> = initialCollectionFilterBarVisibility(
    computed(() => this.activeFilterKeys().length > 0),
  );

  /**
   * Property filterFields
   * @readonly
   *
   * @description
   * Only authorized, server-supported equality filters are offered.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly CollectionFilterField[]>}
   */
  protected readonly filterFields: Signal<readonly CollectionFilterField[]> = computed(() => [
    ...(this.data()?.canReadTeam
      ? [
          {
            key: 'member',
            fieldLabel: $localize`:@@workload.member:Member`,
            icon: 'lucideUser',
            operators: ['equals'] as const,
          },
          {
            key: 'team',
            fieldLabel: $localize`:@@workload.team:Team`,
            icon: 'lucideUsers',
            operators: ['equals'] as const,
          },
        ]
      : []),
    {
      key: 'overloaded',
      fieldLabel: $localize`:@@workload.loadFilter:Load`,
      icon: 'lucideGauge',
      operators: ['equals'],
    },
  ]);

  /**
   * Property memberOptions
   * @readonly
   *
   * @description
   * Authorized identities independent of the current member page, with organization roles.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly MemberSelectOption[]>}
   */
  protected readonly memberOptions: Signal<readonly MemberSelectOption[]> = computed(
    () =>
      this.data()?.memberOptions.map((member) =>
        toMemberSelectOption(
          {
            id: member.id,
            userId: member.id,
            displayName: member.name,
            avatarUrl: member.avatarUrl,
            roleNames: member.roleNames,
          },
          this.organizationId(),
          member.id,
        ),
      ) ?? [],
  );

  /**
   * Property teamOptions
   * @readonly
   *
   * @description
   * Teams select members, never a subset of their work.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly CollectionFilterOption[]>}
   */
  protected readonly teamOptions: Signal<readonly CollectionFilterOption[]> = computed(
    () => this.data()?.teams.map((team) => ({ value: team.id, label: team.name })) ?? [],
  );

  /**
   * Property overloadOptions
   * @readonly
   *
   * @description
   * Daily overload is the only supported load narrowing.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly CollectionFilterOption[]}
   */
  protected readonly overloadOptions: readonly CollectionFilterOption[] = [
    { value: 'overloaded', label: $localize`:@@workload.overloaded:Overloaded` },
  ];

  /**
   * Property memberChip
   * @readonly
   *
   * @description
   * Projected native filter value editor.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<TemplateRef<unknown> | undefined>}
   */
  private readonly memberChip: Signal<TemplateRef<unknown> | undefined> = viewChild('memberChip');

  /**
   * Property teamChip
   * @readonly
   *
   * @description
   * Projected native filter value editor.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<TemplateRef<unknown> | undefined>}
   */
  private readonly teamChip: Signal<TemplateRef<unknown> | undefined> = viewChild('teamChip');

  /**
   * Property overloadChip
   * @readonly
   *
   * @description
   * Projected native filter value editor.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<TemplateRef<unknown> | undefined>}
   */
  private readonly overloadChip: Signal<TemplateRef<unknown> | undefined> =
    viewChild('overloadChip');

  /**
   * Property chipTemplates
   * @readonly
   *
   * @description
   * Value templates indexed by feature-owned filter keys.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<Readonly<Record<string, TemplateRef<unknown> | undefined>>>}
   */
  protected readonly chipTemplates: Signal<
    Readonly<Record<string, TemplateRef<unknown> | undefined>>
  > = computed(() => ({
    member: this.memberChip(),
    team: this.teamChip(),
    overloaded: this.overloadChip(),
  }));

  /**
   * Property selectedDay
   * @readonly
   *
   * @description
   * Read-only contribution sheet.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<WorkloadDaySelection | null>}
   */
  protected readonly selectedDay: WritableSignal<WorkloadDaySelection | null> = signal(null);

  /**
   * Property selectedIdentity
   * @readonly
   *
   * @description
   * Uses the authorized directory supplied with the projection for the day header.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<MemberSelectOption | null>}
   */
  protected readonly selectedIdentity: Signal<MemberSelectOption | null> = computed(
    () =>
      this.memberOptions().find((member) => member.value === this.selectedDay()?.member.memberId) ??
      null,
  );

  /**
   * Property capacityOpen
   * @readonly
   *
   * @description
   * Capacity administration visibility.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly capacityOpen: WritableSignal<boolean> = signal(false);

  /**
   * Property capacityMemberId
   * @readonly
   *
   * @description
   * Initial capacity scope selected from the member filter or a planning issue.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string | null>}
   */
  protected readonly capacityMemberId: WritableSignal<string | null> = signal(null);

  /**
   * Property data
   * @readonly
   *
   * @description
   * Latest authorized response.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<WorkloadOutput | null>}
   */
  protected readonly data: Signal<WorkloadOutput | null> = computed(() => {
    const data = this.store.projectionCallState().data;
    return data?.organizationId === this.organizationId() ? data : null;
  });

  /**
   * Property calculatedAt
   * @readonly
   *
   * @description
   * Formats the calculation instant in the organization's IANA timezone, not the device zone.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly calculatedAt: Signal<string> = computed(() => {
    const projection = this.data()?.projection;
    if (!projection) return '';
    return DateTime.fromISO(projection.calculatedAt, { zone: projection.timezone })
      .setLocale(this.locale)
      .toLocaleString(DateTime.DATETIME_MED);
  });

  /**
   * Property query
   * @readonly
   *
   * @description
   * Dated request; no allocation is computed in the client.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<WorkloadQuery>}
   */
  protected readonly query: Signal<WorkloadQuery> = computed(() => {
    const today = DateTime.now().setZone(this.regional.regionalFormatting().timezone).toISODate();
    if (!today) throw new RangeError('Invalid organization timezone');
    const firstDay =
      this.context.selectedOrganization()?.settings?.regional?.firstDayOfWeek ?? 'monday';
    const from = workloadWeekStart(today, firstDay, this.weekOffset());
    const to = DateTime.fromISO(from, { zone: 'UTC' }).plus({ days: 6 }).toISODate();
    if (!to) throw new RangeError('Invalid workload week');
    const member = this.memberFilter();
    const team = this.teamFilter();
    return {
      organizationId: this.organizationId(),
      from,
      to,
      page: this.page(),
      pageSize: this.pageSize(),
      ...(member ? { member } : {}),
      ...(team ? { team } : {}),
      ...(this.overloadedOnly() ? { overloaded: true } : {}),
    };
  });

  /**
   * Constructor
   * @constructor
   *
   * @description
   * Cancels obsolete reads and clears organization-specific filters on navigation.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    inject(Events)
      .on(workloadStoreEvents.capacitySaved)
      .pipe(takeUntilDestroyed())
      .subscribe(({ payload }) => {
        if (payload.organizationId === this.organizationId()) this.closeCapacity();
      });
    effect(() => {
      this.organizationId();
      untracked(() => {
        this.memberFilter.set(null);
        this.teamFilter.set(null);
        this.overloadedOnly.set(false);
        this.page.set(1);
        this.openFilterKey.set(null);
        this.weekOffset.set(0);
        this.selectedDay.set(null);
        this.capacityOpen.set(false);
      });
    });
    effect(() => {
      const query = this.query();
      const online = this.connectivity.online();
      if (isPlatformBrowser(this.platformId))
        untracked(() => this.store.load(online ? query : null));
    });
  }

  /**
   * Method stepWeek
   * @method stepWeek
   *
   * @description
   * Navigates by complete organization weeks and closes stale day details.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {number} direction - Earlier or later week.
   * @returns {void}
   */
  protected stepWeek(direction: number): void {
    this.selectedDay.set(null);
    this.page.set(1);
    this.weekOffset.update((offset) => offset + direction);
  }

  /**
   * Method setFilter
   * @method setFilter
   *
   * @description
   * Applies a supported server filter and returns to the first member page.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} key - Filter field key.
   * @param {string | null} value - Selected value or removal.
   * @returns {void}
   */
  protected setFilter(key: string, value: string | null): void {
    if (key === 'member') this.memberFilter.set(value);
    else if (key === 'team') this.teamFilter.set(value);
    else if (key === 'overloaded') this.overloadedOnly.set(value === 'overloaded');
    else return;
    this.page.set(1);
    this.selectedDay.set(null);
    this.openFilterKey.set(null);
  }

  /**
   * Method clearFilters
   * @method clearFilters
   *
   * @description
   * Clears narrowing without changing the week or page size.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected clearFilters(): void {
    this.memberFilter.set(null);
    this.teamFilter.set(null);
    this.overloadedOnly.set(false);
    this.page.set(1);
    this.selectedDay.set(null);
    this.openFilterKey.set(null);
  }

  /**
   * Method filterStateChanged
   * @method filterStateChanged
   *
   * @description
   * Keeps native picker state in sync without closing a newer picker.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} key - Filter field key.
   * @param {CollectionFilterPopoverState} state - Native overlay state.
   * @returns {void}
   */
  protected filterStateChanged(key: string, state: CollectionFilterPopoverState): void {
    if (state === 'open') this.openFilterKey.set(key);
    else if (this.openFilterKey() === key) this.openFilterKey.set(null);
  }

  /**
   * Method changePage
   * @method changePage
   *
   * @description
   * Requests another member page without changing the complete projection scope.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {number} page - One-based requested page.
   * @returns {void}
   */
  protected changePage(page: number): void {
    this.selectedDay.set(null);
    this.page.set(page);
  }

  /**
   * Method changePageSize
   * @method changePageSize
   *
   * @description
   * Resets pagination when the number of visible members changes.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {number} size - Requested rows per page.
   * @returns {void}
   */
  protected changePageSize(size: number): void {
    this.pageSize.set(size);
    this.changePage(1);
  }

  /**
   * Method currentWeek
   * @method currentWeek
   *
   * @description
   * Returns to the current week and first member page.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected currentWeek(): void {
    this.weekOffset.set(0);
    this.changePage(1);
  }

  /**
   * Method reload
   * @method reload
   *
   * @description
   * Retries the current online projection.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected reload(): void {
    if (this.connectivity.online()) this.store.load(this.query());
  }

  /**
   * Method openCapacity
   * @method openCapacity
   *
   * @description
   * Opens the existing capacity workflow for an authorized, online scope.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string | null} memberId - Individual override or organization default.
   * @returns {void}
   */
  protected openCapacity(memberId: string | null): void {
    if (!this.connectivity.online() || !this.data()?.canManageCapacity) return;
    this.capacityMemberId.set(memberId);
    this.capacityOpen.set(true);
  }

  /**
   * Method closeCapacity
   * @method closeCapacity
   *
   * @description
   * Cancels configuration reads and clears state after dismissal or success.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected closeCapacity(): void {
    this.capacityOpen.set(false);
    this.store.loadCapacity(null);
  }
}
