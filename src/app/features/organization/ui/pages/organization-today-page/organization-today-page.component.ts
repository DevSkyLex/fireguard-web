import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCircleCheck,
  lucidePlus,
  lucideRefreshCw,
  lucideTriangleAlert,
} from '@ng-icons/lucide';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  InterventionOutput,
  InterventionUnsyncedEntry,
} from '@features/organization/features/interventions/models';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  ORGANIZATION_CONTEXT_PORT,
  type OrganizationContextPort,
} from '@features/organization/ports';
import { OrganizationTodayStore } from '@features/organization/state/organization-today';
import { OrganizationTodayQueue } from '@features/organization/ui/components';
import { EmptyState } from '@shared/empty-state';
import { ErrorState } from '@shared/error-state';
import { HlmButton } from '@shared/ui/button';

/**
 * Constant MILLISECONDS_PER_DAY
 *
 * @description
 * Divisor turning a due-date gap into whole days.
 *
 * @since 1.0.0
 */
const MILLISECONDS_PER_DAY = 86_400_000;

/**
 * Component OrganizationTodayPage
 * @class OrganizationTodayPage
 *
 * @description
 * Landing route of an organization. It answers one question — what needs me? —
 * with named queues holding real interventions: past due, sent back, awaiting
 * review, and waiting to sync. Inventory counts and trend charts live on the
 * Statistics page instead.
 *
 * The page owns orchestration: it holds the store, resolves permissions,
 * localizes the row notes and performs navigation; its children only render
 * (`ARCHITECTURE.md` §10.1).
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-today-page',
  imports: [NgIcon, EmptyState, ErrorState, HlmButton, OrganizationTodayQueue],
  providers: [
    OrganizationTodayStore,
    provideIcons({ lucideCircleCheck, lucidePlus, lucideRefreshCw, lucideTriangleAlert }),
  ],
  templateUrl: './organization-today-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationTodayPage {
  //#region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * Component-scoped store owning the work queues, network and local alike.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {OrganizationTodayStore}
   */
  protected readonly store: OrganizationTodayStore =
    inject<OrganizationTodayStore>(OrganizationTodayStore);

  /**
   * Property organizationContext
   * @readonly
   *
   * @description
   * The routed organization, used to name the page and to build destinations.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationContextPort}
   */
  private readonly organizationContext: OrganizationContextPort =
    inject<OrganizationContextPort>(ORGANIZATION_CONTEXT_PORT);

  /**
   * Property permissionService
   * @readonly
   *
   * @description
   * Organization-owned helper exposing reactive permission checks.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationPermissionService}
   */
  private readonly permissionService: OrganizationPermissionService =
    inject<OrganizationPermissionService>(OrganizationPermissionService);

  /**
   * Property router
   * @readonly
   *
   * @description
   * Used to open an intervention or a filtered list.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property organizationName
   * @readonly
   *
   * @description
   * The open organization, shown under the heading so the page says which
   * workspace it is reporting on.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly organizationName: Signal<string> = computed(
    (): string => this.organizationContext.selectedOrganization()?.name ?? '',
  );

  /**
   * Property canReadInterventions
   * @readonly
   *
   * @description
   * Whether the queues may be rendered. Gated on the interventions permission
   * alone: the queues come from that collection.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canReadInterventions: Signal<boolean> = computed((): boolean =>
    this.permissionService.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_READ),
  );

  /**
   * Property canCreateInterventions
   * @readonly
   *
   * @description
   * Whether the page may offer to start an intervention. Planning is the
   * permission the interventions list itself gates creation on.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canCreateInterventions: Signal<boolean> = computed((): boolean =>
    this.permissionService.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN),
  );

  /**
   * Property unsynced
   * @readonly
   *
   * @description
   * Interventions still holding queued local operations, flattened to the
   * shape the queue component renders.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly InterventionOutput[]>}
   */
  protected readonly unsynced: Signal<readonly InterventionOutput[]> = computed(
    (): readonly InterventionOutput[] =>
      this.store
        .unsynced()
        .map((entry: InterventionUnsyncedEntry): InterventionOutput => entry.intervention),
  );

  /**
   * Property overdueNotes
   * @readonly
   *
   * @description
   * Secondary line of the overdue queue: how late each intervention is.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<Readonly<Record<string, string>>>}
   */
  protected readonly overdueNotes: Signal<Readonly<Record<string, string>>> = computed(
    (): Readonly<Record<string, string>> => {
      const notes: Record<string, string> = {};

      for (const intervention of this.store.overdue().items) {
        const days: number | null = this.daysLate(intervention.dueAt);
        if (days === null) continue;

        notes[intervention.id] = $localize`:@@org.today.overdueBy:${days}:days: days late`;
      }

      return notes;
    },
  );

  /**
   * Property unsyncedNotes
   * @readonly
   *
   * @description
   * Secondary line of the unsynced queue: how many local changes are queued.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<Readonly<Record<string, string>>>}
   */
  protected readonly unsyncedNotes: Signal<Readonly<Record<string, string>>> = computed(
    (): Readonly<Record<string, string>> => {
      const notes: Record<string, string> = {};

      for (const entry of this.store.unsynced()) {
        notes[entry.intervention.id] =
          $localize`:@@org.today.pendingChanges:${entry.pendingCount}:count: changes waiting to sync`;
      }

      return notes;
    },
  );

  /**
   * Property nextUpcoming
   * @readonly
   *
   * @description
   * The nearest planned intervention still ahead, shown once nothing is
   * waiting so the all-clear points somewhere.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<InterventionOutput | undefined>}
   */
  protected readonly nextUpcoming: Signal<InterventionOutput | undefined> = computed(
    (): InterventionOutput | undefined => this.store.upcoming().items[0],
  );
  //#endregion

  //#region Methods
  /**
   * Method retryQueues
   * @method retryQueues
   *
   * @description
   * Re-runs the queue requests after a failure.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected retryQueues(): void {
    // Both calls are re-run: the local queue is loaded separately so it can
    // survive a network failure, and a retry that left it behind would leave
    // the page half-refreshed.
    const organizationId: string | undefined = this.store.loadParams();

    this.store.load(organizationId);
    this.store.loadUnsynced(organizationId);
  }

  /**
   * Method openIntervention
   * @method openIntervention
   *
   * @description
   * Opens one intervention's record.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionOutput} intervention - The intervention picked.
   *
   * @returns {void}
   */
  protected openIntervention(intervention: InterventionOutput): void {
    const organizationId: string | null = this.organizationContext.selectedOrganizationId();
    if (organizationId === null) return;

    void this.router.navigate(['/organizations', organizationId, 'interventions', intervention.id]);
  }

  /**
   * Method openInterventions
   * @method openInterventions
   *
   * @description
   * Opens the full intervention list.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected openInterventions(): void {
    const organizationId: string | null = this.organizationContext.selectedOrganizationId();
    if (organizationId === null) return;

    void this.router.navigate(['/organizations', organizationId, 'interventions']);
  }
  //#endregion

  //#region Internals
  /**
   * Method daysLate
   * @method daysLate
   *
   * @description
   * Whole days between a due date and now, or `null` when there is no date or
   * the date is unparseable.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {string | null} dueAt - The intervention's due date.
   *
   * @returns {number | null} Days late, floored at one.
   */
  private daysLate(dueAt: string | null): number | null {
    if (dueAt === null) return null;

    const due: number = Date.parse(dueAt);
    if (Number.isNaN(due)) return null;

    return Math.max(1, Math.floor((Date.now() - due) / MILLISECONDS_PER_DAY));
  }
  //#endregion
}
