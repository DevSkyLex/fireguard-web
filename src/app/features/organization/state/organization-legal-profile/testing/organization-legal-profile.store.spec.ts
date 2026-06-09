import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { OrganizationService } from '@features/organization/data-access';
import type { OrganizationLegalProfileOutput } from '@features/organization/models';
import { OrganizationLegalProfileStore } from '../organization-legal-profile.store';

const flushEffects = async (): Promise<void> => void (await Promise.resolve());

describe('OrganizationLegalProfileStore', () => {
  let store: OrganizationLegalProfileStore;
  const profile = {
    organizationId: 'org-1',
    legalName: 'Fireguard',
  } as OrganizationLegalProfileOutput;
  const organizationService = { getLegalProfile: vi.fn(), upsertLegalProfile: vi.fn() };

  beforeEach(() => {
    organizationService.getLegalProfile.mockReturnValue(of(profile));
    organizationService.upsertLegalProfile.mockReturnValue(of(profile));
    TestBed.configureTestingModule({
      providers: [
        OrganizationLegalProfileStore,
        { provide: OrganizationService, useValue: organizationService },
      ],
    });
    store = TestBed.inject(OrganizationLegalProfileStore);
  });

  it('should load the legal profile', async () => {
    store.load('org-1');
    await flushEffects();
    expect(store.profile()).toBe(profile);
  });

  it('should expose the saved legal profile', async () => {
    const input = { legalType: 'company' as const, legalName: 'Fireguard' };
    store.save({ organizationId: 'org-1', input });
    await flushEffects();
    expect(organizationService.upsertLegalProfile).toHaveBeenCalledWith('org-1', input);
    expect(store.profile()).toBe(profile);
  });
});
