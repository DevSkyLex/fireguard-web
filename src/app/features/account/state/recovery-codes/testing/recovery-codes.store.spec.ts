import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Events } from '@ngrx/signals/events';
import { NEVER, of, Subject, throwError } from 'rxjs';
import { TotpService } from '@features/account/data-access';
import type { GenerateRecoveryCodesOutput } from '@features/account/models';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { RecoveryCodesStore } from '../recovery-codes.store';

const generated: GenerateRecoveryCodesOutput = {
  '@id': '/api/otp/totp/recovery-codes',
  '@type': 'RecoveryCodes',
  codes: ['1234-5678-9abc-def0-1234-5678-9abc-def0'],
  generatedAt: '2026-10-11T12:00:00Z',
};

describe('RecoveryCodesStore', () => {
  let service: {
    recoveryStatus: ReturnType<typeof vi.fn>;
    generateRecoveryCodes: ReturnType<typeof vi.fn>;
  };
  let store: RecoveryCodesStore;
  const revision = signal(1);
  beforeEach(() => {
    revision.set(1);
    service = {
      recoveryStatus: vi
        .fn()
        .mockReturnValue(
          of({ '@id': '', '@type': 'RecoveryStatus', remainingCount: 0, generatedAt: null }),
        ),
      generateRecoveryCodes: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        RecoveryCodesStore,
        { provide: TotpService, useValue: service },
        { provide: AUTH_SESSION_PORT, useValue: { sessionRevision: revision } },
        { provide: Events, useValue: { on: (): typeof NEVER => NEVER } },
      ],
    });
    store = TestBed.inject(RecoveryCodesStore);
  });

  it('retains an unchanged retry key and replaces edited proof', () => {
    service.generateRecoveryCodes.mockReturnValue(throwError(() => new Error('offline')));
    store.generate('123456');
    store.generate('123456');
    expect(service.generateRecoveryCodes.mock.calls[0]?.[1]).toEqual(
      service.generateRecoveryCodes.mock.calls[1]?.[1],
    );
    store.generate('654321');
    expect(service.generateRecoveryCodes.mock.calls[2]?.[1]).not.toEqual(
      service.generateRecoveryCodes.mock.calls[0]?.[1],
    );
  });

  it('shows codes only in memory and clears them when dismissed', () => {
    service.generateRecoveryCodes.mockReturnValue(of(generated));
    store.generate('123456');
    expect(store.codes()).toEqual(generated.codes);
    expect(store.generateCallState().data).toBeUndefined();
    expect(store.statusCallState().data).not.toHaveProperty('codes');
    store.clear();
    expect(store.codes()).toEqual([]);
  });

  it('ignores a late generation result after close or session replacement', () => {
    const pending = new Subject<GenerateRecoveryCodesOutput>();
    service.generateRecoveryCodes.mockReturnValue(pending);
    store.generate('123456');
    store.clear();
    revision.set(2);
    pending.next(generated);
    pending.complete();
    expect(store.codes()).toEqual([]);
    expect(store.generateCallState().status).toBe('idle');
  });

  it('clears displayed values and gives a new session a new proof intent', () => {
    service.generateRecoveryCodes.mockReturnValue(of(generated));
    store.generate('123456');
    const previous = service.generateRecoveryCodes.mock.calls[0]?.[1];
    revision.set(2);
    TestBed.tick();
    expect(store.codes()).toEqual([]);
    store.generate('123456');
    expect(service.generateRecoveryCodes.mock.calls[1]?.[1]).not.toEqual(previous);
  });
});
