import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { MockInstance } from 'vitest';
import { AuthStore, RegisterStore } from '@features/auth/state';
import { RegisterVerifyPage } from '../register-verify-page.component';

describe('RegisterVerifyPage', () => {
  let fixture: ComponentFixture<RegisterVerifyPage>;
  let isAuthenticated: WritableSignal<boolean>;
  let mockRegisterStore: {
    verify: ReturnType<typeof vi.fn>;
    resend: ReturnType<typeof vi.fn>;
    isVerifying: WritableSignal<boolean>;
    isResending: WritableSignal<boolean>;
    verifyError: WritableSignal<null>;
    resendError: WritableSignal<null>;
    resendAvailableIn: WritableSignal<number>;
  };
  let navigate: MockInstance;

  beforeEach(async () => {
    isAuthenticated = signal(false);

    mockRegisterStore = {
      verify: vi.fn(),
      resend: vi.fn(),
      isVerifying: signal(false),
      isResending: signal(false),
      verifyError: signal(null),
      resendError: signal(null),
      resendAvailableIn: signal(0),
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: RegisterStore, useValue: mockRegisterStore },
        { provide: AuthStore, useValue: { isAuthenticated } },
      ],
    });

    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(RegisterVerifyPage);
    await fixture.whenStable();
  });

  it('should send only the code, leaving the token with the store', () => {
    fixture.componentInstance['verify']({ code: '123456', trustDevice: false });

    expect(mockRegisterStore.verify).toHaveBeenCalledWith({ code: '123456' });
  });

  it('should forward a resend request', () => {
    fixture.componentInstance['resend']();

    expect(mockRegisterStore.resend).toHaveBeenCalledTimes(1);
  });

  it('should stay put until the verification establishes a session', () => {
    expect(navigate).not.toHaveBeenCalled();
  });

  it('should route to onboarding once the auto-login has taken effect', async () => {
    isAuthenticated.set(true);
    await fixture.whenStable();

    // Registration never creates an organization — onboarding owns that, which
    // is why the destination is not the workspace.
    expect(navigate).toHaveBeenCalledWith(['/onboarding']);
  });

  it('should offer the resend control, since an emailed code can be sent again', () => {
    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button');

    expect(buttons.length).toBe(2);
  });
});
