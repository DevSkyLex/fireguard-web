import type { MaintenanceTagSeverity } from '@features/organization/features/maintenance-schedules/models';

/**
 * Constant MAINTENANCE_DUE_STATUS_TAG_ICON_CLASS
 *
 * @description
 * The colour each severity puts on the badge's **icon**, and on nothing
 * else — the badge itself stays `outline`, transparent ground and muted
 * text, per `DESIGN.md`'s glyph rule. Values match
 * `EQUIPMENT_STATUS_TAG_ICON_CLASS` byte for byte: the theme carries no
 * `--success`/`--warning`/`--info` token, so a private literal pair is the
 * sanctioned exception (`ARCHITECTURE.md` §2.8), and the two features render
 * the same enum.
 *
 * @since 1.0.0
 *
 * @type {Readonly<Record<MaintenanceTagSeverity, string>>}
 */
export const MAINTENANCE_DUE_STATUS_TAG_ICON_CLASS: Readonly<
  Record<MaintenanceTagSeverity, string>
> = {
  neutral: 'text-neutral-500 dark:text-neutral-400',
  info: 'text-blue-500 dark:text-blue-400',
  success: 'text-success',
  warning: 'text-amber-500 dark:text-amber-400',
  danger: 'text-red-500 dark:text-red-400',
};
