import type { QuotaStatusTagSeverity } from '../models';

/**
 * Constant QUOTA_STATUS_TAG_ICON_CLASS
 *
 * @description
 * The colour each severity puts on a meter row's status icon, and on nothing
 * else, per `DESIGN.md`'s glyph rule. Values are the same literal Tailwind
 * palette pairs the equipment and facility status tags use; the theme
 * carries no `--warning`/`--danger` token, so a private literal pair is the
 * sanctioned exception (`ARCHITECTURE.md` §2.8).
 *
 * @since 1.0.0
 *
 * @type {Readonly<Record<QuotaStatusTagSeverity, string>>}
 */
export const QUOTA_STATUS_TAG_ICON_CLASS: Readonly<Record<QuotaStatusTagSeverity, string>> = {
  neutral: 'text-neutral-500 dark:text-neutral-400',
  warning: 'text-amber-500 dark:text-amber-400',
  danger: 'text-red-500 dark:text-red-400',
};
