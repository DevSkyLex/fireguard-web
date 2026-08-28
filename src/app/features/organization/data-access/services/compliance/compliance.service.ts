import { Service } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService, type RequestOptions } from '@core/api';
import type { HydraCollection } from '@core/api/models';
import type {
  ComplianceFacilityTreeOutput,
  ComplianceSummaryOutput,
  CreateSafetyRegisterSnapshotInput,
  SafetyRegisterSnapshotOutput,
} from '@features/organization/models';

/**
 * Service ComplianceService
 * @class ComplianceService
 * @extends {HydraApiService}
 *
 * @description
 * API service for the backend Compliance module's read-only surface: the
 * enriched facility hierarchy, the organization/facility compliance
 * register summary, the safety-register PDF export, and the dated
 * register-snapshot archive (create, list, download).
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Service()
export class ComplianceService extends HydraApiService {
  //#region Properties
  /**
   * Property BASE_PATH
   * @readonly
   *
   * @description
   * The base API path for every Compliance-module endpoint.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {string}
   */
  private static readonly BASE_PATH: string = '/api/organizations';
  //#endregion

  //#region Public Methods
  /**
   * Method getFacilityTree
   * @method getFacilityTree
   *
   * @description
   * Reads the enriched facility hierarchy
   * (`GET /organizations/{organizationId}/facility-tree`): nested Site ->
   * Building -> Floor -> Zone/Area nodes, each already carrying its
   * equipment count and compliance verdict/rate, eagerly to the leaves.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The organization to read the tree for.
   *
   * @return {Observable<ComplianceFacilityTreeOutput>} The tree snapshot.
   */
  public getFacilityTree(organizationId: string): Observable<ComplianceFacilityTreeOutput> {
    return this.getOne<ComplianceFacilityTreeOutput>(
      `${ComplianceService.BASE_PATH}/${organizationId}/facility-tree`,
    );
  }

  /**
   * Method getOrganizationCompliance
   * @method getOrganizationCompliance
   *
   * @description
   * Reads the organization-wide compliance register summary
   * (`GET /organizations/{organizationId}/compliance`).
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The organization to read the summary for.
   *
   * @return {Observable<ComplianceSummaryOutput>} The organization rollup summary.
   */
  public getOrganizationCompliance(organizationId: string): Observable<ComplianceSummaryOutput> {
    return this.getOne<ComplianceSummaryOutput>(
      `${ComplianceService.BASE_PATH}/${organizationId}/compliance`,
    );
  }

  /**
   * Method getFacilityCompliance
   * @method getFacilityCompliance
   *
   * @description
   * Reads a single facility's compliance register summary
   * (`GET /organizations/{organizationId}/facilities/{facilityId}/compliance`).
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The owning organization.
   * @param {string} facilityId - The facility to read the summary for.
   *
   * @return {Observable<ComplianceSummaryOutput>} The single-facility summary.
   */
  public getFacilityCompliance(
    organizationId: string,
    facilityId: string,
  ): Observable<ComplianceSummaryOutput> {
    return this.getOne<ComplianceSummaryOutput>(
      `${ComplianceService.BASE_PATH}/${organizationId}/facilities/${facilityId}/compliance`,
    );
  }

  /**
   * Method exportOrganizationSafetyRegister
   * @method exportOrganizationSafetyRegister
   *
   * @description
   * Reads the organization-wide "registre de sécurité" PDF
   * (`GET /organizations/{organizationId}/compliance/export`). Calls
   * `this.http` directly, like `InterventionService.downloadAttachment`, for
   * a response shape (`responseType: 'blob'`) the base class does not
   * support.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The organization to export the register for.
   *
   * @return {Observable<Blob>} The exported PDF's binary content.
   */
  public exportOrganizationSafetyRegister(organizationId: string): Observable<Blob> {
    return this.http.get(
      this.buildUrl(`${ComplianceService.BASE_PATH}/${organizationId}/compliance/export`),
      { responseType: 'blob', withCredentials: true },
    );
  }

  /**
   * Method exportFacilitySafetyRegister
   * @method exportFacilitySafetyRegister
   *
   * @description
   * Reads one facility's "registre de sécurité" PDF
   * (`GET /organizations/{organizationId}/facilities/{facilityId}/compliance/export`).
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The owning organization.
   * @param {string} facilityId - The facility to export the register for.
   *
   * @return {Observable<Blob>} The exported PDF's binary content.
   */
  public exportFacilitySafetyRegister(
    organizationId: string,
    facilityId: string,
  ): Observable<Blob> {
    return this.http.get(
      this.buildUrl(
        `${ComplianceService.BASE_PATH}/${organizationId}/facilities/${facilityId}/compliance/export`,
      ),
      { responseType: 'blob', withCredentials: true },
    );
  }

  /**
   * Method createRegisterSnapshot
   * @method createRegisterSnapshot
   *
   * @description
   * Archives the safety register as a dated snapshot
   * (`POST /organizations/{organizationId}/compliance/register-snapshots`):
   * the register is rendered through the same pipeline as the live export
   * and stored with its SHA-256 content hash. Pass `facilityId` in the body
   * for a facility-scoped register; an empty body archives the
   * organization-wide one. Shares the live export's gate —
   * `organization.compliance.export` AND a pro/max plan; a non-entitled
   * plan answers `403` with an RFC 7807 `detail`.
   *
   * @access public
   * @since 1.1.0
   *
   * @param {string} organizationId - The organization to archive the register for.
   * @param {CreateSafetyRegisterSnapshotInput} input - The scope: `{ facilityId }` or `{}`.
   *
   * @return {Observable<SafetyRegisterSnapshotOutput>} The created snapshot's metadata.
   */
  public createRegisterSnapshot(
    organizationId: string,
    input: CreateSafetyRegisterSnapshotInput,
  ): Observable<SafetyRegisterSnapshotOutput> {
    return this.post<CreateSafetyRegisterSnapshotInput, SafetyRegisterSnapshotOutput>(
      `${ComplianceService.BASE_PATH}/${organizationId}/compliance/register-snapshots`,
      input,
    );
  }

  /**
   * Method listRegisterSnapshots
   * @method listRegisterSnapshots
   *
   * @description
   * Reads the organization's archived safety-register snapshots
   * (`GET /organizations/{organizationId}/compliance/register-snapshots`):
   * a paginated Hydra collection of snapshot metadata, most recently
   * generated first. Same gate as the live export — a non-entitled plan
   * answers `403`.
   *
   * @access public
   * @since 1.1.0
   *
   * @param {string} organizationId - The organization to list the snapshots for.
   * @param {RequestOptions} [options] - Pagination options.
   *
   * @return {Observable<HydraCollection<SafetyRegisterSnapshotOutput>>} The snapshot page.
   */
  public listRegisterSnapshots(
    organizationId: string,
    options?: RequestOptions,
  ): Observable<HydraCollection<SafetyRegisterSnapshotOutput>> {
    return this.getCollection<SafetyRegisterSnapshotOutput>(
      `${ComplianceService.BASE_PATH}/${organizationId}/compliance/register-snapshots`,
      options,
    );
  }

  /**
   * Method downloadRegisterSnapshot
   * @method downloadRegisterSnapshot
   *
   * @description
   * Reads one archived snapshot's PDF
   * (`GET /organizations/{organizationId}/compliance/register-snapshots/{snapshotId}/download`).
   * Calls `this.http` directly, like `exportOrganizationSafetyRegister`, for
   * a response shape (`responseType: 'blob'`) the base class does not
   * support.
   *
   * @access public
   * @since 1.1.0
   *
   * @param {string} organizationId - The owning organization.
   * @param {string} snapshotId - The snapshot to download.
   *
   * @return {Observable<Blob>} The archived PDF's binary content.
   */
  public downloadRegisterSnapshot(organizationId: string, snapshotId: string): Observable<Blob> {
    return this.http.get(
      this.buildUrl(
        `${ComplianceService.BASE_PATH}/${organizationId}/compliance/register-snapshots/${snapshotId}/download`,
      ),
      { responseType: 'blob', withCredentials: true },
    );
  }
  //#endregion
}
