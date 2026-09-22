import { PLATFORM_ID, signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ConnectivityService } from '@core/connectivity';
import { PresenceService as PresenceApi } from '@features/organization/features/collaboration/data-access';
import { MemberPresenceService } from '../presence.service';

describe('MemberPresenceService', () => {
  let service: MemberPresenceService;
  let online: WritableSignal<boolean>;
  let api: { ping: ReturnType<typeof vi.fn>; list: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-22T10:00:00Z'));
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    online = signal(true);
    api = {
      ping: vi.fn().mockReturnValue(of({ memberId: 'self' })),
      list: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })),
    };
    TestBed.configureTestingModule({
      providers: [
        MemberPresenceService,
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: ConnectivityService, useValue: { online } },
        { provide: PresenceApi, useValue: api },
      ],
    });
    service = TestBed.inject(MemberPresenceService);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('announces once at start and merges all deduplicated member batches', async () => {
    const members = Array.from({ length: 205 }, (_, index) => `member-${index}`);
    api.list.mockImplementation(({ memberIds }: { memberIds: readonly string[] }) =>
      of({
        member: memberIds.map((memberId) => ({ memberId, online: memberId !== 'member-1' })),
        totalItems: memberIds.length,
      }),
    );
    service.track([...members, '/api/organizations/org-1/members/member-0']);
    expect(api.list).not.toHaveBeenCalled();

    service.start('org-1');
    service.start('org-1');
    await vi.advanceTimersByTimeAsync(0);

    expect(api.ping).toHaveBeenCalledExactlyOnceWith({ organization: 'org-1' });
    expect(api.list.mock.calls.map(([query]) => query.memberIds.length)).toEqual([100, 100, 5]);
    expect(service.byId().size).toBe(205);
    expect(service.isOnline('/api/organizations/org-1/members/member-0')).toBe(true);
    expect(service.isOnline('member-1')).toBe(false);
    expect(service.isOnline('unknown')).toBe(false);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(api.ping).toHaveBeenCalledTimes(2);
    expect(api.list).toHaveBeenCalledTimes(6);
  });

  it('suspends requests while hidden or offline and catches up on visibility', async () => {
    const visibility = vi.spyOn(document, 'visibilityState', 'get');
    visibility.mockReturnValue('hidden');
    service.start('org-1');
    service.track(['member-1']);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(api.ping).not.toHaveBeenCalled();
    expect(api.list).not.toHaveBeenCalled();

    document.dispatchEvent(new Event('visibilitychange'));
    visibility.mockReturnValue('visible');
    online.set(false);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(api.ping).not.toHaveBeenCalled();

    online.set(true);
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(0);
    expect(api.ping).toHaveBeenCalledExactlyOnceWith({ organization: 'org-1' });
    expect(api.list).toHaveBeenCalledExactlyOnceWith({
      organization: 'org-1',
      memberIds: ['member-1'],
    });
  });

  it('backs off pings for three minutes after a rate limit while continuing presence reads', async () => {
    api.ping.mockReturnValueOnce(
      throwError(() => ({ type: 'rate-limit', status: 429, detail: 'Wait' })),
    );
    service.start('org-1');
    service.track(['member-1']);
    await vi.advanceTimersByTimeAsync(120_000);

    expect(api.ping).toHaveBeenCalledTimes(1);
    expect(api.list).toHaveBeenCalledTimes(3);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(api.ping).toHaveBeenCalledTimes(2);
  });

  it('keeps the last known presence after a failed poll and does not back off ordinary ping failures', async () => {
    api.list.mockReturnValueOnce(
      of({ member: [{ memberId: 'member-1', online: true }], totalItems: 1 }),
    );
    api.ping.mockReturnValueOnce(throwError(() => new Error('Connection lost')));
    service.start('org-1');
    service.track(['member-1']);
    await vi.advanceTimersByTimeAsync(0);
    api.list.mockReturnValue(throwError(() => new Error('Connection lost')));

    await vi.advanceTimersByTimeAsync(60_000);

    expect(service.isOnline('member-1')).toBe(true);
    expect(api.ping).toHaveBeenCalledTimes(2);
  });

  it('replaces the requested members and clears cached presence and timers when stopped', async () => {
    api.list.mockReturnValueOnce(
      of({ member: [{ memberId: 'member-1', online: true }], totalItems: 1 }),
    );
    service.start('org-1');
    service.track(['member-1']);
    await vi.advanceTimersByTimeAsync(0);
    service.track(['member-2']);
    await vi.advanceTimersByTimeAsync(0);
    expect(service.byId().size).toBe(0);
    expect(api.list).toHaveBeenLastCalledWith({ organization: 'org-1', memberIds: ['member-2'] });

    service.stop();
    api.ping.mockClear();
    api.list.mockClear();
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(180_000);
    expect(api.ping).not.toHaveBeenCalled();
    expect(api.list).not.toHaveBeenCalled();

    service.start('org-2');
    await vi.advanceTimersByTimeAsync(0);
    expect(api.ping).toHaveBeenCalledExactlyOnceWith({ organization: 'org-2' });
  });

  it('does not request presence or register timers during SSR', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        MemberPresenceService,
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: ConnectivityService, useValue: { online } },
        { provide: PresenceApi, useValue: api },
      ],
    });
    service = TestBed.inject(MemberPresenceService);
    service.start('org-1');
    service.track(['member-1']);
    service.stop();
    await vi.advanceTimersByTimeAsync(180_000);

    expect(api.ping).not.toHaveBeenCalled();
    expect(api.list).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
