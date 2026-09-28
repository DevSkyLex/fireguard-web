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

  it('never shows Edit/Delete on a non-event source, even when canWrite is set', async () => {
    await render([item({ sourceKey: 'maintenance' })]);
    fixture.componentRef.setInput('canWrite', true);
    await fixture.whenStable();

    expect(root().querySelector('[data-testid="calendar-day-item-edit"]')).toBeNull();
    expect(root().querySelector('[data-testid="calendar-day-item-delete"]')).toBeNull();
  });

  it('hides Edit/Delete on an event source when canWrite is false', async () => {
    await render([item({ sourceKey: 'calendar_event' })]);

    expect(root().querySelector('[data-testid="calendar-day-item-edit"]')).toBeNull();
  });

  it('shows and wires Edit/Delete on an event source when canWrite is set', async () => {
    const target: CalendarFeedItemOutput = item({ sourceKey: 'calendar_event', id: 'evt-1' });
    await render([target]);
    fixture.componentRef.setInput('canWrite', true);
    await fixture.whenStable();

    const editRequested: CalendarFeedItemOutput[] = [];
    const deleteRequested: CalendarFeedItemOutput[] = [];
    fixture.componentInstance.editRequested.subscribe((entry) => editRequested.push(entry));
    fixture.componentInstance.deleteRequested.subscribe((entry) => deleteRequested.push(entry));

    root().querySelector<HTMLButtonElement>('[data-testid="calendar-day-item-edit"]')?.click();
    root().querySelector<HTMLButtonElement>('[data-testid="calendar-day-item-delete"]')?.click();

    expect(editRequested).toEqual([target]);
    expect(deleteRequested).toEqual([target]);
  });

  it('renders a time range when the entry carries an end time', async () => {
    await render([item({ startsAt: '2026-08-09T09:00:00Z', endsAt: '2026-08-09T17:00:00Z' })]);

    expect(root().querySelector('[data-testid="calendar-day-item"]')?.textContent).toMatch(
      /9:00.*5:00/,
    );
  });

  it("reads 'Until {date}' on a continuation day of a multi-day entry, not the start time", async () => {
    await render([
      item({
        startsAt: '2026-08-09T09:00:00Z',
        endsAt: '2026-08-11T17:00:00Z',
      }),
    ]);
    fixture.componentRef.setInput('day', '2026-08-10');
    await fixture.whenStable();

    const text: string | null | undefined = root().querySelector(
      '[data-testid="calendar-day-item"]',
    )?.textContent;
    expect(text).toContain('Until');
    expect(text).not.toMatch(/9:00/);
  });

  it('does not throw when the organization timezone is not one Intl accepts', async () => {
    await render([item({ startsAt: '2026-08-09T09:00:00Z', endsAt: '2026-08-09T17:00:00Z' })]);
    fixture.componentRef.setInput('regionalFormatting', {
      dateFormat: 'yyyy-MM-dd',
      timezone: 'Not/AZone',
    });

    await fixture.whenStable();
    expect(root().querySelector('[data-testid="calendar-day-item"]')?.textContent).toBeTruthy();
  });

  it('shows the entry description, when set', async () => {
    await render([item({ description: 'Checked the pressure gauge.' })]);

    expect(root().querySelector('[data-testid="calendar-day-item"]')?.textContent).toContain(
      'Checked the pressure gauge.',
    );
  });

  it('renders no description line when the entry carries none', async () => {
    await render([item({ description: undefined })]);

    expect(
      root().querySelectorAll('[data-testid="calendar-day-item"] [hlmItemDescription]'),
    ).toHaveLength(1);
  });

  it('resolves the facility name through facilityLabelOf, when the entry carries a facility id', async () => {
    await render([item({ facilityId: 'facility-1' })]);
    fixture.componentRef.setInput('facilityLabelOf', (facilityId: string) =>
      facilityId === 'facility-1' ? 'Building A' : null,
    );
    await fixture.whenStable();

    expect(root().querySelector('[data-testid="calendar-day-item"]')?.textContent).toContain(
      'Building A',
    );
  });

  it('links an inspection entry to its detail page, under the given organization', async () => {
    await render([
      item({ sourceKey: 'inspection', targetType: 'inspection', targetId: 'insp-42' }),
    ]);

    const row: HTMLAnchorElement | null = root().querySelector('[data-testid="calendar-day-item"]');

    expect(row?.tagName).toBe('A');
    expect(row?.getAttribute('href')).toBe('/organizations/org-1/inspections/insp-42');
  });

  it('renders each source badge with an aria-hidden leading glyph', async () => {
    await render([item({ sourceKey: 'maintenance' })]);

    const icon: Element | null = root().querySelector('[data-testid="calendar-day-item"] ng-icon');

    expect(icon?.getAttribute('aria-hidden')).toBe('true');
  });
});
