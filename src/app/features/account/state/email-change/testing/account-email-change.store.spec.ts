import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, throwError, type Observable } from 'rxjs';
import { UserProfileService } from '@features/account/data-access';
import type { RequestEmailChangeInput, RequestEmailChangeOutput } from '@features/account/models';
import { AccountEmailChangeStore } from '../account-email-change.store';
import { accountEmailChangeStoreEvents } from '../events';

interface MockUserProfileService {
  readonly requestEmailChange: ReturnType<
    typeof vi.fn<(input: RequestEmailChangeInput) => Observable<RequestEmailChangeOutput>>
  >;
  readonly cancelEmailChange: ReturnType<typeof vi.fn<() => Observable<void>>>;
}

const dispatchedTypes = (dispatcher: { dispatch: ReturnType<typeof vi.fn> }): string[] =>
  dispatcher.dispatch.mock.calls.map((call) => (call[0] as { type: string }).type);

const ACCEPTED: RequestEmailChangeOutput = {
  success: true,
  message: 'A confirmation link has been sent to the new email address.',
  expiresAt: '2026-08-28T12:00:00+00:00',
} as RequestEmailChangeOutput;

describe('AccountEmailChangeStore', () => {
  const setup = () => {
    const mockUserProfileService: MockUserProfileService = {
      requestEmailChange: vi.fn(() => of(ACCEPTED)),
      cancelEmailChange: vi.fn(() => of(undefined)),
    };
    const mockDispatcher: { dispatch: ReturnType<typeof vi.fn> } = { dispatch: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        AccountEmailChangeStore,
        { provide: UserProfileService, useValue: mockUserProfileService },
        { provide: Dispatcher, useValue: mockDispatcher },
      ],
    });

    const store = TestBed.inject(AccountEmailChangeStore);

    return { store, mockUserProfileService, mockDispatcher };
  };

  it('should start idle with no pending request', () => {
    const { store } = setup();

    expect(store.requestCallState().status).toBe('idle');
    expect(store.cancelCallState().status).toBe('idle');
    expect(store.hasPendingRequest()).toBe(false);
    expect(store.pendingEmail()).toBeNull();
  });

  it('should record the pending address on an accepted request without a toast', () => {
    const { store, mockUserProfileService, mockDispatcher } = setup();

    store.request({ newEmail: 'new@example.com', currentPassword: 'Secret123!' });

    expect(mockUserProfileService.requestEmailChange).toHaveBeenCalledWith({
      newEmail: 'new@example.com',
      currentPassword: 'Secret123!',
    });
    expect(store.requestCallState().status).toBe('success');
    expect(store.pendingEmail()).toBe('new@example.com');
    expect(store.expiresAt()).toBe('2026-08-28T12:00:00+00:00');
    expect(store.hasPendingRequest()).toBe(true);
    expect(dispatchedTypes(mockDispatcher)).toEqual([]);
  });

  it('should expose the error and dispatch the failure event when the request is rejected', () => {
    const { store, mockUserProfileService, mockDispatcher } = setup();
    mockUserProfileService.requestEmailChange.mockReturnValueOnce(
      throwError(() => new Error('This email address cannot be used.')),
    );

    store.request({ newEmail: 'taken@example.com', currentPassword: 'Secret123!' });

    expect(store.requestCallState().status).toBe('error');
    expect(store.requestError()).not.toBeNull();
    expect(store.hasPendingRequest()).toBe(false);
    expect(dispatchedTypes(mockDispatcher)).toEqual([
      accountEmailChangeStoreEvents.requestFailed.type,
    ]);
  });

  it('should clear the pending request on a successful cancellation without a toast', () => {
    const { store, mockUserProfileService, mockDispatcher } = setup();
    store.request({ newEmail: 'new@example.com', currentPassword: 'Secret123!' });

    store.cancel();

    expect(mockUserProfileService.cancelEmailChange).toHaveBeenCalledTimes(1);
    expect(store.cancelCallState().status).toBe('success');
    expect(store.pendingEmail()).toBeNull();
    expect(store.hasPendingRequest()).toBe(false);
    expect(dispatchedTypes(mockDispatcher)).toEqual([]);
  });

  it('should keep the pending request and dispatch the failure event when the cancellation fails', () => {
    const { store, mockUserProfileService, mockDispatcher } = setup();
    store.request({ newEmail: 'new@example.com', currentPassword: 'Secret123!' });
    mockUserProfileService.cancelEmailChange.mockReturnValueOnce(
      throwError(() => new Error('Network error')),
    );

    store.cancel();

    expect(store.cancelCallState().status).toBe('error');
    expect(store.pendingEmail()).toBe('new@example.com');
    expect(dispatchedTypes(mockDispatcher)).toEqual([
      accountEmailChangeStoreEvents.cancelFailed.type,
    ]);
  });
});
