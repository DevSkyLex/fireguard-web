import type { SubscriptionStatusTagSeverity } from '../models';

/**
 * Constant SUBSCRIPTION_STATUS_TAG_ICON_CLASS
 *
 * @description
 * The colour each severity puts on the subscription status icon, and on
 * nothing else, per `DESIGN.md`'s glyph rule. Values are the same literal
 * Tailwind palette pairs the equipment and facility status tags use; the
 * theme carries no `--success`/`--warning`/`--info` token, so a private
 * literal pair is the sanctioned exception (`ARCHITECTURE.md` §2.8).
 *
 * @since 1.0.0
 *
 * @type {Readonly<Record<SubscriptionStatusTagSeverity, string>>}
 */
export const SUBSCRIPTION_STATUS_TAG_ICON_CLASS: Readonly<
  Record<SubscriptionStatusTagSeverity, string>
> = {
  neutral: 'text-neutral-500 dark:text-neutral-400',
  info: 'text-blue-500 dark:text-blue-400',
  success: 'text-success',
  warning: 'text-amber-500 dark:text-amber-400',
  danger: 'text-red-500 dark:text-red-400',
};
