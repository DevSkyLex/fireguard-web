import type { OnboardingStepStatusTagSeverity } from '@features/onboarding/models';

/**
 * Constant ONBOARDING_STEP_STATUS_TAG_ICON_CLASS
 *
 * @description
 * The colour each severity puts on the rail's step **glyph**, and on nothing
 * else — the row itself stays neutral text, per `DESIGN.md`'s glyph rule.
 * Values are the same literal Tailwind palette pairs every other status tag
 * in this codebase uses; the theme carries no `--success`/`--danger` token,
 * so a private literal pair is the sanctioned exception (`ARCHITECTURE.md`
 * §2.8).
 *
 * @since 1.0.0
 *
 * @type {Readonly<Record<OnboardingStepStatusTagSeverity, string>>}
 */
export const ONBOARDING_STEP_STATUS_TAG_ICON_CLASS: Readonly<
  Record<OnboardingStepStatusTagSeverity, string>
> = {
  neutral: 'text-neutral-500 dark:text-neutral-400',
  info: 'text-blue-500 dark:text-blue-400',
  success: 'text-green-500 dark:text-green-400',
  warning: 'text-amber-500 dark:text-amber-400',
  danger: 'text-red-500 dark:text-red-400',
};
