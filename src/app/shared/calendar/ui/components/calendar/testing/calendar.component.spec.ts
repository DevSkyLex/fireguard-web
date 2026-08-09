import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { CalendarDisplayEvent } from '../../../../models/calendar-display-event.interface';
import { Calendar } from '../calendar.component';

const event = (overrides: Partial<CalendarDisplayEvent> = {}): CalendarDisplayEvent => ({
  id: 'event-1',
  date: '2026-08-09T10:00:00Z',
  label: 'Inspection RIA',
  tone: 'secondary',
  ...overrides,
});

describe('Calendar', () => {
  let fixture: ComponentFixture<Calendar>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const create = async (events: readonly CalendarDisplayEvent[] = []): Promise<void> => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(Calendar);
    fixture.componentRef.setInput('month', new Date(2026, 7, 15));
    fixture.componentRef.setInput('events', events);
    await fixture.whenStable();
  };

  it('should render every day of the anchored month', async () => {
    await create();

    expect(root().querySelector('[data-day="2026-08-01"]')).not.toBeNull();
    expect(root().querySelector('[data-day="2026-08-31"]')).not.toBeNull();
  });

  it('should place an event chip on its own day and collapse the overflow', async () => {
    await create([
      event(),
      event({ id: 'event-2', label: 'Maintenance' }),
      event({ id: 'event-3', label: 'Ronde' }),
    ]);

    const day = root().querySelector('[data-day="2026-08-09"]');
    expect(day?.textContent).toContain('Inspection RIA');
    expect(day?.textContent).toContain('+1');
  });

  it('should write the picked day into the two-way model', async () => {
    await create();

    root().querySelector<HTMLButtonElement>('[data-day="2026-08-09"]')?.click();
    await fixture.whenStable();

    expect(fixture.componentInstance.selectedDay()).toBe('2026-08-09');
    expect(root().querySelector('[data-day="2026-08-09"]')?.getAttribute('aria-pressed')).toBe(
      'true',
    );
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
});
