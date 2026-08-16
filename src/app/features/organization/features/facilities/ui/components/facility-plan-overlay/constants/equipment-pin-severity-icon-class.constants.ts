import type { EquipmentStatusTagSeverity } from '@features/organization/features/facilities/models';

/**
 * Constant EQUIPMENT_PIN_SEVERITY_ICON_CLASS
 *
 * @description
 * The colour each severity puts on a pin's **icon**, and on nothing else —
 * the pin itself stays a neutral `bg-background` disc, per `DESIGN.md`'s
 * glyph rule (status is never colour-only: the icon and the accessible name
 * both already carry the status). The same literal Tailwind palette pairs
 * `EQUIPMENT_STATUS_TAG_ICON_CLASS` (equipments feature) uses — the theme
 * carries no `--success`/`--warning` token, so a private literal pair is the
 * sanctioned exception (`ARCHITECTURE.md` §2.8).
 *
 * @since 1.0.0
 *
 * @type {Readonly<Record<EquipmentStatusTagSeverity, string>>}
 */
export const EQUIPMENT_PIN_SEVERITY_ICON_CLASS: Readonly<
  Record<EquipmentStatusTagSeverity, string>
> = {
  neutral: 'text-neutral-500 dark:text-neutral-400',
  success: 'text-success',
  warning: 'text-amber-500 dark:text-amber-400',
  danger: 'text-red-500 dark:text-red-400',
};
