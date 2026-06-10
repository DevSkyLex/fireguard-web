import { TestBed } from '@angular/core/testing';
import { of, throwError, type Observable } from 'rxjs';
import { UserProfileService } from '@features/account/data-access';
import type {
  ConfirmPasswordChangeInput,
  ConfirmPasswordChangeOutput,
  RequestPasswordChangeInput,
  RequestPasswordChangeOutput,
} from '@features/account/models';
import { AccountPasswordChangeStore } from '../account-password-change.store';

interface MockUserProfileService {
  readonly requestPasswordChange: ReturnType<
    typeof vi.fn<(input: RequestPasswordChangeInput) => Observable<RequestPasswordChangeOutput>>
  >;
  readonly confirmPasswordChange: ReturnType<
    typeof vi.fn<(input: ConfirmPasswordChangeInput) => Observable<ConfirmPasswordChangeOutput>>
  >;
}

const REQUEST_OUTPUT: RequestPasswordChangeOutput = {
  success: true,
  message: 'A verification code has been sent to your email address.',
  challengeToken: 'abc123def456abc1',
  maskedRecipient: 'j***e@example.com',
  expiresAt: '2026-06-10T12:34:56+00:00',
  maxAttempts: 5,
} as RequestPasswordChangeOutput;

const CONFIRM_OUTPUT: ConfirmPasswordChangeOutput = {
  success: true,
  message: 'Password has been changed successfully.',
} as ConfirmPasswordChangeOutput;

describe('AccountPasswordChangeStore', () => {
  const setup = () => {
    const mockUserProfileService: MockUserProfileService = {
      requestPasswordChange: vi.fn(() => of(REQUEST_OUTPUT)),
      confirmPasswordChange: vi.fn(() => of(CONFIRM_OUTPUT)),
    };

    TestBed.configureTestingModule({
      providers: [
        AccountPasswordChangeStore,
        { provide: UserProfileService, useValue: mockUserProfileService },
      ],
    });

    const store = TestBed.inject(AccountPasswordChangeStore);
    return { store, mockUserProfileService };
  };

  it('should move to the verify step with the challenge on request success', () => {
    const { store, mockUserProfileService } = setup();

    store.request('CurrentP@ssw0rd!');

    expect(mockUserProfileService.requestPasswordChange).toHaveBeenCalledWith({
      currentPassword: 'CurrentP@ssw0rd!',
    });
    expect(store.step()).toBe('verify');
    expect(store.maskedRecipient()).toBe('j***e@example.com');
    expect(store.requestError()).toBeNull();
  });

  it('should stay on the request step and expose an error when the request fails', () => {
    const { store, mockUserProfileService } = setup();
    mockUserProfileService.requestPasswordChange.mockReturnValueOnce(
      throwError(() => new Error('Unprocessable')),
    );

    store.request('wrong-password');

    expect(store.step()).toBe('request');
    expect(store.requestError()).not.toBeNull();
  });

  it('should confirm with the stored challenge token and reach the success step', () => {
    const { store, mockUserProfileService } = setup();
    store.request('CurrentP@ssw0rd!');

    store.confirm({ code: '123456', newPassword: 'NewP@ssw0rd!' });

    expect(mockUserProfileService.confirmPasswordChange).toHaveBeenCalledWith({
      token: 'abc123def456abc1',
      code: '123456',
      newPassword: 'NewP@ssw0rd!',
    });
    expect(store.step()).toBe('success');
    expect(store.confirmError()).toBeNull();
  });

  it('should stay on the verify step and expose an error when confirmation fails', () => {
    const { store, mockUserProfileService } = setup();
    store.request('CurrentP@ssw0rd!');
    mockUserProfileService.confirmPasswordChange.mockReturnValueOnce(
      throwError(() => new Error('Unauthorized')),
    );

    store.confirm({ code: '000000', newPassword: 'NewP@ssw0rd!' });

    expect(store.step()).toBe('verify');
    expect(store.confirmError()).not.toBeNull();
  });

  it('should reset the workflow on restart', () => {
    const { store } = setup();
    store.request('CurrentP@ssw0rd!');

    store.restart();

    expect(store.step()).toBe('request');
    expect(store.maskedRecipient()).toBeNull();
    expect(store.requestError()).toBeNull();
  });
});
