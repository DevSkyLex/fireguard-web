import { resolveOrganizationDashboardAlertTag } from '../organization-dashboard-alert-tag.util';

describe('resolveOrganizationDashboardAlertTag', () => {
  it('resolves a descriptor for every backend-emitted alert code', () => {
    const codes: readonly string[] = [
      'critical_non_conformities_open',
      'non_conformities_overdue',
      'expired_invitations',
      'equipment_under_maintenance',
    ];

    for (const code of codes) {
      const descriptor = resolveOrganizationDashboardAlertTag(code);

      expect(descriptor.label.length).toBeGreaterThan(0);
      expect(descriptor.icon.length).toBeGreaterThan(0);
    }
  });

  it('carries danger severity for the two non-conformity codes', () => {
    expect(resolveOrganizationDashboardAlertTag('critical_non_conformities_open').severity).toBe(
      'danger',
    );
    expect(resolveOrganizationDashboardAlertTag('non_conformities_overdue').severity).toBe(
      'danger',
    );
  });

  it('carries warning severity for the invitation and equipment codes', () => {
    expect(resolveOrganizationDashboardAlertTag('expired_invitations').severity).toBe('warning');
    expect(resolveOrganizationDashboardAlertTag('equipment_under_maintenance').severity).toBe(
      'warning',
    );
  });

  it('falls back to a humanised neutral descriptor for an unknown code', () => {
    const descriptor = resolveOrganizationDashboardAlertTag('some_unknown_code');

    expect(descriptor).toEqual({
      label: 'some unknown code',
      severity: 'neutral',
      icon: 'lucideBellRing',
    });
  });
});
