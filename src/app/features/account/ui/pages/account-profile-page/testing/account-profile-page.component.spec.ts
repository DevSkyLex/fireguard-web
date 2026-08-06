import {
  LOCALE_ID,
  provideZonelessChangeDetection,
  signal,
  type WritableSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { StoreError } from '@core/request-state';
import type { UpdateCurrentUserProfileInput, UserProfileOutput } from '@features/account/models';
import { AccountProfileEditStore, UserStore } from '@features/account/state';
import type { AccountProfileFormValues } from '../../../forms/account-profile-form/models';
import { AccountProfilePage } from '../account-profile-page.component';

const PROFILE: UserProfileOutput = {
  '@id': '/api/me',
  '@type': 'User',
  id: 'user-1',
  username: 'ada',
  email: 'ada@example.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
  avatarUrl: null,
  status: 'active',
  locale: 'fr',
  emailVerified: true,
  totpEnabled: false,
  tenantId: null,
  createdAt: '2026-01-01T12:00:00+00:00',
  lastLoginAt: '2026-03-02T12:00:00+00:00',
  roles: ['ROLE_USER'],
  permissions: [],
};

describe('AccountProfilePage', () => {
  let fixture: ComponentFixture<AccountProfilePage>;
  let profile: WritableSignal<UserProfileOutput | null>;
  let loadError: WritableSignal<StoreError | null>;
  let userStore: {
    profile: WritableSignal<UserProfileOutput | null>;
    loadError: WritableSignal<StoreError | null>;
    roles: WritableSignal<ReadonlyArray<string>>;
    displayName: WritableSignal<string | null>;
    initials: WritableSignal<string>;
    avatarUrlMedium: WritableSignal<string | null>;
    isLoading: WritableSignal<boolean>;
    load: ReturnType<typeof vi.fn>;
    reload: ReturnType<typeof vi.fn>;
  };
  let editStore: {
    save: ReturnType<typeof vi.fn>;
    uploadAvatar: ReturnType<typeof vi.fn>;
    isSaving: WritableSignal<boolean>;
    isUploadingAvatar: WritableSignal<boolean>;
    saveCallState: WritableSignal<{ status: string }>;
  };

  /**
   * Opens the editable group, the way the Edit control does.
   */
  async function startEditing(): Promise<void> {
    (
      fixture.nativeElement.querySelector(
        '[data-testid="account-profile-edit"]',
      ) as HTMLButtonElement
    ).click();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    profile = signal<UserProfileOutput | null>(PROFILE);
    loadError = signal<StoreError | null>(null);
    userStore = {
      profile,
      loadError,
      roles: signal<ReadonlyArray<string>>(['ROLE_USER']),
      displayName: signal<string | null>('Ada Lovelace'),
      initials: signal('AL'),
      avatarUrlMedium: signal<string | null>(null),
      isLoading: signal(false),
      load: vi.fn(),
      reload: vi.fn(),
    };
    editStore = {
      save: vi.fn(),
      uploadAvatar: vi.fn(),
      isSaving: signal(false),
      isUploadingAvatar: signal(false),
      saveCallState: signal<{ status: string }>({ status: 'idle' }),
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: LOCALE_ID, useValue: 'en-US' },
        { provide: UserStore, useValue: userStore },
      ],
    })
      .overrideComponent(AccountProfilePage, {
        set: { providers: [{ provide: AccountProfileEditStore, useValue: editStore }] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(AccountProfilePage);
    await fixture.whenStable();
  });

  it('should show the details read-only, with no form in sight', () => {
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('#account-first-name')).toBeNull();
    expect(element.textContent).toContain('Ada');
    expect(element.textContent).toContain('Lovelace');
    expect(element.querySelector('[data-testid="account-profile-edit"]')).not.toBeNull();
  });

  it('should seed the form from the stored profile once editing starts', async () => {
    await startEditing();

    const firstName = fixture.nativeElement.querySelector(
      '#account-first-name',
    ) as HTMLInputElement;

    expect(firstName.value).toBe('Ada');
  });

  it('should show the email read-only', () => {
    expect(fixture.nativeElement.textContent).toContain('ada@example.com');
  });

  it('should flag an unconfirmed address, and stay quiet about a confirmed one', async () => {
    expect(fixture.nativeElement.textContent).not.toContain('Not confirmed');

    profile.set({ ...PROFILE, emailVerified: false });
    await fixture.whenStable();

    // Only the case that needs attention is badged: an unconfirmed address
    // cannot receive the code the password change depends on.
    expect(fixture.nativeElement.textContent).toContain('Not confirmed');
  });

  it('should show when the account was created and last used', () => {
    expect(fixture.nativeElement.textContent).toContain('January 1, 2026');
    expect(fixture.nativeElement.textContent).toContain('March 2, 2026');
  });

  it('should omit a timestamp the backend did not send', async () => {
    profile.set({ ...PROFILE, lastLoginAt: null });
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).not.toContain('Last sign-in');
  });

  it('should render neither the form nor the details before the profile lands', async () => {
    profile.set(null);
    await fixture.whenStable();

    // The form seeds itself from the profile, so rendering it early would show
    // empty fields as though they were stored values — and a save would then
    // persist them.
    expect(fixture.nativeElement.querySelector('#account-first-name')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('ada@example.com');
  });

  it('should offer a retry when the profile could not be fetched', async () => {
    profile.set(null);
    loadError.set({ error: null, message: 'Boom', code: 500, retryable: true, timestamp: 0 });
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain("Couldn't load your account");

    fixture.componentInstance['retryProfile']();

    // `reload()` rather than `load()`: the latter filters itself out while the
    // call state still holds the failure.
    expect(userStore.reload).toHaveBeenCalled();
  });

  it('should ask for the profile it edits', () => {
    expect(userStore.load).toHaveBeenCalled();
  });

  it('should send the edited values to the store', () => {
    fixture.componentInstance['save']({
      firstName: 'Grace',
      lastName: 'Hopper',
      locale: 'en',
    } satisfies AccountProfileFormValues);

    expect(editStore.save).toHaveBeenCalledWith({
      firstName: 'Grace',
      lastName: 'Hopper',
      locale: 'en',
    } satisfies UpdateCurrentUserProfileInput);
  });

  it('should send an emptied name as null rather than as a blank string', () => {
    fixture.componentInstance['save']({
      firstName: '   ',
      lastName: '',
      locale: 'system',
    } satisfies AccountProfileFormValues);

    // Under merge-patch, `null` clears the field. `''` is a blank name the API
    // rejects, and omitting the key would silently keep the value the user just
    // deleted.
    expect(editStore.save).toHaveBeenCalledWith({
      firstName: null,
      lastName: null,
      locale: 'system',
    } satisfies UpdateCurrentUserProfileInput);
  });

  it('should trim a name before sending it', () => {
    fixture.componentInstance['save']({
      firstName: '  Grace  ',
      lastName: 'Hopper',
      locale: 'system',
    } satisfies AccountProfileFormValues);

    expect(editStore.save).toHaveBeenCalledWith(expect.objectContaining({ firstName: 'Grace' }));
  });

  it('should hand a chosen picture to the store', () => {
    const file = new File(['x'], 'avatar.png', { type: 'image/png' });

    fixture.componentInstance['uploadAvatar'](file);

    expect(editStore.uploadAvatar).toHaveBeenCalledWith(file);
  });

  it('should name the interface language rather than show its stored code', () => {
    // `fr` is not a thing to display to a reader.
    expect(fixture.nativeElement.textContent).toContain('Français');
    expect(fixture.nativeElement.textContent).not.toContain('locale');
  });

  it('should hide the edit control while editing', async () => {
    await startEditing();

    expect(fixture.nativeElement.querySelector('[data-testid="account-profile-edit"]')).toBeNull();
  });

  it('should return to read-only when the edit is abandoned', async () => {
    await startEditing();

    (
      fixture.nativeElement.querySelector(
        '[data-testid="account-profile-cancel"]',
      ) as HTMLButtonElement
    ).click();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('#account-first-name')).toBeNull();
    expect(editStore.save).not.toHaveBeenCalled();
  });

  it('should return to read-only once a save lands', async () => {
    await startEditing();

    editStore.saveCallState.set({ status: 'pending' });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('#account-first-name')).not.toBeNull();

    editStore.saveCallState.set({ status: 'success' });
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('#account-first-name')).toBeNull();
  });

  it('should stay open when reopened after an earlier save', async () => {
    editStore.saveCallState.set({ status: 'pending' });
    await fixture.whenStable();
    editStore.saveCallState.set({ status: 'success' });
    await fixture.whenStable();

    await startEditing();

    // The call state stays `success` afterwards, so keying on the state rather
    // than on the transition into it would slam the form shut on reopening.
    expect(fixture.nativeElement.querySelector('#account-first-name')).not.toBeNull();
  });
});
