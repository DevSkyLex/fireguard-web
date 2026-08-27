import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { idleCallState, type CallState, type StoreError } from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import type { CalendarFeedItemOutput } from '@features/organization/features/calendar/models';
import { CalendarFeedStore } from '@features/organization/features/calendar/state';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import { ORGANIZATION_CONTEXT_PORT } from '@features/organization/ports';
import { CalendarPage } from '../calendar-page.component';

function feedItem(overrides: Partial<CalendarFeedItemOutput> = {}): CalendarFeedItemOutput {
  return {
    sourceKey: 'inspection',
    id: 'item-1',
    title: 'RIA inspection',
    startsAt: '2026-08-09T09:00:00+02:00',
    allDay: false,
    targetType: 'inspection',
    targetId: 'insp-1',
    ...overrides,
  };
}

describe('CalendarPage', () => {
  let fixture: ComponentFixture<CalendarPage>;
  let items: WritableSignal<readonly CalendarFeedItemOutput[]>;
  let queryError: WritableSignal<StoreError | null>;
  let isQueryLoading: WritableSignal<boolean>;
  let load: ReturnType<typeof vi.fn>;
  let createEvent: ReturnType<typeof vi.fn>;
  let updateEvent: ReturnType<typeof vi.fn>;
  let deleteEvent: ReturnType<typeof vi.fn>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  async function render(canWrite: boolean = false): Promise<void> {
    items = signal<readonly CalendarFeedItemOutput[]>([]);
    queryError = signal<StoreError | null>(null);
    isQueryLoading = signal<boolean>(false);
    load = vi.fn();
    createEvent = vi.fn();
    updateEvent = vi.fn();
    deleteEvent = vi.fn();

    const storeMock = {
      items,
      queryError,
      isQueryLoading,
      load,
      createEvent,
      updateEvent,
      deleteEvent,
      createEventCallState: signal<CallState<unknown>>(idleCallState()),
      updateEventCallState: signal<CallState<unknown>>(idleCallState()),
      deleteEventCallState: signal<CallState<unknown>>(idleCallState()),
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: OrganizationPermissionService, useValue: { hasPermission: () => canWrite } },
        { provide: FacilityService, useValue: { list: () => of({ member: [], totalItems: 0 }) } },
        {
          provide: ORGANIZATION_CONTEXT_PORT,
          useValue: { selectedOrganization: signal(null) },
        },
      ],
    });

    TestBed.overrideComponent(CalendarPage, {
      set: { providers: [{ provide: CalendarFeedStore, useValue: storeMock }] },
    });

    fixture = TestBed.createComponent(CalendarPage);
    fixture.componentRef.setInput('organizationId', 'org-1');
    await fixture.whenStable();
  }

  it('loads the current month window on arrival', async () => {
    await render();

    expect(load).toHaveBeenCalledTimes(1);
    const command = load.mock.calls[0]?.[0] as { organizationId: string; from: string; to: string };
    expect(command.organizationId).toBe('org-1');

    const now: Date = new Date();
    const expectedFrom: Date = new Date(now.getFullYear(), now.getMonth(), 1 - 7);
    expect(new Date(command.from).toDateString()).toBe(expectedFrom.toDateString());
  });

  it('steps the window back and forward a month through the toolbar, reloading each time', async () => {
    await render();
    load.mockClear();

    root().querySelector<HTMLButtonElement>('[data-testid="calendar-toolbar-next"]')?.click();
    await fixture.whenStable();

    expect(load).toHaveBeenCalledTimes(1);
    const nextCommand = load.mock.calls[0]?.[0] as { from: string };
    load.mockClear();

    root().querySelector<HTMLButtonElement>('[data-testid="calendar-toolbar-prev"]')?.click();
    await fixture.whenStable();

    expect(load).toHaveBeenCalledTimes(1);
    const backCommand = load.mock.calls[0]?.[0] as { from: string };

    expect(new Date(backCommand.from).getMonth()).not.toBe(new Date(nextCommand.from).getMonth());
  });

  it('returns to the current month and reloads when Today is pressed', async () => {
    await render();

    root().querySelector<HTMLButtonElement>('[data-testid="calendar-toolbar-next"]')?.click();
    await fixture.whenStable();
    load.mockClear();

    root().querySelector<HTMLButtonElement>('[data-testid="calendar-toolbar-today"]')?.click();
    await fixture.whenStable();

    expect(load).toHaveBeenCalledTimes(1);
    const command = load.mock.calls[0]?.[0] as { from: string };
    const now: Date = new Date();
    const expectedFrom: Date = new Date(now.getFullYear(), now.getMonth(), 1 - 7);
    expect(new Date(command.from).toDateString()).toBe(expectedFrom.toDateString());
  });

  it('shows the current period label in the toolbar', async () => {
    await render();

    const period: HTMLElement | null = root().querySelector(
      '[data-testid="calendar-toolbar-period"]',
    );
    const now: Date = new Date();
    const expectedLabel: string = new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric',
    }).format(now);

    expect(period?.textContent?.trim().toLowerCase()).toBe(expectedLabel.toLowerCase());
  });

  it('renders the error state and retries through the store on a failed load', async () => {
    await render();
    load.mockClear();
    queryError.set({
      error: null,
      message: null,
      code: 500,
      retryable: true,
      timestamp: Date.now(),
    });
    await fixture.whenStable();

    expect(root().querySelector('[data-testid="calendar-retry"]')).not.toBeNull();

    root().querySelector<HTMLButtonElement>('[data-testid="calendar-retry"]')?.click();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('groups the loaded window into agenda day sections for the mobile region', async () => {
    await render();
    items.set([
      feedItem({ id: 'a', startsAt: '2026-08-09T09:00:00+02:00' }),
      feedItem({ id: 'b', startsAt: '2026-08-09T14:00:00+02:00' }),
      feedItem({ id: 'c', startsAt: '2026-08-10T08:00:00+02:00', sourceKey: 'maintenance' }),
    ]);
    await fixture.whenStable();

    const agenda: HTMLElement | null = root().querySelector('[data-testid="calendar-agenda"]');
    const groups: NodeListOf<Element> | undefined = agenda?.querySelectorAll(
      '[data-testid="calendar-agenda-group"]',
    );

    expect(groups).toHaveLength(2);
    expect(agenda?.querySelectorAll('[data-testid="calendar-day-item"]')).toHaveLength(3);
  });

  it('shows the empty agenda message once loaded with nothing scheduled', async () => {
    await render();

    const agenda: HTMLElement | null = root().querySelector('[data-testid="calendar-agenda"]');
    expect(agenda?.textContent).toContain('Nothing scheduled in this period.');
  });

  it('hides "New event" when the member lacks organization.events.write', async () => {
    await render(false);

    expect(root().querySelector('[data-testid="calendar-new-event"]')).toBeNull();
  });

  it('opens the create dialog from "New event" and sends the create write on submit', async () => {
    await render(true);

    root().querySelector<HTMLButtonElement>('[data-testid="calendar-new-event"]')?.click();
    await fixture.whenStable();

    expect(document.querySelector('[data-testid="calendar-event-dialog"]')?.textContent).toContain(
      'New event',
    );

    (
      fixture.componentInstance as unknown as {
        onEventFormSubmitted(values: {
          title: string;
          description: string | null;
          startsAt: string;
          endsAt: string | null;
          allDay: boolean;
          facilityId: string | null;
        }): void;
      }
    ).onEventFormSubmitted({
      title: 'Fire drill',
      description: null,
      startsAt: '2026-08-01T09:00:00.000Z',
      endsAt: null,
      allDay: false,
      facilityId: null,
    });

    expect(createEvent).toHaveBeenCalledWith({
      organizationId: 'org-1',
      input: {
        title: 'Fire drill',
        description: null,
        startsAt: '2026-08-01T09:00:00.000Z',
        endsAt: null,
        allDay: false,
        facilityId: null,
      },
    });
  });

  it('sends only the changed fields as a merge-patch on an edit', async () => {
    await render(true);

    const original: CalendarFeedItemOutput = feedItem({
      sourceKey: 'calendar_event',
      id: 'evt-1',
      title: 'Fire drill',
      startsAt: '2026-08-01T09:00:00+02:00',
      allDay: false,
    });

    (
      fixture.componentInstance as unknown as {
        openEditDialog(item: CalendarFeedItemOutput): void;
      }
    ).openEditDialog(original);
    await fixture.whenStable();

    (
      fixture.componentInstance as unknown as {
        onEventFormSubmitted(values: {
          title: string;
          description: string | null;
          startsAt: string;
          endsAt: string | null;
          allDay: boolean;
          facilityId: string | null;
        }): void;
      }
    ).onEventFormSubmitted({
      title: 'Fire drill (updated)',
      description: null,
      startsAt: '2026-08-01T09:00:00+02:00',
      endsAt: null,
      allDay: false,
      facilityId: null,
    });

    expect(updateEvent).toHaveBeenCalledWith({
      organizationId: 'org-1',
      eventId: 'evt-1',
      input: { title: 'Fire drill (updated)' },
    });
  });

  it('sends the delete write for the confirmed target', async () => {
    await render(true);

    const target: CalendarFeedItemOutput = feedItem({ sourceKey: 'calendar_event', id: 'evt-1' });

    (
      fixture.componentInstance as unknown as {
        requestDelete(item: CalendarFeedItemOutput): void;
      }
    ).requestDelete(target);
    (fixture.componentInstance as unknown as { confirmDelete(): void }).confirmDelete();

    expect(deleteEvent).toHaveBeenCalledWith({ organizationId: 'org-1', eventId: 'evt-1' });
  });
});
