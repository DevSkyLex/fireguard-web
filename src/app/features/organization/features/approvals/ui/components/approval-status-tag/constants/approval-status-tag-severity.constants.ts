import type { ApprovalTagSeverity } from '@features/organization/features/approvals/models';

/**
 * Constant APPROVAL_STATUS_TAG_ICON_CLASS
 *
 * @description
 * The colour each severity puts on the badge's **icon**, and on nothing else
 * — the badge itself stays `outline`, transparent ground and muted text, per
 * `DESIGN.md`'s glyph rule. Values match
 * `MAINTENANCE_DUE_STATUS_TAG_ICON_CLASS` byte for byte: `success` is the
 * one severity with a theme token (`--success`, so no `dark:` twin), and the
 * literal pairs that remain are the sanctioned exception (`ARCHITECTURE.md`
 * §2.8).
 *
 * @since 1.0.0
 *
 * @type {Readonly<Record<ApprovalTagSeverity, string>>}
 */
export const APPROVAL_STATUS_TAG_ICON_CLASS: Readonly<Record<ApprovalTagSeverity, string>> = {
  neutral: 'text-muted-foreground',
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
};
