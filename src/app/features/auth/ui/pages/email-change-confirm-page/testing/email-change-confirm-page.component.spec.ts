import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError, type Observable } from 'rxjs';
import { EmailChangeService } from '@features/auth/data-access';
import type { ConfirmEmailChangeInput, ConfirmEmailChangeOutput } from '@features/auth/models';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { EmailChangeConfirmPage } from '../email-change-confirm-page.component';

interface MockEmailChangeService {
  readonly confirm: ReturnType<
    typeof vi.fn<(input: ConfirmEmailChangeInput) => Observable<ConfirmEmailChangeOutput>>
  >;
}

const CONFIRMED: ConfirmEmailChangeOutput = {
  success: true,
  message: 'Your email address has been changed. Please sign in again with the new address.',
} as ConfirmEmailChangeOutput;

describe('EmailChangeConfirmPage', () => {
  let fixture: ComponentFixture<EmailChangeConfirmPage>;
  let mockEmailChangeService: MockEmailChangeService;
  let clearSession: ReturnType<typeof vi.fn>;

  const confirmButton = (): HTMLButtonElement | null =>
    fixture.nativeElement.querySelector('[data-testid="email-change-confirm-submit"]');

  const setup = async (token: string | null): Promise<void> => {
    mockEmailChangeService = { confirm: vi.fn(() => of(CONFIRMED)) };
    clearSession = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: EmailChangeService, useValue: mockEmailChangeService },
        {
          provide: AUTH_SESSION_PORT,
          useValue: { clearSession, renewSession: vi.fn(() => of(null)) },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap(token === null ? {} : { token }) },
          },
        },
      ],
    });

    fixture = TestBed.createComponent(EmailChangeConfirmPage);
    await fixture.whenStable();
  };

  it('should never consume the token on arrival — prefetchers would burn it', async () => {
    await setup('emailed-token');

    expect(mockEmailChangeService.confirm).not.toHaveBeenCalled();
    expect(confirmButton()).not.toBeNull();
  });

  it('should confirm with the URL token on the explicit click, then purge the local session', async () => {
    await setup('emailed-token');

    confirmButton()?.click();
    await fixture.whenStable();

    expect(mockEmailChangeService.confirm).toHaveBeenCalledWith({ token: 'emailed-token' });
    expect(clearSession).toHaveBeenCalledTimes(1);

    const loginLink: HTMLAnchorElement | null = fixture.nativeElement.querySelector(
      '[data-testid="email-change-confirm-login"]',
    );
    expect(loginLink).not.toBeNull();
    expect(loginLink?.getAttribute('href')).toBe('/auth/login');
  });

  it('should surface the neutral failure inline with a way to request a new change', async () => {
    await setup('expired-token');
    mockEmailChangeService.confirm.mockReturnValueOnce(
      throwError(() => new Error('This confirmation link is invalid or has expired.')),
    );

    confirmButton()?.click();
    await fixture.whenStable();

    expect(clearSession).not.toHaveBeenCalled();

    const error: HTMLElement | null = fixture.nativeElement.querySelector(
      '[data-testid="email-change-confirm-error"]',
    );
    expect(error).not.toBeNull();

    const requestAgain: HTMLAnchorElement | null = fixture.nativeElement.querySelector(
      '[data-testid="email-change-confirm-request-again"]',
    );
    expect(requestAgain?.getAttribute('href')).toBe('/account/security');
  });

  it('should render the invalid state without calling the API when the token is missing', async () => {
    await setup(null);

    expect(confirmButton()).toBeNull();
    expect(mockEmailChangeService.confirm).not.toHaveBeenCalled();
    expect(
      fixture.nativeElement.querySelector('[data-testid="email-change-confirm-request-again"]'),
    ).not.toBeNull();
  });
});
