import type { HydraItem } from '@core/api/models';

/**
 * Interface InterventionAttachmentOutput
 * @interface InterventionAttachmentOutput
 *
 * @description
 * One file attached to an intervention, mirroring the backend's
 * `InterventionAttachmentOutput`. Carries no download URL of its own — the
 * bearer-authenticated `GET /api/intervention-attachments/{id}/download`
 * route is read through `InterventionService.downloadAttachment`.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface InterventionAttachmentOutput extends HydraItem {
  //#region Properties
  /** Attachment identifier. */
  readonly id: string;

  /** Owning intervention id. */
  readonly interventionId: string;

  /** Stored file name. */
  readonly fileName: string;

  /** Declared MIME type. */
  readonly mimeType: string;

  /** Size in bytes. */
  readonly size: number;

  /** Optional operator-typed label. */
  readonly label?: string | null;

  /** The work item this attachment documents, when uploaded scoped to one. */
  readonly workItemId?: string | null;

  /** Optimistic-concurrency revision (`If-Match: "revision-N"`). */
  readonly revision: number;

  /** ISO upload instant. */
  readonly uploadedAt: string;
  //#endregion
}
