import type { InspectionStatusTagSeverity } from '@features/organization/features/inspections/models';

/**
 * Constant INSPECTION_STATUS_TAG_ICON_CLASS
 *
 * @description
 * The colour each severity puts on the badge's **icon**, and on nothing
 * else — the badge itself stays `outline`, transparent ground and muted
 * text, per `DESIGN.md`'s glyph rule. Values are the same literal Tailwind
 * palette pairs `DESIGN.md`'s glyph palette maps to; the theme carries no
 * `--success`/`--warning`/`--info` token, so a private literal pair is the
 * sanctioned exception (`ARCHITECTURE.md` §2.8).
 *
 * @since 1.0.0
 *
 * @type {Readonly<Record<InspectionStatusTagSeverity, string>>}
 */
export const INSPECTION_STATUS_TAG_ICON_CLASS: Readonly<
  Record<InspectionStatusTagSeverity, string>
> = {
  neutral: 'text-neutral-500 dark:text-neutral-400',
  info: 'text-blue-500 dark:text-blue-400',
  success: 'text-green-500 dark:text-green-400',
  warning: 'text-amber-500 dark:text-amber-400',
  danger: 'text-red-500 dark:text-red-400',
};
