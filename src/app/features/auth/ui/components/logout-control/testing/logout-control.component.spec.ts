import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { AUTH_LOGOUT_PORT } from '@features/auth/ports';
import { LogoutControl } from '../logout-control.component';

describe('LogoutControl', () => {
  let fixture: ComponentFixture<LogoutControl>;
  let isLoggingOut: WritableSignal<boolean>;
  let logout: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    isLoggingOut = signal(false);
    logout = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: AUTH_LOGOUT_PORT, useValue: { isLoggingOut, logout } },
      ],
    });

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
});
