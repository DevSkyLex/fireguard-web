import { WEBHOOK_EVENT_LABELS } from '@features/organization/features/webhooks/constants';

/**
 * Function resolveWebhookEventLabel
 *
 * @description
 * Resolves a raw webhook event type key to a human label: the curated
 * localized {@link WEBHOOK_EVENT_LABELS} entry first, the backend catalog's
 * own mechanically derived label second, and the raw key itself last — never
 * a blank cell.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {string} value - Raw event type key, e.g. `'facility.facility_created_event'`.
 * @param {string} [catalogLabel] - The backend catalog entry's own label, when loaded.
 *
 * @returns {string} The resolved label.
 */
export function resolveWebhookEventLabel(value: string, catalogLabel?: string): string {
  return WEBHOOK_EVENT_LABELS[value] ?? catalogLabel ?? value;
}
