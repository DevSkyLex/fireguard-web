import { Service } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService } from '@core/api';
import type { HydraCollection } from '@core/api/models';
import type {
  FacilityModelInput,
  FacilityModelOutput,
} from '@features/organization/features/facilities/models';

/**
 * Class FacilityModelService
 * @class FacilityModelService
 *
 * @description
 * Owns authenticated GLB resource transport, including revision-protected writes.
 */
@Service()
export class FacilityModelService extends HydraApiService {
  //#region Methods
  /**
   * Method list
   * @method list
   *
   * @description
   * Reads the building's active model and optional replacement draft.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization.
   * @param {string} buildingId - Owning building.
   *
   * @returns {Observable<HydraCollection<FacilityModelOutput>>} Model collection.
   */
  public list(
    organizationId: string,
    buildingId: string,
  ): Observable<HydraCollection<FacilityModelOutput>> {
    return this.getCollection(
      `/api/organizations/${organizationId}/facilities/${buildingId}/models`,
    );
  }

  /**
   * Method get
   * @method get
   *
   * @description
   * Retrieves current placement, associations and revision.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} modelId - Model identifier.
   *
   * @returns {Observable<FacilityModelOutput>} Canonical resource.
   */
  public get(modelId: string): Observable<FacilityModelOutput> {
    return this.getOne(`/api/facility-models/${modelId}`);
  }

  /**
   * Method upload
   * @method upload
   *
   * @description
   * Creates an independent draft from an immutable autonomous GLB upload.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization.
   * @param {string} buildingId - Owning building.
   * @param {Blob} file - Autonomous GLB bytes.
   * @param {string} fileName - Original filename.
   *
   * @returns {Observable<FacilityModelOutput>} Created draft, without inherited associations.
   */
  public upload(
    organizationId: string,
    buildingId: string,
    file: Blob,
    fileName: string,
  ): Observable<FacilityModelOutput> {
    const body: FormData = new FormData();
    body.set('file', file, fileName);
    return this.http.post<FacilityModelOutput>(
      this.buildUrl(`/api/organizations/${organizationId}/facilities/${buildingId}/models`),
      body,
      { withCredentials: true, headers: this.buildHeaders().delete('Content-Type') },
    );
  }

  /**
   * Method update
   * @method update
   *
   * @description
   * Replaces placement and node associations under an optimistic revision precondition.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} modelId - Model identifier.
   * @param {FacilityModelInput} input - Complete settings.
   * @param {number} revision - Last observed revision.
   *
   * @returns {Observable<FacilityModelOutput>} Updated resource.
   */
  public update(
    modelId: string,
    input: FacilityModelInput,
    revision: number,
  ): Observable<FacilityModelOutput> {
    return this.patch<FacilityModelInput, FacilityModelOutput>(
      `/api/facility-models/${modelId}`,
      input,
      {
        headers: { 'If-Match': `"revision-${revision}"` },
      },
    );
  }

  /**
   * Method activate
   * @method activate
   *
   * @description
   * Makes this model active and atomically deactivates the previous model.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} modelId - Model identifier.
   * @param {number} revision - Last observed revision.
   *
   * @returns {Observable<FacilityModelOutput>} Activated resource.
   */
  public activate(modelId: string, revision: number): Observable<FacilityModelOutput> {
    return this.postAction(`/api/facility-models/${modelId}/activate`, {
      headers: { 'If-Match': `"revision-${revision}"` },
    });
  }

  /**
   * Method remove
   * @method remove
   *
   * @description
   * Deletes only the selected model resource and its immutable file.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} modelId - Model identifier.
   * @param {number} revision - Last observed revision.
   *
   * @returns {Observable<void>} Delete completion.
   */
  public remove(modelId: string, revision: number): Observable<void> {
    return this.delete(`/api/facility-models/${modelId}`, {
      headers: { 'If-Match': `"revision-${revision}"` },
    });
  }

  /**
   * Method download
   * @method download
   *
   * @description
   * Reads bytes through authenticated HTTP, never through a bare download URL.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} modelId - Model identifier.
   *
   * @returns {Observable<Blob>} Immutable GLB file.
   */
  public download(modelId: string): Observable<Blob> {
    return this.http.get(this.buildUrl(`/api/facility-models/${modelId}/download`), {
      responseType: 'blob',
      withCredentials: true,
    });
  }
  //#endregion
}
