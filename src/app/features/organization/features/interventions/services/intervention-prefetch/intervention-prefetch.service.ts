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
 * Provides intervention prefetch operations.
 *
 * @version 1.0.0
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
   * @type {InterventionService}
   */
  private readonly service: InterventionService = inject(InterventionService);

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
   * @type {InterventionOfflineService}
   */
  private readonly offline: InterventionOfflineService = inject(InterventionOfflineService);

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
   * Executes the prefetch operation.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {string} organizationId - Organization owning the prefetch request.
   * @param {InterventionOutput} intervention - intervention value.
   *
   * @return {Observable<void>} Result of the prefetch operation.
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
