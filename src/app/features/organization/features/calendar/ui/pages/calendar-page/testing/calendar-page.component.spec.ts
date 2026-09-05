import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  input as inputSignal,
  provideZonelessChangeDetection,
  signal,
  type InputSignal,
  type TemplateRef,
  type WritableSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PageActionsService } from '@core/page-actions';
import { PageTabsService } from '@core/page-tabs';
import { idleCallState, type CallState, type StoreError } from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import { CalendarService } from '@features/organization/features/calendar/data-access';
import type { CalendarFeedItemOutput } from '@features/organization/features/calendar/models';
import { CalendarFeedStore } from '@features/organization/features/calendar/state';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import { ORGANIZATION_CONTEXT_PORT, REGIONAL_FORMATTING_PORT } from '@features/organization/ports';
import { DEFAULT_REGIONAL_FORMAT_SETTINGS } from '@shared/regional-format';
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

/**
 * Stands in for the shell's `DashboardPageActions`. "Subscribe (iCal)" and
 * "New event" are registered as a `TemplateRef` on the real
 * `PageActionsService` rather than rendered in the page's own template, so a
 * spec that needs to interact with either renders the currently registered
 * template through this outlet, the same way the shell does.
 */
@Component({
  selector: 'app-page-actions-host',
  imports: [NgTemplateOutlet],
  template: '<ng-container *ngTemplateOutlet="template()" />',
})
class PageActionsHost {
  public readonly template: InputSignal<TemplateRef<unknown> | null> =
    inputSignal<TemplateRef<unknown> | null>(null);
}

const renderPageActions = (): HTMLElement => {
  const hostFixture: ComponentFixture<PageActionsHost> = TestBed.createComponent(PageActionsHost);
  hostFixture.componentRef.setInput('template', TestBed.inject(PageActionsService).actions());
  hostFixture.detectChanges();

  return hostFixture.nativeElement as HTMLElement;
};

const renderPageTabs = (): HTMLElement => {
  const hostFixture: ComponentFixture<PageActionsHost> = TestBed.createComponent(PageActionsHost);
  hostFixture.componentRef.setInput('template', TestBed.inject(PageTabsService).tabs());
  hostFixture.detectChanges();

  return hostFixture.nativeElement as HTMLElement;
};

const byPageActionsTestId = (id: string): HTMLElement | null =>
  renderPageActions().querySelector(`[data-testid="${id}"]`);

describe('CalendarPage', () => {
  let fixture: ComponentFixture<CalendarPage>;
  let items: WritableSignal<readonly CalendarFeedItemOutput[]>;
  let queryError: WritableSignal<StoreError | null>;
  let isQueryLoading: WritableSignal<boolean>;
  let load: ReturnType<typeof vi.fn>;
  let createEvent: ReturnType<typeof vi.fn>;
  let updateEvent: ReturnType<typeof vi.fn>;
  let deleteEvent: ReturnType<typeof vi.fn>;
  let moveEvent: ReturnType<typeof vi.fn>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  async function render(canWrite: boolean = false): Promise<void> {
    items = signal<readonly CalendarFeedItemOutput[]>([]);
    queryError = signal<StoreError | null>(null);
    isQueryLoading = signal<boolean>(false);
    load = vi.fn();
    createEvent = vi.fn();
    updateEvent = vi.fn();
    deleteEvent = vi.fn();
    moveEvent = vi.fn();

    const storeMock = {
      items,
      queryError,
      isQueryLoading,
      load,
      createEvent,
      updateEvent,
      deleteEvent,
      moveEvent,
      createEventCallState: signal<CallState<unknown>>(idleCallState()),
      updateEventCallState: signal<CallState<unknown>>(idleCallState()),
      deleteEventCallState: signal<CallState<unknown>>(idleCallState()),
      moveEventCallState: signal<CallState<unknown>>(idleCallState()),
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
        {
          provide: REGIONAL_FORMATTING_PORT,
          useValue: { regionalFormatting: signal(DEFAULT_REGIONAL_FORMAT_SETTINGS) },
        },
        {
          provide: CalendarService,
          useValue: {
            getFeedTokenMetadata: vi.fn(),
            createFeedToken: vi.fn(),
            revokeFeedToken: vi.fn(),
          },
        },
      ],
    });

    TestBed.overrideComponent(CalendarPage, {
      set: { providers: [{ provide: CalendarFeedStore, useValue: storeMock }] },
    });

    fixture = TestBed.createComponent(CalendarPage);
    fixture.componentRef.setInput('organizationId', 'org-1');
    await fixture.whenStable();
    (fixture.nativeElement as HTMLElement).appendChild(renderPageTabs());
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

    expect(byPageActionsTestId('calendar-new-event')).toBeNull();
    expect(byPageActionsTestId('calendar-subscribe')).not.toBeNull();
  });

  it('opens the create sheet from "New event" and sends the create write on submit', async () => {
    await render(true);

    (byPageActionsTestId('calendar-new-event') as HTMLButtonElement).click();
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
      startsAt: '2026-08-01T09:00:00+00:00',
      endsAt: null,
      allDay: false,
      facilityId: null,
    });

    expect(createEvent).toHaveBeenCalledWith({
      organizationId: 'org-1',
      input: {
        title: 'Fire drill',
        description: null,
        startsAt: '2026-08-01T09:00:00+00:00',
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

  describe('granularities', () => {
    it('switches to the week view and reloads a seven-day window', async () => {
      await render();
      load.mockClear();

      root().querySelector<HTMLButtonElement>('[data-testid="calendar-granularity-week"]')?.click();
      await fixture.whenStable();

      expect(root().querySelector('[data-testid="calendar-week"]')).not.toBeNull();
      expect(root().querySelector('[data-testid="calendar-agenda"]')).toBeNull();
      expect(load).toHaveBeenCalledTimes(1);

      const command = load.mock.calls[0]?.[0] as { from: string; to: string };
      const spanMs: number = new Date(command.to).getTime() - new Date(command.from).getTime();
      expect(Math.round(spanMs / 3_600_000)).toBe(7 * 24);
      expect(new Date(command.from).getDay()).toBe(1);
    });

    it('renders all seven day sections in the week view, empty days included', async () => {
      await render();
      items.set([feedItem({ id: 'a', startsAt: new Date().toISOString() })]);

      root().querySelector<HTMLButtonElement>('[data-testid="calendar-granularity-week"]')?.click();
      await fixture.whenStable();

      expect(root().querySelectorAll('[data-testid="calendar-week-day"]')).toHaveLength(7);
    });

    it('switches to the day view and steps one day at a time', async () => {
      await render();

      root().querySelector<HTMLButtonElement>('[data-testid="calendar-granularity-day"]')?.click();
      await fixture.whenStable();

      expect(root().querySelector('[data-testid="calendar-day-view"]')).not.toBeNull();
      load.mockClear();

      root().querySelector<HTMLButtonElement>('[data-testid="calendar-toolbar-next"]')?.click();
      await fixture.whenStable();

      expect(load).toHaveBeenCalledTimes(1);
      const command = load.mock.calls[0]?.[0] as { from: string; to: string };
      const tomorrow: Date = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(new Date(command.from).toDateString()).toBe(tomorrow.toDateString());
      expect(new Date(command.to).toDateString()).toBe(tomorrow.toDateString());
    });
  });

  describe('quick create', () => {
    it('pre-fills the create dialog with the requested day at the default time', async () => {
      await render(true);

      (
        fixture.componentInstance as unknown as { onCreateRequested(day: string): void }
      ).onCreateRequested('2026-08-12');
      await fixture.whenStable();

      expect(
        (
          fixture.componentInstance as unknown as {
            createDefaultStart: { (): string | null };
          }
        ).createDefaultStart(),
      ).toBe('2026-08-12T09:00');
    });

    it('ignores a quick create without the write permission', async () => {
      await render(false);

      (
        fixture.componentInstance as unknown as { onCreateRequested(day: string): void }
      ).onCreateRequested('2026-08-12');
      await fixture.whenStable();

      expect(document.querySelector('[data-testid="calendar-event-dialog"]')).toBeNull();
    });
  });

  describe('drag reschedule', () => {
    it('moves a dropped standalone event to the target day, keeping its wall-clock time, and announces it', async () => {
      await render(true);
      const item: CalendarFeedItemOutput = feedItem({
        sourceKey: 'calendar_event',
        id: 'evt-1',
        startsAt: '2026-08-09T09:30:00+02:00',
        endsAt: '2026-08-09T10:30:00+02:00',
        targetType: 'calendar_event',
        targetId: 'evt-1',
      });
      items.set([item]);
      await fixture.whenStable();

      (
        fixture.componentInstance as unknown as {
          onEventDropped(drop: { id: string; day: string }): void;
        }
      ).onEventDropped({ id: 'calendar_event:evt-1', day: '2026-08-05' });
      await fixture.whenStable();

      const start: Date = new Date(item.startsAt);
      const moved: Date = new Date(2026, 7, 5, start.getHours(), start.getMinutes(), 0);
      const deltaMs: number = moved.getTime() - start.getTime();

      expect(moveEvent).toHaveBeenCalledWith({
        organizationId: 'org-1',
        eventId: 'evt-1',
        startsAt: moved.toISOString().replace(/\.\d{3}Z$/, '+00:00'),
        endsAt: new Date(new Date('2026-08-09T10:30:00+02:00').getTime() + deltaMs)
          .toISOString()
          .replace(/\.\d{3}Z$/, '+00:00'),
      });

      const liveRegion: HTMLElement | null = root().querySelector(
        '[data-testid="calendar-move-live-region"]',
      );
      expect(liveRegion?.textContent).toContain('RIA inspection');
    });

    it("ignores a drop on the event's own day and a drop of a non-event entry", async () => {
      await render(true);
      items.set([
        feedItem({
          sourceKey: 'calendar_event',
          id: 'evt-1',
          startsAt: '2026-08-09T09:30:00+02:00',
        }),
        feedItem({ sourceKey: 'inspection', id: 'insp-1', startsAt: '2026-08-09T09:00:00+02:00' }),
      ]);
      await fixture.whenStable();

      const page = fixture.componentInstance as unknown as {
        onEventDropped(drop: { id: string; day: string }): void;
      };

      page.onEventDropped({ id: 'calendar_event:evt-1', day: '2026-08-09' });
      page.onEventDropped({ id: 'inspection:insp-1', day: '2026-08-05' });

      expect(moveEvent).not.toHaveBeenCalled();
    });
  });
});
