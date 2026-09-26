import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, Subject, throwError } from 'rxjs';
import { PresencePreferenceService } from '@features/account/data-access';
import type { PresencePreferenceOutput } from '@features/account/models/presence-preference';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { PresencePreferenceStore } from '../presence-preference.store';

describe('PresencePreferenceStore', () => {
  const revision = signal(0);
  const api = {
    getPreference: vi.fn(),
    updatePreference: vi.fn(),
    getSubscription: vi.fn(),
  };
  let store: PresencePreferenceStore;

  beforeEach(() => {
    revision.set(0);
    api.getPreference
      .mockReset()
      .mockReturnValue(of({ doNotDisturb: false, revision: 0, invisible: false }));
    api.updatePreference
      .mockReset()
      .mockReturnValue(of({ doNotDisturb: true, revision: 1, invisible: false }));
    api.getSubscription.mockReset().mockReturnValue(
      of({
        topic: '/users/user-1/presence-preference',
        token: 'token',
        expiresAt: '2026-09-26T12:00:00Z',
      }),
    );
    TestBed.configureTestingModule({
      providers: [
        { provide: AUTH_SESSION_PORT, useValue: { sessionRevision: revision } },
        { provide: PresencePreferenceService, useValue: api },
      ],
    });
    store = TestBed.inject(PresencePreferenceStore);
  });

  afterEach(() => vi.useRealTimers());

  it('makes visibility exclusive and rejects stale or malformed visibility events', () => {
    store.setContext(0, true);
    store.load();
    api.updatePreference.mockReturnValue(of({ doNotDisturb: true, invisible: true, revision: 4 }));
    store.setInvisible(true);
    expect(api.updatePreference).toHaveBeenCalledExactlyOnceWith({
      invisible: true,
      doNotDisturb: false,
    });
    expect(store.invisible()).toBe(true);
    expect(store.doNotDisturb()).toBe(false);
    store.applyRealtime(
      { type: 'presence.preference.changed', doNotDisturb: false, invisible: false, revision: 3 },
      0,
    );
    store.applyRealtime(
      { type: 'presence.preference.changed', doNotDisturb: false, invisible: 'yes', revision: 5 },
      0,
    );
    expect(store.invisible()).toBe(true);
    store.applyRealtime(
      { type: 'presence.preference.changed', doNotDisturb: true, invisible: false, revision: 5 },
      0,
    );
    expect(store.invisible()).toBe(false);
    expect(store.doNotDisturb()).toBe(true);
  });

  it('activates NPD by clearing Invisible in the same request', () => {
    api.getPreference.mockReturnValue(of({ doNotDisturb: false, invisible: true, revision: 1 }));
    api.updatePreference.mockReturnValue(of({ doNotDisturb: true, invisible: false, revision: 2 }));
    store.setContext(0, true);
    store.load();
    store.setDoNotDisturb(true);
    expect(api.updatePreference).toHaveBeenCalledExactlyOnceWith({
      doNotDisturb: true,
      invisible: false,
    });
    expect(store.doNotDisturb()).toBe(true);
    expect(store.invisible()).toBe(false);
  });

  it('restores active presence by clearing both modes atomically', () => {
    store.setContext(0, true);
    store.load();
    api.updatePreference.mockReturnValue(
      of({ doNotDisturb: false, invisible: false, revision: 2 }),
    );
    store.setActive();
    expect(api.updatePreference).toHaveBeenCalledExactlyOnceWith({
      doNotDisturb: false,
      invisible: false,
    });
  });

  it('has no implicit preference and starts no requests before the browser coordinator activates it', () => {
    store.load();
    store.subscribe();
    store.setDoNotDisturb(true);
    expect(store.preference()).toBeNull();
    expect(store.available()).toBe(false);
    expect(api.getPreference).not.toHaveBeenCalled();
    expect(api.updatePreference).not.toHaveBeenCalled();
    expect(api.getSubscription).not.toHaveBeenCalled();
  });

  it('keeps the confirmed value during save and rejects a concurrent toggle', () => {
    const save = new Subject<
      Pick<PresencePreferenceOutput, 'doNotDisturb' | 'revision' | 'invisible'>
    >();
    api.updatePreference.mockReturnValue(save);
    store.setContext(0, true);
    store.load();
    store.setDoNotDisturb(true);
    store.setDoNotDisturb(false);
    expect(store.isSaving()).toBe(true);
    expect(store.doNotDisturb()).toBe(false);
    expect(api.updatePreference).toHaveBeenCalledTimes(1);
    save.next({ doNotDisturb: true, revision: 1, invisible: false });
    save.complete();
    expect(store.isSaving()).toBe(false);
    expect(store.doNotDisturb()).toBe(true);
  });

  it('preserves the confirmed preference and emits feedback on a rejected save', () => {
    store.setContext(0, true);
    store.load();
    const dispatch = vi.spyOn(TestBed.inject(Dispatcher), 'dispatch');
    api.updatePreference.mockReturnValue(throwError(() => new Error('Cannot save.')));
    store.setDoNotDisturb(true);
    expect(store.preference()).toEqual({ doNotDisturb: false, revision: 0, invisible: false });
    expect(store.saveCallState().error?.message).toBe('Cannot save.');
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: '[Presence Preference Store] saveFailed' }),
    );
  });

  it('does not let a delayed REST read or write replace a newer Mercure revision', () => {
    store.setContext(0, true);
    store.load();
    const read = new Subject<
      Pick<PresencePreferenceOutput, 'doNotDisturb' | 'revision' | 'invisible'>
    >();
    const save = new Subject<
      Pick<PresencePreferenceOutput, 'doNotDisturb' | 'revision' | 'invisible'>
    >();
    api.getPreference.mockReturnValue(read);
    api.updatePreference.mockReturnValue(save);
    store.load();
    store.setDoNotDisturb(true);
    store.applyRealtime(
      { type: 'presence.preference.changed', doNotDisturb: false, revision: 3 },
      0,
    );
    read.next({ doNotDisturb: false, revision: 0, invisible: false });
    save.next({ doNotDisturb: true, revision: 2, invisible: false });
    expect(store.preference()).toEqual({ doNotDisturb: false, revision: 3, invisible: false });
  });

  it('ignores malformed frames and revisions from the previous account', () => {
    store.setContext(0, true);
    store.load();
    for (const frame of [
      null,
      {},
      { type: 'other', doNotDisturb: true, revision: 4 },
      { type: 'presence.preference.changed', doNotDisturb: 'yes', revision: 4 },
      { type: 'presence.preference.changed', doNotDisturb: true, revision: -1 },
    ]) {
      store.applyRealtime(frame, 0);
    }
    store.applyRealtime(
      { type: 'presence.preference.changed', doNotDisturb: true, revision: 4 },
      7,
    );
    expect(store.preference()).toEqual({ doNotDisturb: false, revision: 0, invisible: false });
  });

  it('lets an accepted old-session write finish without blocking or mutating the next session', () => {
    const oldWrite = new Subject<
      Pick<PresencePreferenceOutput, 'doNotDisturb' | 'revision' | 'invisible'>
    >();
    api.updatePreference.mockReturnValueOnce(oldWrite);
    store.setContext(0, true);
    store.load();
    store.setDoNotDisturb(true);
    revision.set(1);
    store.setContext(1, true);
    expect(store.preference()).toBeNull();
    store.load();
    store.setDoNotDisturb(true);
    expect(api.updatePreference).toHaveBeenCalledTimes(2);
    oldWrite.next({ doNotDisturb: false, revision: 99, invisible: false });
    oldWrite.complete();
    expect(store.preference()).toEqual({ doNotDisturb: true, revision: 1, invisible: false });
  });

  it('cancels reads and subscription bootstrap on pause but retains the confirmed setting', () => {
    store.setContext(0, true);
    store.load();
    const read = new Subject<
      Pick<PresencePreferenceOutput, 'doNotDisturb' | 'revision' | 'invisible'>
    >();
    const subscription = new Subject();
    api.getPreference.mockReturnValue(read);
    api.getSubscription.mockReturnValue(subscription);
    store.load();
    store.subscribe();
    store.setContext(0, false);
    expect(read.observed).toBe(false);
    expect(subscription.observed).toBe(false);
    expect(store.doNotDisturb()).toBe(false);
    expect(store.available()).toBe(false);
    expect(store.subscriptionCallState().data).toBeNull();
  });

  it('preserves a valid authorization after renewal failure and backs off rate-limited reads', () => {
    vi.useFakeTimers();
    store.setContext(0, true);
    store.subscribe();
    const authorization = store.subscriptionCallState().data;
    api.getSubscription.mockReturnValue(throwError(() => new Error('Hub unavailable.')));
    store.subscribe();
    expect(store.subscriptionCallState().data).toEqual(authorization);
    api.getPreference.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 429 })));
    store.load();
    store.load();
    expect(api.getPreference).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(60_000);
    store.load();
    expect(api.getPreference).toHaveBeenCalledTimes(2);
  });
});
