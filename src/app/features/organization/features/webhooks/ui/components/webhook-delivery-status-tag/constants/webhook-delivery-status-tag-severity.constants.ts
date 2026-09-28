import type { WebhookDeliveryStatusTagSeverity } from '@features/organization/features/webhooks/models';

/**
 * Constant WEBHOOK_DELIVERY_STATUS_TAG_ICON_CLASS
 *
 * @description
 * The colour each severity puts on the badge's **icon**, and on nothing else
 * — the badge itself stays `outline`, transparent ground and muted text, per
 * `DESIGN.md`'s glyph rule. Values match `APPROVAL_STATUS_TAG_ICON_CLASS` and
 * `AUTOMATION_STATUS_TAG_ICON_CLASS` byte for byte: `success` is the one
 * severity with a theme token (`--success`, so no `dark:` twin), and the
 * literal pairs that remain are the sanctioned exception (`ARCHITECTURE.md`
 * §2.8).
 *
 * @since 1.0.0
 *
 * @type {Readonly<Record<WebhookDeliveryStatusTagSeverity, string>>}
 */
export const WEBHOOK_DELIVERY_STATUS_TAG_ICON_CLASS: Readonly<
  Record<WebhookDeliveryStatusTagSeverity, string>
> = {
  neutral: 'text-muted-foreground',
  success: 'text-success',
  danger: 'text-destructive',
};
