import type { OnboardingStepStatusTagSeverity } from '@features/onboarding/models';

/**
 * Constant ONBOARDING_STEP_STATUS_TAG_ICON_CLASS
 *
 * @description
 * The colour each severity puts on the rail's step **glyph**, and on nothing
 * else — the row itself stays neutral text, per `DESIGN.md`'s glyph rule.
 * Values are the same literal Tailwind palette pairs every other status tag
 * in this codebase uses; `success` is the one severity with a theme token
 * (`--success`, so no `dark:` twin), and the literal pairs that remain are
 * the sanctioned exception (`ARCHITECTURE.md` §2.8).
 *
 * @since 1.0.0
 *
 * @type {Readonly<Record<OnboardingStepStatusTagSeverity, string>>}
 */
export const ONBOARDING_STEP_STATUS_TAG_ICON_CLASS: Readonly<
  Record<OnboardingStepStatusTagSeverity, string>
> = {
  neutral: 'text-muted-foreground',
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
};
