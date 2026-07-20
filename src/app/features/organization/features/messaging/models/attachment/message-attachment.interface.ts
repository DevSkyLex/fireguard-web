import type { HydraItem } from '@core/api/models';

/**
 * A file attached to a message.
 *
 * Deliberately no URL field: the transport payload carries metadata only, and
 * the download link is derived — `/api/messaging-attachments/{id}/content`
 * against `ENV_CONFIG.apiUrl` — because the endpoint is a cookie-authenticated
 * plain navigation, not an API resource with an IRI of its own.
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
