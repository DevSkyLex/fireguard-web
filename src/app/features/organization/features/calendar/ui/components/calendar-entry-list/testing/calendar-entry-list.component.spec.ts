import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { CalendarFeedItemOutput } from '@features/organization/features/calendar/models';
import { CalendarEntryList } from '../calendar-entry-list.component';

function item(overrides: Partial<CalendarFeedItemOutput> = {}): CalendarFeedItemOutput {
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

describe('CalendarEntryList', () => {
  let fixture: ComponentFixture<CalendarEntryList>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  async function render(items: readonly CalendarFeedItemOutput[]): Promise<void> {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });

    fixture = TestBed.createComponent(CalendarEntryList);
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('organizationId', 'org-1');
    await fixture.whenStable();
  }

  it('renders one row per entry with its title and source badge', async () => {
    await render([
      item({ id: 'a', title: 'RIA inspection', sourceKey: 'inspection' }),
      item({ id: 'b', title: 'Fire drill', sourceKey: 'calendar_event' }),
    ]);

    const rows: NodeListOf<Element> = root().querySelectorAll('[data-testid="calendar-day-item"]');

    expect(rows).toHaveLength(2);
    expect(rows[0]?.textContent).toContain('RIA inspection');
    expect(rows[0]?.textContent).toContain('Inspection');
    expect(rows[1]?.textContent).toContain('Fire drill');
    expect(rows[1]?.textContent).toContain('Event');
  });

  it('shows the localized all-day label instead of a time for an all-day entry', async () => {
    await render([item({ allDay: true })]);

    expect(root().querySelector('[data-testid="calendar-day-item"]')?.textContent).toContain(
      'All day',
    );
  });

  it('links an intervention entry to its workspace, under the given organization', async () => {
    await render([
      item({ sourceKey: 'intervention', targetType: 'intervention', targetId: 'itv-42' }),
    ]);

    const row: HTMLAnchorElement | null = root().querySelector('[data-testid="calendar-day-item"]');

    expect(row?.tagName).toBe('A');
    expect(row?.getAttribute('href')).toBe('/organizations/org-1/interventions/itv-42');
  });

  it('renders a non-intervention entry as a plain row, not a link', async () => {
    await render([item({ sourceKey: 'maintenance', targetType: 'maintenance' })]);

    const row: Element | null = root().querySelector('[data-testid="calendar-day-item"]');

    expect(row?.tagName).toBe('DIV');
  });

  it('renders nothing when there are no entries', async () => {
    await render([]);

    expect(root().querySelectorAll('[data-testid="calendar-day-item"]')).toHaveLength(0);
  });
});
