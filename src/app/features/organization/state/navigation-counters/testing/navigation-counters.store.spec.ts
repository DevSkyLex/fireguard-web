import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { NavigationCountersService } from '@features/organization/data-access/services/navigation-counters/navigation-counters.service';
import type { OrganizationNavigationCountersOutput } from '@features/organization/models';
import { ORGANIZATION_CONTEXT_PORT } from '@features/organization/ports';
import { NavigationCountersStore } from '../navigation-counters.store';

const COUNTERS: OrganizationNavigationCountersOutput = {
  '@id': '/api/organizations/org-1/navigation-counters',
  '@type': 'OrganizationNavigationCounters',
  openInterventions: 4,
  openNonConformities: 12,
};

describe('NavigationCountersStore', () => {
  const selectedOrganization = signal<{ id: string } | null>(null);
  let mockService: { getCounters: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    selectedOrganization.set(null);
    mockService = { getCounters: vi.fn().mockReturnValue(of(COUNTERS)) };

    TestBed.configureTestingModule({
      providers: [
        NavigationCountersStore,
        { provide: NavigationCountersService, useValue: mockService },
        { provide: ORGANIZATION_CONTEXT_PORT, useValue: { selectedOrganization } },
      ],
    });
  });

  it('should stay idle with zero counters while no organization is selected', () => {
    const store = TestBed.inject(NavigationCountersStore);

    expect(store.openInterventions()).toBe(0);
    expect(store.openNonConformities()).toBe(0);
    expect(mockService.getCounters).not.toHaveBeenCalled();
  });

  it('should load the counters of the selected organization', () => {
    const store = TestBed.inject(NavigationCountersStore);

    selectedOrganization.set({ id: 'org-1' });
    TestBed.tick();

    expect(mockService.getCounters).toHaveBeenCalledWith('org-1');
    expect(store.openInterventions()).toBe(4);
    expect(store.openNonConformities()).toBe(12);
  });

  it('should reload when the selected organization changes', () => {
    const store = TestBed.inject(NavigationCountersStore);

    selectedOrganization.set({ id: 'org-1' });
    TestBed.tick();
    selectedOrganization.set({ id: 'org-2' });
    TestBed.tick();

    expect(mockService.getCounters).toHaveBeenCalledTimes(2);
    expect(mockService.getCounters).toHaveBeenLastCalledWith('org-2');
    expect(store.openInterventions()).toBe(4);
  });

  it('should degrade to zero counters on error', () => {
    mockService.getCounters.mockReturnValue(throwError(() => new Error('boom')));
    const store = TestBed.inject(NavigationCountersStore);

    selectedOrganization.set({ id: 'org-1' });
    TestBed.tick();

    expect(store.queryError()).not.toBeNull();
    expect(store.openInterventions()).toBe(0);
    expect(store.openNonConformities()).toBe(0);
  });
});
