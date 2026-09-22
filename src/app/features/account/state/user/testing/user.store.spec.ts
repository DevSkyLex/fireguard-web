import { makeStateKey, TransferState } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, Subject, throwError } from 'rxjs';
import { LocalePreferenceService } from '@core/locale';
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
  let mockLocalePreference: { applyPreference: ReturnType<typeof vi.fn> };

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
    locale: 'system',
    emailVerified: true,
    totpEnabled: false,
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
    mockLocalePreference = { applyPreference: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: Dispatcher, useValue: mockDispatcher },
        { provide: UserProfileService, useValue: mockUserProfileService },
        { provide: LocalePreferenceService, useValue: mockLocalePreference },
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
    expect(mockLocalePreference.applyPreference).toHaveBeenCalledWith('system');
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
    expect(mockLocalePreference.applyPreference).toHaveBeenCalledWith('system');
  });

  it('should retry current profile loading in the browser when SSR transfer state contains null', async () => {
    transferState.set(makeStateKey<UserProfileOutput | null>('user-profile'), null);
    mockUserProfileService.getCurrentProfile.mockReturnValue(of(profile));

    await store.initialize();

    expect(mockUserProfileService.getCurrentProfile).toHaveBeenCalledTimes(1);
    expect(store.profile()).toEqual(profile);
    expect(mockLocalePreference.applyPreference).toHaveBeenCalledWith('system');
  });

  it('should apply the locale from a profile transferred after SSR hydration', async () => {
    const transferredProfile: UserProfileOutput = { ...profile, locale: 'fr' };
    transferState.set(makeStateKey<UserProfileOutput | null>('user-profile'), transferredProfile);

    await store.initialize();

    expect(mockUserProfileService.getCurrentProfile).not.toHaveBeenCalled();
    expect(store.profile()).toEqual(transferredProfile);
    expect(mockLocalePreference.applyPreference).toHaveBeenCalledWith('fr');
    expect(transferState.hasKey(makeStateKey<UserProfileOutput | null>('user-profile'))).toBe(
      false,
    );
  });

  it('should clear profile and operation state', async () => {
    mockUserProfileService.getCurrentProfile.mockReturnValue(of(profile));
    store.load();
    await flushEffects();

    store.clear();

    expect(store.profile()).toBeNull();
    expect(store.loadCallState().status).toBe('idle');
  });

  it('should share initialization and reactive profile reads', async () => {
    const response = new Subject<UserProfileOutput>();
    mockUserProfileService.getCurrentProfile.mockReturnValue(response);

    store.load();
    const first = store.initialize();
    const second = store.initialize();
    response.next(profile);
    response.complete();
    await Promise.all([first, second]);

    expect(mockUserProfileService.getCurrentProfile).toHaveBeenCalledTimes(1);
    expect(store.profile()).toEqual(profile);
    expect(mockLocalePreference.applyPreference).toHaveBeenCalledTimes(1);
  });

  it('should cancel initialization at logout and permit an immediate new session read', async () => {
    const departed = new Subject<UserProfileOutput>();
    const current = new Subject<UserProfileOutput>();
    mockUserProfileService.getCurrentProfile
      .mockReturnValueOnce(departed)
      .mockReturnValueOnce(current);
    const previousInitialization = store.initialize();

    store.clear();
    const currentInitialization = store.initialize();
    await previousInitialization;
    const concurrentInitialization = store.initialize();
    departed.next({ ...profile, locale: 'fr' });

    expect(departed.observed).toBe(false);
    expect(store.profile()).toBeNull();
    expect(store.loadCallState().status).toBe('pending');
    expect(mockLocalePreference.applyPreference).not.toHaveBeenCalled();
    expect(mockUserProfileService.getCurrentProfile).toHaveBeenCalledTimes(2);

    current.next({ ...profile, id: 'user-2', locale: 'en' });
    await Promise.all([currentInitialization, concurrentInitialization]);
    expect(store.profile()?.id).toBe('user-2');
    expect(mockLocalePreference.applyPreference).toHaveBeenCalledExactlyOnceWith('en');
  });

  it('should ignore a delayed profile error after clear and keep the reactive loader reusable', () => {
    const departed = new Subject<UserProfileOutput>();
    mockUserProfileService.getCurrentProfile
      .mockReturnValueOnce(departed)
      .mockReturnValueOnce(of(profile));
    store.load();
    store.clear();
    departed.error(new Error('Old failure'));

    expect(store.loadCallState().status).toBe('idle');
    expect(mockDispatcher.dispatch).not.toHaveBeenCalled();
    store.load();
    expect(store.profile()).toEqual(profile);
  });

  it('should preserve an authoritative profile save over older reads and locale responses', async () => {
    const oldResponse = new Subject<UserProfileOutput>();
    mockUserProfileService.getCurrentProfile.mockReturnValue(oldResponse);
    const pending = store.initialize();
    const saved = { ...profile, firstName: 'Saved', locale: 'en' as const };

    store.setProfile(saved);
    oldResponse.next({ ...profile, locale: 'fr' });
    await pending;

    expect(oldResponse.observed).toBe(false);
    expect(store.profile()).toEqual(saved);
    expect(mockLocalePreference.applyPreference).toHaveBeenCalledExactlyOnceWith('en');
  });

  it('should remove an unconsumed profile handoff when the session is cleared', async () => {
    const key = makeStateKey<UserProfileOutput | null>('user-profile');
    transferState.set(key, profile);
    store.clear();
    mockUserProfileService.getCurrentProfile.mockReturnValue(of({ ...profile, id: 'user-2' }));

    await store.initialize();

    expect(transferState.hasKey(key)).toBe(false);
    expect(store.profile()?.id).toBe('user-2');
    expect(mockUserProfileService.getCurrentProfile).toHaveBeenCalledTimes(1);
  });
});
