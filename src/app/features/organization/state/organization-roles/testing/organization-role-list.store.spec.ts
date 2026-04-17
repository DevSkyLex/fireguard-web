import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import type { HydraCollection } from '@core/models/api';
import { OrganizationRoleService } from '@features/organization/data-access';
import { OrganizationRoleListStore } from '../organization-role-list.store';

const flushEffects = async (): Promise<void> => {
  await Promise.resolve();
};

describe('OrganizationRoleListStore', () => {
  let store: OrganizationRoleListStore;
  let mockOrganizationRoleService: {
    list: ReturnType<typeof vi.fn>;
  };

  const collection: HydraCollection<{
    '@id': string;
    '@type': string;
    id: string;
    name: string;
  }> = {
    '@id': '/api/organizations/org-1/roles',
    '@type': 'Collection',
    totalItems: 2,
    member: [
      { '@id': '/api/roles/owner', '@type': 'OrganizationRole', id: 'owner', name: 'Owner' },
      { '@id': '/api/roles/member', '@type': 'OrganizationRole', id: 'member', name: 'Member' },
    ],
  };

  beforeEach(() => {
    mockOrganizationRoleService = {
      list: vi.fn().mockReturnValue(of(collection)),
    };

    TestBed.configureTestingModule({
      providers: [
        OrganizationRoleListStore,
        { provide: OrganizationRoleService, useValue: mockOrganizationRoleService },
      ],
    });

    store = TestBed.inject(OrganizationRoleListStore);
  });

  it('should load organization roles', async () => {
    store.loadRoles('org-1');
    await flushEffects();

    expect(mockOrganizationRoleService.list).toHaveBeenCalledWith('org-1');
    expect(store.roles()).toEqual(collection.member);
    expect(store.rolesCallState().status).toBe('success');
  });
});
