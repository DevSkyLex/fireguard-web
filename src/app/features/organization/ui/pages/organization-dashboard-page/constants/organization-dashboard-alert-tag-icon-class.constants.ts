import type { OrganizationDashboardAlertTagSeverity } from '../models';

/**
 * Constant ORGANIZATION_DASHBOARD_ALERT_TAG_ICON_CLASS
 *
 * @description
 * The colour each severity puts on an alert row's icon, and on nothing
 * else — the same convention the intervention and subscription-status tags
 * use: literal Tailwind palette pairs, because the theme carries no
 * `--success`/`--warning`/`--info` token (`ARCHITECTURE.md` §2.8). Private to
 * this page; other surfaces write their own literal pairs rather than
 * reaching into it.
 *
 * @since 1.0.0
 *
 * @type {Readonly<Record<OrganizationDashboardAlertTagSeverity, string>>}
 */
export const ORGANIZATION_DASHBOARD_ALERT_TAG_ICON_CLASS: Readonly<
  Record<OrganizationDashboardAlertTagSeverity, string>
> = {
  neutral: 'text-neutral-500 dark:text-neutral-400',
  info: 'text-blue-500 dark:text-blue-400',
  success: 'text-success',
  warning: 'text-amber-500 dark:text-amber-400',
  danger: 'text-red-500 dark:text-red-400',
};
