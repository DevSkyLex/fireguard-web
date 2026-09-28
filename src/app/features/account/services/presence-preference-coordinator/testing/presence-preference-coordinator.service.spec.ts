import { ChangeDetectionStrategy, Component, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError, Observable } from 'rxjs';
import { ConnectivityService } from '@core/connectivity';
import { MercureService } from '@core/mercure';
import { PresencePreferenceService } from '@features/account/data-access';
import { USER_IDENTITY_PORT } from '@features/account/ports';
import { PresencePreferenceStore } from '@features/account/state/presence-preference';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { PresencePreferenceCoordinatorService } from '../presence-preference-coordinator.service';

@Component({ template: '', changeDetection: ChangeDetectionStrategy.OnPush })
class PresenceTestHost {}

describe('PresencePreferenceCoordinatorService', () => {
  const sessionRevision = signal(0);
  const online = signal(true);
  const authenticated = signal(true);
  const connection = signal(false);
  const profile = signal<object | null>({ id: 'user-1' });
  const api = { getPreference: vi.fn(), getSubscription: vi.fn(), updatePreference: vi.fn() };
  let store: PresencePreferenceStore;
  let frames: Subject<unknown>;
  let connect: ReturnType<typeof vi.fn>;
  let disconnect: ReturnType<typeof vi.fn<() => void>>;
  let visibility: ReturnType<typeof vi.spyOn>;

  function setup(platform = 'browser'): void {
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: platform },
        {
          provide: AUTH_SESSION_PORT,
          useValue: { sessionRevision, isAuthenticated: authenticated },
        },
        { provide: USER_IDENTITY_PORT, useValue: { profile } },
        { provide: ConnectivityService, useValue: { online } },
        { provide: PresencePreferenceService, useValue: api },
        {
          provide: MercureService,
          useValue: { subscribe: connect, isConnected: () => connection() },
        },
      ],
    });
    TestBed.inject(PresencePreferenceCoordinatorService);
    store = TestBed.inject(PresencePreferenceStore);
    TestBed.createComponent(PresenceTestHost);
    TestBed.tick();
    TestBed.tick();
  }

  beforeEach(() => {
    vi.useFakeTimers();
    sessionRevision.set(0);
    online.set(true);
    authenticated.set(true);
    connection.set(false);
    profile.set({ id: 'user-1' });
    visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    frames = new Subject();
    disconnect = vi.fn();
    connect = vi.fn(
      () =>
        new Observable<unknown>((subscriber) => {
          const stream = frames.subscribe(subscriber);
          return () => {
            disconnect();
            stream.unsubscribe();
          };
        }),
    );
    api.getPreference.mockReset().mockReturnValue(of({ doNotDisturb: false, revision: 0 }));
    api.getSubscription.mockReset().mockImplementation(() =>
      of({
        topic: '/users/user-1/presence-preference',
        token: 'token-' + api.getSubscription.mock.calls.length,
        expiresAt: new Date(Date.now() + 120_000).toISOString(),
      }),
    );
    api.updatePreference.mockReset();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('loads only after hydration then polls every 45 seconds and resumes after offline', () => {
    setup();
    expect(api.getPreference).toHaveBeenCalledTimes(1);
    expect(connect).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(45_000);
    expect(api.getPreference).toHaveBeenCalledTimes(2);
    online.set(false);
    TestBed.tick();
    expect(disconnect).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(90_000);
    expect(api.getPreference).toHaveBeenCalledTimes(2);
    online.set(true);
    TestBed.tick();
    expect(api.getPreference).toHaveBeenCalledTimes(3);
    expect(connect).toHaveBeenCalledTimes(2);
  });

  it('renews expiring credentials and keeps an existing socket after renewal failure', () => {
    setup();
    api.getSubscription.mockReturnValueOnce(throwError(() => new Error('Unavailable')));
    vi.advanceTimersByTime(90_000);
    TestBed.tick();
    expect(store.subscriptionCallState().status).toBe('error');
    expect(disconnect).not.toHaveBeenCalled();
    expect(connect).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(45_000);
    TestBed.tick();
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(connect).toHaveBeenCalledTimes(2);
  });

  it('applies private realtime and refreshes after Mercure reconnects', () => {
    setup();
    frames.next({ type: 'presence.preference.changed', doNotDisturb: true, revision: 2 });
    expect(store.doNotDisturb()).toBe(true);
    connection.set(true);
    TestBed.tick();
    expect(api.getPreference).toHaveBeenCalledTimes(2);
    expect(store.doNotDisturb()).toBe(true);
    connection.set(false);
    TestBed.tick();
    connection.set(true);
    TestBed.tick();
    expect(api.getPreference).toHaveBeenCalledTimes(3);
  });

  it('suspends a hidden document and resynchronizes immediately on return', () => {
    setup();
    visibility.mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    TestBed.tick();
    expect(store.available()).toBe(false);
    expect(disconnect).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(45_000);
    expect(api.getPreference).toHaveBeenCalledTimes(1);
    visibility.mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    TestBed.tick();
    expect(api.getPreference).toHaveBeenCalledTimes(2);
    expect(connect).toHaveBeenCalledTimes(2);
  });

  it('clears session-private state and all background work when authentication ends', () => {
    setup();
    frames.next({ type: 'presence.preference.changed', doNotDisturb: true, revision: 2 });
    sessionRevision.set(1);
    authenticated.set(false);
    profile.set(null);
    TestBed.tick();
    expect(store.preference()).toBeNull();
    expect(store.subscriptionCallState().data).toBeNull();
    expect(disconnect).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(120_000);
    expect(api.getPreference).toHaveBeenCalledTimes(1);
  });

  it('never starts account presence exchanges during server rendering', () => {
    setup('server');
    expect(api.getPreference).not.toHaveBeenCalled();
    expect(api.getSubscription).not.toHaveBeenCalled();
    expect(connect).not.toHaveBeenCalled();
  });
});
