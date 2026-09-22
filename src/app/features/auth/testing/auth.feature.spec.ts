import { ApplicationInitStatus, PLATFORM_ID, REQUEST, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { BOOT_READINESS_PORT } from '@core/boot-readiness';
import { USER_PROFILE_PORT } from '@features/account/ports';
import { AUTH_LOGOUT_PORT, AUTH_SESSION_PORT } from '@features/auth/ports';
import { AuthSessionNavigationService } from '@features/auth/services';
import { AuthStore } from '@features/auth/state';
import { provideAuthFeature } from '../auth.feature';

describe('provideAuthFeature', () => {
  const auth = {
    accessToken: signal<string | null>('session-token'),
    isAuthenticated: signal(true),
    initialized: signal(false),
    isLoggingOut: signal(false),
    initialize: vi.fn().mockResolvedValue(undefined),
    clearToken: vi.fn(),
    renewSession: vi.fn().mockReturnValue(of('renewed-token')),
    logout: vi.fn(),
  };
  const navigation = { start: vi.fn() };
  const profile = { clear: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    auth.initialized.set(false);
    auth.isLoggingOut.set(false);
  });

  /**
   * Function configureAuth
   * @description Configures startup hooks with owner-boundary doubles for each runtime.
   * @access private
   * @since 1.0.0
   * @param {string} platform - Browser or server runtime identifier.
   * @param {Request | null} request - Optional incoming SSR request.
   * @returns {void}
   */
  function configureAuth(platform: string, request: Request | null): void {
    TestBed.configureTestingModule({
      providers: [
        provideAuthFeature(),
        { provide: PLATFORM_ID, useValue: platform },
        { provide: REQUEST, useValue: request },
        { provide: AuthStore, useValue: auth },
        { provide: USER_PROFILE_PORT, useValue: profile },
        { provide: AuthSessionNavigationService, useValue: navigation },
      ],
    });
  }

  it.each([
    { platform: 'browser', request: null, initialized: true },
    {
      platform: 'server',
      request: new Request('https://fireguard.test/organizations'),
      initialized: true,
    },
    { platform: 'server', request: null, initialized: false },
  ])(
    'restores authentication only in a request-capable $platform context ($initialized)',
    async ({ platform, request, initialized }) => {
      configureAuth(platform, request);
      const startup = TestBed.inject(ApplicationInitStatus);
      await startup.donePromise;

      expect(navigation.start).toHaveBeenCalledOnce();
      expect(auth.initialize).toHaveBeenCalledTimes(initialized ? 1 : 0);
    },
  );

  it('publishes the live session and readiness signals and delegates clearing and renewal', async () => {
    configureAuth('browser', null);
    const session = TestBed.inject(AUTH_SESSION_PORT);
    const readiness = TestBed.inject(BOOT_READINESS_PORT);
    expect(session.accessToken()).toBe('session-token');
    expect(session.isAuthenticated()).toBe(true);
    expect(readiness.initialized()).toBe(false);
    auth.initialized.set(true);
    expect(readiness.initialized()).toBe(true);
    expect(session.initialized()).toBe(true);

    session.clearSession();
    expect(auth.clearToken).toHaveBeenCalledOnce();
    expect(profile.clear).toHaveBeenCalledOnce();
    expect(await firstValueFrom(session.renewSession())).toBe('renewed-token');
    expect(auth.renewSession).toHaveBeenCalledOnce();
  });

  it('delegates logout through its owner while exposing pending state', () => {
    configureAuth('browser', null);
    const logout = TestBed.inject(AUTH_LOGOUT_PORT);
    logout.logout();
    expect(auth.logout).toHaveBeenCalledOnce();
    auth.isLoggingOut.set(true);
    expect(logout.isLoggingOut()).toBe(true);
  });
});
