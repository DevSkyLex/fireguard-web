import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ActivatedRouteSnapshot } from '@angular/router';
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

  const organizationEntity = signal<OrganizationOutput | null>(organization);

  /** Route snapshot naming the organization being navigated to. */
  const route = (organizationId: string): ActivatedRouteSnapshot =>
    ({
      paramMap: {
        get: (key: string): string | null => (key === 'organizationId' ? organizationId : null),
      },
    }) as unknown as ActivatedRouteSnapshot;

  beforeEach(() => {
    organizationEntity.set(organization);

    TestBed.configureTestingModule({
      providers: [
        {
          provide: ActiveOrganizationStore,
          useValue: {
            organizationEntity,
          },
        },
      ],
    });
  });

  it('should return the organization name synchronously when already loaded', () => {
    const result = TestBed.runInInjectionContext(() =>
      organizationTitleResolver(route('org-1'), {} as never),
    );

    expect(result).toBe('Fireguard');
  });

  it('should wait for the organization when not already available', async () => {
    organizationEntity.set(null);

    const result = TestBed.runInInjectionContext(() =>
      organizationTitleResolver(route('org-1'), {} as never),
    );

    expect(isObservable(result)).toBe(true);

    const pendingResult = firstValueFrom(result as Observable<string>);
    organizationEntity.set(organization);

    await expect(pendingResult).resolves.toBe('Fireguard');
  });

  it('should ignore an organization left over from the previous route', async () => {
    // Navigating org-1 -> org-2: the store still holds org-1 until its sibling
    // resolver lands the new one. Answering "Fireguard" here would title the
    // page after the organization the member just left.
    const result = TestBed.runInInjectionContext(() =>
      organizationTitleResolver(route('org-2'), {} as never),
    );

    expect(isObservable(result)).toBe(true);

    const pendingResult = firstValueFrom(result as Observable<string>);
    organizationEntity.set({ ...organization, id: 'org-2', name: 'Second Org' });

    await expect(pendingResult).resolves.toBe('Second Org');
  });
});
