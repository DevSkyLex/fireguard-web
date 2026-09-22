import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { Subject, of, throwError } from 'rxjs';
import type { ApiError } from '@core/api/models';
import { CalendarService } from '@features/organization/features/calendar/data-access';
import type {
  CalendarEventOutput,
  CalendarFeedOutput,
} from '@features/organization/features/calendar/models';
import { CalendarFeedStore } from '../calendar-feed.store';

const flushEffects = async (): Promise<void> => {
  await Promise.resolve();
};

const apiError = (status: number, detail: string): ApiError => ({
  '@id': '',
  '@type': 'Error',
  status,
  type: 'about:blank',
  title: 'Error',
  detail,
});

describe('CalendarFeedStore', () => {
  let store: InstanceType<typeof CalendarFeedStore>;
  let dispatcher: { dispatch: ReturnType<typeof vi.fn> };
  let mockCalendarService: {
    getFeed: ReturnType<typeof vi.fn>;
    createEvent: ReturnType<typeof vi.fn>;
    updateEvent: ReturnType<typeof vi.fn>;
    deleteEvent: ReturnType<typeof vi.fn>;
  };

  const feed: CalendarFeedOutput = {
    '@id': '/api/organizations/org-1/calendar/feed',
    '@type': 'CalendarFeed',
    from: '2026-07-25T00:00:00Z',
    to: '2026-09-07T23:59:59Z',
    items: [],
  };
  const event: CalendarEventOutput = {
    '@id': '/api/organizations/org-1/calendar/events/evt-1',
    '@type': 'CalendarEvent',
    id: 'evt-1',
    organizationId: 'org-1',
    title: 'Fire drill',
    startsAt: '2026-08-01T09:00:00+02:00',
    allDay: false,
    createdByMemberId: 'member-1',
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
  };

  beforeEach(() => {
    dispatcher = { dispatch: vi.fn() };
    mockCalendarService = {
      getFeed: vi.fn().mockReturnValue(of(feed)),
      createEvent: vi.fn().mockReturnValue(of(event)),
      updateEvent: vi.fn().mockReturnValue(of(event)),
      deleteEvent: vi.fn().mockReturnValue(of(undefined)),
    };

    TestBed.configureTestingModule({
      providers: [
        CalendarFeedStore,
        { provide: CalendarService, useValue: mockCalendarService },
        { provide: Dispatcher, useValue: dispatcher },
      ],
    });

    store = TestBed.inject(CalendarFeedStore);
  });

  it('should load the feed for the given window', async () => {
    store.load({ organizationId: 'org-1', from: feed.from, to: feed.to });
    await flushEffects();

    expect(mockCalendarService.getFeed).toHaveBeenCalledWith('org-1', feed.from, feed.to);
    expect(store.queryData()).toEqual(feed);
  });

  it('keeps a partial response successful while exposing source availability and truncation', () => {
    const sources = [
      { sourceKey: 'inspection' as const, available: false, truncated: false },
      { sourceKey: 'maintenance' as const, available: true, truncated: true },
    ];
    mockCalendarService.getFeed.mockReturnValueOnce(of({ ...feed, complete: false, sources }));
    store.load({ organizationId: 'org-1', from: feed.from, to: feed.to });
    expect(store.queryError()).toBeNull();
    expect(store.isComplete()).toBe(false);
    expect(store.partialSources()).toEqual(sources);
    expect(store.hasTruncation()).toBe(true);
    store.load({ organizationId: 'org-1', from: feed.from, to: feed.to });
    expect(store.isComplete()).toBe(true);
    expect(store.partialSources()).toEqual([]);
  });

  describe('createEvent', () => {
    it('should create the event and re-read the last loaded window', async () => {
      store.load({ organizationId: 'org-1', from: feed.from, to: feed.to });
      await flushEffects();
      mockCalendarService.getFeed.mockClear();

      store.createEvent({
        organizationId: 'org-1',
        input: { title: 'Fire drill', startsAt: '2026-08-01T09:00:00+02:00' },
      });
      await flushEffects();

      expect(mockCalendarService.createEvent).toHaveBeenCalledWith('org-1', {
        title: 'Fire drill',
        startsAt: '2026-08-01T09:00:00+02:00',
      });
      expect(store.createEventCallState().status).toBe('success');
      expect(mockCalendarService.getFeed).toHaveBeenCalledWith('org-1', feed.from, feed.to);
    });

    it('should not re-read the window when nothing was ever loaded', async () => {
      store.createEvent({
        organizationId: 'org-1',
        input: { title: 'Fire drill', startsAt: '2026-08-01T09:00:00+02:00' },
      });
      await flushEffects();

      expect(mockCalendarService.getFeed).not.toHaveBeenCalled();
    });

    it('should surface a create failure without touching the loaded feed', async () => {
      mockCalendarService.createEvent.mockReturnValueOnce(
        throwError(() => apiError(422, 'A title is required.')),
      );

      store.createEvent({
        organizationId: 'org-1',
        input: { title: '', startsAt: '2026-08-01T09:00:00+02:00' },
      });
      await flushEffects();

      expect(store.createEventCallState().status).toBe('error');
      expect(store.createEventCallState().error?.code).toBe(422);
    });
  });

  describe('updateEvent', () => {
    it('should merge-patch the event and re-read the last loaded window', async () => {
      store.load({ organizationId: 'org-1', from: feed.from, to: feed.to });
      await flushEffects();
      mockCalendarService.getFeed.mockClear();

      store.updateEvent({
        organizationId: 'org-1',
        eventId: 'evt-1',
        input: { title: 'Fire drill (updated)' },
      });
      await flushEffects();

      expect(mockCalendarService.updateEvent).toHaveBeenCalledWith('org-1', 'evt-1', {
        title: 'Fire drill (updated)',
      });
      expect(store.updateEventCallState().status).toBe('success');
      expect(mockCalendarService.getFeed).toHaveBeenCalledWith('org-1', feed.from, feed.to);
    });

    it('should surface an update failure', async () => {
      mockCalendarService.updateEvent.mockReturnValueOnce(
        throwError(() => apiError(404, 'Not found')),
      );

      store.updateEvent({ organizationId: 'org-1', eventId: 'evt-1', input: { title: 'X' } });
      await flushEffects();

      expect(store.updateEventCallState().status).toBe('error');
      expect(store.updateEventCallState().error?.code).toBe(404);
    });
  });

  describe('deleteEvent', () => {
    it('should delete the event and re-read the last loaded window', async () => {
      store.load({ organizationId: 'org-1', from: feed.from, to: feed.to });
      await flushEffects();
      mockCalendarService.getFeed.mockClear();

      store.deleteEvent({ organizationId: 'org-1', eventId: 'evt-1' });
      await flushEffects();

      expect(mockCalendarService.deleteEvent).toHaveBeenCalledWith('org-1', 'evt-1');
      expect(store.deleteEventCallState().status).toBe('success');
      expect(mockCalendarService.getFeed).toHaveBeenCalledWith('org-1', feed.from, feed.to);
    });

    it('should surface a delete failure', async () => {
      mockCalendarService.deleteEvent.mockReturnValueOnce(
        throwError(() => apiError(500, 'Server error')),
      );

      store.deleteEvent({ organizationId: 'org-1', eventId: 'evt-1' });
      await flushEffects();

      expect(store.deleteEventCallState().status).toBe('error');
      expect(store.deleteEventCallState().error?.code).toBe(500);
    });
  });

  describe('moveEvent', () => {
    const movableFeed: CalendarFeedOutput = {
      ...feed,
      items: [
        {
          sourceKey: 'calendar_event',
          id: 'evt-1',
          title: 'Fire drill',
          startsAt: '2026-08-01T09:00:00+02:00',
          endsAt: '2026-08-01T10:00:00+02:00',
          allDay: false,
          targetType: 'calendar_event',
          targetId: 'evt-1',
        },
      ],
    };

    beforeEach(async () => {
      mockCalendarService.getFeed.mockReturnValue(of(movableFeed));
      store.load({ organizationId: 'org-1', from: feed.from, to: feed.to });
      await flushEffects();
      mockCalendarService.getFeed.mockClear();
    });

    it('should optimistically reposition the entry, send the merge-patch, and re-read the window on success', async () => {
      store.moveEvent({
        organizationId: 'org-1',
        eventId: 'evt-1',
        startsAt: '2026-08-03T09:00:00.000Z',
        endsAt: '2026-08-03T10:00:00.000Z',
      });
      await flushEffects();

      expect(mockCalendarService.updateEvent).toHaveBeenCalledWith('org-1', 'evt-1', {
        startsAt: '2026-08-03T09:00:00.000Z',
        endsAt: '2026-08-03T10:00:00.000Z',
      });
      expect(store.moveEventCallState().status).toBe('success');
      expect(mockCalendarService.getFeed).toHaveBeenCalledWith('org-1', feed.from, feed.to);
    });

    it('should omit endsAt from the merge-patch when the command carries none', async () => {
      store.moveEvent({
        organizationId: 'org-1',
        eventId: 'evt-1',
        startsAt: '2026-08-03T09:00:00.000Z',
      });
      await flushEffects();

      expect(mockCalendarService.updateEvent).toHaveBeenCalledWith('org-1', 'evt-1', {
        startsAt: '2026-08-03T09:00:00.000Z',
      });
    });

    it('should roll the optimistic reposition back on failure', async () => {
      const pendingUpdate = new Subject<CalendarEventOutput>();
      mockCalendarService.updateEvent.mockReturnValueOnce(pendingUpdate.asObservable());

      store.moveEvent({
        organizationId: 'org-1',
        eventId: 'evt-1',
        startsAt: '2026-08-03T09:00:00.000Z',
        endsAt: '2026-08-03T10:00:00.000Z',
      });
      await flushEffects();

      expect(store.items()[0]?.startsAt).toBe('2026-08-03T09:00:00.000Z');

      pendingUpdate.error(apiError(409, 'Conflict'));
      await flushEffects();

      expect(store.items()[0]?.startsAt).toBe('2026-08-01T09:00:00+02:00');
      expect(store.items()[0]?.endsAt).toBe('2026-08-01T10:00:00+02:00');
      expect(store.moveEventCallState().status).toBe('error');
      expect(store.moveEventCallState().error?.code).toBe(409);
      expect(mockCalendarService.getFeed).not.toHaveBeenCalled();
    });

    it('should preserve a newer period when a move in the previous period fails', () => {
      const update = new Subject<CalendarEventOutput>();
      mockCalendarService.updateEvent.mockReturnValue(update);
      store.moveEvent({
        organizationId: 'org-1',
        eventId: 'evt-1',
        startsAt: '2026-08-03T09:00:00Z',
      });
      const september: CalendarFeedOutput = {
        ...movableFeed,
        from: '2026-09-01T00:00:00Z',
        to: '2026-09-30T23:59:59Z',
        items: [
          { ...movableFeed.items[0], id: 'september-event', startsAt: '2026-09-10T09:00:00Z' },
        ],
      };
      mockCalendarService.getFeed.mockReturnValue(of(september));
      store.load({ organizationId: 'org-1', from: september.from, to: september.to });
      update.error(apiError(409, 'Conflict'));

      expect(store.queryData()).toEqual(september);
      expect(store.lastLoadCommand()?.from).toBe(september.from);
      expect(store.moveEventCallState().status).toBe('error');
    });

    it('should not overwrite pending window state with an optimistic rollback', () => {
      const update = new Subject<CalendarEventOutput>();
      const window = new Subject<CalendarFeedOutput>();
      mockCalendarService.updateEvent.mockReturnValue(update);
      store.moveEvent({
        organizationId: 'org-1',
        eventId: 'evt-1',
        startsAt: '2026-08-03T09:00:00Z',
      });
      mockCalendarService.getFeed.mockReturnValue(window);
      store.load({ organizationId: 'org-1', from: '2026-09-01', to: '2026-09-30' });
      update.error(apiError(409, 'Conflict'));

      expect(store.isQueryLoading()).toBe(true);
      window.next({ ...feed, from: '2026-09-01', to: '2026-09-30' });
      expect(store.queryData()?.from).toBe('2026-09-01');
      expect(store.items()).toEqual([]);
    });

    it('should preserve an authoritative refresh of the same period after an older move fails', () => {
      const update = new Subject<CalendarEventOutput>();
      mockCalendarService.updateEvent.mockReturnValue(update);
      store.moveEvent({
        organizationId: 'org-1',
        eventId: 'evt-1',
        startsAt: '2026-08-03T09:00:00Z',
      });
      const fresh = {
        ...movableFeed,
        items: [{ ...movableFeed.items[0], title: 'Edited elsewhere' }],
      };
      mockCalendarService.getFeed.mockReturnValue(of(fresh));
      store.load({ organizationId: 'org-1', from: feed.from, to: feed.to });
      update.error(apiError(409, 'Conflict'));

      expect(store.queryData()).toEqual(fresh);
    });

    it('should retain queued writes while preventing their old-period optimistic patches and rollbacks', () => {
      const first = new Subject<CalendarEventOutput>();
      const queued = new Subject<CalendarEventOutput>();
      mockCalendarService.updateEvent.mockReturnValueOnce(first).mockReturnValueOnce(queued);
      store.moveEvent({
        organizationId: 'org-1',
        eventId: 'evt-1',
        startsAt: '2026-08-03T09:00:00Z',
      });
      store.moveEvent({
        organizationId: 'org-1',
        eventId: 'evt-1',
        startsAt: '2026-08-04T09:00:00Z',
      });
      expect(mockCalendarService.updateEvent).toHaveBeenCalledTimes(1);
      const september = { ...movableFeed, from: '2026-09-01', to: '2026-09-30' };
      mockCalendarService.getFeed.mockReturnValue(of(september));
      store.load({ organizationId: 'org-1', from: september.from, to: september.to });
      first.error(apiError(409, 'First failed'));

      expect(mockCalendarService.updateEvent).toHaveBeenCalledTimes(2);
      expect(mockCalendarService.updateEvent).toHaveBeenLastCalledWith('org-1', 'evt-1', {
        startsAt: '2026-08-04T09:00:00Z',
      });
      expect(store.queryData()).toEqual(september);
      queued.error(apiError(409, 'Queued failed'));
      expect(store.queryData()).toEqual(september);
    });

    it('should skip departed queued moves even when returning to the same organization', () => {
      const departed = new Subject<CalendarEventOutput>();
      const current = new Subject<CalendarEventOutput>();
      mockCalendarService.updateEvent.mockReturnValueOnce(departed).mockReturnValueOnce(current);
      store.moveEvent({
        organizationId: 'org-1',
        eventId: 'evt-1',
        startsAt: '2026-08-03T09:00:00Z',
      });
      store.moveEvent({
        organizationId: 'org-1',
        eventId: 'evt-1',
        startsAt: '2026-08-04T09:00:00Z',
      });
      store.load({ organizationId: 'org-2', from: feed.from, to: feed.to });
      store.load({ organizationId: 'org-1', from: feed.from, to: feed.to });
      store.moveEvent({
        organizationId: 'org-1',
        eventId: 'evt-1',
        startsAt: '2026-08-05T09:00:00Z',
      });

      expect(departed.observed).toBe(true);
      mockCalendarService.getFeed.mockClear();
      departed.next(event);
      departed.complete();

      expect(mockCalendarService.updateEvent).toHaveBeenCalledTimes(2);
      expect(mockCalendarService.updateEvent).toHaveBeenLastCalledWith('org-1', 'evt-1', {
        startsAt: '2026-08-05T09:00:00Z',
      });
      expect(mockCalendarService.getFeed).not.toHaveBeenCalled();
      expect(dispatcher.dispatch).not.toHaveBeenCalled();
      expect(store.moveEventCallState().status).toBe('pending');
      current.next(event);
      expect(store.moveEventCallState().status).toBe('success');
    });

    it('should ignore a departed move failure while the new organization feed is loading', () => {
      const departed = new Subject<CalendarEventOutput>();
      mockCalendarService.updateEvent.mockReturnValueOnce(departed);
      store.moveEvent({
        organizationId: 'org-1',
        eventId: 'evt-1',
        startsAt: '2026-08-03T09:00:00Z',
      });
      mockCalendarService.getFeed.mockReturnValue(new Subject<CalendarFeedOutput>());
      store.load({ organizationId: 'org-2', from: feed.from, to: feed.to });
      departed.error(apiError(409, 'Old organization failure'));

      expect(store.queryData()).toBeNull();
      expect(store.isQueryLoading()).toBe(true);
      expect(store.moveEventCallState().status).toBe('idle');
      expect(dispatcher.dispatch).not.toHaveBeenCalled();
    });
  });

  describe('resetWriteCallStates', () => {
    it('should idle every write call state', async () => {
      store.createEvent({
        organizationId: 'org-1',
        input: { title: 'Fire drill', startsAt: '2026-08-01T09:00:00+02:00' },
      });
      await flushEffects();
      expect(store.createEventCallState().status).toBe('success');

      store.resetWriteCallStates();

      expect(store.createEventCallState().status).toBe('idle');
      expect(store.updateEventCallState().status).toBe('idle');
      expect(store.deleteEventCallState().status).toBe('idle');
      expect(store.moveEventCallState().status).toBe('idle');
    });
  });
});
