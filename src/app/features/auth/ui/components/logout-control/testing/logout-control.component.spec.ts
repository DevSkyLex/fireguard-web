import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import { Subject } from 'rxjs';
import type { MockInstance } from 'vitest';
import { AUTH_LOGOUT_PORT } from '@features/auth/ports';
import { LogoutControl } from '../logout-control.component';

describe('LogoutControl', () => {
  let fixture: ComponentFixture<LogoutControl>;
  let isLoggingOut: WritableSignal<boolean>;
  let logout: ReturnType<typeof vi.fn>;
  let sessionEnded: Subject<void>;
  let navigate: MockInstance;

  beforeEach(async () => {
    isLoggingOut = signal(false);
    logout = vi.fn();
    sessionEnded = new Subject<void>();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AUTH_LOGOUT_PORT, useValue: { isLoggingOut, logout } },
        { provide: Events, useValue: { on: vi.fn().mockReturnValue(sessionEnded) } },
      ],
    });

    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(LogoutControl);
    await fixture.whenStable();
  });

  it('should trigger the logout port when clicked', async () => {
    const button = fixture.nativeElement.querySelector(
      '[data-testid="logout-control"]',
    ) as HTMLButtonElement;

    button.click();
    await fixture.whenStable();

    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('should disable the control while the logout is in flight', async () => {
    isLoggingOut.set(true);
    await fixture.whenStable();

    const button = fixture.nativeElement.querySelector(
      '[data-testid="logout-control"]',
    ) as HTMLButtonElement;

    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
  });

  it('should leave for the sign-in screen once the session has ended', () => {
    sessionEnded.next();

    expect(navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('should not navigate while the session is still alive', () => {
    expect(navigate).not.toHaveBeenCalled();
  });
});
