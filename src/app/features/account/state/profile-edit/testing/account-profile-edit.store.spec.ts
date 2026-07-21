import { TestBed } from '@angular/core/testing';
import { of, throwError, type Observable } from 'rxjs';
import { UserProfileService } from '@features/account/data-access';
import type {
  UpdateCurrentUserProfileInput,
  UserOutput,
  UserProfileOutput,
} from '@features/account/models';
import { AUTH_LOGOUT_PORT } from '@features/auth';
import { UserStore } from '../../user';
import { AccountProfileEditStore } from '../account-profile-edit.store';

interface MockUserProfileService {
  readonly updateCurrentProfile: ReturnType<
    typeof vi.fn<(input: UpdateCurrentUserProfileInput) => Observable<UserProfileOutput>>
  >;
  readonly uploadCurrentAvatar: ReturnType<
    typeof vi.fn<(avatar: Blob, fileName?: string) => Observable<UserOutput>>
  >;
  readonly deactivateCurrentAccount: ReturnType<typeof vi.fn<() => Observable<UserProfileOutput>>>;
}

interface MockAuthLogoutPort {
  readonly logout: ReturnType<typeof vi.fn<() => void>>;
}

interface MockUserStore {
  readonly profile: ReturnType<typeof vi.fn<() => UserProfileOutput | null>>;
  readonly setProfile: ReturnType<typeof vi.fn<(profile: UserProfileOutput) => void>>;
  readonly reload: ReturnType<typeof vi.fn<() => void>>;
}

interface SetupResult {
  readonly store: AccountProfileEditStore;
  readonly mockUserProfileService: MockUserProfileService;
  readonly mockUserStore: MockUserStore;
  readonly mockAuthLogoutPort: MockAuthLogoutPort;
}

const USER_PROFILE_OUTPUT: UserProfileOutput = {
  id: 'user-1',
  firstName: 'Ada',
  lastName: 'Lovelace',
} as UserProfileOutput;

const USER_OUTPUT: UserOutput = {
  ...USER_PROFILE_OUTPUT,
  avatarUrl: 'https://example.com/avatar/256.webp',
  avatarUrls: {
    '256': 'https://example.com/avatar/256.webp',
    '64': 'https://example.com/avatar/64.webp',
  },
} as UserOutput;

const INPUT: UpdateCurrentUserProfileInput = {
  firstName: 'Ada',
  lastName: 'Lovelace',
};

describe('AccountProfileEditStore', () => {
  const setup = (): SetupResult => {
    const mockUserProfileService: MockUserProfileService = {
      updateCurrentProfile: vi.fn<
        (input: UpdateCurrentUserProfileInput) => Observable<UserProfileOutput>
      >(() => of(USER_PROFILE_OUTPUT)),
      uploadCurrentAvatar: vi.fn<(avatar: Blob, fileName?: string) => Observable<UserOutput>>(() =>
        of(USER_OUTPUT),
      ),
      deactivateCurrentAccount: vi.fn<() => Observable<UserProfileOutput>>(() =>
        of(USER_PROFILE_OUTPUT),
      ),
    };
    const mockAuthLogoutPort: MockAuthLogoutPort = { logout: vi.fn<() => void>() };
    const mockUserStore: MockUserStore = {
      profile: vi.fn<() => UserProfileOutput | null>(() => USER_PROFILE_OUTPUT),
      setProfile: vi.fn<(profile: UserProfileOutput) => void>(),
      reload: vi.fn<() => void>(),
    };

    TestBed.configureTestingModule({
      providers: [
        AccountProfileEditStore,
        { provide: UserProfileService, useValue: mockUserProfileService },
        { provide: UserStore, useValue: mockUserStore },
        { provide: AUTH_LOGOUT_PORT, useValue: mockAuthLogoutPort },
      ],
    });

    const store: AccountProfileEditStore = TestBed.inject(AccountProfileEditStore);
    return { store, mockUserProfileService, mockUserStore, mockAuthLogoutPort };
  };

  it('should patch and store the current profile without reloading it', () => {
    const { store, mockUserProfileService, mockUserStore } = setup();

    store.save(INPUT);

    expect(mockUserProfileService.updateCurrentProfile).toHaveBeenCalledWith(INPUT);
    expect(mockUserStore.setProfile).toHaveBeenCalledWith(USER_PROFILE_OUTPUT);
    expect(mockUserStore.reload).not.toHaveBeenCalled();
    expect(store.isSaving()).toBe(false);
    expect(store.saveError()).toBeNull();
  });

  it('should expose a save error and not reload when the update fails', () => {
    const { store, mockUserProfileService, mockUserStore } = setup();
    mockUserProfileService.updateCurrentProfile.mockReturnValueOnce(
      throwError(() => new Error('boom')),
    );

    store.save(INPUT);

    expect(store.saveError()).not.toBeNull();
    expect(mockUserStore.setProfile).not.toHaveBeenCalled();
    expect(mockUserStore.reload).not.toHaveBeenCalled();
  });

  it('should upload the avatar and merge avatar fields without reloading the profile', () => {
    const { store, mockUserProfileService, mockUserStore } = setup();
    const file: File = new File(['x'], 'avatar.png', { type: 'image/png' });

    store.uploadAvatar(file);

    expect(mockUserProfileService.uploadCurrentAvatar).toHaveBeenCalledWith(file, 'avatar.png');
    expect(mockUserStore.setProfile).toHaveBeenCalledWith({
      ...USER_PROFILE_OUTPUT,
      avatarUrl: USER_OUTPUT.avatarUrl,
      avatarUrls: USER_OUTPUT.avatarUrls,
    });
    expect(mockUserStore.reload).not.toHaveBeenCalled();
    expect(store.avatarError()).toBeNull();
  });

  it('should fall back to a profile reload when no profile is loaded yet', () => {
    const { store, mockUserStore } = setup();
    mockUserStore.profile.mockReturnValueOnce(null);

    store.uploadAvatar(new File(['x'], 'avatar.png', { type: 'image/png' }));

    expect(mockUserStore.setProfile).not.toHaveBeenCalled();
    expect(mockUserStore.reload).toHaveBeenCalledTimes(1);
  });

  it('should expose an avatar error when the upload fails', () => {
    const { store, mockUserProfileService } = setup();
    mockUserProfileService.uploadCurrentAvatar.mockReturnValueOnce(
      throwError(() => new Error('boom')),
    );

    store.uploadAvatar(new File(['x'], 'avatar.png', { type: 'image/png' }));

    expect(store.avatarError()).not.toBeNull();
  });

  describe('deactivate', () => {
    // The backend kills every session as part of the call, so the local one is
    // already dead when the response lands. Logging out is what turns that into
    // a clean sign-out instead of the next request failing with a 401.
    it('should sign the user out once the account is deactivated', () => {
      const { store, mockUserProfileService, mockAuthLogoutPort } = setup();

      store.deactivate();

      expect(mockUserProfileService.deactivateCurrentAccount).toHaveBeenCalledTimes(1);
      expect(mockAuthLogoutPort.logout).toHaveBeenCalledTimes(1);
      expect(store.isDeactivating()).toBe(false);
      expect(store.deactivateError()).toBeNull();
    });

    // A failed deactivation must leave the user signed in — signing them out
    // would look exactly like the success it is not.
    it('should keep the session when the request fails', () => {
      const { store, mockUserProfileService, mockAuthLogoutPort } = setup();
      mockUserProfileService.deactivateCurrentAccount.mockReturnValueOnce(
        throwError(() => new Error('boom')),
      );

      store.deactivate();

      expect(store.deactivateError()).not.toBeNull();
      expect(mockAuthLogoutPort.logout).not.toHaveBeenCalled();
    });

    it('should not touch the profile or avatar call states', () => {
      const { store } = setup();

      store.deactivate();

      expect(store.saveError()).toBeNull();
      expect(store.saveSucceeded()).toBe(false);
      expect(store.avatarError()).toBeNull();
    });
  });
});
