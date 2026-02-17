import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { guestGuard } from './guest.guard';
import { AuthStore } from '@core/stores/auth';

describe('guestGuard', () => {
  let mockRouter: { createUrlTree: ReturnType<typeof vi.fn> };
  let mockAuthStore: {
    isAuthenticated: ReturnType<typeof vi.fn>;
    mfaRequired: ReturnType<typeof vi.fn>;
  };

  const urlTree = {} as UrlTree;

  const runGuard = (): boolean | UrlTree => {
    return TestBed.runInInjectionContext(() => guestGuard({} as any, {} as any)) as boolean | UrlTree;
  };

  beforeEach(() => {
    mockRouter = {
      createUrlTree: vi.fn().mockReturnValue(urlTree),
    };
    mockAuthStore = {
      isAuthenticated: vi.fn(),
      mfaRequired: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: AuthStore, useValue: mockAuthStore },
      ],
    });
  });

  it('should redirect to MFA page when MFA is required', () => {
    mockAuthStore.mfaRequired.mockReturnValue(true);
    const result = runGuard();

    expect(result).toBe(urlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/auth/mfa-verify']);
  });

  it('should allow access when user is not authenticated', () => {
    mockAuthStore.mfaRequired.mockReturnValue(false);
    mockAuthStore.isAuthenticated.mockReturnValue(false);

    const result = runGuard();
    expect(result).toBe(true);
  });

  it('should redirect authenticated users to root', () => {
    mockAuthStore.mfaRequired.mockReturnValue(false);
    mockAuthStore.isAuthenticated.mockReturnValue(true);

    const result = runGuard();

    expect(result).toBe(urlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/']);
  });
});
