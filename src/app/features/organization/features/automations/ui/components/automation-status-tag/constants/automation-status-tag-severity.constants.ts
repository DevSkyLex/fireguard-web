import type { AutomationStatusTagSeverity } from '@features/organization/features/automations/models';

/**
 * Constant AUTOMATION_STATUS_TAG_ICON_CLASS
 *
 * @description
 * The colour each severity puts on the badge's **icon**, and on nothing else
 * — the badge itself stays `outline`, transparent ground and muted text, per
 * `DESIGN.md`'s glyph rule. Matches `APPROVAL_STATUS_TAG_ICON_CLASS` byte for
 * byte: `success` is the one severity with a theme token (`--success`, so no
 * `dark:` twin).
 *
 * @since 1.0.0
 *
 * @type {Readonly<Record<AutomationStatusTagSeverity, string>>}
 */
export const AUTOMATION_STATUS_TAG_ICON_CLASS: Readonly<
  Record<AutomationStatusTagSeverity, string>
> = {
  neutral: 'text-muted-foreground',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
};
