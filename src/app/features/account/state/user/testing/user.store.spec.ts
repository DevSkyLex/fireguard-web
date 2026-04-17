import { makeStateKey, TransferState } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, throwError } from 'rxjs';
import { UserProfileService } from '@features/account/data-access';
import type { UserProfileOutput } from '@features/account/models';
import { UserStore } from '../user.store';

const flushEffects = async (): Promise<void> => {
  await Promise.resolve();
};

describe('UserStore', () => {
  let store: UserStore;
  let transferState: TransferState;
  let mockDispatcher: { dispatch: ReturnType<typeof vi.fn> };
  let mockUserProfileService: { getCurrentProfile: ReturnType<typeof vi.fn> };

  const profile: UserProfileOutput = {
    '@id': '/api/oauth2/userinfo',
    '@type': 'UserInfo',
    sub: 'user-1',
    name: 'Jane Doe',
    given_name: 'Jane',
    family_name: 'Doe',
    preferred_username: 'jane',
    email: 'jane@example.com',
    picture: 'https://example.com/avatar.png',
  };

  beforeEach(() => {
    mockDispatcher = { dispatch: vi.fn() };
    mockUserProfileService = {
      getCurrentProfile: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Dispatcher, useValue: mockDispatcher },
        { provide: UserProfileService, useValue: mockUserProfileService },
      ],
    });

    store = TestBed.inject(UserStore);
    transferState = TestBed.inject(TransferState);
  });

  it('should load profile and expose computed values', async () => {
    mockUserProfileService.getCurrentProfile.mockReturnValue(of(profile));

    store.load();
    await flushEffects();

    expect(store.loadCallState().status).toBe('success');
    expect(store.profile()).toEqual(profile);
    expect(store.displayName()).toBe('Jane Doe');
    expect(store.initials()).toBe('JD');
    expect(store.avatarUrl()).toBe('https://example.com/avatar.png');
    expect(store.isLoaded()).toBe(true);
  });

  it('should dispatch an event when profile loading fails', async () => {
    mockUserProfileService.getCurrentProfile.mockReturnValue(
      throwError(() => new Error('Unauthorized')),
    );

    store.load();
    await flushEffects();

    expect(store.loadCallState().status).toBe('error');
    expect(store.loadError()).not.toBeNull();
    expect(mockDispatcher.dispatch).toHaveBeenCalledTimes(1);
  });

  it('should not call API again when profile is already loaded', async () => {
    mockUserProfileService.getCurrentProfile.mockReturnValue(of(profile));

    store.load();
    await flushEffects();
    store.load();
    await flushEffects();

    expect(mockUserProfileService.getCurrentProfile).toHaveBeenCalledTimes(1);
  });

  it('should force API call on reload', async () => {
    const updatedProfile: UserProfileOutput = {
      ...profile,
      name: 'Jane Updated',
    };
    mockUserProfileService.getCurrentProfile
      .mockReturnValueOnce(of(profile))
      .mockReturnValueOnce(of(updatedProfile));

    store.load();
    await flushEffects();
    store.reload();
    await flushEffects();

    expect(mockUserProfileService.getCurrentProfile).toHaveBeenCalledTimes(2);
    expect(store.profile()?.name).toBe('Jane Updated');
  });

  it('should retry userinfo in the browser when SSR transfer state contains null', async () => {
    transferState.set(makeStateKey<UserProfileOutput | null>('user-profile'), null);
    mockUserProfileService.getCurrentProfile.mockReturnValue(of(profile));

    await store.initialize();

    expect(mockUserProfileService.getCurrentProfile).toHaveBeenCalledTimes(1);
    expect(store.profile()).toEqual(profile);
  });

  it('should clear profile and operation state', async () => {
    mockUserProfileService.getCurrentProfile.mockReturnValue(of(profile));
    store.load();
    await flushEffects();

    store.clear();

    expect(store.profile()).toBeNull();
    expect(store.loadCallState().status).toBe('idle');
  });
});
