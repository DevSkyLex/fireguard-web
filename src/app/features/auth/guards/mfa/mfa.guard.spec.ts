import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { mfaGuard } from './mfa.guard';
import { AuthStore } from '@core/stores/auth';

describe('mfaGuard', () => {
  let mockRouter: { createUrlTree: ReturnType<typeof vi.fn> };
  let mockAuthStore: {
    isAuthenticated: ReturnType<typeof vi.fn>;
    mfaRequired: ReturnType<typeof vi.fn>;
  };

  const urlTree = {} as UrlTree;

  const runGuard = (): boolean | UrlTree => {
    return TestBed.runInInjectionContext(() => mfaGuard({} as any, {} as any)) as boolean | UrlTree;
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

  it('should allow access during SSR', () => {
    configure('server');
    mockAuthStore.isAuthenticated.mockReturnValue(false);
    mockAuthStore.mfaRequired.mockReturnValue(false);

    const result = runGuard();
    expect(result).toBe(true);
  });

  it('should redirect authenticated users to home in browser', () => {
    configure('browser');
    mockAuthStore.isAuthenticated.mockReturnValue(true);

    const result = runGuard();

    expect(result).toBe(urlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/home']);
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
