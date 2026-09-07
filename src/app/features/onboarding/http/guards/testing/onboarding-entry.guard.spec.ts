import { TestBed } from '@angular/core/testing';
import {
  Router,
  convertToParamMap,
  type ActivatedRouteSnapshot,
  type RouterStateSnapshot,
  type UrlTree,
} from '@angular/router';
import { firstValueFrom, isObservable, of } from 'rxjs';
import type { OnboardingOutput } from '@features/onboarding/models';
import { OnboardingStore } from '@features/onboarding/state';
import { onboardingEntryGuard } from '../onboarding-entry.guard';

describe('onboardingEntryGuard', () => {
  const store = { ensureLoaded: vi.fn() };
  let router: Router;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [{ provide: OnboardingStore, useValue: store }] });
    router = TestBed.inject(Router);
  });
  async function destination(
    record: Partial<OnboardingOutput> | null,
    returnUrl: string | null = null,
  ): Promise<string> {
    store.ensureLoaded.mockReturnValue(of(record));
    const route = { queryParamMap: convertToParamMap({ returnUrl }) } as ActivatedRouteSnapshot;
    const result = TestBed.runInInjectionContext(() =>
      onboardingEntryGuard(route, {} as RouterStateSnapshot),
    );
    const resolved = isObservable(result) ? await firstValueFrom(result) : await result;
    return router.serializeUrl(resolved as UrlTree);
  }
  it('shows choices without starting creation for a new account', async () => {
    expect(await destination(null)).toBe('/onboarding/workspace');
  });
  it('preserves an explicit invitation ahead of an unfinished creation', async () => {
    expect(
      await destination(
        { targetOrganizationId: 'created' },
        '/organizations/invitations/accept?token=invitation',
      ),
    ).toBe('/organizations/invitations/accept?token=invitation');
  });
  it('resumes a pinned creation when no accessible workspace exists', async () => {
    expect(await destination({ targetOrganizationId: 'created' })).toBe('/onboarding/create');
  });
  it('permits a joined organization while another creation is incomplete', async () => {
    expect(
      await destination({
        state: 'in_progress',
        targetOrganizationId: 'created',
        accessibleOrganizationId: 'joined',
      }),
    ).toBe('/organizations');
  });
  it('keeps a safe requested destination for existing access', async () => {
    expect(
      await destination({ accessibleOrganizationId: 'joined' }, '/organizations/joined/equipments'),
    ).toBe('/organizations/joined/equipments');
  });
  it('rejects external return destinations and onboarding redirect loops', async () => {
    expect(await destination({ accessibleOrganizationId: 'joined' }, 'https://attacker.test')).toBe(
      '/organizations',
    );
    expect(await destination({ accessibleOrganizationId: 'joined' }, '/onboarding/create')).toBe(
      '/organizations',
    );
  });
});
