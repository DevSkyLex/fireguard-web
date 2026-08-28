import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, throwError, type Observable } from 'rxjs';
import { UserProfileService } from '@features/account/data-access';
import type { UserProfileOutput } from '@features/account/models';
import { AccountDeactivationStore } from '../account-deactivation.store';
import { accountDeactivationStoreEvents } from '../events';

interface MockUserProfileService {
  readonly deactivateCurrentAccount: ReturnType<typeof vi.fn<() => Observable<UserProfileOutput>>>;
}

const dispatchedTypes = (dispatcher: { dispatch: ReturnType<typeof vi.fn> }): string[] =>
  dispatcher.dispatch.mock.calls.map((call) => (call[0] as { type: string }).type);

const DEACTIVATED_PROFILE: UserProfileOutput = {
  id: 'user-uuid-123',
  status: 'inactive',
} as UserProfileOutput;

describe('AccountDeactivationStore', () => {
  const setup = () => {
    const mockUserProfileService: MockUserProfileService = {
      deactivateCurrentAccount: vi.fn(() => of(DEACTIVATED_PROFILE)),
    };
    const mockDispatcher: { dispatch: ReturnType<typeof vi.fn> } = { dispatch: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        AccountDeactivationStore,
        { provide: UserProfileService, useValue: mockUserProfileService },
        { provide: Dispatcher, useValue: mockDispatcher },
      ],
    });

    const store = TestBed.inject(AccountDeactivationStore);

    return { store, mockUserProfileService, mockDispatcher };
  };

  it('should start idle', () => {
    const { store } = setup();

    expect(store.deactivateCallState().status).toBe('idle');
    expect(store.isDeactivating()).toBe(false);
    expect(store.deactivateError()).toBeNull();
  });

  it('should reach success and dispatch the feedback event on deactivation', () => {
    const { store, mockUserProfileService, mockDispatcher } = setup();

    store.deactivate();

    expect(mockUserProfileService.deactivateCurrentAccount).toHaveBeenCalledTimes(1);
    expect(store.deactivateCallState().status).toBe('success');
    expect(store.deactivateError()).toBeNull();
    expect(dispatchedTypes(mockDispatcher)).toEqual([
      accountDeactivationStoreEvents.deactivateSucceeded.type,
    ]);
  });

  it('should expose the error and dispatch the failure event when the request is rejected', () => {
    const { store, mockUserProfileService, mockDispatcher } = setup();
    mockUserProfileService.deactivateCurrentAccount.mockReturnValueOnce(
      throwError(() => new Error('Forbidden')),
    );

    store.deactivate();

    expect(store.deactivateCallState().status).toBe('error');
    expect(store.deactivateError()).not.toBeNull();
    expect(dispatchedTypes(mockDispatcher)).toEqual([
      accountDeactivationStoreEvents.deactivateFailed.type,
    ]);
  });
});
