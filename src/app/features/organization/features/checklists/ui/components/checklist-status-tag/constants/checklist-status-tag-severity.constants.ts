import type { ChecklistStatusTagSeverity } from '@features/organization/features/checklists/models';

/**
 * Constant CHECKLIST_STATUS_TAG_ICON_CLASS
 *
 * @description
 * The colour each severity puts on the badge's **icon**, and on nothing
 * else — the badge itself stays `outline`, transparent ground and muted
 * text, per `DESIGN.md`'s glyph rule.
 *
 * @since 1.0.0
 *
 * @type {Readonly<Record<ChecklistStatusTagSeverity, string>>}
 */
export const CHECKLIST_STATUS_TAG_ICON_CLASS: Readonly<Record<ChecklistStatusTagSeverity, string>> =
  {
    neutral: 'text-neutral-500 dark:text-neutral-400',
    success: 'text-success',
  };
