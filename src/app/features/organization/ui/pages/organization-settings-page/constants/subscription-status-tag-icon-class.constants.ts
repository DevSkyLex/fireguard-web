import type { SubscriptionStatusTagSeverity } from '../models';

/**
 * Constant SUBSCRIPTION_STATUS_TAG_ICON_CLASS
 *
 * @description
 * The colour each severity puts on the subscription status icon, and on
 * nothing else, per `DESIGN.md`'s glyph rule. Values are the same literal
 * Tailwind palette pairs the equipment and facility status tags use;
 * `success` is the one severity with a theme token (`--success`, so no
 * `dark:` twin), and the literal pairs that remain are the sanctioned
 * exception (`ARCHITECTURE.md` §2.8).
 *
 * @since 1.0.0
 *
 * @type {Readonly<Record<SubscriptionStatusTagSeverity, string>>}
 */
export const SUBSCRIPTION_STATUS_TAG_ICON_CLASS: Readonly<
  Record<SubscriptionStatusTagSeverity, string>
> = {
  neutral: 'text-muted-foreground',
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
};
