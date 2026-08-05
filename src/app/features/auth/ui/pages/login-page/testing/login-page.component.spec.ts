import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { MockInstance } from 'vitest';
import { AuthStore } from '@features/auth/state';
import { LoginPage } from '../login-page.component';

describe('LoginPage', () => {
  let fixture: ComponentFixture<LoginPage>;
  let mfaRequired: WritableSignal<boolean>;
  let isAuthenticated: WritableSignal<boolean>;
  let mockAuthStore: {
    login: ReturnType<typeof vi.fn>;
    isLoggingIn: WritableSignal<boolean>;
    loginError: WritableSignal<null>;
    mfaRequired: WritableSignal<boolean>;
    isAuthenticated: WritableSignal<boolean>;
  };
  let navigateByUrl: MockInstance;
  let navigate: MockInstance;

  beforeEach(async () => {
    mfaRequired = signal(false);
    isAuthenticated = signal(false);

    mockAuthStore = {
      login: vi.fn(),
      isLoggingIn: signal(false),
      loginError: signal(null),
      mfaRequired,
      isAuthenticated,
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AuthStore, useValue: mockAuthStore },
      ],
    });

    const router: Router = TestBed.inject(Router);
    navigateByUrl = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(LoginPage);
    await fixture.whenStable();
  });

  it('should not navigate while no outcome is reached', () => {
    expect(navigate).not.toHaveBeenCalled();
    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('should send plain credentials without remember_me when it was not asked for', () => {
    fixture.componentInstance['login']({
      email: 'ada@example.com',
      password: 'Str0ng!Passw0rd',
      rememberMe: false,
    });

    // The flag is omitted rather than sent as false, so the request keeps the
    // shape the backend documents for a plain sign-in.
    expect(mockAuthStore.login).toHaveBeenCalledWith({
      email: 'ada@example.com',
      password: 'Str0ng!Passw0rd',
    });
  });

  it('should send remember_me when it was asked for', () => {
    fixture.componentInstance['login']({
      email: 'ada@example.com',
      password: 'Str0ng!Passw0rd',
      rememberMe: true,
    });

    expect(mockAuthStore.login).toHaveBeenCalledWith({
      email: 'ada@example.com',
      password: 'Str0ng!Passw0rd',
      remember_me: true,
    });
  });

  it('should route to the return url once the session is established', async () => {
    isAuthenticated.set(true);
    await fixture.whenStable();

    expect(navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('should route to verification when a challenge is pending', async () => {
    mfaRequired.set(true);
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith(['/auth/mfa-verify'], {
      queryParamsHandling: 'preserve',
    });
  });

  it('should prefer the challenge over an established session', async () => {
    // A pending challenge means the session is not really established yet, so
    // it must win — otherwise the second factor is silently skipped.
    mfaRequired.set(true);
    isAuthenticated.set(true);
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith(['/auth/mfa-verify'], {
      queryParamsHandling: 'preserve',
    });
    expect(navigateByUrl).not.toHaveBeenCalled();
  });
});
