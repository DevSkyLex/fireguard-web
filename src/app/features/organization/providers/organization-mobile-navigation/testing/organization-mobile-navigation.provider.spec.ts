import { OrganizationMobileNavigation } from '@features/organization/ui/components';
import { withOrganizationMobileNavigation } from '../organization-mobile-navigation.provider';

describe('withOrganizationMobileNavigation', () => {
  it('contributes a stable organization-owned widget without touching layout state', () => {
    expect(withOrganizationMobileNavigation().useFactory()).toEqual({
      id: 'organization-mobile-navigation',
      order: 10,
      component: OrganizationMobileNavigation,
    });
  });
});
