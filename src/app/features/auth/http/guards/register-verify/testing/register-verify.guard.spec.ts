import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { RegisterStore } from '@features/auth/state';
import { registerVerifyGuard } from '../register-verify.guard';

describe('registerVerifyGuard', () => {
  let mockRouter: { createUrlTree: ReturnType<typeof vi.fn> };
  let mockRegisterStore: { hasChallenge: ReturnType<typeof vi.fn> };

  const registerUrlTree = {} as UrlTree;
  const route = {} as unknown as Parameters<typeof registerVerifyGuard>[0];
  const state = {} as unknown as Parameters<typeof registerVerifyGuard>[1];

  const runGuard = (): boolean | UrlTree =>
    TestBed.runInInjectionContext(() => registerVerifyGuard(route, state)) as boolean | UrlTree;

  beforeEach(() => {
    mockRouter = {
      createUrlTree: vi.fn().mockReturnValue(registerUrlTree),
    };
    mockRegisterStore = {
      hasChallenge: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: RegisterStore, useValue: mockRegisterStore },
      ],
    });
  });

  it('should allow access when a registration challenge is in progress', () => {
    mockRegisterStore.hasChallenge.mockReturnValue(true);

    expect(runGuard()).toBe(true);
    expect(mockRouter.createUrlTree).not.toHaveBeenCalled();
  });

  it('should redirect to the registration page when no challenge exists', () => {
    mockRegisterStore.hasChallenge.mockReturnValue(false);

    const result = runGuard();

    expect(result).toBe(registerUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/auth/register']);
  });
});
