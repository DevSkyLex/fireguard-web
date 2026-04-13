import { TestBed } from '@angular/core/testing';
import { convertToParamMap, Router, UrlTree } from '@angular/router';
import { PasswordResetStore } from '@features/auth/state';
import { passwordResetVerifyGuard } from './password-reset-verify.guard';

describe('passwordResetVerifyGuard', () => {
  let mockRouter: { createUrlTree: ReturnType<typeof vi.fn> };
  let mockPasswordResetStore: {
    challengeToken: ReturnType<typeof vi.fn>;
    setChallengeToken: ReturnType<typeof vi.fn>;
  };

  const forgotUrlTree = {} as UrlTree;
  const state = {} as unknown as Parameters<typeof passwordResetVerifyGuard>[1];

  const runGuard = (queryToken: string | null): boolean | UrlTree => {
    const route = {
      queryParamMap: convertToParamMap(queryToken ? { token: queryToken } : {}),
    } as unknown as Parameters<typeof passwordResetVerifyGuard>[0];

    return TestBed.runInInjectionContext(() => passwordResetVerifyGuard(route, state)) as
      | boolean
      | UrlTree;
  };

  beforeEach(() => {
    mockRouter = {
      createUrlTree: vi.fn().mockReturnValue(forgotUrlTree),
    };
    mockPasswordResetStore = {
      challengeToken: vi.fn(),
      setChallengeToken: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: PasswordResetStore, useValue: mockPasswordResetStore },
      ],
    });
  });

  it('should store token from query params when different from store token', () => {
    mockPasswordResetStore.challengeToken.mockReturnValue('old-token');

    const result = runGuard('new-token');

    expect(result).toBe(true);
    expect(mockPasswordResetStore.setChallengeToken).toHaveBeenCalledWith('new-token');
  });

  it('should not overwrite token when query token matches store token', () => {
    mockPasswordResetStore.challengeToken.mockReturnValue('same-token');

    const result = runGuard('same-token');

    expect(result).toBe(true);
    expect(mockPasswordResetStore.setChallengeToken).not.toHaveBeenCalled();
  });

  it('should allow access when no query token but store token exists', () => {
    mockPasswordResetStore.challengeToken.mockReturnValue('store-token');

    const result = runGuard(null);
    expect(result).toBe(true);
  });

  it('should redirect to forgot password page when no token exists', () => {
    mockPasswordResetStore.challengeToken.mockReturnValue(null);

    const result = runGuard(null);

    expect(result).toBe(forgotUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/auth/password-reset/forgot']);
  });
});
