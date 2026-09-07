import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { AuthStore } from '@features/auth/state';
import { authGuard } from '../auth.guard';

describe('authGuard', () => {
  let mockRouter: { createUrlTree: ReturnType<typeof vi.fn> };
  let mockAuthStore: { isAuthenticated: ReturnType<typeof vi.fn> };
  const loginUrlTree = {} as UrlTree;
  const route = {} as unknown as Parameters<typeof authGuard>[0];

  function runGuard(url?: string): boolean | UrlTree {
    const state = { url: url ?? '' } as Parameters<typeof authGuard>[1];
    return TestBed.runInInjectionContext(() => authGuard(route, state)) as boolean | UrlTree;
  }

  beforeEach(() => {
    mockRouter = {
      createUrlTree: vi.fn().mockReturnValue(loginUrlTree),
    };
    mockAuthStore = {
      isAuthenticated: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: Router, useValue: mockRouter },
        { provide: AuthStore, useValue: mockAuthStore },
      ],
    });
  });

  it('should allow access when user is authenticated', () => {
    mockAuthStore.isAuthenticated.mockReturnValue(true);
    const result = runGuard();
    expect(result).toBe(true);
  });

  it('should redirect to /auth/login when not authenticated', () => {
    mockAuthStore.isAuthenticated.mockReturnValue(false);
    const result = runGuard();
    expect(result).toBe(loginUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/auth/login']);
  });

  it.each([
    '/onboarding/requests',
    '/onboarding/workspace?returnUrl=%2Finvitations%2Faccept%3Ftoken%3Dinvitation',
  ])('preserves the requested workspace destination %s', (url) => {
    mockAuthStore.isAuthenticated.mockReturnValue(false);
    runGuard(url);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/auth/login'], {
      queryParams: { returnUrl: url },
    });
  });

  it('restarts an expired OAuth connection without carrying callback credentials', () => {
    mockAuthStore.isAuthenticated.mockReturnValue(false);
    runGuard('/account/security/federated/google/callback?code=private-code&state=private-state');
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/auth/login'], {
      queryParams: { returnUrl: '/account/security' },
    });
  });

  it('does not preserve an unsafe destination', () => {
    mockAuthStore.isAuthenticated.mockReturnValue(false);
    runGuard('//other.example/path');
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/auth/login']);
  });

  it('should redirect to /auth/login during SSR when not authenticated', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: Router, useValue: mockRouter },
        { provide: AuthStore, useValue: mockAuthStore },
      ],
    });

    mockAuthStore.isAuthenticated.mockReturnValue(false);
    const result = runGuard();
    expect(result).toBe(loginUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/auth/login']);
  });
});
