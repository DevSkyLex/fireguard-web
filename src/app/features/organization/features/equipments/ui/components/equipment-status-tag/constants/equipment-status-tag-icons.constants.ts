import {
  lucideBan,
  lucideCalendarOff,
  lucideCircleAlert,
  lucideCircleCheck,
  lucideClock,
  lucidePackage,
  lucideTag,
  lucideWrench,
} from '@ng-icons/lucide';

/**
 * Constant EQUIPMENT_STATUS_TAG_ICONS
 *
 * @description
 * Every glyph the equipment status tag registry can resolve to, in one
 * record to hand to `provideIcons()`. Registered as a whole set rather than
 * per call site: an unregistered name renders an empty `ng-icon`, which would
 * leave the badge carrying its meaning in colour and text alone. `lucideTag`
 * backs the unknown-value fallback.
 *
 * @since 1.0.0
 *
 * @type {Readonly<Record<string, string>>}
 */
export const EQUIPMENT_STATUS_TAG_ICONS: Readonly<Record<string, string>> = {
  lucideBan,
  lucideCalendarOff,
  lucideCircleAlert,
  lucideCircleCheck,
  lucideClock,
  lucidePackage,
  lucideTag,
  lucideWrench,
};
