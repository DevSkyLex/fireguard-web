import { signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
} from '@core/request-state';
import type { CallState, StoreError } from '@core/request-state';
import type { SubmissionGate, SubmissionGateOptions } from '../models';
import { SubmissionGateService } from '../submission-gate.service';

const flushEffects = (): void => {
  TestBed.tick();
};

const failure = (message: string): CallState<unknown, StoreError> =>
  errorCallState(toStoreError(new Error(message)));

describe('SubmissionGateService', () => {
  let callState: WritableSignal<CallState<unknown, StoreError>>;
  let service: SubmissionGateService;

  const openGate = (options?: SubmissionGateOptions): SubmissionGate =>
    TestBed.runInInjectionContext(() => service.create(callState, options));

  beforeEach(() => {
    callState = signal<CallState<unknown, StoreError>>(idleCallState());
    TestBed.configureTestingModule({});
    service = TestBed.inject(SubmissionGateService);
  });

  it('should attribute nothing before a write is submitted', () => {
    const gate = openGate();

    callState.set(failure('stale'));

    expect(gate.isSubmitted()).toBe(false);
    expect(gate.isBusy()).toBe(false);
    expect(gate.error()).toBeNull();
  });

  it('should report busy only while the claimed write is in flight', () => {
    const gate = openGate();

    gate.submit();
    expect(gate.isBusy()).toBe(false);

    callState.set(pendingCallState());
    expect(gate.isBusy()).toBe(true);

    callState.set(failure('rejected'));
    expect(gate.isBusy()).toBe(false);
  });

  it('should surface the failure of a claimed write', () => {
    const gate = openGate();

    gate.submit();
    callState.set(failure('cannot remove the last owner'));

    expect(gate.error()?.message).toBe('cannot remove the last owner');
  });

  it('should drop the claim and run onSuccess once the claimed write succeeds', () => {
    const onSuccess = vi.fn();
    const gate = openGate({ onSuccess });

    gate.submit();
    callState.set(successCallState(null));
    flushEffects();

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(gate.isSubmitted()).toBe(false);
    expect(gate.error()).toBeNull();
  });

  it('should leave onSuccess alone when a sibling mutation succeeds unclaimed', () => {
    const onSuccess = vi.fn();
    const gate = openGate({ onSuccess });

    callState.set(successCallState(null));
    flushEffects();

    expect(onSuccess).not.toHaveBeenCalled();
    expect(gate.isSubmitted()).toBe(false);
  });

  it('should stop attributing a result once the claim is reset', () => {
    const gate = openGate();

    gate.submit();
    gate.reset();
    callState.set(failure('dismissed while in flight'));

    expect(gate.error()).toBeNull();
    expect(gate.isBusy()).toBe(false);
  });

  it('should keep two gates over one call state independent', () => {
    const onInviteSuccess = vi.fn();
    const onRemoveSuccess = vi.fn();
    const invite = openGate({ onSuccess: onInviteSuccess });
    const remove = openGate({ onSuccess: onRemoveSuccess });

    invite.submit();
    callState.set(failure('quota exceeded'));

    expect(invite.error()).not.toBeNull();
    expect(remove.error()).toBeNull();

    callState.set(successCallState(null));
    flushEffects();

    expect(onInviteSuccess).toHaveBeenCalledTimes(1);
    expect(onRemoveSuccess).not.toHaveBeenCalled();
  });
});
