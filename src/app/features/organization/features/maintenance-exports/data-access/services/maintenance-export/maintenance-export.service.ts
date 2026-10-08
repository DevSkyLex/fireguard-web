import { Service } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService } from '@core/api';
import type { HydraCollection, RequestOptions } from '@core/api/models';
import type {
  MaintenanceExportOutput,
  MaintenanceExportSourceOutput,
  MaintenanceExportReferenceOutput,
  MaintenanceExportResourceType,
  CreateMaintenanceExportInput,
  AdjustMaintenanceExportInput,
  ConfirmMaintenanceExportInput,
  WriteMaintenanceExportReferenceInput,
} from '@features/organization/features/maintenance-exports/models';

/**
 * Class MaintenanceExportService
 * @class MaintenanceExportService
 *
 * @description
 * Scoped archive transport preserves retained bytes, optimistic revisions and operation receipts.
 */
@Service()
export class MaintenanceExportService extends HydraApiService {
  //#region Methods
  /**
   * Method list
   * @method list
   *
   * @description
   * Reads one server page of authorized archive metadata.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization.
   * @param {RequestOptions | undefined} options - Bounded server query.
   *
   * @returns {Observable<HydraCollection<MaintenanceExportOutput>>} Authorized metadata page.
   */
  public list(
    organizationId: string,
    options?: RequestOptions,
  ): Observable<HydraCollection<MaintenanceExportOutput>> {
    return this.getCollection<MaintenanceExportOutput>(
      `/api/organizations/${organizationId}/maintenance-exports`,
      options,
    );
  }

  /**
   * Method read
   * @method read
   *
   * @description
   * Reads the selected retained archive, including its immutable correction links.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization.
   * @param {string} exportId - Retained archive identity.
   *
   * @returns {Observable<MaintenanceExportOutput>} Scoped archive metadata.
   */
  public read(organizationId: string, exportId: string): Observable<MaintenanceExportOutput> {
    return this.getOne<MaintenanceExportOutput>(
      `/api/organizations/${organizationId}/maintenance-exports/${exportId}`,
    );
  }

  /**
   * Method listSources
   * @method listSources
   *
   * @description
   * Lists published dossier readiness without reconstructing it from current live data.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization.
   * @param {RequestOptions | undefined} options - Server page and search.
   *
   * @returns {Observable<HydraCollection<MaintenanceExportSourceOutput>>} Published selection page.
   */
  public listSources(
    organizationId: string,
    options?: RequestOptions,
  ): Observable<HydraCollection<MaintenanceExportSourceOutput>> {
    return this.getCollection<MaintenanceExportSourceOutput>(
      `/api/organizations/${organizationId}/maintenance-export-sources`,
      options,
    );
  }

  /**
   * Method create
   * @method create
   *
   * @description
   * Creates one retained archive or recovers the same operation receipt on replay.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization.
   * @param {CreateMaintenanceExportInput} input - Stable bounded creation command.
   *
   * @returns {Observable<MaintenanceExportOutput>} Original archive receipt.
   */
  public create(
    organizationId: string,
    input: CreateMaintenanceExportInput,
  ): Observable<MaintenanceExportOutput> {
    return this.post<CreateMaintenanceExportInput, MaintenanceExportOutput>(
      `/api/organizations/${organizationId}/maintenance-exports`,
      input,
    );
  }

  /**
   * Method adjust
   * @method adjust
   *
   * @description
   * Appends a motivated adjustment using the displayed predecessor revision.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization.
   * @param {string} exportId - Retained predecessor identity.
   * @param {AdjustMaintenanceExportInput} input - Stable reason and receipt identity.
   * @param {number} revision - Displayed predecessor revision.
   *
   * @returns {Observable<MaintenanceExportOutput>} New linked immutable archive.
   */
  public adjust(
    organizationId: string,
    exportId: string,
    input: AdjustMaintenanceExportInput,
    revision: number,
  ): Observable<MaintenanceExportOutput> {
    return this.post<AdjustMaintenanceExportInput, MaintenanceExportOutput>(
      `/api/organizations/${organizationId}/maintenance-exports/${exportId}/adjustments`,
      input,
      { headers: { 'If-Match': `"revision-${revision}"` } },
    );
  }

  /**
   * Method confirm
   * @method confirm
   *
   * @description
   * Records an explicitly confirmed external import independently of generation.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization.
   * @param {string} exportId - Imported retained archive.
   * @param {ConfirmMaintenanceExportInput} input - Stable external acknowledgement.
   * @param {number} revision - Displayed administrative revision.
   *
   * @returns {Observable<MaintenanceExportOutput>} Confirmed import metadata.
   */
  public confirm(
    organizationId: string,
    exportId: string,
    input: ConfirmMaintenanceExportInput,
    revision: number,
  ): Observable<MaintenanceExportOutput> {
    return this.post<ConfirmMaintenanceExportInput, MaintenanceExportOutput>(
      `/api/organizations/${organizationId}/maintenance-exports/${exportId}/confirm`,
      input,
      { headers: { 'If-Match': `"revision-${revision}"` } },
    );
  }

  /**
   * Method download
   * @method download
   *
   * @description
   * Returns the persisted file bytes without client-side regeneration or conversion.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization.
   * @param {string} exportId - Retained archive identity.
   * @param {'json' | 'csv'} format - Persisted format.
   *
   * @returns {Observable<Blob>} Exact retained byte stream.
   */
  public download(
    organizationId: string,
    exportId: string,
    format: 'json' | 'csv',
  ): Observable<Blob> {
    return this.http.get(
      this.buildUrl(
        `/api/organizations/${organizationId}/maintenance-exports/${exportId}/files/${format}`,
      ),
      { responseType: 'blob', withCredentials: true },
    );
  }

  /**
   * Method listReferences
   * @method listReferences
   *
   * @description
   * Lists current mapping revisions; generated archives keep their own frozen references.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization.
   * @param {RequestOptions | undefined} options - Server page and mapping scope.
   *
   * @returns {Observable<HydraCollection<MaintenanceExportReferenceOutput>>} Current mapping page.
   */
  public listReferences(
    organizationId: string,
    options?: RequestOptions,
  ): Observable<HydraCollection<MaintenanceExportReferenceOutput>> {
    return this.getCollection<MaintenanceExportReferenceOutput>(
      `/api/organizations/${organizationId}/maintenance-export-references`,
      options,
    );
  }

  /**
   * Method writeReference
   * @method writeReference
   *
   * @description
   * Writes one mapping at the reviewed revision, using revision zero only for a confirmed absence.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization.
   * @param {MaintenanceExportResourceType} type - Supported owner type.
   * @param {string} resourceId - Readable scoped selection identity.
   * @param {WriteMaintenanceExportReferenceInput} input - Exact stable mapping command.
   * @param {number} revision - Reviewed current revision or zero for absence.
   *
   * @returns {Observable<MaintenanceExportReferenceOutput>} Server-confirmed current mapping.
   */
  public writeReference(
    organizationId: string,
    type: MaintenanceExportResourceType,
    resourceId: string,
    input: WriteMaintenanceExportReferenceInput,
    revision: number,
  ): Observable<MaintenanceExportReferenceOutput> {
    return this.patch<WriteMaintenanceExportReferenceInput, MaintenanceExportReferenceOutput>(
      `/api/organizations/${organizationId}/maintenance-export-references/${type}/${resourceId}`,
      input,
      { headers: { 'If-Match': `"revision-${revision}"` } },
    );
  }
  //#endregion
}
