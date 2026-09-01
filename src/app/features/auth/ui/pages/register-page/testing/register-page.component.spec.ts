import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { MockInstance } from 'vitest';
import { RegisterStore } from '@features/auth/state';
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

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: RegisterStore, useValue: mockRegisterStore },
      ],
    });

    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(RegisterPage);
    await fixture.whenStable();
  });

  it('should stay put while no challenge exists', () => {
    expect(navigate).not.toHaveBeenCalled();
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
