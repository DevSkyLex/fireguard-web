import type { OrganizationDashboardAlertTagDescriptor } from './organization-dashboard-alert-tag-descriptor.interface';

/**
 * Descriptors for the dashboard's backend-computed alert codes
 * (`GetOrganizationDashboardHandler`). The two non-conformity codes carry
 * `danger` — an open critical item or one already overdue is a compliance
 * risk; the invitation and equipment codes carry `warning` — worth a look,
 * not yet a breach.
 */
const CODE: Record<string, OrganizationDashboardAlertTagDescriptor> = {
  critical_non_conformities_open: {
    label: $localize`:@@org.today.alerts.code.criticalNonConformitiesOpen:Critical non-conformities open`,
    severity: 'danger',
    icon: 'lucideOctagonAlert',
  },
  non_conformities_overdue: {
    label: $localize`:@@org.today.alerts.code.nonConformitiesOverdue:Non-conformities overdue`,
    severity: 'danger',
    icon: 'lucideTriangleAlert',
  },
  expired_invitations: {
    label: $localize`:@@org.today.alerts.code.expiredInvitations:Invitations expired`,
    severity: 'warning',
    icon: 'lucideMailWarning',
  },
  equipment_under_maintenance: {
    label: $localize`:@@org.today.alerts.code.equipmentUnderMaintenance:Equipment under maintenance`,
    severity: 'warning',
    icon: 'lucideWrench',
  },
};

/**
 * Function resolveOrganizationDashboardAlertTag
 * @function resolveOrganizationDashboardAlertTag
 *
 * @description
 * Resolves the presentation descriptor for a dashboard alert code. Falls
 * back to a neutral, humanised descriptor for an unknown code so the strip
 * degrades to a readable label instead of dropping the alert silently.
 *
 * @since 1.0.0
 *
 * @param {string} code - Raw alert `code` from `OrganizationDashboardAlert`.
 *
 * @returns {OrganizationDashboardAlertTagDescriptor} The matching descriptor, or a humanised fallback.
 */
export function resolveOrganizationDashboardAlertTag(
  code: string,
): OrganizationDashboardAlertTagDescriptor {
  return (
    CODE[code] ?? {
      label: code.replace(/_/g, ' '),
      severity: 'neutral',
      icon: 'lucideBellRing',
    }
  );
}
