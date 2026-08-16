import { Service } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService } from '@core/api';
import type { HydraCollection } from '@core/api/models';
import type {
  FacilityAttachmentKind,
  FacilityAttachmentOutput,
} from '@features/organization/features/facilities/models';

/**
 * Service FacilityAttachmentService
 * @class FacilityAttachmentService
 * @extends {HydraApiService}
 *
 * @description
 * Owns the facility attachment resources (`/api/facilities/{id}/attachments`,
 * `/api/facility-attachments/{id}`) — plain documents and floor plans alike.
 * Kept apart from {@link FacilityService} because it addresses a different
 * URL family and is not organization-scoped.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Service()
export class FacilityAttachmentService extends HydraApiService {
  /**
   * Method list
   * @method list
   *
   * @description
   * Lists a facility's attachments (`GET /api/facilities/{id}/attachments`),
   * optionally narrowed by `kind`.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} facilityId - facility Id value.
   * @param {FacilityAttachmentKind} [kind] - Narrows the list to one attachment kind.
   *
   * @return {Observable<HydraCollection<FacilityAttachmentOutput>>} The attachments.
   */
  public list(
    facilityId: string,
    kind?: FacilityAttachmentKind,
  ): Observable<HydraCollection<FacilityAttachmentOutput>> {
    return this.getCollection<FacilityAttachmentOutput>(
      `/api/facilities/${facilityId}/attachments`,
      kind ? { params: { kind } } : undefined,
    );
  }

  /**
   * Method upload
   * @method upload
   *
   * @description
   * Uploads one file as a multipart request (`file` + optional `kind`).
   * `kind: 'floor_plan'` requires an image MIME type — the backend probes
   * `imageWidth`/`imageHeight` from the upload and rejects a non-image with a
   * 422; omitting `kind` uploads a plain `document`.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} facilityId - facility Id value.
   * @param {Blob} file - file value.
   * @param {string} fileName - file Name value.
   * @param {FacilityAttachmentKind} [kind] - `'document'` (default) or `'floor_plan'`.
   *
   * @return {Observable<FacilityAttachmentOutput>} The created attachment.
   */
  public upload(
    facilityId: string,
    file: Blob,
    fileName: string,
    kind?: FacilityAttachmentKind,
  ): Observable<FacilityAttachmentOutput> {
    const body: FormData = new FormData();
    body.set('file', file, fileName);
    if (kind) body.set('kind', kind);

    return this.http.post<FacilityAttachmentOutput>(
      this.buildUrl(`/api/facilities/${facilityId}/attachments`),
      body,
      { withCredentials: true, headers: { Accept: 'application/ld+json' } },
    );
  }

  /**
   * Method setPrimary
   * @method setPrimary
   *
   * @description
   * Sets one floor plan as the facility's primary plan
   * (`POST /api/facility-attachments/{id}/primary`), atomically unsetting the
   * previous one server-side. Rejected with a 409 for a `document`.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} attachmentId - attachment Id value.
   *
   * @return {Observable<FacilityAttachmentOutput>} The attachment, now primary.
   */
  public setPrimary(attachmentId: string): Observable<FacilityAttachmentOutput> {
    return this.postAction<FacilityAttachmentOutput>(
      `/api/facility-attachments/${attachmentId}/primary`,
    );
  }

  /**
   * Method remove
   * @method remove
   *
   * @description
   * Deletes one attachment, pinned to its revision.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} attachmentId - attachment Id value.
   * @param {number} revision - revision value.
   *
   * @return {Observable<void>} Completion of the delete.
   */
  public remove(attachmentId: string, revision: number): Observable<void> {
    return this.delete(`/api/facility-attachments/${attachmentId}`, {
      headers: { 'If-Match': `"revision-${revision}"` },
    });
  }

  /**
   * Method download
   * @method download
   *
   * @description
   * Reads one attachment's binary content
   * (`GET /api/facility-attachments/{id}/download`). The route is
   * bearer-authenticated and forces `Content-Disposition: attachment`, so a
   * bare `<a href>` or `<img src>` cannot carry it — the caller reads the
   * resulting `Blob` and derives an object URL. Calls `this.http` directly,
   * like `upload`, for a response shape (`responseType: 'blob'`) the base
   * class does not support — mirrors `InterventionService.downloadAttachment`.
   *
   * @access public
   * @since 1.1.0
   *
   * @param {string} attachmentId - attachment Id value.
   *
   * @return {Observable<Blob>} The attachment's binary content.
   */
  public download(attachmentId: string): Observable<Blob> {
    return this.http.get(this.buildUrl(`/api/facility-attachments/${attachmentId}/download`), {
      responseType: 'blob',
      withCredentials: true,
    });
  }
}
