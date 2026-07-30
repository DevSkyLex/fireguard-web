import { Component, viewChild, type TemplateRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { CalendarAgendaDay, CalendarEvent, CalendarEventContext } from '../../../models';
import { CalendarAgenda } from '../calendar-agenda.component';

@Component({
  template: `<ng-template #tpl let-event>{{ event.title }} (tpl)</ng-template>`,
})
class TemplateHost {
  public readonly tpl = viewChild.required<TemplateRef<CalendarEventContext>>('tpl');
}

const timedEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: 'evt-1',
  title: 'Quarterly audit',
  start: new Date(2026, 5, 15, 9, 0),
  end: new Date(2026, 5, 15, 10, 0),
  tone: 'info',
  ...overrides,
});

describe('CalendarAgenda', () => {
  let templateRef: TemplateRef<CalendarEventContext>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TemplateHost] });
    const hostFixture = TestBed.createComponent(TemplateHost);
    hostFixture.detectChanges();
    templateRef = hostFixture.componentInstance.tpl();
  });

  const createFixture = (agendaDays: readonly CalendarAgendaDay[], today?: Date) => {
    const fixture = TestBed.createComponent(CalendarAgenda);
    fixture.componentRef.setInput('agendaDays', agendaDays);
    fixture.componentRef.setInput('eventTemplate', templateRef);
    if (today) fixture.componentRef.setInput('today', today);
    fixture.detectChanges();
    return fixture;
  };

  it('should render nothing when there are no agenda days', () => {
    const fixture = createFixture([]);

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('section').length).toBe(0);
  });

  it('should render a day header and its events via the projected template', () => {
    const day: CalendarAgendaDay = { date: new Date(2026, 5, 15), events: [timedEvent()] };
    const fixture = createFixture([day]);

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('section').length).toBe(1);
    expect(host.textContent).toContain('Quarterly audit (tpl)');
  });

  it('should show the "Today" relative cue for the current day', () => {
    const today = new Date(2026, 5, 15);
    const day: CalendarAgendaDay = { date: today, events: [timedEvent()] };
    const fixture = createFixture([day], today);

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Today');
  });

  it('should show the "Tomorrow" relative cue for the next day', () => {
    const today = new Date(2026, 5, 15);
    const day: CalendarAgendaDay = { date: new Date(2026, 5, 16), events: [timedEvent()] };
    const fixture = createFixture([day], today);

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Tomorrow');
  });

  it('should show no relative cue for a day beyond tomorrow', () => {
    const today = new Date(2026, 5, 15);
    const day: CalendarAgendaDay = { date: new Date(2026, 5, 20), events: [timedEvent()] };
    const fixture = createFixture([day], today);

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.textContent).not.toContain('Today');
    expect(host.textContent).not.toContain('Tomorrow');
  });

  it('should render the "all-day" marker for an all-day event', () => {
    const day: CalendarAgendaDay = {
      date: new Date(2026, 5, 15),
      events: [timedEvent({ allDay: true })],
    };
    const fixture = createFixture([day]);

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('all-day');
  });

  it('should render the start and end time for a timed event', () => {
    const day: CalendarAgendaDay = {
      date: new Date(2026, 5, 15),
      events: [
        timedEvent({ start: new Date(2026, 5, 15, 9, 0), end: new Date(2026, 5, 15, 10, 30) }),
      ],
    };
    const fixture = createFixture([day]);

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('09:00');
    expect(host.textContent).toContain('10:30');
  });

  it('should not render an end time when the event has no end or ends before it starts', () => {
    const day: CalendarAgendaDay = {
      date: new Date(2026, 5, 15),
      events: [timedEvent({ start: new Date(2026, 5, 15, 9, 0), end: undefined })],
    };
    const fixture = createFixture([day]);

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('09:00');
  });

  it('should not render an end time when the event spans into the next day', () => {
    const day: CalendarAgendaDay = {
      date: new Date(2026, 5, 15),
      events: [
        timedEvent({ start: new Date(2026, 5, 15, 22, 0), end: new Date(2026, 5, 16, 2, 0) }),
      ],
    };
    const fixture = createFixture([day]);

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('22:00');
    expect(host.textContent).not.toContain('02:00');
  });

  it('should emit eventClick when an event row is clicked', () => {
    const event = timedEvent();
    const day: CalendarAgendaDay = { date: new Date(2026, 5, 15), events: [event] };
    const fixture = createFixture([day]);
    const spy = vi.fn();
    fixture.componentInstance.eventClick.subscribe(spy);

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    host.querySelector<HTMLElement>(`button[aria-label="Open ${event.title}"]`)?.click();

    expect(spy).toHaveBeenCalledWith(event);
  });

  it('should emit dayCreate when the day "Add" action is clicked', () => {
    const day: CalendarAgendaDay = { date: new Date(2026, 5, 15), events: [] };
    const fixture = createFixture([day]);
    const spy = vi.fn();
    fixture.componentInstance.dayCreate.subscribe(spy);

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    const addButton = Array.from(host.querySelectorAll<HTMLElement>('p-button')).find((el) =>
      el.textContent?.includes('Add'),
    );
    addButton?.querySelector('button')?.click();

    expect(spy).toHaveBeenCalledWith(day.date);
  });

  it('should render multiple day sections in order', () => {
    const days: CalendarAgendaDay[] = [
      { date: new Date(2026, 5, 15), events: [timedEvent({ id: 'a' })] },
      { date: new Date(2026, 5, 16), events: [timedEvent({ id: 'b', title: 'Second event' })] },
    ];
    const fixture = createFixture(days);

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('section').length).toBe(2);
    expect(host.textContent).toContain('Second event');
  });
});
