import {
  computed,
  provideZonelessChangeDetection,
  signal,
  type WritableSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import { USER_IDENTITY_PORT, type ShellUserProfile } from '@features/account/ports';
import { AUTH_LOGOUT_PORT } from '@features/auth';
import { AccountMenu } from '../account-menu.component';

describe('AccountMenu', () => {
  const mobile = signal(false);
  let fixture: ComponentFixture<AccountMenu>;
  let profile: WritableSignal<ShellUserProfile | null>;
  let displayName: WritableSignal<string | null>;
  let isLoading: WritableSignal<boolean>;
  let logout: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    profile = signal<ShellUserProfile | null>({
      sub: 'user-1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      picture: null,
    });
    displayName = signal<string | null>('Ada Lovelace');
    isLoading = signal(false);
    logout = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: USER_IDENTITY_PORT,
          useValue: {
            profile,
            displayName,
            initials: signal<string | null>('AL'),
            avatarUrl: signal<string | null>(null),
            avatarUrlSmall: signal<string | null>(null),
            isLoading,
          },
        },
        { provide: AUTH_LOGOUT_PORT, useValue: { logout, isLoggingOut: signal(false) } },
        {
          provide: INTERACTION_CAPABILITIES_PORT,
          useValue: {
            isMobileInteractionMode: mobile,
            mode: computed(() => (mobile() ? 'mobile' : 'desktop')),
            shortcutModifier: signal<'Ctrl'>('Ctrl'),
          },
        },
      ],
    });

    mobile.set(false);
    fixture = TestBed.createComponent(AccountMenu);
    await fixture.whenStable();
  });

  it('should render the signed-in identity', () => {
    expect(fixture.nativeElement.textContent).toContain('Ada Lovelace');
    expect(fixture.nativeElement.textContent).toContain('ada@example.com');
  });

  it('should fall back to the address when the user set no name', async () => {
    displayName.set(null);
    await fixture.whenStable();

    // A row showing nothing at all would be worse than showing the address.
    expect(fixture.nativeElement.textContent).toContain('ada@example.com');
  });

  it('should show a placeholder while the profile is still resolving', async () => {
    profile.set(null);
    displayName.set(null);
    isLoading.set(true);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('hlm-skeleton')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#account-menu-trigger')).toBeNull();
  });

  it('should render nothing rather than an empty row when no profile resolves', async () => {
    profile.set(null);
    displayName.set(null);
    isLoading.set(false);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('#account-menu-trigger')).toBeNull();
    expect(fixture.nativeElement.querySelector('hlm-skeleton')).toBeNull();
  });

  it('exposes account destinations as native router links', async () => {
    fixture.nativeElement.querySelector('#account-menu-trigger').click();
    await fixture.whenStable();

    const menu = document.querySelector('hlm-dropdown-menu');
    expect(menu?.querySelector('a[href="/account/profile"]')).not.toBeNull();
    expect(menu?.querySelector('a[href="/account/notifications"]')).not.toBeNull();
    expect(menu?.textContent).not.toContain('Notification preferences');
    expect(menu?.querySelector('button[data-variant="destructive"]')).not.toBeNull();
    expect(
      Array.from(menu?.querySelectorAll('[data-slot="dropdown-menu-shortcut"]') ?? []).map(
        (element) => element.textContent?.trim(),
      ),
    ).toEqual(['Ctrl+P', 'Ctrl+S', 'Ctrl+O', 'Ctrl+N']);
  });

  it('should end the session through the auth port', () => {
    fixture.componentInstance['logout']();

    expect(logout).toHaveBeenCalledTimes(1);
  });
  it('uses the central mobile drawer and keeps notifications as the only notification destination', async () => {
    mobile.set(true);
    await fixture.whenStable();
    const trigger = fixture.nativeElement.querySelector(
      '#account-menu-trigger',
    ) as HTMLButtonElement;
    trigger.click();
    await fixture.whenStable();
    const drawer = document.querySelector('hlm-drawer-content');
    expect(drawer).not.toBeNull();
    expect(drawer?.querySelector('a[href="/account/notifications"]')).not.toBeNull();
    expect(drawer?.textContent).not.toContain('Notification preferences');
    expect(drawer?.querySelector('button.text-destructive')).not.toBeNull();
  });

  it('keeps the native menu when the central mode is desktop', async () => {
    expect(fixture.nativeElement.querySelector('hlm-drawer')).toBeNull();
    fixture.nativeElement.querySelector('#account-menu-trigger').click();
    await fixture.whenStable();
    expect(document.querySelector('hlm-dropdown-menu')).not.toBeNull();
  });
});
