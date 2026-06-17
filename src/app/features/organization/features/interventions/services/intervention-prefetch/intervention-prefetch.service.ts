import { effect, inject, Injectable, signal, type WritableSignal } from '@angular/core';
import { catchError, EMPTY, forkJoin, from, map, type Observable, switchMap } from 'rxjs';
import { ConnectivityService } from '@core/services/connectivity';
import { OrganizationMemberService } from '@features/organization/data-access';
import {
  InterventionOfflineService,
  InterventionService,
} from '@features/organization/features/interventions/data-access';
import type { InterventionOutput } from '@features/organization/features/interventions/models';
import { ActiveOrganizationStore } from '@features/organization/state';

/**
 * Service InterventionPrefetchService
 * @class InterventionPrefetchService
 *
 * @description
 * Proactively downloads and stores intervention workspaces for offline
 * use. When online, fetches all active interventions assigned to the
 * current member and persists them (work items, changes, issues) via
 * {@link InterventionOfflineService}.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
export class InterventionPrefetchService {
  /**
   * Property organization
   * @readonly
   *
   * @description
   * Active organization store whose selected organization drives which
   * interventions are prefetched.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActiveOrganizationStore}
   */
  private readonly organization: ActiveOrganizationStore =
    inject<ActiveOrganizationStore>(ActiveOrganizationStore);

  /**
   * Property connectivity
   * @readonly
   *
   * @description
   * Shared connectivity source of truth gating prefetch on online status.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ConnectivityService}
   */
  private readonly connectivity: ConnectivityService =
    inject<ConnectivityService>(ConnectivityService);

  /**
   * Property service
   * @readonly
   *
   * @description
   * Intervention data-access service used to list and fetch workspace data.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {InterventionService}
   */
  private readonly service: InterventionService = inject<InterventionService>(InterventionService);

  /**
   * Property offline
   * @readonly
   *
   * @description
   * Offline persistence service used to store prefetched workspaces locally.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {InterventionOfflineService}
   */
  private readonly offline: InterventionOfflineService = inject<InterventionOfflineService>(
    InterventionOfflineService,
  );

  /**
   * Property members
   * @readonly
   *
   * @description
   * Member data-access service used to resolve the current user's profile
   * before filtering assigned interventions.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationMemberService}
   */
  private readonly members: OrganizationMemberService =
    inject<OrganizationMemberService>(OrganizationMemberService);

  /**
   * Property started
   * @readonly
   *
   * @description
   * Whether {@link start} has armed prefetching. The prefetch effect reads
   * this signal and stays inert until it flips to `true`, so prefetch only
   * begins once the feature has bootstrapped.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  private readonly started: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Constructor
   * @constructor
   *
   * @description
   * Registers the prefetch effect. Once {@link start} arms it, a reactive
   * effect downloads the current member's active-intervention workspaces
   * whenever the active organization changes and the application is online.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect((onCleanup) => {
      if (!this.started()) return;
      const organizationId = this.organization.selectedOrganization()?.id;
      if (!organizationId || this.connectivity.isOffline()) return;
      const subscription = this.members
        .getCurrentProfile(organizationId)
        .pipe(
          switchMap((profile) =>
            this.service.listAll(organizationId, {
              responsible: `/api/organizations/${organizationId}/members/${profile.id}`,
            }),
          ),
          switchMap((interventions) =>
            forkJoin(
              interventions
                .filter((item) =>
                  ['planned', 'in_progress', 'changes_requested'].includes(item.status),
                )
                .map((intervention) => this.prefetch(organizationId, intervention)),
            ),
          ),
          catchError(() => EMPTY),
        )
        .subscribe();
      onCleanup(() => subscription.unsubscribe());
    });
  }

  /**
   * Method start
   * @method start
   *
   * @description
   * Arms the prefetch effect. Idempotent: re-arming an already-started
   * service is a no-op.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {void}
   */
  public start(): void {
    this.started.set(true);
  }

  /**
   * Method prefetch
   * @method prefetch
   *
   * @description
   * Downloads and persists the workspace for a single intervention:
   * work items, changes and issues. Aborts if the active organization
   * changes before the download completes.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {string} organizationId - Organization owning the intervention.
   * @param {InterventionOutput} intervention - Intervention to prefetch.
   *
   * @returns {Observable<void>} Completes once the workspace is persisted.
   */
  private prefetch(organizationId: string, intervention: InterventionOutput): Observable<void> {
    return forkJoin({
      workItems: this.service.listAllWorkItems(intervention.id),
      changes: this.service.listAllChanges(intervention.id),
      issues: this.service.listIssues(intervention.id),
    }).pipe(
      switchMap(({ workItems, changes, issues }) => {
        if (this.organization.selectedOrganization()?.id !== organizationId) return EMPTY;
        return from(this.offline.saveWorkspace(intervention, workItems, changes, issues.member));
      }),
      map(() => undefined),
    );
  }
}
