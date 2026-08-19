import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
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
    mockCalendarService = {
      getFeed: vi.fn().mockReturnValue(of(feed)),
      createEvent: vi.fn().mockReturnValue(of(event)),
      updateEvent: vi.fn().mockReturnValue(of(event)),
      deleteEvent: vi.fn().mockReturnValue(of(undefined)),
    };

    TestBed.configureTestingModule({
      providers: [CalendarFeedStore, { provide: CalendarService, useValue: mockCalendarService }],
    });

    store = TestBed.inject(CalendarFeedStore);
  });

  it('should load the feed for the given window', async () => {
    store.load({ organizationId: 'org-1', from: feed.from, to: feed.to });
    await flushEffects();

    expect(mockCalendarService.getFeed).toHaveBeenCalledWith('org-1', feed.from, feed.to);
    expect(store.queryData()).toEqual(feed);
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
    });
  });
});
