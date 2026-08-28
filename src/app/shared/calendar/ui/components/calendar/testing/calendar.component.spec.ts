import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { CalendarDisplayEvent } from '../../../../models/calendar-display-event.interface';
import { Calendar } from '../calendar.component';

const dragEvent = (type: string): DragEvent => {
  const raw: Event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(raw, 'dataTransfer', { value: null, configurable: true });

  return raw as unknown as DragEvent;
};

const event = (overrides: Partial<CalendarDisplayEvent> = {}): CalendarDisplayEvent => ({
  id: 'event-1',
  date: '2026-08-09T10:00:00',
  label: 'Inspection RIA',
  tone: 'secondary',
  ...overrides,
});

describe('Calendar', () => {
  let fixture: ComponentFixture<Calendar>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const dayCell = (iso: string): HTMLButtonElement | null =>
    root().querySelector<HTMLButtonElement>(`[data-day="${iso}"]`);

  const press = async (iso: string, key: string): Promise<void> => {
    dayCell(iso)?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    await fixture.whenStable();
  };

  const create = async (events: readonly CalendarDisplayEvent[] = []): Promise<void> => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(Calendar);
    fixture.componentRef.setInput('month', new Date(2026, 7, 15));
    fixture.componentRef.setInput('events', events);
    await fixture.whenStable();
  };

  it('should render every day of the anchored month', async () => {
    await create();

    expect(dayCell('2026-08-01')).not.toBeNull();
    expect(dayCell('2026-08-31')).not.toBeNull();
  });

  it('should expose the grid pattern with associated column headers', async () => {
    await create();

    expect(root().querySelector('[role="grid"]')).not.toBeNull();
    expect(dayCell('2026-08-09')?.getAttribute('role')).toBe('gridcell');

    const headers = root().querySelectorAll('th[scope="col"]');
    expect(headers).toHaveLength(7);
    expect(headers[0]?.textContent).toContain('Monday');
  });

  it('should keep a single tab stop and move it with the arrow keys', async () => {
    await create();

    const focusable = (): readonly string[] =>
      Array.from(root().querySelectorAll('[data-day][tabindex="0"]')).map(
        (cell) => cell.getAttribute('data-day') ?? '',
      );

    expect(focusable()).toEqual(['2026-08-01']);

    dayCell('2026-08-09')?.click();
    await fixture.whenStable();
    expect(focusable()).toEqual(['2026-08-09']);

    await press('2026-08-09', 'ArrowRight');
    expect(focusable()).toEqual(['2026-08-10']);

    await press('2026-08-10', 'ArrowDown');
    expect(focusable()).toEqual(['2026-08-17']);

    await press('2026-08-17', 'Home');
    expect(focusable()).toEqual(['2026-08-01']);

    await press('2026-08-01', 'End');
    expect(focusable()).toEqual(['2026-08-31']);
  });

  it('should follow the arrow keys across a month boundary', async () => {
    await create();

    dayCell('2026-08-31')?.click();
    await fixture.whenStable();

    await press('2026-08-31', 'ArrowRight');

    expect(fixture.componentInstance.month().getMonth()).toBe(8);
    expect(dayCell('2026-09-01')?.getAttribute('tabindex')).toBe('0');
  });

  it('should announce the date and the event count as one accessible name', async () => {
    await create([event(), event({ id: 'event-2', label: 'Maintenance' })]);

    const busy = dayCell('2026-08-09')?.textContent ?? '';
    expect(busy).toContain('August 9, 2026');
    expect(busy).toContain('2 events');

    expect(dayCell('2026-08-10')?.textContent).toContain('No events');
    expect(dayCell('2026-08-09')?.hasAttribute('aria-label')).toBe(false);
  });

  it('should place an event chip on its own day and collapse the overflow', async () => {
    await create([
      event(),
      event({ id: 'event-2', label: 'Maintenance' }),
      event({ id: 'event-3', label: 'Ronde' }),
    ]);

    const day = dayCell('2026-08-09');
    expect(day?.textContent).toContain('Inspection RIA');
    expect(day?.textContent).toContain('+1');
  });

  it('should mark today with a non-colour affordance', async () => {
    await create();
    fixture.componentRef.setInput('month', new Date(1999, 4, 15));
    await fixture.whenStable();

    expect(root().querySelector('[aria-current="date"]')).toBeNull();

    fixture.componentRef.setInput('month', new Date());
    await fixture.whenStable();

    expect(root().querySelectorAll('[aria-current="date"]')).toHaveLength(1);
    expect(root().querySelectorAll('[data-today="true"]')).toHaveLength(1);
  });

  it('should write the picked day into the two-way model', async () => {
    await create();

    dayCell('2026-08-09')?.click();
    await fixture.whenStable();

    expect(fixture.componentInstance.selectedDay()).toBe('2026-08-09');
    expect(dayCell('2026-08-09')?.getAttribute('aria-selected')).toBe('true');
  });

  it('should step one month at a time and come home on Today', async () => {
    await create();

    root().querySelector<HTMLButtonElement>('[data-testid="calendar-next"]')?.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.month().getMonth()).toBe(8);

    root().querySelector<HTMLButtonElement>('[data-testid="calendar-today"]')?.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.month().getMonth()).toBe(new Date().getMonth());
    expect(fixture.componentInstance.selectedDay()).not.toBeNull();
  });

  it('should hide its own Today/prev/next controls when the host supplies its own toolbar', async () => {
    await create();

    expect(root().querySelector('[data-testid="calendar-today"]')).not.toBeNull();

    fixture.componentRef.setInput('showToolbar', false);
    await fixture.whenStable();

    expect(root().querySelector('[data-testid="calendar-today"]')).toBeNull();
    expect(root().querySelector('[data-testid="calendar-prev"]')).toBeNull();
    expect(root().querySelector('[data-testid="calendar-next"]')).toBeNull();
  });

  it('should keep the month title in the DOM, visually hidden, so the grid keeps its accessible name', async () => {
    await create();

    fixture.componentRef.setInput('showToolbar', false);
    await fixture.whenStable();

    const monthTitle: HTMLElement | null = root().querySelector('[data-testid="calendar-month"]');
    const grid: HTMLElement | null = root().querySelector('[role="grid"]');

    expect(monthTitle).not.toBeNull();
    expect(monthTitle?.closest('.sr-only')).not.toBeNull();
    expect(grid?.getAttribute('aria-labelledby')).toBe(monthTitle?.parentElement?.id ?? null);
  });

  describe('quick create', () => {
    it('should offer no per-cell create button by default', async () => {
      await create();

      expect(root().querySelector('[data-testid="calendar-day-create"]')).toBeNull();
    });

    it('should emit createRequested with the cell day, under a dated accessible name', async () => {
      await create();
      fixture.componentRef.setInput('canCreate', true);
      await fixture.whenStable();

      const days: string[] = [];
      fixture.componentInstance.createRequested.subscribe((day: string) => days.push(day));

      const button: HTMLButtonElement | null =
        dayCell('2026-08-09')
          ?.closest('td')
          ?.querySelector<HTMLButtonElement>('[data-testid="calendar-day-create"]') ?? null;

      expect(button?.getAttribute('aria-label')).toContain('August 9, 2026');

      button?.click();
      expect(days).toEqual(['2026-08-09']);
    });
  });

  describe('chip drag', () => {
    it('should flag only chips marked draggable', async () => {
      await create([
        event({ id: 'movable', draggable: true }),
        event({ id: 'fixed', label: 'Maintenance' }),
      ]);

      const chips: NodeListOf<Element> = root().querySelectorAll('[data-draggable="true"]');
      expect(chips).toHaveLength(1);
      expect(chips[0]?.getAttribute('draggable')).toBe('true');
    });

    it('should emit eventDropped when a draggable chip lands on another day', async () => {
      await create([event({ id: 'movable', draggable: true })]);

      const drops: Array<{ id: string; day: string }> = [];
      fixture.componentInstance.eventDropped.subscribe((drop) => drops.push(drop));

      const chip: Element | null = root().querySelector('[data-draggable="true"]');
      chip?.dispatchEvent(dragEvent('dragstart'));
      dayCell('2026-08-12')?.dispatchEvent(dragEvent('dragover'));
      dayCell('2026-08-12')?.dispatchEvent(dragEvent('drop'));
      await fixture.whenStable();

      expect(drops).toEqual([{ id: 'movable', day: '2026-08-12' }]);
    });

    it('should emit nothing on a drop with no drag in flight', async () => {
      await create([event({ id: 'movable', draggable: true })]);

      const drops: Array<{ id: string; day: string }> = [];
      fixture.componentInstance.eventDropped.subscribe((drop) => drops.push(drop));

      dayCell('2026-08-12')?.dispatchEvent(dragEvent('drop'));
      await fixture.whenStable();

      expect(drops).toEqual([]);
    });
  });
});
