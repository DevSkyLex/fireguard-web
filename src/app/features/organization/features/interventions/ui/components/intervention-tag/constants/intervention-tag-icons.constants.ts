import {
  lucideBadgeCheck,
  lucideBan,
  lucideCalendar,
  lucideCheck,
  lucideChevronDown,
  lucideChevronsUp,
  lucideChevronUp,
  lucideCircleAlert,
  lucideCircleCheck,
  lucideCircleDotDashed,
  lucideCircleX,
  lucideClipboardCheck,
  lucideClock,
  lucideFastForward,
  lucideHourglass,
  lucideInfo,
  lucideLoader,
  lucideMapPin,
  lucideMinus,
  lucideNetwork,
  lucidePackage,
  lucideRotateCcw,
  lucideSend,
  lucideTag,
  lucideTriangleAlert,
  lucideX,
} from '@ng-icons/lucide';

/**
 * Constant INTERVENTION_TAG_ICONS
 *
 * @description
 * Every glyph the intervention tag registry can resolve to, in one record to
 * hand to `provideIcons()`.
 *
 * Registered as a whole set rather than per call site: an unregistered name
 * renders an empty `ng-icon`, which would leave the badge carrying its meaning
 * in colour and text alone. `lucideTag` backs the unknown-value fallback.
 *
 * @since 2.0.0
 *
 * @type {Readonly<Record<string, string>>}
 */
export const INTERVENTION_TAG_ICONS: Readonly<Record<string, string>> = {
  lucideBadgeCheck,
  lucideBan,
  lucideCalendar,
  lucideCheck,
  lucideChevronDown,
  lucideChevronsUp,
  lucideChevronUp,
  lucideCircleAlert,
  lucideCircleCheck,
  lucideCircleDotDashed,
  lucideCircleX,
  lucideClipboardCheck,
  lucideClock,
  lucideFastForward,
  lucideHourglass,
  lucideInfo,
  lucideLoader,
  lucideMapPin,
  lucideMinus,
  lucideNetwork,
  lucidePackage,
  lucideRotateCcw,
  lucideSend,
  lucideTag,
  lucideTriangleAlert,
  lucideX,
};
