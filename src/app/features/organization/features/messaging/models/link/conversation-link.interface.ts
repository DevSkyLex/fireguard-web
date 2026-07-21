import type { HydraItem } from '@core/api/models';

/**
 * A URL extracted from a message body, as listed by
 * `GET /api/conversations/{conversationId}/links`.
 *
 * ⚠️ `label` is documented as nullable but is **never populated today** — and
 * API Platform omits null fields, so it arrives as `undefined`. Anything
 * rendering it must fall back rather than test for `null`.
 *
 * @since 1.4.0
 */
export interface ConversationLinkOutput extends HydraItem {
  readonly id: string;
  readonly url: string;
  readonly label?: string | null;
  readonly messageId: string;
  readonly createdAt: string;
}
