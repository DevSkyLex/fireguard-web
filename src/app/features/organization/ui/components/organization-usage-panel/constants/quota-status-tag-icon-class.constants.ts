import type { QuotaStatusTagSeverity } from '../models';

/**
 * Constant QUOTA_STATUS_TAG_ICON_CLASS
 *
 * @description
 * The colour each severity puts on a meter row's status icon, and on nothing
 * else, per `DESIGN.md`'s glyph rule. Values are the theme's status tokens,
 * the same map the equipment and facility status tags keep for themselves
 * (`ARCHITECTURE.md` §2.8).
 *
 * @since 1.0.0
 *
 * @type {Readonly<Record<QuotaStatusTagSeverity, string>>}
 */
export const QUOTA_STATUS_TAG_ICON_CLASS: Readonly<Record<QuotaStatusTagSeverity, string>> = {
  neutral: 'text-muted-foreground',
  warning: 'text-warning',
  danger: 'text-destructive',
};
