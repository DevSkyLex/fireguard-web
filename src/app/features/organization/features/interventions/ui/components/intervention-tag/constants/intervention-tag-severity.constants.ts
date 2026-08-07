import type { InterventionTagSeverity } from '@features/organization/features/interventions/models';

/**
 * Constant INTERVENTION_TAG_ICON_CLASS
 *
 * @description
 * The colour each severity puts on the badge's **icon** — and on nothing else.
 *
 * This is how spartan's own dashboard draws a status: the badge stays
 * `outline` with a transparent ground and muted text, and only the glyph
 * carries the tone (`text-green-500 dark:text-green-400` on a "Done" row).
 * Filling the badge instead turns a dense table into a row of coloured pills
 * and drowns out the one thing that should stand out.
 *
 * `neutral` is a genuine grey (`neutral-500`/`neutral-400`, zero chroma), not
 * the muted label colour it sits next to — close enough in value to the
 * badge's own `text-muted-foreground` to read as "no status", but never full
 * black or white.
 *
 * Literal strings, because Tailwind scans source text and would not see a
 * composed class name.
 *
 * @since 3.0.0
 *
 * @type {Readonly<Record<InterventionTagSeverity, string>>}
 */
export const INTERVENTION_TAG_ICON_CLASS: Readonly<Record<InterventionTagSeverity, string>> = {
  neutral: 'text-neutral-500 dark:text-neutral-400',
  info: 'text-blue-500 dark:text-blue-400',
  success: 'text-green-500 dark:text-green-400',
  warning: 'text-amber-500 dark:text-amber-400',
  danger: 'text-red-500 dark:text-red-400',
};
