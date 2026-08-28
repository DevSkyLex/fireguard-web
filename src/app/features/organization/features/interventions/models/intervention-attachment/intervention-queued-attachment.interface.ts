/**
 * Interface InterventionQueuedAttachment
 * @interface InterventionQueuedAttachment
 *
 * @description
 * View contract for one attachment upload waiting in the offline outbox: the
 * queued operation's identifier plus the file metadata a list row needs. The
 * binary itself stays in IndexedDB with the `attachment.upload` operation and
 * never travels through component inputs.
 *
 * @since 6.0.0
 */
export interface InterventionQueuedAttachment {
  //#region Properties
  /** Outbox operation identifier — what a discard removes. */
  readonly id: string;

  /** Client-generated identity of the future attachment, kept local only. */
  readonly clientId: string;

  /** Owning intervention identifier. */
  readonly interventionId: string;

  /** Original file name, shown in the row. */
  readonly fileName: string;

  /** Declared MIME type, drives the row icon. */
  readonly mimeType: string;

  /** File size in bytes, after the photo pipeline's compression. */
  readonly size: number;

  /** ISO timestamp of when the upload was queued. */
  readonly queuedAt: string;

  /** Optional operator label carried to the replayed upload. */
  readonly label?: string;

  /** Work item this upload documents, when scoped to one. */
  readonly workItemId?: string;
  //#endregion
}
