import { effect, inject, Injectable, Injector } from '@angular/core';
import { catchError, EMPTY, forkJoin, from, map, type Observable, switchMap } from 'rxjs';
import { ConnectivityService } from '@core/services/connectivity';
import { OrganizationMemberService } from '@features/organization/data-access';
import { MissionService } from '@features/organization/features/missions/data-access';
import type { MissionOutput } from '@features/organization/features/missions/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import { MissionOfflineService } from '../mission-offline';

/**
 * Service MissionPrefetchService
 * @class MissionPrefetchService
 *
 * @description
 * Provides mission prefetch operations.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
export class MissionPrefetchService {
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
  private readonly organization: ActiveOrganizationStore = inject(ActiveOrganizationStore);

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
  private readonly connectivity: ConnectivityService = inject(ConnectivityService);

  /**
   * Property service
   * @readonly
   *
   * @description
   * Provides the service value.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {MissionService}
   */
  private readonly service: MissionService = inject(MissionService);

  /**
   * Property offline
   * @readonly
   *
   * @description
   * Provides the offline value.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {MissionOfflineService}
   */
  private readonly offline: MissionOfflineService = inject(MissionOfflineService);

  /**
   * Property members
   * @readonly
   *
   * @description
   * Provides the members value.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationMemberService}
   */
  private readonly members: OrganizationMemberService = inject(OrganizationMemberService);

  /**
   * Property injector
   * @readonly
   *
   * @description
   * Provides the injector value.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Injector}
   */
  private readonly injector: Injector = inject(Injector);

  /**
   * Property started
   *
   * @description
   * Provides the started value.
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
   * Executes the start operation.
   *
   * @access public
   * @since 1.0.0
   *
   * @return {void} Result of the start operation.
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
            switchMap((missions) =>
              forkJoin(
                missions
                  .filter((item) =>
                    ['planned', 'in_progress', 'changes_requested'].includes(item.status),
                  )
                  .map((mission) => this.prefetch(organizationId, mission)),
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
   * Executes the prefetch operation.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {string} organizationId - Organization owning the prefetch request.
   * @param {MissionOutput} mission - mission value.
   *
   * @return {Observable<void>} Result of the prefetch operation.
   */
  private prefetch(organizationId: string, mission: MissionOutput): Observable<void> {
    return forkJoin({
      workItems: this.service.listAllWorkItems(mission.id),
      changes: this.service.listAllChanges(mission.id),
      issues: this.service.listIssues(mission.id),
    }).pipe(
      switchMap(({ workItems, changes, issues }) => {
        if (this.organization.selectedOrganization()?.id !== organizationId) return EMPTY;
        return from(this.offline.saveWorkspace(mission, workItems, changes, issues.member));
      }),
      map(() => undefined),
    );
  }
}
