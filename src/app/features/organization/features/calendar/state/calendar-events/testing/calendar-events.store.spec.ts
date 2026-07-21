import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { NEVER, of, throwError } from 'rxjs';
import type { ApiError } from '@core/api/models';
import { CalendarEventService } from '@features/organization/features/calendar/data-access';
import type { CalendarEventOutput } from '@features/organization/features/calendar/models';
import { CalendarEventsStore } from '../calendar-events.store';

const flushEffects = async (): Promise<void> => {
  await Promise.resolve();
};

describe('CalendarEventsStore', () => {
  let store: InstanceType<typeof CalendarEventsStore>;
  let mockCalendarEventService: { create: ReturnType<typeof vi.fn> };
  let mockDispatcher: { dispatch: ReturnType<typeof vi.fn> };

  const event = {
    id: 'event-1',
    organizationId: 'org-1',
    title: 'Fire drill',
  } as unknown as CalendarEventOutput;

  beforeEach(() => {
    mockCalendarEventService = { create: vi.fn().mockReturnValue(of(event)) };
    mockDispatcher = { dispatch: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        CalendarEventsStore,
        { provide: Dispatcher, useValue: mockDispatcher },
        { provide: CalendarEventService, useValue: mockCalendarEventService },
      ],
    });

    store = TestBed.inject(CalendarEventsStore);
  });

  it('starts idle', () => {
    expect(store.createCallState().status).toBe('idle');
    expect(store.isCreating()).toBe(false);
  });

  it('creates an event and dispatches a success toast', async () => {
    store.create({
      organizationId: 'org-1',
      input: { title: 'Fire drill', startsAt: '2026-08-01T09:00:00+02:00' },
    });
    await flushEffects();

    expect(mockCalendarEventService.create).toHaveBeenCalledWith('org-1', {
      title: 'Fire drill',
      startsAt: '2026-08-01T09:00:00+02:00',
    });
    expect(store.createCallState().status).toBe('success');
    expect(store.createCallState().data).toEqual(event);
    expect(store.isCreating()).toBe(false);
    expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: '[Calendar Events Store] createSucceeded' }),
    );
  });

  it('tracks the pending state while the request is in flight', () => {
    mockCalendarEventService.create.mockReturnValueOnce(NEVER);
    store.create({
      organizationId: 'org-1',
      input: { title: 'Fire drill', startsAt: '2026-08-01T09:00:00+02:00' },
    });

    expect(store.isCreating()).toBe(true);
  });

  it('moves to an error state and dispatches a failure toast on failure', async () => {
    const apiError: ApiError = {
      '@id': '/api/errors/1',
      '@type': 'hydra:Error',
      status: 422,
      type: 'about:blank',
      title: 'Unprocessable',
      detail: 'endsAt must be after startsAt',
      instance: null,
    };
    mockCalendarEventService.create.mockReturnValueOnce(throwError(() => apiError));

    store.create({
      organizationId: 'org-1',
      input: { title: 'Fire drill', startsAt: '2026-08-01T09:00:00+02:00' },
    });
    await flushEffects();

    expect(store.createCallState().status).toBe('error');
    expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: '[Calendar Events Store] createFailed' }),
    );
  });

  it('resets the create operation back to idle', async () => {
    store.create({
      organizationId: 'org-1',
      input: { title: 'Fire drill', startsAt: '2026-08-01T09:00:00+02:00' },
    });
    await flushEffects();
    expect(store.createCallState().status).toBe('success');

    store.resetCreateOperation();

    expect(store.createCallState().status).toBe('idle');
  });
});
