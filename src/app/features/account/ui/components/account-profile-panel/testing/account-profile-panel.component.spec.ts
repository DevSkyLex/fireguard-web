import { TestBed } from '@angular/core/testing';
import type { UpdateCurrentUserProfileInput } from '@features/account/models';
import { AccountProfileEditStore, UserStore } from '@features/account/state';
import { AccountProfilePanel } from '../account-profile-panel.component';

interface PanelInternals {
  save(input: UpdateCurrentUserProfileInput): void;
  uploadAvatar(file: File): void;
}

interface MockAccountProfileEditStore {
  readonly save: ReturnType<typeof vi.fn<(input: UpdateCurrentUserProfileInput) => void>>;
  readonly uploadAvatar: ReturnType<typeof vi.fn<(file: File) => void>>;
}

interface SetupResult {
  readonly component: PanelInternals;
  readonly mockEditStore: MockAccountProfileEditStore;
}

describe('AccountProfilePanel', () => {
  const setup = (): SetupResult => {
    const mockUserStore: Record<string, never> = {};
    const mockEditStore: MockAccountProfileEditStore = {
      save: vi.fn<(input: UpdateCurrentUserProfileInput) => void>(),
      uploadAvatar: vi.fn<(file: File) => void>(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: UserStore, useValue: mockUserStore },
        { provide: AccountProfileEditStore, useValue: mockEditStore },
      ],
    });

    const component = TestBed.runInInjectionContext(
      () => new AccountProfilePanel(),
    ) as unknown as PanelInternals;
    return { component, mockEditStore };
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
});
