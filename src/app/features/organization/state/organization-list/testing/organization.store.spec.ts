import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { OrganizationService } from '@features/organization/data-access';
import type { OrganizationOutput } from '@features/organization/models';
import { ActiveOrganizationStore } from '../../active-organization/active-organization.store';
import { OrganizationStore } from '../organization.store';

const flushEffects = async (): Promise<void> => {
  await Promise.resolve();
};

describe('OrganizationStore', () => {
  let store: OrganizationStore;
  let mockOrganizationService: {
    list: ReturnType<typeof vi.fn>;
  };

  const organization = { id: 'org-1', name: 'Fireguard' } as unknown as OrganizationOutput;
  const collection: HydraCollection<OrganizationOutput> = {
    '@id': '/api/organizations',
    '@type': 'Collection',
    totalItems: 1,
    member: [organization],
  };

  beforeEach(() => {
    mockOrganizationService = {
      list: vi.fn().mockReturnValue(of(collection)),
    };

    TestBed.configureTestingModule({
      providers: [
        OrganizationStore,
        { provide: Dispatcher, useValue: { dispatch: vi.fn() } },
        { provide: OrganizationService, useValue: mockOrganizationService },
        {
          provide: ActiveOrganizationStore,
          useValue: {
            selectedOrganization: signal<OrganizationOutput | null>(organization),
            isLoadingOrganization: signal(false),
          },
        },
      ],
    });

    store = TestBed.inject(OrganizationStore);
  });

  it('should load organizations', async () => {
    store.load();
    await flushEffects();

    expect(mockOrganizationService.list).toHaveBeenCalledWith(undefined);
    expect(store.organizations()).toEqual([organization]);
    expect(store.totalOrganizations()).toBe(1);
  });

  it('should proxy the selected organization from the active store', () => {
    expect(store.selectedOrganization()).toEqual(organization);
    expect(store.isLoadingOrganization()).toBe(false);
  });
});
