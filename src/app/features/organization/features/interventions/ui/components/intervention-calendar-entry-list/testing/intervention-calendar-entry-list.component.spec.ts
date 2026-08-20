import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { InterventionOutput } from '@features/organization/features/interventions/models';
import { InterventionCalendarEntryList } from '../intervention-calendar-entry-list.component';

const intervention = (overrides: Partial<InterventionOutput> = {}): InterventionOutput =>
  ({
    id: 'itv-1',
    organization: '/api/organizations/1',
    number: 101,
    type: 'site_setup',
    name: 'Check the riser',
    description: null,
    status: 'planned',
    allowedTransitions: [],
    site: null,
    responsible: null,
    participants: [],
    labels: [],
    priority: 'normal',
    plannedStartAt: '2026-08-10T09:00:00+00:00',
    dueAt: null,
    reviewNote: null,
    revision: 1,
    facilitiesCount: 0,
    equipmentCount: 0,
    inspectionsCount: 0,
    blockersCount: 0,
    workItemsCount: 0,
    completedWorkItemsCount: 0,
    proposedChangesCount: 0,
    commentsCount: 0,
    hasSignature: false,
    createdAt: '2026-08-01T00:00:00+00:00',
    updatedAt: '2026-08-01T00:00:00+00:00',
    ...overrides,
  }) as InterventionOutput;

describe('InterventionCalendarEntryList', () => {
  let fixture: ComponentFixture<InterventionCalendarEntryList>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  async function render(items: readonly InterventionOutput[]): Promise<void> {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });

    fixture = TestBed.createComponent(InterventionCalendarEntryList);
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('organizationId', 'org-1');
    await fixture.whenStable();
  }

  it('renders one row per intervention with its FG-number, name and status tag', async () => {
    await render([
      intervention({ id: 'a', number: 101, name: 'Check the riser', status: 'planned' }),
      intervention({ id: 'b', number: 202, name: 'Replace extinguisher', status: 'draft' }),
    ]);

    const rows: NodeListOf<Element> = root().querySelectorAll(
      '[data-testid="intervention-calendar-entry"]',
    );

    expect(rows).toHaveLength(2);
    expect(rows[0]?.textContent).toContain('FG-101');
    expect(rows[0]?.textContent).toContain('Check the riser');
    expect(rows[0]?.textContent).toContain('Planned');
    expect(rows[1]?.textContent).toContain('FG-202');
    expect(rows[1]?.textContent).toContain('Draft');
  });

  it('links each row to the intervention workspace, under the given organization', async () => {
    await render([intervention({ id: 'itv-42' })]);

    const row: HTMLAnchorElement | null = root().querySelector(
      '[data-testid="intervention-calendar-entry"]',
    );

    expect(row?.tagName).toBe('A');
    expect(row?.getAttribute('href')).toBe('/organizations/org-1/interventions/itv-42');
  });

  it('renders nothing when there are no entries', async () => {
    await render([]);

    expect(root().querySelectorAll('[data-testid="intervention-calendar-entry"]')).toHaveLength(0);
  });
});
