import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { PasswordResetStore } from '@features/auth/state';
import { passwordResetNewGuard } from '../password-reset-new.guard';

describe('passwordResetNewGuard', () => {
  let mockRouter: { createUrlTree: ReturnType<typeof vi.fn> };
  let mockPasswordResetStore: {
    challengeToken: ReturnType<typeof vi.fn>;
    verificationCode: ReturnType<typeof vi.fn>;
  };

  const urlTree = {} as UrlTree;
  const route = {} as unknown as Parameters<typeof passwordResetNewGuard>[0];
  const state = {} as unknown as Parameters<typeof passwordResetNewGuard>[1];

  const runGuard = (): boolean | UrlTree => {
    return TestBed.runInInjectionContext(() => passwordResetNewGuard(route, state)) as
      | boolean
      | UrlTree;
  };

  beforeEach(() => {
    mockRouter = {
      createUrlTree: vi.fn().mockReturnValue(urlTree),
    };
    mockPasswordResetStore = {
      challengeToken: vi.fn(),
      verificationCode: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: PasswordResetStore, useValue: mockPasswordResetStore },
      ],
    });
  });

  it('should redirect to forgot page when challenge token is missing', () => {
    mockPasswordResetStore.challengeToken.mockReturnValue(null);
    mockPasswordResetStore.verificationCode.mockReturnValue(null);

    const result = runGuard();

    expect(result).toBe(urlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/auth/password-reset/forgot']);
  });

  it('should redirect to verify page when verification code is missing', () => {
    mockPasswordResetStore.challengeToken.mockReturnValue('challenge-token');
    mockPasswordResetStore.verificationCode.mockReturnValue(null);

    const result = runGuard();

    expect(result).toBe(urlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/auth/password-reset/verify']);
  });

  it('should allow access when token and code are present', () => {
    mockPasswordResetStore.challengeToken.mockReturnValue('challenge-token');
    mockPasswordResetStore.verificationCode.mockReturnValue('123456');

    const result = runGuard();
    expect(result).toBe(true);
  });
});

