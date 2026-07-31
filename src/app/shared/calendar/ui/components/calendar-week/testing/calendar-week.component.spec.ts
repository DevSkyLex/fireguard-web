import { TestBed } from '@angular/core/testing';
import type { CalendarEvent, CalendarWeekDay } from '../../../../models';
import { buildWeekDays, hoursRange } from '../../../../utils';
import { CalendarWeek } from '../calendar-week.component';

const TODAY: Date = new Date(2026, 5, 15);

const TIMED_EVENT: CalendarEvent = {
  id: 'e1',
  title: 'Site visit',
  start: new Date(2026, 5, 15, 9, 0),
  end: new Date(2026, 5, 15, 10, 0),
};

const ALL_DAY_EVENT: CalendarEvent = {
  id: 'e2',
  title: 'Conference',
  start: new Date(2026, 5, 16, 0, 0),
  allDay: true,
};

function createFixture(weekDays: readonly CalendarWeekDay[]) {
  const fixture = TestBed.createComponent(CalendarWeek);
  fixture.componentRef.setInput('weekDays', weekDays);
  fixture.componentRef.setInput('hours', hoursRange(8, 18));
  fixture.detectChanges();
  return fixture;
}

describe('CalendarWeek', () => {
  it('renders 7 day columns from the weekDays input', () => {
    const weekDays: readonly CalendarWeekDay[] = buildWeekDays(TODAY, [], 1, TODAY, 8, 18);
    const fixture = createFixture(weekDays);

    const dayHeaderLabels: NodeListOf<Element> = fixture.nativeElement.querySelectorAll(
      '.tracking-wide.uppercase',
    );
    expect(dayHeaderLabels).toHaveLength(7);
  });

  it('positions a timed event using the resolved top/height/lane offsets', () => {
    const weekDays: readonly CalendarWeekDay[] = buildWeekDays(
      TODAY,
      [TIMED_EVENT],
      1,
      TODAY,
      8,
      18,
    );
    const fixture = createFixture(weekDays);

    const element: HTMLElement = fixture.nativeElement;
    const button: HTMLButtonElement | null = element.querySelector('.absolute.z-10');
    expect(button).toBeTruthy();
    expect(button?.style.top).not.toBe('');
    expect(button?.style.height).not.toBe('');
    expect(button?.style.left).toBe('0%');
    expect(button?.style.width).toBe('100%');
  });

  it('renders an all-day event in the all-day row', () => {
    const weekDays: readonly CalendarWeekDay[] = buildWeekDays(
      TODAY,
      [ALL_DAY_EVENT],
      1,
      TODAY,
      8,
      18,
    );
    const fixture = createFixture(weekDays);

    expect(fixture.nativeElement.textContent).toContain('all-day');
    const button: HTMLButtonElement | null = fixture.nativeElement.querySelector(
      'button[aria-label="Open Conference"]',
    );
    expect(button).toBeTruthy();
  });

  it('emits the clicked timed event', () => {
    const weekDays: readonly CalendarWeekDay[] = buildWeekDays(
      TODAY,
      [TIMED_EVENT],
      1,
      TODAY,
      8,
      18,
    );
    const fixture = createFixture(weekDays);
    const clicked: CalendarEvent[] = [];
    fixture.componentInstance.eventClick.subscribe((event: CalendarEvent) => clicked.push(event));

    const element: HTMLElement = fixture.nativeElement;
    element.querySelector<HTMLButtonElement>('.absolute.z-10')?.click();

    expect(clicked.map((event: CalendarEvent) => event.id)).toEqual(['e1']);
  });

  it('emits dayCreate when a day column is clicked', () => {
    const weekDays: readonly CalendarWeekDay[] = buildWeekDays(TODAY, [], 1, TODAY, 8, 18);
    const fixture = createFixture(weekDays);
    const created: Date[] = [];
    fixture.componentInstance.dayCreate.subscribe((date: Date) => created.push(date));

    fixture.nativeElement.querySelector('[aria-label^="Create on"]')?.click();

    expect(created).toHaveLength(1);
  });
});
