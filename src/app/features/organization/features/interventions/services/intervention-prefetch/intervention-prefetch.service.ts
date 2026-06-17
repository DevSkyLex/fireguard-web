import { effect, inject, Injectable, Injector } from '@angular/core';
import { catchError, EMPTY, forkJoin, from, map, type Observable, switchMap } from 'rxjs';
import { ConnectivityService } from '@core/services/connectivity';
import { OrganizationMemberService } from '@features/organization/data-access';
import { InterventionService } from '@features/organization/features/interventions/data-access';
import type { InterventionOutput } from '@features/organization/features/interventions/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import { InterventionOfflineService } from '../intervention-offline';

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
   * Provides the organization value.
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
   * Property injector
   * @readonly
   *
   * @description
   * Owning injector used to create the prefetch effect lazily from
   * within `start()`, outside of the constructor injection context.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Injector}
   */
  private readonly injector: Injector = inject<Injector>(Injector);

  /**
   * Property started
   *
   * @description
   * Whether prefetch monitoring has already been registered; prevents
   * double-registration when `start()` is called more than once.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {boolean}
   */
  private started: boolean = false;

  /**
   * Method start
   * @method start
   *
   * @description
   * Registers the prefetch effect once. A reactive effect triggers a
   * workspace download whenever the active organization changes and the
   * application is online. Subsequent calls are no-ops.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {void}
   */
  public start(): void {
    if (this.started) return;
    this.started = true;

    effect(
      (onCleanup) => {
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
      },
      { injector: this.injector },
    );
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
