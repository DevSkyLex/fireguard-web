import { inject, Service } from '@angular/core';
import { map, type Observable } from 'rxjs';
import { OrganizationPermissionService } from '@features/organization/access';
import { CustomerService } from '@features/organization/features/customers/data-access';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import type { MaintenanceExportReferencePage } from '@features/organization/features/maintenance-exports/models';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import type { MaintenanceExportReferenceDirectoryQuery } from './maintenance-export-reference-directory-query.interface';

/**
 * Class MaintenanceExportReferenceDirectoryService
 * @class MaintenanceExportReferenceDirectoryService
 *
 * @description
 * Coordinates authorized owner directories and projects only stable ids and readable labels.
 * The archive store retains session fences, cancellation and request state.
 */
@Service()
export class MaintenanceExportReferenceDirectoryService {
  //#region Properties
  /**
   * Property customers
   * @readonly
   *
   * @description
   * Owner transport preserves explicit active or archived browsing.
   *
   * @access private
   * @since unreleased
   *
   * @type {CustomerService}
   */
  private readonly customers: CustomerService = inject(CustomerService);

  /**
   * Property facilities
   * @readonly
   *
   * @description
   * Owner transport supplies root sites, including historical archived sites.
   *
   * @access private
   * @since unreleased
   *
   * @type {FacilityService}
   */
  private readonly facilities: FacilityService = inject(FacilityService);

  /**
   * Property equipments
   * @readonly
   *
   * @description
   * Owner transport supplies individual equipment choices.
   *
   * @access private
   * @since unreleased
   *
   * @type {EquipmentService}
   */
  private readonly equipments: EquipmentService = inject(EquipmentService);

  /**
   * Property permissions
   * @readonly
   *
   * @description
   * Each owner directory requires its existing independent read grant.
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
   * Method list
   * @method list
   *
   * @description
   * Returns a minimal directory page while preserving authoritative totals and label fallbacks.
   * A denied owner returns no request; no contact details leave this projection.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Authenticated organization captured by the store.
   * @param {MaintenanceExportReferenceDirectoryQuery} query - Exact owner page and filters.
   *
   * @returns {Observable<MaintenanceExportReferencePage> | null} Authorized projection or no grant.
   */
  public list(
    organizationId: string,
    query: MaintenanceExportReferenceDirectoryQuery,
  ): Observable<MaintenanceExportReferencePage> | null {
    const options = { page: query.page, itemsPerPage: 30, search: query.search };
    if (
      query.resourceType === 'customer' &&
      this.permissions.hasPermission(ORGANIZATION_PERMISSION.CUSTOMERS_READ)
    )
      return this.customers
        .list(organizationId, { ...options, params: { archived: query.archived ?? false } })
        .pipe(
          map((page) => ({
            member: page.member.map((item) => ({ id: item.id, label: item.name })),
            totalItems: page.totalItems,
          })),
        );
    if (
      query.resourceType === 'site' &&
      this.permissions.hasPermission(ORGANIZATION_PERMISSION.FACILITIES_READ)
    )
      return this.facilities
        .list(organizationId, { ...options, rootsOnly: true, includeArchived: true })
        .pipe(
          map((page) => ({
            member: page.member
              .filter((item) => item.type === 'site')
              .map((item) => ({ id: item.id, label: item.name })),
            totalItems: page.totalItems,
          })),
        );
    if (
      query.resourceType === 'equipment' &&
      this.permissions.hasPermission(ORGANIZATION_PERMISSION.EQUIPMENT_READ)
    )
      return this.equipments.list(organizationId, options).pipe(
        map((page) => ({
          member: page.member.map((item) => ({
            id: item.id,
            label: item.name ?? item.assetCode ?? item.serialNumber ?? item.type,
          })),
          totalItems: page.totalItems,
        })),
      );
    return null;
  }
  //#endregion
}
