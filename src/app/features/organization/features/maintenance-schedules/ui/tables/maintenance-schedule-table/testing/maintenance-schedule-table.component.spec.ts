import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { MaintenanceScheduleOutput } from '@features/organization/features/maintenance-schedules/models';
import { MaintenanceScheduleTable } from '../maintenance-schedule-table.component';

const schedule = (overrides: Partial<MaintenanceScheduleOutput> = {}): MaintenanceScheduleOutput =>
  ({
    '@id': '/api/maintenance/schedules/schedule-1',
    '@type': 'MaintenanceSchedule',
    id: 'schedule-1',
    organization: '/api/organizations/org-1',
    equipment: '/api/equipment/equipment-1',
    equipmentType: 'fire_extinguisher',
    dueStatus: 'due_soon',
    nextDueAt: '2026-06-01T00:00:00+00:00',
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-01-01T00:00:00+00:00',
    ...overrides,
  }) as MaintenanceScheduleOutput;

describe('MaintenanceScheduleTable', () => {
  let fixture: ComponentFixture<MaintenanceScheduleTable>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const render = async (
    items: readonly MaintenanceScheduleOutput[],
    overrides: Partial<{
      loading: boolean;
      canManage: boolean;
      facilityLabelOf: (facilityId: string) => string | null;
    }> = {},
  ): Promise<void> => {
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('loading', overrides.loading ?? false);
    fixture.componentRef.setInput('canManage', overrides.canManage ?? false);
    fixture.componentRef.setInput('equipmentRouteBase', ['/organizations', 'org-1', 'equipments']);
    fixture.componentRef.setInput('facilityRouteBase', ['/organizations', 'org-1', 'facilities']);
    if (overrides.facilityLabelOf) {
      fixture.componentRef.setInput('facilityLabelOf', overrides.facilityLabelOf);
    }
    await fixture.whenStable();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });

    fixture = TestBed.createComponent(MaintenanceScheduleTable);
  });

  it('should render one row per schedule, humanizing the raw equipment type', async () => {
    await render([schedule(), schedule({ id: 'schedule-2', equipmentType: 'smoke_detector' })]);

    const rows: NodeListOf<HTMLElement> = root().querySelectorAll(
      '[data-testid="maintenance-schedule-table-row"]',
    );

    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Fire extinguisher');
    expect(rows[1].textContent).toContain('Smoke detector');
  });

  it('should link the equipment cell to the equipment record by id extracted from the IRI', async () => {
    await render([schedule()]);

    const link: HTMLAnchorElement | null = root().querySelector(
      '[data-testid="maintenance-schedule-table-row"] a',
    );

    expect(link?.getAttribute('href')).toBe('/organizations/org-1/equipments/equipment-1');
  });

  it('should render "Never inspected" for overdue with no nextDueAt, not a blank cell', async () => {
    await render([schedule({ dueStatus: 'overdue', nextDueAt: undefined })]);

    expect(root().textContent).toContain('Never inspected');
  });

  it('should render an em dash, not "Never inspected", for unscheduled with no nextDueAt', async () => {
    await render([schedule({ dueStatus: 'unscheduled', nextDueAt: undefined })]);

    expect(root().textContent).not.toContain('Never inspected');
  });

  it('should render the formatted date when nextDueAt is present', async () => {
    await render([schedule({ nextDueAt: '2026-06-15T00:00:00+00:00' })]);

    expect(root().textContent).toContain('Jun 15, 2026');
  });

  it('should render the override duration label when set, or a dash when following the default', async () => {
    await render([
      schedule({ id: 'schedule-1', intervalOverride: 'P6M' }),
      schedule({ id: 'schedule-2', intervalOverride: undefined }),
    ]);

    const rows: NodeListOf<HTMLElement> = root().querySelectorAll(
      '[data-testid="maintenance-schedule-table-row"]',
    );

    expect(rows[0].textContent).toContain('Every 6 months');
    expect(rows[1].textContent).toContain('—');
  });

  it('should render no unassigned marker link when a schedule carries a facility', async () => {
    await render([schedule({ facility: '/api/facilities/facility-1' })]);

    const links: NodeListOf<HTMLAnchorElement> = root().querySelectorAll(
      '[data-testid="maintenance-schedule-table-row"] a',
    );

    expect(
      Array.from(links).some((link) => link.getAttribute('href')?.includes('facility-1')),
    ).toBe(true);
  });

  it('should render the resolved facility name when facilityLabelOf resolves it', async () => {
    await render([schedule({ facility: '/api/facilities/facility-1' })], {
      facilityLabelOf: (facilityId) => (facilityId === 'facility-1' ? 'Building A' : null),
    });

    expect(root().textContent).toContain('Building A');
    expect(root().textContent).not.toContain('View facility');
  });

  it('should fall back to the generic "View facility" label when facilityLabelOf cannot resolve it', async () => {
    await render([schedule({ facility: '/api/facilities/facility-1' })]);

    expect(root().textContent).toContain('View facility');
  });

  it('should disambiguate the equipment link accessible name by facility when two rows share a type', async () => {
    await render(
      [
        schedule({ id: 'schedule-1', facility: '/api/facilities/facility-1' }),
        schedule({ id: 'schedule-2', facility: '/api/facilities/facility-2' }),
      ],
      {
        facilityLabelOf: (facilityId) =>
          facilityId === 'facility-1'
            ? 'Building A'
            : facilityId === 'facility-2'
              ? 'Building B'
              : null,
      },
    );

    const rows: NodeListOf<HTMLElement> = root().querySelectorAll(
      '[data-testid="maintenance-schedule-table-row"]',
    );
    const equipmentLinks: HTMLAnchorElement[] = Array.from(rows).map(
      (row) => row.querySelector('a') as HTMLAnchorElement,
    );

    expect(equipmentLinks[0].getAttribute('aria-label')).toBe('Fire extinguisher at Building A');
    expect(equipmentLinks[1].getAttribute('aria-label')).toBe('Fire extinguisher at Building B');
  });

  it('should carry no equipment-link aria-label when the facility does not resolve', async () => {
    await render([schedule()]);

    const link: HTMLAnchorElement | null = root().querySelector(
      '[data-testid="maintenance-schedule-table-row"] a',
    );

    expect(link?.hasAttribute('aria-label')).toBe(false);
  });

  it('should hide the actions column entirely when the operator cannot manage overrides', async () => {
    await render([schedule()], { canManage: false });

    expect(root().querySelector('[data-testid="maintenance-schedule-table-override"]')).toBeNull();
  });

  it('should emit overrideRequested with the row schedule when the Edit action is activated', async () => {
    const target = schedule();
    await render([target], { canManage: true });

    const emitted: MaintenanceScheduleOutput[] = [];
    fixture.componentInstance.overrideRequested.subscribe((value) => emitted.push(value));

    (
      root().querySelector(
        '[data-testid="maintenance-schedule-table-override"]',
      ) as HTMLButtonElement
    ).click();

    expect(emitted).toEqual([target]);
  });
});
