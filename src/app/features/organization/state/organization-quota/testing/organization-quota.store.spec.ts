import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { OrganizationService } from '@features/organization/data-access';
import {
  ORGANIZATION_QUOTA_RESOURCE,
  type OrganizationQuotaItemOutput,
  type OrganizationQuotaOutput,
} from '@features/organization/models';
import { ActiveOrganizationStore } from '../../active-organization';
import { OrganizationQuotaStore } from '../organization-quota.store';

const flushEffects = async (): Promise<void> => {
  const testBedWithFlush = TestBed as typeof TestBed & {
    flushEffects?: () => void;
  };

  testBedWithFlush.flushEffects?.();
  await Promise.resolve();
};

const quota = (items: readonly OrganizationQuotaItemOutput[]): OrganizationQuotaOutput =>
  ({
    '@id': '/api/organizations/org-1/quota',
    '@type': 'OrganizationQuota',
    organizationId: 'org-1',
    items,
  }) as OrganizationQuotaOutput;

describe('OrganizationQuotaStore', () => {
  const selectedOrganizationId = signal<string | null>(null);
  let store: OrganizationQuotaStore;
  const organizationService = { getQuota: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    selectedOrganizationId.set(null);
    organizationService.getQuota.mockReturnValue(
      of(
        quota([
          { resource: ORGANIZATION_QUOTA_RESOURCE.FACILITIES, used: 8, limit: 10 },
          { resource: ORGANIZATION_QUOTA_RESOURCE.MEMBERS, used: 10, limit: 10 },
        ]),
      ),
    );

    TestBed.configureTestingModule({
      providers: [
        OrganizationQuotaStore,
        { provide: OrganizationService, useValue: organizationService },
        { provide: ActiveOrganizationStore, useValue: { selectedOrganizationId } },
      ],
    });

    store = TestBed.inject(OrganizationQuotaStore);
  });

  it('should load quota usage when the active organization changes', async () => {
    selectedOrganizationId.set('org-1');
    await flushEffects();

    expect(organizationService.getQuota).toHaveBeenCalledWith('org-1');
    expect(store.items().length).toBe(2);
    expect(store.isLoadingQuota()).toBe(false);
  });

  it('should classify the quota status per resource and detect resources at limit', async () => {
    selectedOrganizationId.set('org-1');
    await flushEffects();

    const statuses = store.statusByResource();
    expect(statuses[ORGANIZATION_QUOTA_RESOURCE.MEMBERS]).toBe('full');
    expect(statuses[ORGANIZATION_QUOTA_RESOURCE.FACILITIES]).toBe('near');
    expect(statuses[ORGANIZATION_QUOTA_RESOURCE.EQUIPMENT]).toBe('ok');
    expect(store.isAtLimit(ORGANIZATION_QUOTA_RESOURCE.MEMBERS)).toBe(true);
    expect(store.isAtLimit(ORGANIZATION_QUOTA_RESOURCE.FACILITIES)).toBe(false);
  });

  it('should clear the quota usage when the active organization is cleared', async () => {
    selectedOrganizationId.set('org-1');
    await flushEffects();
    expect(store.items().length).toBe(2);

    selectedOrganizationId.set(null);
    await flushEffects();

    expect(store.items()).toEqual([]);
  });

  it('should reload the quota usage for the organization currently in state', async () => {
    selectedOrganizationId.set('org-1');
    await flushEffects();

    store.reload();
    await flushEffects();

    expect(organizationService.getQuota).toHaveBeenCalledTimes(2);
    expect(organizationService.getQuota).toHaveBeenLastCalledWith('org-1');
  });
});
