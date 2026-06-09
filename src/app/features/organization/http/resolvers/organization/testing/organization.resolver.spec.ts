import { TestBed } from '@angular/core/testing';
import {
  RedirectCommand,
  type ActivatedRouteSnapshot,
  type MaybeAsync,
  Router,
} from '@angular/router';
import { firstValueFrom, isObservable, of, throwError } from 'rxjs';
import { OrganizationService } from '@features/organization/data-access';
import type { OrganizationOutput } from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import { organizationResolver } from '../organization.resolver';

describe('organizationResolver', () => {
  const parsedRootUrl = { root: true } as const;
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

  let mockRouter: {
    parseUrl: ReturnType<typeof vi.fn>;
  };
  let mockActiveOrganizationStore: {
    resolveOrganization: ReturnType<typeof vi.fn>;
    setOrganization: ReturnType<typeof vi.fn>;
  };
  let mockOrganizationService: {
    list: ReturnType<typeof vi.fn>;
  };

  async function resolveMaybeAsync<T>(result: MaybeAsync<T>): Promise<T> {
    if (result instanceof Promise) {
      return result;
    }

    if (isObservable(result)) {
      return firstValueFrom(result);
    }

    return result;
  }

  function createRoute(organizationId: string | null): ActivatedRouteSnapshot {
    return {
      paramMap: {
        get: (key: string): string | null => (key === 'organizationId' ? organizationId : null),
      },
    } as unknown as ActivatedRouteSnapshot;
  }

  beforeEach(() => {
    mockRouter = {
      parseUrl: vi.fn().mockReturnValue(parsedRootUrl),
    };

    mockActiveOrganizationStore = {
      resolveOrganization: vi.fn().mockReturnValue(of(organization)),
      setOrganization: vi.fn(),
    };
    mockOrganizationService = {
      list: vi.fn().mockReturnValue(
        of({
          member: [],
          totalItems: 0,
        }),
      ),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: ActiveOrganizationStore, useValue: mockActiveOrganizationStore },
        { provide: OrganizationService, useValue: mockOrganizationService },
        { provide: Router, useValue: mockRouter },
      ],
    });
  });

  it('should resolve the organization when organizationId is present', async () => {
    const result = await TestBed.runInInjectionContext(() =>
      resolveMaybeAsync(organizationResolver(createRoute('org-1'), {} as never)),
    );

    expect(result).toEqual(organization);
    expect(mockActiveOrganizationStore.resolveOrganization).toHaveBeenCalledWith('org-1');
  });

  it('should redirect to / when organizationId is missing', async () => {
    const result = await TestBed.runInInjectionContext(() =>
      resolveMaybeAsync(organizationResolver(createRoute(null), {} as never)),
    );

    expect(result).toBeInstanceOf(RedirectCommand);
    expect((result as RedirectCommand).redirectTo).toBe(parsedRootUrl);
    expect(mockActiveOrganizationStore.resolveOrganization).not.toHaveBeenCalled();
  });

  it('should redirect to / when organization resolution fails', async () => {
    mockActiveOrganizationStore.resolveOrganization.mockReturnValue(
      throwError(() => new Error('Not found')),
    );

    const result = await TestBed.runInInjectionContext(() =>
      resolveMaybeAsync(organizationResolver(createRoute('org-1'), {} as never)),
    );

    expect(result).toBeInstanceOf(RedirectCommand);
    expect((result as RedirectCommand).redirectTo).toBe(parsedRootUrl);
  });

  it('should resolve an accessible listed organization when detail loading is forbidden', async () => {
    mockActiveOrganizationStore.resolveOrganization.mockReturnValue(
      throwError(() => new Error('Forbidden')),
    );
    mockOrganizationService.list.mockReturnValue(
      of({
        member: [organization],
        totalItems: 1,
      }),
    );

    const result = await TestBed.runInInjectionContext(() =>
      resolveMaybeAsync(organizationResolver(createRoute('org-1'), {} as never)),
    );

    expect(result).toEqual(organization);
    expect(mockActiveOrganizationStore.setOrganization).toHaveBeenCalledWith(organization);
    expect(mockOrganizationService.list).toHaveBeenCalledWith({ page: 1, itemsPerPage: 30 });
  });
});
