import { TestBed } from '@angular/core/testing';
import { of, throwError, type Observable } from 'rxjs';
import { EmailChangeService } from '@features/auth/data-access';
import type { ConfirmEmailChangeInput, ConfirmEmailChangeOutput } from '@features/auth/models';
import { EmailChangeConfirmStore } from '../email-change-confirm.store';

interface MockEmailChangeService {
  readonly confirm: ReturnType<
    typeof vi.fn<(input: ConfirmEmailChangeInput) => Observable<ConfirmEmailChangeOutput>>
  >;
}

const CONFIRMED: ConfirmEmailChangeOutput = {
  success: true,
  message: 'Your email address has been changed. Please sign in again with the new address.',
} as ConfirmEmailChangeOutput;

describe('EmailChangeConfirmStore', () => {
  const setup = () => {
    const mockEmailChangeService: MockEmailChangeService = {
      confirm: vi.fn(() => of(CONFIRMED)),
    };

    TestBed.configureTestingModule({
      providers: [
        EmailChangeConfirmStore,
        { provide: EmailChangeService, useValue: mockEmailChangeService },
      ],
    });

    const store = TestBed.inject(EmailChangeConfirmStore);

    return { store, mockEmailChangeService };
  };

  it('should start idle — the token is never consumed without an explicit call', () => {
    const { store, mockEmailChangeService } = setup();

    expect(store.confirmCallState().status).toBe('idle');
    expect(store.isConfirmed()).toBe(false);
    expect(mockEmailChangeService.confirm).not.toHaveBeenCalled();
  });

  it('should reach success once the token is confirmed', () => {
    const { store, mockEmailChangeService } = setup();

    store.confirm('a'.repeat(64));

    expect(mockEmailChangeService.confirm).toHaveBeenCalledWith({ token: 'a'.repeat(64) });
    expect(store.isConfirmed()).toBe(true);
    expect(store.confirmError()).toBeNull();
  });

  it('should expose the neutral error when the token is rejected', () => {
    const { store, mockEmailChangeService } = setup();
    mockEmailChangeService.confirm.mockReturnValueOnce(
      throwError(() => new Error('This confirmation link is invalid or has expired.')),
    );

    store.confirm('expired-token');

    expect(store.confirmCallState().status).toBe('error');
    expect(store.isConfirmed()).toBe(false);
    expect(store.confirmError()).not.toBeNull();
  });
});
