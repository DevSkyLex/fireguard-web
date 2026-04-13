import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, throwError } from 'rxjs';
import type { HydraCollection } from '@core/models/api';
import { SessionService } from '@features/auth/data-access';
import type { SessionOutput } from '@features/auth/models';
import { SessionStore } from './session.store';

const flushEffects = async (): Promise<void> => {
  await Promise.resolve();
};

describe('SessionStore', () => {
  let store: SessionStore;
  let mockDispatcher: { dispatch: ReturnType<typeof vi.fn> };
  let mockSessionService: {
    list: ReturnType<typeof vi.fn>;
    revoke: ReturnType<typeof vi.fn>;
    revokeAll: ReturnType<typeof vi.fn>;
  };

  const currentSession: SessionOutput = {
    '@id': '/api/sessions/current',
    '@type': 'Session',
    id: 'current',
    userId: 'user-1',
    ipAddress: '127.0.0.1',
    userAgent: 'Browser',
    createdAt: '2026-01-01T00:00:00Z',
    lastActivityAt: '2026-01-01T00:00:00Z',
    isActive: true,
    isCurrent: true,
  };
  const otherSession: SessionOutput = {
    ...currentSession,
    '@id': '/api/sessions/other',
    id: 'other',
    isCurrent: false,
  };
  const sessionsCollection: HydraCollection<SessionOutput> = {
    '@id': '/api/sessions',
    '@type': 'Collection',
    totalItems: 2,
    member: [currentSession, otherSession],
  };

  beforeEach(() => {
    mockDispatcher = { dispatch: vi.fn() };
    mockSessionService = {
      list: vi.fn(),
      revoke: vi.fn(),
      revokeAll: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        SessionStore,
        { provide: Dispatcher, useValue: mockDispatcher },
        { provide: SessionService, useValue: mockSessionService },
      ],
    });

    store = TestBed.inject(SessionStore);
  });

  it('should load sessions and compute current/other sessions', async () => {
    mockSessionService.list.mockReturnValue(of(sessionsCollection));

    store.loadSessions();
    await flushEffects();

    expect(store.listCallState().status).toBe('success');
    expect(store.sessions()).toEqual([currentSession, otherSession]);
    expect(store.totalSessions()).toBe(2);
    expect(store.currentSession()?.id).toBe('current');
    expect(store.otherSessions()).toEqual([otherSession]);
    expect(store.hasOtherSessions()).toBe(true);
  });

  it('should dispatch an event when loading sessions fails', async () => {
    mockSessionService.list.mockReturnValue(throwError(() => new Error('Failed')));

    store.loadSessions();
    await flushEffects();

    expect(store.listCallState().status).toBe('error');
    expect(mockDispatcher.dispatch).toHaveBeenCalledTimes(1);
  });

  it('should revoke one session and update counters', async () => {
    mockSessionService.list.mockReturnValue(of(sessionsCollection));
    mockSessionService.revoke.mockReturnValue(of(undefined));

    store.loadSessions();
    await flushEffects();
    store.revoke('other');
    await flushEffects();

    expect(mockSessionService.revoke).toHaveBeenCalledWith('other');
    expect(store.revokeCallState().status).toBe('success');
    expect(store.sessions()).toEqual([currentSession]);
    expect(store.totalSessions()).toBe(1);
  });

  it('should revoke all sessions except current one', async () => {
    mockSessionService.list.mockReturnValue(of(sessionsCollection));
    mockSessionService.revokeAll.mockReturnValue(of(undefined));

    store.loadSessions();
    await flushEffects();
    store.revokeAll();
    await flushEffects();

    expect(mockSessionService.revokeAll).toHaveBeenCalledTimes(1);
    expect(store.revokeAllCallState().status).toBe('success');
    expect(store.sessions()).toEqual([currentSession]);
    expect(store.totalSessions()).toBe(1);
  });

  it('should clear store state', async () => {
    mockSessionService.list.mockReturnValue(of(sessionsCollection));
    store.loadSessions();
    await flushEffects();

    store.clear();

    expect(store.sessions()).toEqual([]);
    expect(store.totalSessions()).toBe(0);
    expect(store.listCallState().status).toBe('idle');
    expect(store.revokeCallState().status).toBe('idle');
    expect(store.revokeAllCallState().status).toBe('idle');
  });
});
