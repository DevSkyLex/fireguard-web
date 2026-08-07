import { lucideActivity, lucideArrowRightLeft, lucideFlag } from '@ng-icons/lucide';
import type { InterventionActivityEvent } from '@features/organization/features/interventions/models';

/**
 * Constant INTERVENTION_ACTIVITY_EVENT_ICONS
 *
 * @description
 * Every glyph a system-recorded activity entry can render on the timeline's
 * marker rail, in one record to hand to `provideIcons()`.
 *
 * @since 1.0.0
 *
 * @type {Readonly<Record<string, string>>}
 */
export const INTERVENTION_ACTIVITY_EVENT_ICONS: Readonly<Record<string, string>> = {
  lucideActivity,
  lucideArrowRightLeft,
  lucideFlag,
};

/**
 * Constant INTERVENTION_ACTIVITY_EVENT_ICON_NAME
 *
 * @description
 * The marker icon for each known system event — `comment` is absent because
 * a comment renders as an avatar card, never a marker row.
 *
 * @since 1.0.0
 *
 * @type {Readonly<Partial<Record<InterventionActivityEvent, string>>>}
 */
export const INTERVENTION_ACTIVITY_EVENT_ICON_NAME: Readonly<
  Partial<Record<InterventionActivityEvent, string>>
> = {
  created: 'lucideFlag',
  status_changed: 'lucideArrowRightLeft',
};

/**
 * Constant INTERVENTION_ACTIVITY_EVENT_FALLBACK_ICON
 *
 * @description
 * The marker icon for a system event outside the known set, mirroring the
 * template's own defensive fallback branch.
 *
 * @since 1.0.0
 *
 * @type {string}
 */
export const INTERVENTION_ACTIVITY_EVENT_FALLBACK_ICON: string = 'lucideActivity';

/**
 * Constant INTERVENTION_ACTIVITY_EVENT_ICON_CLASS
 *
 * @description
 * The size and tint each known system event puts on its marker glyph — and
 * on nothing else, the text beside it stays `text-muted-foreground`.
 * `created` reads as a start (green, the diff convention for an added line);
 * `status_changed` stays a genuine grey — `text-neutral-500`/`400`, the same
 * literal pair `intervention-tag-severity.constants.ts` uses for `neutral` —
 * because it is the routine, most frequent entry on this timeline, and
 * giving it the same weight as `created` would compete with the one event
 * actually worth a colour.
 *
 * The size is repeated here rather than left to `hlmMarkerIcon`'s own
 * `[&_ng-icon:not([class*='text-'])]:text-[length:--spacing(4)]` rule: that
 * selector only fires when the icon carries **no** `text-` class at all, so
 * the moment a tint class lands on `<ng-icon>` the rule stops matching and
 * the glyph silently falls back to its inherited `text-xs` (12px) size —
 * shrinking it and throwing off its pixel-alignment with the connecting
 * rail line, which centres on the column rather than the glyph's own box.
 * Bundling size and colour in one literal class sidesteps the
 * selector entirely, the same fix `intervention-work-item-appearance.constants.ts`
 * already applies for the same reason.
 *
 * @since 2.3.0
 *
 * @type {Readonly<Partial<Record<InterventionActivityEvent, string>>>}
 */
export const INTERVENTION_ACTIVITY_EVENT_ICON_CLASS: Readonly<
  Partial<Record<InterventionActivityEvent, string>>
> = {
  created: 'text-[length:--spacing(4)] text-green-600 dark:text-green-400',
  status_changed: 'text-[length:--spacing(4)] text-neutral-500 dark:text-neutral-400',
};

/**
 * Constant INTERVENTION_ACTIVITY_EVENT_FALLBACK_ICON_CLASS
 *
 * @description
 * The size and tint for a system event outside the known set, mirroring the
 * icon fallback above.
 *
 * @since 2.3.0
 *
 * @type {string}
 */
export const INTERVENTION_ACTIVITY_EVENT_FALLBACK_ICON_CLASS: string =
  'text-[length:--spacing(4)] text-muted-foreground';
