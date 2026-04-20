import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, isObservable, type Observable } from 'rxjs';
import type { OrganizationOutput } from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import { organizationTitleResolver } from '../organization-title.resolver';

describe('organizationTitleResolver', () => {
  const organization: OrganizationOutput = {
    '@id': '/api/organizations/org-1',
    '@type': 'Organization',
    id: 'org-1',
    name: 'Fireguard',
    slug: 'fireguard',
    ownerUserId: 'user-1',
    createdByUserId: 'user-1',
    status: 'active',
    isActive: true,
    memberCount: 3,
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-01-01T00:00:00+00:00',
  };

  const selectedOrganization = signal<OrganizationOutput | null>(organization);

  beforeEach(() => {
    selectedOrganization.set(organization);

    TestBed.configureTestingModule({
      providers: [
        {
          provide: ActiveOrganizationStore,
          useValue: {
            selectedOrganization,
          },
        },
      ],
    });
  });

  it('should return the organization name synchronously when already selected', () => {
    const result = TestBed.runInInjectionContext(() =>
      organizationTitleResolver({} as never, {} as never),
    );

    expect(result).toBe('Fireguard');
  });

  it('should wait for the selected organization when not already available', async () => {
    selectedOrganization.set(null);

    const result = TestBed.runInInjectionContext(() =>
      organizationTitleResolver({} as never, {} as never),
    );

    expect(isObservable(result)).toBe(true);

    const pendingResult = firstValueFrom(result as Observable<string>);
    selectedOrganization.set(organization);

    await expect(pendingResult).resolves.toBe('Fireguard');
  });
});
