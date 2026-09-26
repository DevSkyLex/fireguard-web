import {
  computed,
  provideZonelessChangeDetection,
  signal,
  type WritableSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import { idleCallState } from '@core/request-state';
import type { PresencePreferenceOutput } from '@features/account/models/presence-preference';
import { USER_IDENTITY_PORT, type ShellUserProfile } from '@features/account/ports';
import { PresencePreferenceStore } from '@features/account/state/presence-preference';
import { AUTH_LOGOUT_PORT } from '@features/auth';
import type { PresenceStatus } from '@features/organization/models';
import { MEMBER_PRESENCE_PORT } from '@features/organization/ports';
import { AccountMenu } from '../account-menu.component';

describe('AccountMenu', () => {
  const mobile = signal(false);
  let fixture: ComponentFixture<AccountMenu>;
  let profile: WritableSignal<ShellUserProfile | null>;
  let displayName: WritableSignal<string | null>;
  let isLoading: WritableSignal<boolean>;
  let logout: ReturnType<typeof vi.fn>;
  const preference = signal<Pick<
    PresencePreferenceOutput,
    'doNotDisturb' | 'revision' | 'invisible'
  > | null>({
    doNotDisturb: false,
    revision: 0,
  });
  const ownStatus = signal<PresenceStatus | null>('active');
  const isSaving = signal(false);
  const available = signal(true);
  const setDoNotDisturb = vi.fn();
  const setInvisible = vi.fn();

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
    preference.set({ doNotDisturb: false, revision: 0 });
    ownStatus.set('active');
    isSaving.set(false);
    available.set(true);
    setDoNotDisturb.mockReset();
    setInvisible.mockReset();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: MEMBER_PRESENCE_PORT, useValue: { ownStatus } },
        {
          provide: PresencePreferenceStore,
          useValue: {
            preference,
            doNotDisturb: computed(() => preference()?.doNotDisturb ?? false),
            available,
            isSaving,
            saveCallState: signal(idleCallState()),
            setDoNotDisturb,
            setInvisible,
            invisible: computed(() => preference()?.invisible ?? false),
          },
        },
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

  it('selects NPD directly through the account store and closes the menu', async () => {
    fixture.nativeElement.querySelector('#account-menu-trigger').click();
    await fixture.whenStable();
    (
      document.querySelector('[data-testid="account-presence-trigger"]') as HTMLButtonElement
    ).click();
    await fixture.whenStable();
    const control = Array.from(document.querySelectorAll('hlm-dropdown-menu-sub button')).find(
      (item) => item.textContent?.includes('Do not disturb'),
    ) as HTMLButtonElement;
    expect(control.getAttribute('aria-current')).toBeNull();
    control.click();
    await fixture.whenStable();
    expect(setDoNotDisturb).toHaveBeenCalledExactlyOnceWith(true);
    expect(document.querySelector('hlm-dropdown-menu')).toBeNull();
    expect(fixture.componentInstance['presenceStatus']()).toBe('active');
    expect(control.getAttribute('aria-current')).toBeNull();
  });

  it('does not turn off the selected status when it is clicked again', async () => {
    preference.set({ doNotDisturb: false, invisible: true, revision: 2 });
    await fixture.whenStable();
    fixture.nativeElement.querySelector('#account-menu-trigger').click();
    await fixture.whenStable();
    (
      document.querySelector('[data-testid="account-presence-trigger"]') as HTMLButtonElement
    ).click();
    await fixture.whenStable();
    const control = Array.from(document.querySelectorAll('hlm-dropdown-menu-sub button')).find(
      (item) => item.textContent?.includes('Invisible'),
    ) as HTMLButtonElement;
    expect(control.getAttribute('aria-current')).toBe('true');
    control.click();
    await fixture.whenStable();
    expect(setInvisible).toHaveBeenCalledExactlyOnceWith(true);
    expect(document.querySelector('hlm-dropdown-menu')).toBeNull();
  });

  it('hides online decoration until the global preference is confirmed', async () => {
    preference.set(null);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[data-slot="avatar-badge"]')).toBeNull();
  });

  it('shows a confirmed NPD change immediately but never invents online presence', async () => {
    preference.set({ doNotDisturb: true, revision: 1 });
    await fixture.whenStable();
    expect(fixture.componentInstance['presenceStatus']()).toBe('do_not_disturb');
    ownStatus.set(null);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[data-slot="avatar-badge"]')).toBeNull();
    fixture.componentInstance['changePresencePreference'](false);
    expect(setDoNotDisturb).toHaveBeenCalledExactlyOnceWith(false);
  });

  it('shows invisible as a private gray status and sends only the visibility command', async () => {
    fixture.nativeElement.querySelector('#account-menu-trigger').click();
    await fixture.whenStable();
    (
      document.querySelector('[data-testid="account-presence-trigger"]') as HTMLButtonElement
    ).click();
    await fixture.whenStable();
    const controls = Array.from(document.querySelectorAll('hlm-dropdown-menu-sub button'));
    const control = controls.find((element) =>
      element.textContent?.includes('Invisible'),
    ) as HTMLButtonElement;
    control.click();
    await fixture.whenStable();
    expect(setInvisible).toHaveBeenCalledExactlyOnceWith(true);
    expect(setDoNotDisturb).not.toHaveBeenCalled();
    expect(control.getAttribute('aria-current')).toBeNull();
    ownStatus.set('offline');
    preference.set({ doNotDisturb: true, revision: 2, invisible: true });
    await fixture.whenStable();
    expect(fixture.componentInstance['presenceStatus']()).toBe('invisible');
    const badge = fixture.nativeElement.querySelector('[data-slot="avatar-badge"]');
    expect(badge.getAttribute('aria-label')).toBe('Invisible');
    expect(badge.classList.contains('bg-muted-foreground')).toBe(true);
  });

  it('offers the invisible preference through the mobile Signal Forms switch', async () => {
    mobile.set(true);
    await fixture.whenStable();
    fixture.nativeElement.querySelector('#account-menu-trigger').click();
    await fixture.whenStable();
    const control = document.querySelector('#account-invisible-switch') as HTMLElement;
    control.click();
    await fixture.whenStable();
    expect(setInvisible).toHaveBeenCalledExactlyOnceWith(true);
    expect(fixture.componentInstance['presenceModel']().invisible).toBe(false);
  });

  it('blocks unavailable or in-flight changes without queuing them', () => {
    available.set(false);
    fixture.componentInstance['changePresencePreference'](true);
    available.set(true);
    isSaving.set(true);
    fixture.componentInstance['changePresencePreference'](true);
    expect(setDoNotDisturb).not.toHaveBeenCalled();
  });

  it('uses a labeled Signal Forms switch on mobile and retains the confirmed value until success', async () => {
    mobile.set(true);
    await fixture.whenStable();
    fixture.nativeElement.querySelector('#account-menu-trigger').click();
    await fixture.whenStable();
    const control = document.querySelector('#account-presence-switch') as HTMLElement;
    expect(control).not.toBeNull();
    expect(document.querySelector('label[for="account-presence-switch"]')?.textContent).toContain(
      'Do not disturb',
    );
    control.click();
    await fixture.whenStable();
    expect(setDoNotDisturb).toHaveBeenCalledExactlyOnceWith(true);
    expect(fixture.componentInstance['presenceModel']().doNotDisturb).toBe(false);
  });
});
