import { inject, Service } from '@angular/core';
import { defer, firstValueFrom, type Observable } from 'rxjs';
import type { HydraCollection, HydraItem } from '@core/api/models';
import { AUTH_SESSION_PORT, type AuthSessionPort } from '@features/auth/ports';
import { OrganizationPermissionService } from '@features/organization/access';
import {
  InterventionInventoryRepository,
  InterventionOfflineService,
} from '@features/organization/features/interventions/data-access';
import type {
  InterventionInventoryScope,
  InterventionInventorySnapshot,
  InterventionOutput,
} from '@features/organization/features/interventions/models';
import { InventoryService } from '@features/organization/features/inventory/data-access';
import type {
  InventoryPartOutput,
  InventoryWarehouseOutput,
  InventoryConsumptionOutput,
} from '@features/organization/features/inventory/models';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  ORGANIZATION_CONTEXT_PORT,
  type OrganizationContextPort,
} from '@features/organization/ports';

/**
 * Constant INVENTORY_SNAPSHOT_LIMIT
 *
 * @description
 * Bounds full reference and fact drains; exceeding it never produces a partial offline snapshot.
 *
 * @type {number}
 */
const INVENTORY_SNAPSHOT_LIMIT: number = 10000;

/**
 * Class InterventionInventoryService
 * @class InterventionInventoryService
 *
 * @description
 * Prepares full authorized quantitative references and declarations for an account-owned workspace.
 * Ordinary snapshots expose no internal valuation and never claim global stock availability.
 */
@Service()
export class InterventionInventoryService {
  //#region Properties
  /**
   * Property inventory
   * @readonly
   *
   * @description
   * Owner-published quantitative transport.
   *
   * @access private
   * @since unreleased
   *
   * @type {InventoryService}
   */
  private readonly inventory: InventoryService = inject(InventoryService);

  /**
   * Property repository
   * @readonly
   *
   * @description
   * Retains complete catalog snapshots and accepted receipts.
   *
   * @access private
   * @since unreleased
   *
   * @type {InterventionInventoryRepository}
   */
  private readonly repository: InterventionInventoryRepository = inject(
    InterventionInventoryRepository,
  );

  /**
   * Property offline
   * @readonly
   *
   * @description
   * Supplies the account owner and saved workspace authority.
   *
   * @access private
   * @since unreleased
   *
   * @type {InterventionOfflineService}
   */
  private readonly offline: InterventionOfflineService = inject(InterventionOfflineService);

  /**
   * Property session
   * @readonly
   *
   * @description
   * Authentication-session generation fences later network and persistence results.
   *
   * @access private
   * @since unreleased
   *
   * @type {AuthSessionPort}
   */
  private readonly session: AuthSessionPort = inject(AUTH_SESSION_PORT);

  /**
   * Property organization
   * @readonly
   *
   * @description
   * Parent-owned current workspace context.
   *
   * @access private
   * @since unreleased
   *
   * @type {OrganizationContextPort}
   */
  private readonly organization: OrganizationContextPort = inject(ORGANIZATION_CONTEXT_PORT);

  /**
   * Property permissions
   * @readonly
   *
   * @description
   * Unknown or revoked access cannot expose cached references.
   *
   * @access private
   * @since unreleased
   *
   * @type {OrganizationPermissionService}
   */
  private readonly permissions: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );
  //#endregion

  //#region Methods
  /**
   * Method scope
   * @method scope
   *
   * @description
   * Captures current account and session only after scope and Inventory read permission are known.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization.
   * @param {string} interventionId - Current workspace.
   *
   * @returns {InterventionInventoryScope | null} Eligible captured scope.
   */
  public scope(organizationId: string, interventionId: string): InterventionInventoryScope | null {
    const accountId = this.offline.publicationOwner();
    if (!accountId) return null;
    const scope: InterventionInventoryScope = {
      organizationId,
      interventionId,
      accountId,
      sessionRevision: this.session.sessionRevision(),
    };
    return this.isCurrent(scope) ? scope : null;
  }

  /**
   * Method isCurrent
   * @method isCurrent
   *
   * @description
   * Requires current account, session, organization and loaded server permissions before exposure.
   *
   * @access public
   * @since unreleased
   *
   * @param {InterventionInventoryScope} scope - Captured scope.
   * @param {boolean} consume - Also require Inventory consumption and intervention execution.
   *
   * @returns {boolean} Whether this scope may still own the operation.
   */
  public isCurrent(scope: InterventionInventoryScope, consume: boolean = false): boolean {
    return (
      this.session.isAuthenticated() &&
      this.session.sessionRevision() === scope.sessionRevision &&
      this.offline.publicationOwner() === scope.accountId &&
      this.organization.selectedOrganizationId() === scope.organizationId &&
      !this.permissions.isLoadingPermissions() &&
      !this.permissions.permissionError() &&
      this.permissions.hasPermission(ORGANIZATION_PERMISSION.INVENTORY_READ) &&
      (!consume ||
        (this.permissions.hasPermission(ORGANIZATION_PERMISSION.INVENTORY_CONSUME) &&
          this.permissions.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_EXECUTE)))
    );
  }

  /**
   * Method loadSaved
   * @method loadSaved
   *
   * @description
   * Restores metadata only under currently authorized account and workspace access.
   *
   * @access public
   * @since unreleased
   *
   * @param {InterventionInventoryScope} scope - Captured authorized scope.
   *
   * @returns {Promise<InterventionInventorySnapshot | null>} Saved complete or receipt-only
   *   snapshot.
   */
  public loadSaved(
    scope: InterventionInventoryScope,
  ): Promise<InterventionInventorySnapshot | null> {
    return this.repository.load(scope.organizationId, scope.interventionId, () =>
      this.isCurrent(scope),
    );
  }

  /**
   * Method capture
   * @method capture
   *
   * @description
   * Captures all authorized catalog pages after workspace preparation; failures never replace an
   * earlier complete snapshot with a partial result.
   *
   * @access public
   * @since unreleased
   *
   * @param {InterventionOutput} intervention - Canonical already-saved workspace.
   * @param {string | null} expectedOwner - Account captured before preparation started.
   *
   * @returns {Observable<InterventionInventorySnapshot | null>} Complete snapshot, or none when
   *   denied.
   */
  public capture(
    intervention: InterventionOutput,
    expectedOwner: string | null,
  ): Observable<InterventionInventorySnapshot | null> {
    return defer(async () => {
      const organizationId = /^\/api\/organizations\/([^/?#]+)$/.exec(
        intervention.organization ?? '',
      )?.[1];
      const scope = organizationId ? this.scope(organizationId, intervention.id) : null;
      if (!scope || expectedOwner !== scope.accountId) return null;
      return this.refresh(scope);
    });
  }

  /**
   * Method refresh
   * @method refresh
   *
   * @description
   * Drains all server pages and then saves one complete scoped catalog and declaration history.
   *
   * @access public
   * @since unreleased
   *
   * @param {InterventionInventoryScope} scope - Captured account and session.
   *
   * @returns {Promise<InterventionInventorySnapshot>} Persisted full snapshot.
   */
  public async refresh(scope: InterventionInventoryScope): Promise<InterventionInventorySnapshot> {
    const current = (): boolean => this.isCurrent(scope);
    this.assertCurrent(current);
    const [parts, warehouses, declarations] = await Promise.all([
      this.collectPages<InventoryPartOutput>(
        (page) =>
          this.inventory.listParts(scope.organizationId, {
            page,
            itemsPerPage: 100,
            params: { archived: false },
          }),
        current,
      ),
      this.collectPages<InventoryWarehouseOutput>(
        (page) =>
          this.inventory.listWarehouses(scope.organizationId, {
            page,
            itemsPerPage: 100,
            params: { archived: false },
          }),
        current,
      ),
      this.collectPages<InventoryConsumptionOutput>(
        (page) =>
          this.inventory.listConsumptions(scope.organizationId, {
            page,
            itemsPerPage: 100,
            params: { interventionId: scope.interventionId },
          }),
        current,
      ),
    ]);
    this.assertCurrent(current);
    if (declarations.some((item) => item.interventionId !== scope.interventionId))
      throw new Error(
        $localize`:@@intervention.inventory.historyScopeError:The declaration history could not be verified for this intervention. Refresh before continuing.`,
      );
    const snapshot: InterventionInventorySnapshot = {
      version: 1,
      ...scope,
      capturedAt: new Date().toISOString(),
      catalogComplete: true,
      declarationsComplete: true,
      parts,
      warehouses,
      declarations,
    };
    await this.repository.save(snapshot, current);
    this.assertCurrent(current);
    const retained = await this.repository.load(
      scope.organizationId,
      scope.interventionId,
      current,
    );
    this.assertCurrent(current);
    return retained ?? snapshot;
  }

  /**
   * Method collectPages
   * @method collectPages
   *
   * @description
   * Rejects missing pages, changing totals or repeated pages instead of labeling them complete.
   *
   * @access private
   * @since unreleased
   *
   * @template Row - Server resource with a stable identifier.
   *
   * @param {(page: number) => Observable<HydraCollection<Row>>} read - Authorized paged transport.
   * @param {() => boolean} isCurrent - Authorization fence at every async boundary.
   *
   * @returns {Promise<readonly Row[]>} All validated bounded rows.
   */
  private async collectPages<Row extends HydraItem & { readonly id: string }>(
    read: (page: number) => Observable<HydraCollection<Row>>,
    isCurrent: () => boolean,
  ): Promise<readonly Row[]> {
    const rows = new Map<string, Row>();
    let total: number | null = null;
    for (let page = 1; page <= INVENTORY_SNAPSHOT_LIMIT / 100 + 1; page += 1) {
      this.assertCurrent(isCurrent);
      // eslint-disable-next-line no-await-in-loop -- Each validated page determines whether another bounded request is safe.
      const response = await firstValueFrom(read(page));
      this.assertCurrent(isCurrent);
      if (
        !Array.isArray(response.member) ||
        !Number.isSafeInteger(response.totalItems) ||
        response.totalItems < 0 ||
        response.totalItems > INVENTORY_SNAPSHOT_LIMIT ||
        (total !== null && response.totalItems !== total)
      )
        throw new Error(
          $localize`:@@intervention.inventory.catalogIncomplete:The stock references changed or could not be downloaded completely. Retry preparation.`,
        );
      total = response.totalItems;
      const previousSize = rows.size;
      for (const row of response.member) {
        if (typeof row.id !== 'string' || !row.id)
          throw new Error('A stock reference has no stable identity.');
        rows.set(row.id, row);
      }
      if (rows.size === total) return [...rows.values()];
      if (rows.size > total || rows.size === previousSize)
        throw new Error(
          $localize`:@@intervention.inventory.catalogIncomplete:The stock references changed or could not be downloaded completely. Retry preparation.`,
        );
    }
    throw new Error(
      $localize`:@@intervention.inventory.catalogIncomplete:The stock references changed or could not be downloaded completely. Retry preparation.`,
    );
  }

  /**
   * Method assertCurrent
   * @method assertCurrent
   *
   * @description
   * Cancels obsolete exposure and persistence while an already accepted server request may finish.
   *
   * @access private
   * @since unreleased
   *
   * @param {() => boolean} isCurrent - Captured authorization fence.
   *
   * @returns {void} Throws after an account, permission, organization or session change.
   */
  private assertCurrent(isCurrent: () => boolean): void {
    if (!isCurrent()) throw new DOMException('Inventory preparation scope changed.', 'AbortError');
  }
  //#endregion
}
