import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { MockInstance } from 'vitest';
import { USER_IDENTITY_PORT, type ShellUserProfile } from '@features/account/ports';
import { AUTH_LOGOUT_PORT } from '@features/auth';
import { AccountMenu } from '../account-menu.component';

describe('AccountMenu', () => {
  let fixture: ComponentFixture<AccountMenu>;
  let profile: WritableSignal<ShellUserProfile | null>;
  let displayName: WritableSignal<string | null>;
  let isLoading: WritableSignal<boolean>;
  let logout: ReturnType<typeof vi.fn>;
  let navigate: MockInstance;

  beforeEach(async () => {
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
      ],
    });

    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

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

  it('should open the account page', () => {
    fixture.componentInstance['openProfile']();

    expect(navigate).toHaveBeenCalledWith(['/account']);
  });

  it('should open the notification preferences', () => {
    fixture.componentInstance['openNotifications']();

    expect(navigate).toHaveBeenCalledWith(['/account/notifications']);
  });

  it('should end the session through the auth port', () => {
    fixture.componentInstance['logout']();

    // Navigation away is the auth feature's consequence of the logout, not
    // this menu's to perform.
    expect(logout).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });
});
