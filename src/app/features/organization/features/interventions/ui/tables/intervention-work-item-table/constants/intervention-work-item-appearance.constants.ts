import type { InterventionWorkItemStatus } from '@features/organization/features/interventions/models';

/**
 * The glyph each work-item state carries.
 *
 * Four states, four distinct shapes. A field operator reading this through a
 * visor in daylight gets the state from the glyph, never from the tint
 * (WCAG 1.4.1).
 */
export const WORK_ITEM_STATUS_ICON: Readonly<Record<InterventionWorkItemStatus, string>> = {
  planned: 'lucideCircle',
  in_progress: 'lucideCircleDot',
  completed: 'lucideCircleCheckBig',
  skipped: 'lucideCircleSlash',
};

/**
 * The size and tint of each state's glyph.
 *
 * The size is set here rather than left to the button's own variant: a 44px tap
 * target is right for a gloved hand, but a 16px glyph adrift in it reads as an
 * oversized empty gutter, and nothing else in this app uses a target past 36px.
 *
 * Only the completed end is tinted, matching the badge beside it: the Two Ends
 * Rule colours a workflow's terminal outcome and leaves every step before it
 * neutral, so a row in progress no longer reads as a second signal competing
 * with the one that means "done".
 *
 * That one tint is the theme's `--success` token: 3.5:1 against Paper, above
 * the 3:1 non-text floor for a 20px glyph that always sits next to the row's
 * status badge.
 */
export const WORK_ITEM_STATUS_ICON_CLASS: Readonly<Record<InterventionWorkItemStatus, string>> = {
  planned: 'text-[length:--spacing(5)] text-muted-foreground',
  in_progress: 'text-[length:--spacing(5)] text-muted-foreground',
  completed: 'text-[length:--spacing(5)] text-success',
  skipped: 'text-[length:--spacing(5)] text-muted-foreground',
};
