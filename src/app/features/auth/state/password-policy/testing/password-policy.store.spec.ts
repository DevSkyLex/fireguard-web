import { PLATFORM_ID, TransferState } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { PasswordPolicyService } from '@features/auth/data-access';
import { DEFAULT_PASSWORD_POLICY } from '@features/auth/state/password-policy/testing/password-policy.fixture';
import { PasswordPolicyStore } from '../password-policy.store';

describe('PasswordPolicyStore', () => {
  it('fails closed while unavailable and retries the same public query', () => {
    const service = { policy: vi.fn().mockReturnValue(throwError(() => new Error('offline'))) };
    TestBed.configureTestingModule({
      providers: [PasswordPolicyStore, { provide: PasswordPolicyService, useValue: service }],
    });
    const store = TestBed.inject(PasswordPolicyStore);
    expect(store.policy()).toBeNull();
    expect(store.policyCallState().status).toBe('error');
    service.policy.mockReturnValue(of(DEFAULT_PASSWORD_POLICY));
    store.load();
    expect(store.policy()).toEqual(DEFAULT_PASSWORD_POLICY);
    expect(service.policy).toHaveBeenCalledTimes(2);
  });

  it('consumes the public SSR handoff once without refetching during hydration', () => {
    const serverService = { policy: vi.fn().mockReturnValue(of(DEFAULT_PASSWORD_POLICY)) };
    TestBed.configureTestingModule({
      providers: [
        PasswordPolicyStore,
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: PasswordPolicyService, useValue: serverService },
      ],
    });
    const serverStore = TestBed.inject(PasswordPolicyStore);
    expect(serverStore.policy()).toEqual(DEFAULT_PASSWORD_POLICY);
    const transfer = TestBed.inject(TransferState).toJson();
    expect(transfer).toContain('auth-password-policy');
    expect(transfer).not.toContain('access_token');
    TestBed.resetTestingModule();
    const browserTransfer = new TransferState();
    const state = JSON.parse(transfer) as Record<string, unknown>;
    for (const key of Object.keys(state))
      browserTransfer.set(key as import('@angular/core').StateKey<unknown>, state[key]);
    const browserService = { policy: vi.fn().mockReturnValue(of(DEFAULT_PASSWORD_POLICY)) };
    TestBed.configureTestingModule({
      providers: [
        PasswordPolicyStore,
        { provide: TransferState, useValue: browserTransfer },
        { provide: PasswordPolicyService, useValue: browserService },
      ],
    });
    expect(TestBed.inject(PasswordPolicyStore).policy()).toEqual(DEFAULT_PASSWORD_POLICY);
    expect(browserService.policy).not.toHaveBeenCalled();
    expect(browserTransfer.isEmpty).toBe(true);
  });
});
