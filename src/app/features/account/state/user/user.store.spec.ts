import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, throwError } from 'rxjs';
import { OAuth2Service } from '@features/auth/data-access';
import type { UserInfoOutput } from '@features/auth/models';
import { UserStore } from './user.store';

const flushEffects = async (): Promise<void> => {
  await Promise.resolve();
};

describe('UserStore', () => {
  let store: UserStore;
  let mockDispatcher: { dispatch: ReturnType<typeof vi.fn> };
  let mockOauth2Service: { userinfo: ReturnType<typeof vi.fn> };

  const profile: UserInfoOutput = {
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
    mockOauth2Service = {
      userinfo: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Dispatcher, useValue: mockDispatcher },
        { provide: OAuth2Service, useValue: mockOauth2Service },
      ],
    });

    store = TestBed.inject(UserStore);
  });

  it('should load profile and expose computed values', async () => {
    mockOauth2Service.userinfo.mockReturnValue(of(profile));

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
    mockOauth2Service.userinfo.mockReturnValue(throwError(() => new Error('Unauthorized')));

    store.load();
    await flushEffects();

    expect(store.loadCallState().status).toBe('error');
    expect(store.loadError()).not.toBeNull();
    expect(mockDispatcher.dispatch).toHaveBeenCalledTimes(1);
  });

  it('should not call API again when profile is already loaded', async () => {
    mockOauth2Service.userinfo.mockReturnValue(of(profile));

    store.load();
    await flushEffects();
    store.load();
    await flushEffects();

    expect(mockOauth2Service.userinfo).toHaveBeenCalledTimes(1);
  });

  it('should force API call on reload', async () => {
    const updatedProfile: UserInfoOutput = {
      ...profile,
      name: 'Jane Updated',
    };
    mockOauth2Service.userinfo
      .mockReturnValueOnce(of(profile))
      .mockReturnValueOnce(of(updatedProfile));

    store.load();
    await flushEffects();
    store.reload();
    await flushEffects();

    expect(mockOauth2Service.userinfo).toHaveBeenCalledTimes(2);
    expect(store.profile()?.name).toBe('Jane Updated');
  });

  it('should clear profile and operation state', async () => {
    mockOauth2Service.userinfo.mockReturnValue(of(profile));
    store.load();
    await flushEffects();

    store.clear();

    expect(store.profile()).toBeNull();
    expect(store.loadCallState().status).toBe('idle');
  });
});
