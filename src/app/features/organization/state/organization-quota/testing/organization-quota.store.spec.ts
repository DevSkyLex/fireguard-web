import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
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
  const sessionRevision = signal(0);
  const isAuthenticated = signal(true);
  const selectedOrganizationId = signal<string | null>(null);
  let store: OrganizationQuotaStore;
  const organizationService = { getQuota: vi.fn() };

  beforeEach(() => {
    sessionRevision.set(0);
    isAuthenticated.set(true);
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
        { provide: AUTH_SESSION_PORT, useValue: { isAuthenticated, sessionRevision } },
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
    expect(store.items()).toHaveLength(2);
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
    expect(store.items()).toHaveLength(2);

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
  it('retains limits on same-context refresh but clears them for another organization', async () => {
    selectedOrganizationId.set('org-1');
    await flushEffects();
    const refresh = new Subject<OrganizationQuotaOutput>();
    organizationService.getQuota.mockReturnValueOnce(refresh);
    store.reload();
    expect(store.items()).toHaveLength(2);
    expect(store.isAtLimit(ORGANIZATION_QUOTA_RESOURCE.MEMBERS)).toBe(true);
    refresh.error(new Error('offline'));
    expect(store.items()).toHaveLength(2);
    store.reload();
    expect(store.quotaCallState().status).toBe('success');
    const otherOrganization = new Subject<OrganizationQuotaOutput>();
    organizationService.getQuota.mockReturnValueOnce(otherOrganization);
    selectedOrganizationId.set('org-2');
    await flushEffects();
    expect(store.items()).toEqual([]);
    expect(store.isAtLimit(ORGANIZATION_QUOTA_RESOURCE.MEMBERS)).toBe(false);
    store.clear();
    expect(otherOrganization.observed).toBe(false);
    otherOrganization.next(
      quota([{ resource: ORGANIZATION_QUOTA_RESOURCE.MEMBERS, used: 20, limit: 20 }]),
    );
    expect(store.items()).toEqual([]);
    expect(store.isLoadingQuota()).toBe(false);
  });

  it('invalidates the quota cache on session replacement and does not fetch while logged out', async () => {
    selectedOrganizationId.set('org-1');
    await flushEffects();
    const response = new Subject<OrganizationQuotaOutput>();
    organizationService.getQuota.mockReturnValueOnce(response);
    sessionRevision.update((revision) => revision + 1);
    await flushEffects();
    expect(store.items()).toEqual([]);
    expect(store.isLoadingQuota()).toBe(true);
    isAuthenticated.set(false);
    sessionRevision.update((revision) => revision + 1);
    await flushEffects();
    expect(response.observed).toBe(false);
    expect(store.items()).toEqual([]);
    expect(organizationService.getQuota).toHaveBeenCalledTimes(2);
  });
});
