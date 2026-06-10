import { makeStateKey, TransferState } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, throwError } from 'rxjs';
import { UserProfileService } from '@features/account/data-access';
import { ACCOUNT_PERMISSION } from '@features/account/models';
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
    '@id': '/api/me',
    '@type': 'User',
    id: 'user-1',
    username: 'jane',
    email: 'jane@example.com',
    firstName: 'Jane',
    lastName: 'Doe',
    avatarUrl: 'https://example.com/avatar.png',
    status: 'active',
    emailVerified: true,
    tenantId: 'tenant-1',
    createdAt: '2026-04-01T08:00:00+00:00',
    lastLoginAt: '2026-04-20T08:00:00+00:00',
    roles: ['ROLE_USER'],
    permissions: [ACCOUNT_PERMISSION.PROFILE_READ],
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

  it('should resolve avatar size variants from avatarUrls with legacy fallback', () => {
    store.setProfile({
      ...profile,
      avatarUrls: {
        '256': 'https://example.com/avatar/256.webp',
        '128': 'https://example.com/avatar/128.webp',
        '64': 'https://example.com/avatar/64.webp',
        '32': 'https://example.com/avatar/32.webp',
      },
    });

    expect(store.avatarUrl()).toBe('https://example.com/avatar/256.webp');
    expect(store.avatarUrlMedium()).toBe('https://example.com/avatar/128.webp');
    expect(store.avatarUrlSmall()).toBe('https://example.com/avatar/64.webp');

    store.setProfile(profile);

    expect(store.avatarUrlSmall()).toBe('https://example.com/avatar.png');
    expect(store.avatarUrlMedium()).toBe('https://example.com/avatar.png');
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
      firstName: 'Janet',
      lastName: 'Updated',
    };
    mockUserProfileService.getCurrentProfile
      .mockReturnValueOnce(of(profile))
      .mockReturnValueOnce(of(updatedProfile));

    store.load();
    await flushEffects();
    store.reload();
    await flushEffects();

    expect(mockUserProfileService.getCurrentProfile).toHaveBeenCalledTimes(2);
    expect(store.displayName()).toBe('Janet Updated');
  });

  it('should replace the profile without calling the API', () => {
    const updatedProfile: UserProfileOutput = {
      ...profile,
      firstName: 'Janet',
      lastName: 'Updated',
    };

    store.setProfile(updatedProfile);

    expect(store.profile()).toEqual(updatedProfile);
    expect(store.displayName()).toBe('Janet Updated');
    expect(store.loadCallState().status).toBe('success');
    expect(mockUserProfileService.getCurrentProfile).not.toHaveBeenCalled();
  });

  it('should retry current profile loading in the browser when SSR transfer state contains null', async () => {
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
