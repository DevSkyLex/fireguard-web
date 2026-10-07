import { inject, Service } from '@angular/core';
import { catchError, defer, from, map, of, switchMap, type Observable } from 'rxjs';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { OrganizationPermissionService } from '@features/organization/access';
import type { EquipmentTypeCatalogStoreType } from '@features/organization/features/equipments';
import { EquipmentTypeService } from '@features/organization/features/equipments/data-access';
import { InterventionOfflineService } from '@features/organization/features/interventions/data-access';
import type {
  InterventionEquipmentCatalogSnapshot,
  InterventionOutput,
} from '@features/organization/features/interventions/models';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { ORGANIZATION_CONTEXT_PORT } from '@features/organization/ports';

/**
 * Class InterventionEquipmentCatalogService
 * @class InterventionEquipmentCatalogService
 *
 * @description
 * Captures the complete authorized Equipment-owned catalog for field work and restores it
 * only while the current account, organization and permissions still match.
 */
@Service()
export class InterventionEquipmentCatalogService {
  //#region Properties
  /**
   * Property catalog
   * @readonly
   *
   * @description
   * Public transport drains every server page, including archived type descriptors.
   *
   * @access private
   * @since unreleased
   *
   * @type {EquipmentTypeService}
   */
  private readonly catalog = inject(EquipmentTypeService);

  /**
   * Property offline
   * @readonly
   *
   * @description
   * Account-fenced durable workspace storage.
   *
   * @access private
   * @since unreleased
   *
   * @type {InterventionOfflineService}
   */
  private readonly offline = inject(InterventionOfflineService);

  /**
   * Property organization
   * @readonly
   *
   * @description
   * Current organization context owns the catalog authorization scope.
   *
   * @access private
   * @since unreleased
   *
   * @type {OrganizationContextPort}
   */
  private readonly organization = inject(ORGANIZATION_CONTEXT_PORT);

  /**
   * Property permissions
   * @readonly
   *
   * @description
   * Current loaded permissions must still authorize reading equipment.
   *
   * @access private
   * @since unreleased
   *
   * @type {OrganizationPermissionService}
   */
  private readonly permissions = inject(OrganizationPermissionService);

  /**
   * Property session
   * @readonly
   *
   * @description
   * Session replacement fences late catalog responses independently of bearer rotation.
   *
   * @access private
   * @since unreleased
   *
   * @type {AuthSessionPort}
   */
  private readonly session = inject(AUTH_SESSION_PORT);
  //#endregion

  //#region Methods
  /**
   * Method accountId
   * @method accountId
   *
   * @description
   * Captures the authenticated account before workspace preparation crosses an await boundary.
   *
   * @access public
   * @since unreleased
   *
   * @returns {string | null} Current account owner.
   */
  public accountId(): string | null {
    return this.offline.publicationOwner();
  }

  /**
   * Method capture
   * @method capture
   *
   * @description
   * Persists a complete catalog only after its owning workspace has been saved.
   * Missing permission, incomplete reads and stale scopes never produce a snapshot.
   *
   * @access public
   * @since unreleased
   *
   * @param {InterventionOutput} intervention - Saved workspace owning this catalog snapshot.
   * @param {string | null} expectedOwner - Account captured when workspace preparation started.
   *
   * @returns {Observable<InterventionEquipmentCatalogSnapshot | null>} Complete eligible catalog,
   *   or none.
   */
  public capture(
    intervention: InterventionOutput,
    expectedOwner: string | null,
  ): Observable<InterventionEquipmentCatalogSnapshot | null> {
    return defer(() => {
      const organizationId = /^\/api\/organizations\/([^/?#]+)$/.exec(
        intervention.organization ?? '',
      )?.[1];
      const revision = this.session.sessionRevision();
      if (
        !organizationId ||
        !expectedOwner ||
        !this.authorized(organizationId, expectedOwner, revision)
      )
        return of(null);
      return this.catalog.listAll(organizationId).pipe(
        switchMap((entries) => {
          if (!this.authorized(organizationId, expectedOwner, revision)) return of(null);
          const snapshot: InterventionEquipmentCatalogSnapshot = {
            version: 1,
            accountId: expectedOwner,
            organizationId,
            entries,
            capturedAt: new Date().toISOString(),
          };
          return from(
            this.offline.saveEquipmentCatalog(
              intervention.id,
              organizationId,
              entries,
              expectedOwner,
            ),
          ).pipe(
            map(() => (this.authorized(organizationId, expectedOwner, revision) ? snapshot : null)),
          );
        }),
        catchError(() => of(null)),
      );
    });
  }

  /**
   * Method restore
   * @method restore
   *
   * @description
   * Hydrates a local page catalog while revocation and scope changes clear proprietary descriptors.
   *
   * @access public
   * @since unreleased
   *
   * @param {InterventionEquipmentCatalogSnapshot | null | undefined} snapshot - Optional cached
   *   catalog; old workspaces omit it.
   * @param {Pick<EquipmentTypeCatalogStoreType, 'seed' | 'clear'>} target - Equipment-owned page
   *   catalog instance.
   *
   * @returns {void}
   */
  public restore(
    snapshot: InterventionEquipmentCatalogSnapshot | null | undefined,
    target: Pick<EquipmentTypeCatalogStoreType, 'seed' | 'clear'>,
  ): void {
    if (
      !snapshot ||
      snapshot.version !== 1 ||
      !this.authorized(snapshot.organizationId, snapshot.accountId)
    ) {
      target.clear();
      return;
    }
    target.seed(snapshot.organizationId, snapshot.entries);
  }

  /**
   * Method authorized
   * @method authorized
   *
   * @description
   * Rejects unloaded permissions and every stale account, organization or session.
   *
   * @access private
   * @since unreleased
   *
   * @param {string} organizationId - Snapshot organization.
   * @param {string} accountId - Snapshot account.
   * @param {number} [sessionRevision] - Session captured before a network read.
   *
   * @returns {boolean} Whether this scope may currently expose the catalog.
   */
  private authorized(organizationId: string, accountId: string, sessionRevision?: number): boolean {
    return (
      this.session.isAuthenticated() &&
      this.offline.publicationOwner() === accountId &&
      this.organization.selectedOrganizationId() === organizationId &&
      !this.permissions.isLoadingPermissions() &&
      !this.permissions.permissionError() &&
      this.permissions.hasPermission(ORGANIZATION_PERMISSION.EQUIPMENT_READ) &&
      (sessionRevision === undefined || this.session.sessionRevision() === sessionRevision)
    );
  }
  //#endregion
}
