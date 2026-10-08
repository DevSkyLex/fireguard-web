import { Service } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService } from '@core/api';
import type { HydraCollection } from '@core/api/models';
import type {
  MaintenanceEconomicReportOutput,
  MaintenanceFinancialDirectoryQuery,
  MaintenanceFinancialDossierOutput,
  MaintenanceReportQuery,
} from '@features/organization/features/maintenance-costs/models';

/**
 * Class MaintenanceReportService
 * @class MaintenanceReportService
 *
 * @description
 * Dedicated read-only financial transport; server aggregates and scope identities remain
 * authoritative.
 */
@Service()
export class MaintenanceReportService extends HydraApiService {
  //#region Methods
  /**
   * Method readReport
   * @method readReport
   *
   * @description
   * Reads complete filtered totals and one allocation page; an oversized scope is explicitly
   * rejected.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Authorized owning organization.
   * @param {MaintenanceReportQuery} query - Inclusive dates, allocation dimension and server page.
   *
   * @returns {Observable<MaintenanceEconomicReportOutput>} Exact private financial report.
   */
  public readReport(
    organizationId: string,
    query: MaintenanceReportQuery,
  ): Observable<MaintenanceEconomicReportOutput> {
    return this.getOne<MaintenanceEconomicReportOutput>(
      `/api/organizations/${organizationId}/maintenance-cost/reports`,
      {
        params: {
          from: query.from,
          to: query.to,
          groupBy: query.groupBy,
          page: query.page,
          itemsPerPage: query.itemsPerPage,
          ...(query.siteId ? { siteId: query.siteId } : {}),
          ...(query.customerId ? { customerId: query.customerId } : {}),
          ...(query.equipmentId ? { equipmentId: query.equipmentId } : {}),
        },
      },
    );
  }

  /**
   * Method listDossiers
   * @method listDossiers
   *
   * @description
   * Browses minimal named financial contexts with cost-read permission independently of operational
   * reads.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Authorized owning organization.
   * @param {MaintenanceFinancialDirectoryQuery} query - Search, optional scope and explicit page.
   *
   * @returns {Observable<HydraCollection<MaintenanceFinancialDossierOutput>>} Authorized minimal
   *   directory page.
   */
  public listDossiers(
    organizationId: string,
    query: MaintenanceFinancialDirectoryQuery,
  ): Observable<HydraCollection<MaintenanceFinancialDossierOutput>> {
    return this.getCollection<MaintenanceFinancialDossierOutput>(
      `/api/organizations/${organizationId}/maintenance-cost/dossiers`,
      {
        page: query.page,
        itemsPerPage: query.itemsPerPage,
        search: query.search,
        params: {
          ...(query.from ? { from: query.from } : {}),
          ...(query.to ? { to: query.to } : {}),
          ...(query.siteId ? { siteId: query.siteId } : {}),
          ...(query.customerId ? { customerId: query.customerId } : {}),
          ...(query.equipmentId ? { equipmentId: query.equipmentId } : {}),
        },
      },
    );
  }
  //#endregion
}
