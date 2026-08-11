import {
  lucideBuilding2,
  lucideChevronsRight,
  lucideCircle,
  lucideCircleAlert,
  lucideCircleCheck,
  lucideCircleDashed,
  lucideMapPin,
  lucideStar,
  lucideUsers,
  lucideWrench,
} from '@ng-icons/lucide';

/**
 * Constant ONBOARDING_STEP_RAIL_ICONS
 *
 * @description
 * Every glyph the rail can render, in one record to hand to `provideIcons()`
 * — the step's own presentation icon (`ONBOARDING_STEP_PRESENTATION`) plus
 * the status glyph (`resolveOnboardingStepStatusTag`). Registered as a whole
 * set rather than per call site: an unregistered name renders an empty
 * `ng-icon`, which would leave the row carrying its meaning in colour and
 * text alone.
 *
 * @since 1.0.0
 *
 * @type {Readonly<Record<string, string>>}
 */
export const ONBOARDING_STEP_RAIL_ICONS: Readonly<Record<string, string>> = {
  lucideBuilding2,
  lucideChevronsRight,
  lucideCircle,
  lucideCircleAlert,
  lucideCircleCheck,
  lucideCircleDashed,
  lucideMapPin,
  lucideStar,
  lucideUsers,
  lucideWrench,
};
