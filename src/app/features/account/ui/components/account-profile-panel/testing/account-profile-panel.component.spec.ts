import { TestBed } from '@angular/core/testing';
import type { UpdateCurrentUserProfileInput } from '@features/account/models';
import {
  AccountPasswordChangeStore,
  AccountProfileEditStore,
  UserStore,
} from '@features/account/state';
import { AccountProfilePanel } from '../account-profile-panel.component';

interface PanelInternals {
  save(input: UpdateCurrentUserProfileInput): void;
  uploadAvatar(file: File): void;
  requestPasswordChange(currentPassword: string): void;
  confirmPasswordChange(confirmation: { code: string; newPassword: string }): void;
  restartPasswordChange(): void;
}

interface MockAccountProfileEditStore {
  readonly save: ReturnType<typeof vi.fn<(input: UpdateCurrentUserProfileInput) => void>>;
  readonly uploadAvatar: ReturnType<typeof vi.fn<(file: File) => void>>;
}

interface MockAccountPasswordChangeStore {
  readonly request: ReturnType<typeof vi.fn<(currentPassword: string) => void>>;
  readonly confirm: ReturnType<
    typeof vi.fn<(confirmation: { code: string; newPassword: string }) => void>
  >;
  readonly restart: ReturnType<typeof vi.fn<() => void>>;
}

interface SetupResult {
  readonly component: PanelInternals;
  readonly mockEditStore: MockAccountProfileEditStore;
  readonly mockPasswordStore: MockAccountPasswordChangeStore;
}

describe('AccountProfilePanel', () => {
  const setup = (): SetupResult => {
    const mockUserStore: Record<string, never> = {};
    const mockEditStore: MockAccountProfileEditStore = {
      save: vi.fn<(input: UpdateCurrentUserProfileInput) => void>(),
      uploadAvatar: vi.fn<(file: File) => void>(),
    };
    const mockPasswordStore: MockAccountPasswordChangeStore = {
      request: vi.fn<(currentPassword: string) => void>(),
      confirm: vi.fn<(confirmation: { code: string; newPassword: string }) => void>(),
      restart: vi.fn<() => void>(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: UserStore, useValue: mockUserStore },
        { provide: AccountProfileEditStore, useValue: mockEditStore },
        { provide: AccountPasswordChangeStore, useValue: mockPasswordStore },
      ],
    });

    const component = TestBed.runInInjectionContext(
      () => new AccountProfilePanel(),
    ) as unknown as PanelInternals;
    return { component, mockEditStore, mockPasswordStore };
  };

  it('should forward submitted profile values to the edit store', () => {
    const { component, mockEditStore } = setup();
    const input: UpdateCurrentUserProfileInput = {
      firstName: 'Ada',
      lastName: 'Lovelace',
    };

    component.save(input);

    expect(mockEditStore.save).toHaveBeenCalledWith(input);
  });

  it('should forward the selected avatar to the edit store', () => {
    const { component, mockEditStore } = setup();
    const file: File = new File(['x'], 'avatar.png', { type: 'image/png' });

    component.uploadAvatar(file);

    expect(mockEditStore.uploadAvatar).toHaveBeenCalledWith(file);
  });

  it('should forward password change intents to the password store', () => {
    const { component, mockPasswordStore } = setup();

    component.requestPasswordChange('CurrentP@ssw0rd!');
    component.confirmPasswordChange({ code: '123456', newPassword: 'NewP@ssw0rd!' });
    component.restartPasswordChange();

    expect(mockPasswordStore.request).toHaveBeenCalledWith('CurrentP@ssw0rd!');
    expect(mockPasswordStore.confirm).toHaveBeenCalledWith({
      code: '123456',
      newPassword: 'NewP@ssw0rd!',
    });
    expect(mockPasswordStore.restart).toHaveBeenCalledTimes(1);
  });
});
