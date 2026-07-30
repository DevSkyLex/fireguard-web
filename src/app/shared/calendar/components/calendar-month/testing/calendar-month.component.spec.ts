import { TestBed } from '@angular/core/testing';
import type { CalendarDay, CalendarEvent } from '../../../models';
import { buildMonthDays, weekdayLabels } from '../../../utils';
import { CalendarMonth } from '../calendar-month.component';

const EVENT: CalendarEvent = {
  id: 'e1',
  title: 'Quarterly audit',
  start: new Date(2026, 5, 15, 9, 0),
  tone: 'info',
};

const TODAY: Date = new Date(2026, 5, 1);

function createFixture(days: readonly CalendarDay[], maxEventsPerDay?: number) {
  const fixture = TestBed.createComponent(CalendarMonth);
  fixture.componentRef.setInput('days', days);
  fixture.componentRef.setInput('weekdayLabels', weekdayLabels(1));
  if (maxEventsPerDay !== undefined) {
    fixture.componentRef.setInput('maxEventsPerDay', maxEventsPerDay);
  }
  fixture.detectChanges();
  return fixture;
}

describe('CalendarMonth', () => {
  it('renders a 42-cell grid from the days input', () => {
    const days: readonly CalendarDay[] = buildMonthDays(TODAY, [], 1, TODAY);
    const fixture = createFixture(days);

    const cells: NodeListOf<Element> = fixture.nativeElement.querySelectorAll('.min-h-20');
    expect(cells).toHaveLength(42);
  });

  it('dims out-of-month cells and keeps in-month cells legible', () => {
    const days: readonly CalendarDay[] = buildMonthDays(TODAY, [], 1, TODAY);
    const fixture = createFixture(days);

    const outOfMonthIndex: number = days.findIndex((day: CalendarDay): boolean => !day.inMonth);
    const inMonthIndex: number = days.findIndex(
      (day: CalendarDay): boolean => day.inMonth && !day.isToday,
    );
    expect(outOfMonthIndex).toBeGreaterThanOrEqual(0);
    expect(inMonthIndex).toBeGreaterThanOrEqual(0);

    const element: HTMLElement = fixture.nativeElement;
    const cells: HTMLElement[] = Array.from(element.querySelectorAll<HTMLElement>('.min-h-20'));
    const outOfMonthNumber: HTMLElement | null =
      cells[outOfMonthIndex].querySelector('.rounded-full.text-xs');
    const inMonthNumber: HTMLElement | null =
      cells[inMonthIndex].querySelector('.rounded-full.text-xs');
    expect(outOfMonthNumber?.className).toContain('text-surface-400');
    expect(inMonthNumber?.className).toContain('text-surface-700');
  });

  it('emits the clicked event', () => {
    const days: readonly CalendarDay[] = buildMonthDays(TODAY, [EVENT], 1, TODAY);
    const fixture = createFixture(days);
    const clicked: CalendarEvent[] = [];
    fixture.componentInstance.eventClick.subscribe((event: CalendarEvent) => clicked.push(event));

    const button: HTMLButtonElement | null = fixture.nativeElement.querySelector(
      'button[aria-label="Open Quarterly audit"]',
    );
    button?.click();

    expect(clicked.map((event: CalendarEvent) => event.id)).toEqual(['e1']);
  });

  it('emits dayCreate from the "+" affordance on a cell', () => {
    const days: readonly CalendarDay[] = buildMonthDays(TODAY, [], 1, TODAY);
    const fixture = createFixture(days);
    const created: Date[] = [];
    fixture.componentInstance.dayCreate.subscribe((date: Date) => created.push(date));

    const element: HTMLElement = fixture.nativeElement;
    element.querySelector('.pi-plus')?.closest('button')?.click();

    expect(created).toHaveLength(1);
  });

  it('emits daySelect from the "+N more" affordance beyond maxEventsPerDay', () => {
    const manyEvents: CalendarEvent[] = Array.from(
      { length: 4 },
      (_, index: number): CalendarEvent => ({
        id: `e${index}`,
        title: `Event ${index}`,
        start: new Date(2026, 5, 15, 9 + index, 0),
      }),
    );
    const days: readonly CalendarDay[] = buildMonthDays(TODAY, manyEvents, 1, TODAY);
    const fixture = createFixture(days, 2);
    const selected: Date[] = [];
    fixture.componentInstance.daySelect.subscribe((date: Date) => selected.push(date));

    const element: HTMLElement = fixture.nativeElement;
    const moreButton: HTMLButtonElement | undefined = Array.from(
      element.querySelectorAll<HTMLButtonElement>('button'),
    ).find((button: HTMLButtonElement): boolean => button.textContent?.includes('more') ?? false);
    expect(moreButton).toBeTruthy();
    moreButton?.click();

    expect(selected).toHaveLength(1);
  });
});
