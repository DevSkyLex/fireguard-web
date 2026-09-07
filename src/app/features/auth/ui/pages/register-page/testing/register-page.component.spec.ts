import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { MockInstance } from 'vitest';
import { idleCallState, type CallState } from '@core/request-state';
import type { FederatedProviderOutput } from '@features/auth/models';
import { FederatedAuthStore, RegisterStore } from '@features/auth/state';
import { RegisterPage } from '../register-page.component';

describe('RegisterPage', () => {
  let fixture: ComponentFixture<RegisterPage>;
  let hasChallenge: WritableSignal<boolean>;
  let mockRegisterStore: {
    register: ReturnType<typeof vi.fn>;
    isRegistering: WritableSignal<boolean>;
    registerError: WritableSignal<null>;
    hasChallenge: WritableSignal<boolean>;
    challengeToken: WritableSignal<string | null>;
  };
  let mockFederatedStore: {
    loadProviders: ReturnType<typeof vi.fn>;
    startLogin: ReturnType<typeof vi.fn>;
    resetStart: ReturnType<typeof vi.fn>;
    enabledProviders: WritableSignal<readonly ('google' | 'microsoft')[]>;
    providersLoading: WritableSignal<boolean>;
    providersCallState: WritableSignal<CallState<readonly FederatedProviderOutput[]>>;
    startPending: WritableSignal<boolean>;
    pendingProvider: WritableSignal<'google' | 'microsoft' | null>;
    startUrl: WritableSignal<string | null>;
    startCallState: WritableSignal<{ status: 'idle'; data: null; error: null }>;
  };
  let navigate: MockInstance;

  beforeEach(async () => {
    hasChallenge = signal(false);

    mockRegisterStore = {
      register: vi.fn(),
      isRegistering: signal(false),
      registerError: signal(null),
      hasChallenge,
      challengeToken: signal<string | null>(null),
    };
    mockFederatedStore = {
      loadProviders: vi.fn(),
      startLogin: vi.fn(),
      resetStart: vi.fn(),
      enabledProviders: signal([]),
      providersLoading: signal(false),
      providersCallState: signal<CallState<readonly FederatedProviderOutput[]>>(idleCallState()),
      startPending: signal(false),
      pendingProvider: signal(null),
      startUrl: signal(null),
      startCallState: signal({ status: 'idle', data: null, error: null }),
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: RegisterStore, useValue: mockRegisterStore },
        { provide: FederatedAuthStore, useValue: mockFederatedStore },
      ],
    });

    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(RegisterPage);
    await fixture.whenStable();
  });

  it('should stay put while no challenge exists', () => {
    expect(mockFederatedStore.loadProviders).toHaveBeenCalledOnce();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('should render enabled providers and start account creation through the login flow', async () => {
    mockFederatedStore.enabledProviders.set(['google', 'microsoft']);
    await fixture.whenStable();

    const googleButton = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('[data-testid="auth-provider-google"]')
      ?.closest('button');

    expect(googleButton).toBeTruthy();
    googleButton?.click();
    expect(mockFederatedStore.startLogin).toHaveBeenCalledWith({
      provider: 'google',
      returnUrl: '/',
    });
  });

  it('should drop the confirmation before calling the API', () => {
    fixture.componentInstance['register']({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      password: 'Str0ng!Passw0rd',
      confirmPassword: 'Str0ng!Passw0rd',
    });

    // `confirmPassword` exists only in the form: the API contract never
    // carries it, so mapping is the page's job.
    expect(mockRegisterStore.register).toHaveBeenCalledWith({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      password: 'Str0ng!Passw0rd',
    });
  });

  it('should hand over to verification with the challenge token once a challenge exists', async () => {
    mockRegisterStore.challengeToken.set('challenge-token');
    hasChallenge.set(true);
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith(['/auth/register/verify'], {
      queryParams: { token: 'challenge-token' },
    });
  });
});
