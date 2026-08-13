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
 * The tints are literal palette pairs: the theme's `--success` token maps to
 * green-500, one step lighter than the green-600 this 20px glyph needs against
 * Paper, and no warning/info token exists — the same reason
 * `intervention-tag-severity.constants.ts` keeps its non-success pairs literal,
 * though that file is private to the tag and must not be reached into.
 */
export const WORK_ITEM_STATUS_ICON_CLASS: Readonly<Record<InterventionWorkItemStatus, string>> = {
  planned: 'text-[length:--spacing(5)] text-muted-foreground',
  in_progress: 'text-[length:--spacing(5)] text-blue-600 dark:text-blue-400',
  completed: 'text-[length:--spacing(5)] text-green-600 dark:text-green-400',
  skipped: 'text-[length:--spacing(5)] text-muted-foreground',
};
