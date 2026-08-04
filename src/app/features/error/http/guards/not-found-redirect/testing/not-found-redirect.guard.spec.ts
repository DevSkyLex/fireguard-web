import { TestBed } from '@angular/core/testing';
import { Router, type RouterStateSnapshot, type UrlTree } from '@angular/router';
import { notFoundRedirectGuard } from '../not-found-redirect.guard';

describe('notFoundRedirectGuard', () => {
  const urlTree = {} as UrlTree;
  let mockRouter: { createUrlTree: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockRouter = { createUrlTree: vi.fn().mockReturnValue(urlTree) };

    TestBed.configureTestingModule({
      providers: [{ provide: Router, useValue: mockRouter }],
    });
  });

  it('should redirect to the not-found page carrying the address that failed', () => {
    const state = { url: '/organizations/org-1/interventions/nope' } as RouterStateSnapshot;

    const result = TestBed.runInInjectionContext(() => notFoundRedirectGuard({} as never, state));

    expect(result).toBe(urlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/error/404'], {
      queryParams: { from: '/organizations/org-1/interventions/nope' },
    });
  });

  it('should carry the query string of the failed address as-is', () => {
    const state = { url: '/organizations/org-1/facilities?tab=all' } as RouterStateSnapshot;

    TestBed.runInInjectionContext(() => notFoundRedirectGuard({} as never, state));

    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/error/404'], {
      queryParams: { from: '/organizations/org-1/facilities?tab=all' },
    });
  });
});
