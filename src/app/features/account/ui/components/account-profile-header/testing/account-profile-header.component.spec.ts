import { signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { UserProfileOutput } from '@features/account/models';
import { UserStore } from '@features/account/state';
import { AccountProfileHeader } from '../account-profile-header.component';

interface MockUserStore {
  isLoading: WritableSignal<boolean>;
  profile: WritableSignal<UserProfileOutput | null>;
  avatarUrl: WritableSignal<string | null>;
  initials: WritableSignal<string | null>;
  displayName: WritableSignal<string | null>;
  roles: WritableSignal<ReadonlyArray<string>>;
}

describe('AccountProfileHeader', () => {
  const buildProfile = (overrides: Partial<UserProfileOutput> = {}): UserProfileOutput =>
    ({
      id: 'user-1',
      username: 'valentin',
      email: 'valentin@example.com',
      firstName: 'Valentin',
      lastName: 'Fortin',
      avatarUrl: null,
      status: 'active',
      emailVerified: true,
      tenantId: null,
      createdAt: '2025-01-15T10:00:00.000Z',
      lastLoginAt: '2026-06-01T08:30:00.000Z',
      roles: [],
      permissions: [],
      ...overrides,
    }) as UserProfileOutput;

  const createComponent = (store: Partial<MockUserStore> = {}) => {
    const mockUserStore: MockUserStore = {
      isLoading: signal(false),
      profile: signal<UserProfileOutput | null>(buildProfile()),
      avatarUrl: signal<string | null>(null),
      initials: signal<string | null>('VF'),
      displayName: signal<string | null>('Valentin Fortin'),
      roles: signal<ReadonlyArray<string>>([]),
      ...store,
    };

    TestBed.configureTestingModule({
      imports: [AccountProfileHeader],
      providers: [{ provide: UserStore, useValue: mockUserStore }],
    });

    const fixture = TestBed.createComponent(AccountProfileHeader);
    fixture.detectChanges();
    return { fixture, mockUserStore };
  };

  it('should render the display name and email', () => {
    const { fixture } = createComponent();
    const text: string = fixture.nativeElement.textContent ?? '';

    expect(text).toContain('Valentin Fortin');
    expect(text).toContain('valentin@example.com');
  });

  it('should render the avatar image when an avatar url is available', () => {
    const { fixture } = createComponent({ avatarUrl: signal('https://cdn.test/avatar.png') });

    const image: HTMLImageElement | null = fixture.nativeElement.querySelector('p-avatar img');
    expect(image).toBeTruthy();
    expect(image?.getAttribute('src')).toBe('https://cdn.test/avatar.png');
  });

  it('should fall back to the initials when no avatar url is available', () => {
    const { fixture } = createComponent({ avatarUrl: signal<string | null>(null) });

    const avatar: HTMLElement | null = fixture.nativeElement.querySelector('p-avatar');
    expect(avatar?.querySelector('img')).toBeNull();
    expect(avatar?.textContent).toContain('VF');
  });

  it('should render the read-only metadata when timestamps are present', () => {
    const { fixture } = createComponent();
    const text: string = fixture.nativeElement.textContent ?? '';

    expect(text).toContain('Member since');
    expect(text).toContain('Last login');
  });

  it('should hide the metadata rows when timestamps are null', () => {
    const { fixture } = createComponent({
      profile: signal<UserProfileOutput | null>(
        buildProfile({ createdAt: null, lastLoginAt: null }),
      ),
    });
    const text: string = fixture.nativeElement.textContent ?? '';

    expect(text).not.toContain('Member since');
    expect(text).not.toContain('Last login');
  });

  it('should render skeletons while the profile is loading', () => {
    const { fixture } = createComponent({ isLoading: signal(true) });

    expect(fixture.nativeElement.querySelector('.p-skeleton')).toBeTruthy();
    expect(fixture.nativeElement.textContent ?? '').not.toContain('Valentin Fortin');
  });

  it('should map the active status to a green indicator and others to orange', () => {
    const { fixture } = createComponent();
    const component = fixture.componentInstance as unknown as {
      statusDotClass: (status: string) => string;
    };

    expect(component.statusDotClass('active')).toBe('bg-green-500');
    expect(component.statusDotClass('suspended')).toBe('bg-orange-500');
  });
});
