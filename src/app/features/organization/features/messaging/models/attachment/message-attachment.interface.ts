import type { HydraItem } from '@core/api/models';

/**
 * A file attached to a message.
 *
 * The API exposes upload, list and delete, but **no download endpoint** — so
 * there is no URL here to link to. Attachments render as metadata (name, size)
 * until the backend serves their content.
 *
 * @since 1.0.0
 */
export interface MessageAttachment extends HydraItem {
  readonly id: string;
  readonly message: string;
  readonly conversation: string;
  readonly uploadedByMember: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly size: number;
  readonly label: string | null;
  readonly revision: number;
  readonly uploadedAt: string;
}
