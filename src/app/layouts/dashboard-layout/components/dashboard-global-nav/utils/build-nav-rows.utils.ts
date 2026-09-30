import { hasAnyOrganizationPermission } from '@features/organization/access';
import type { DashboardGlobalNavItem, DashboardGlobalNavRow } from '../models';

/**
 * Function buildDashboardGlobalNavRows
 *
 * @description
 * Projects shell destinations from active organization and effective grants.
 *
 * @param {readonly DashboardGlobalNavItem[]} items - Ordered shell destination catalog.
 * @param {string | null} organizationId - Currently selected organization.
 * @param {readonly string[]} permissions - Effective grants read through the member-access port.
 *
 * @returns {readonly DashboardGlobalNavRow[]} Visible destinations, with scoped URLs completed.
 */
export function buildDashboardGlobalNavRows(
  items: readonly DashboardGlobalNavItem[],
  organizationId: string | null,
  permissions: readonly string[],
): readonly DashboardGlobalNavRow[] {
  const rows: DashboardGlobalNavRow[] = [];
  for (const item of items) {
    if (
      item.permissions !== undefined &&
      !hasAnyOrganizationPermission(permissions, item.permissions)
    )
      continue;
    if (item.organizationScoped === true && (item.route === null || organizationId === null))
      continue;
    rows.push({
      id: item.id,
      label: item.label,
      icon: item.icon,
      resolvedRoute:
        item.organizationScoped === true
          ? `/organizations/${organizationId}/${item.route}`
          : item.route,
    });
  }
  return rows;
}
