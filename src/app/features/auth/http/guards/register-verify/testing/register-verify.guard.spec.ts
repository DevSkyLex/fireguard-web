import { TestBed } from '@angular/core/testing';
import { convertToParamMap, Router, UrlTree } from '@angular/router';
import { RegisterStore } from '@features/auth/state';
import { registerVerifyGuard } from '../register-verify.guard';

describe('registerVerifyGuard', () => {
  let mockRouter: { createUrlTree: ReturnType<typeof vi.fn> };
  let mockRegisterStore: {
    challengeToken: ReturnType<typeof vi.fn>;
    setChallengeToken: ReturnType<typeof vi.fn>;
  };

  const registerUrlTree = {} as UrlTree;
  const state = {} as unknown as Parameters<typeof registerVerifyGuard>[1];

  const runGuard = (queryToken: string | null): boolean | UrlTree => {
    const route = {
      queryParamMap: convertToParamMap(queryToken ? { token: queryToken } : {}),
    } as unknown as Parameters<typeof registerVerifyGuard>[0];

    return TestBed.runInInjectionContext(() => registerVerifyGuard(route, state)) as
      | boolean
      | UrlTree;
  };

  beforeEach(() => {
    mockRouter = {
      createUrlTree: vi.fn().mockReturnValue(registerUrlTree),
    };
    mockRegisterStore = {
      challengeToken: vi.fn(),
      setChallengeToken: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: RegisterStore, useValue: mockRegisterStore },
      ],
    });
  });

  it('should rehydrate the store when the query token differs from the store token', () => {
    mockRegisterStore.challengeToken.mockReturnValue(null);

    const result = runGuard('challenge-token');

    expect(result).toBe(true);
    expect(mockRegisterStore.setChallengeToken).toHaveBeenCalledWith('challenge-token');
    expect(mockRouter.createUrlTree).not.toHaveBeenCalled();
  });

  it('should not overwrite the store when the query token matches it', () => {
    mockRegisterStore.challengeToken.mockReturnValue('same-token');

    const result = runGuard('same-token');

    expect(result).toBe(true);
    expect(mockRegisterStore.setChallengeToken).not.toHaveBeenCalled();
  });

  it('should allow access from the store token when the URL carries none', () => {
    mockRegisterStore.challengeToken.mockReturnValue('store-token');

    const result = runGuard(null);

    expect(result).toBe(true);
    expect(mockRegisterStore.setChallengeToken).not.toHaveBeenCalled();
  });

  it('should redirect to the registration page when no token exists at all', () => {
    mockRegisterStore.challengeToken.mockReturnValue(null);

    const result = runGuard(null);

    expect(result).toBe(registerUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/auth/register']);
  });
});
