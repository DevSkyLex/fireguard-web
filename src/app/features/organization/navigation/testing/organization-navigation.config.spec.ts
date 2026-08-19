import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { buildOrganizationNavigation } from '../organization-navigation.config';

describe('buildOrganizationNavigation', () => {
  const grantedPermissions = new Set<string>(['organization.*']);

  it('should keep the submittedInterventions counterKey on the interventions link', () => {
    const sections = buildOrganizationNavigation('org-1', grantedPermissions);
    const operations = sections.find((section) => section.id === 'operations');
    const interventions = operations?.links.find((link) => link.id === 'interventions');

    expect(interventions?.counterKey).toBe('submittedInterventions');
  });

  it('should leave every other link without a counterKey', () => {
    const sections = buildOrganizationNavigation('org-1', grantedPermissions);
    const otherLinks = sections
      .flatMap((section) => section.links)
      .filter((link) => link.id !== 'interventions');

    expect(otherLinks.length).toBeGreaterThan(0);
    for (const link of otherLinks) {
      expect(link.counterKey).toBeUndefined();
    }
  });

  it('should drop the counterKey along with the link when the member lacks the permission', () => {
    const sections = buildOrganizationNavigation(
      'org-1',
      new Set<string>([ORGANIZATION_PERMISSION.DASHBOARD_READ]),
    );
    const interventions = sections
      .flatMap((section) => section.links)
      .find((link) => link.id === 'interventions');

    expect(interventions).toBeUndefined();
  });
});
