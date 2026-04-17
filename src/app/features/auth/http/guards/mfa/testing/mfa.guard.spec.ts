import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { AuthStore } from '@features/auth/state';
import { mfaGuard } from '../mfa.guard';

describe('mfaGuard', () => {
  let mockRouter: { createUrlTree: ReturnType<typeof vi.fn> };
  let mockAuthStore: {
    isAuthenticated: ReturnType<typeof vi.fn>;
    mfaRequired: ReturnType<typeof vi.fn>;
  };

  const urlTree = {} as UrlTree;
  const route = {} as unknown as Parameters<typeof mfaGuard>[0];
  const state = {} as unknown as Parameters<typeof mfaGuard>[1];

  const runGuard = (): boolean | UrlTree => {
    return TestBed.runInInjectionContext(() => mfaGuard(route, state)) as boolean | UrlTree;
  };

  beforeEach(() => {
    mockRouter = {
      createUrlTree: vi.fn().mockReturnValue(urlTree),
    };
    mockAuthStore = {
      isAuthenticated: vi.fn(),
      mfaRequired: vi.fn(),
    };
  });

  const configure = (platformId: 'browser' | 'server'): void => {
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: platformId },
        { provide: Router, useValue: mockRouter },
        { provide: AuthStore, useValue: mockAuthStore },
      ],
    });
  };

  it('should redirect to login during SSR when MFA is not required', () => {
    configure('server');
    mockAuthStore.isAuthenticated.mockReturnValue(false);
    mockAuthStore.mfaRequired.mockReturnValue(false);

    const result = runGuard();
    expect(result).toBe(urlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/auth/login']);
  });

  it('should redirect authenticated users to root in browser', () => {
    configure('browser');
    mockAuthStore.isAuthenticated.mockReturnValue(true);

    const result = runGuard();

    expect(result).toBe(urlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/']);
  });

  it('should allow access when MFA is required in browser', () => {
    configure('browser');
    mockAuthStore.isAuthenticated.mockReturnValue(false);
    mockAuthStore.mfaRequired.mockReturnValue(true);

    const result = runGuard();
    expect(result).toBe(true);
  });

  it('should redirect to login when MFA is not required and user is not authenticated', () => {
    configure('browser');
    mockAuthStore.isAuthenticated.mockReturnValue(false);
    mockAuthStore.mfaRequired.mockReturnValue(false);

    const result = runGuard();

    expect(result).toBe(urlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/auth/login']);
  });
});
