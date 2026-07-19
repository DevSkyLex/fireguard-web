import { signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { THEME_PORT } from '@core/theme';
import type { EquipmentStatusBucket } from '@features/organization/data-access/adapters/organization-dashboard-equipment-status.adapter';
import { DashboardStore } from '@features/organization/state/organization-dashboard';
import { EquipmentStatusBreakdown } from '../equipment-status-breakdown.component';

const legendRows = (fixture: ComponentFixture<EquipmentStatusBreakdown>): HTMLElement[] =>
  Array.from(fixture.nativeElement.querySelectorAll('li'));

describe('EquipmentStatusBreakdown', () => {
  const createComponent = (buckets: readonly EquipmentStatusBucket[]) => {
    const bucketsSignal: WritableSignal<readonly EquipmentStatusBucket[]> = signal(buckets);

    TestBed.configureTestingModule({
      imports: [EquipmentStatusBreakdown],
      providers: [
        {
          provide: DashboardStore,
          useValue: { equipmentByStatus: bucketsSignal, isQueryLoading: signal(false) },
        },
        { provide: THEME_PORT, useValue: { resolvedTheme: signal('light') } },
      ],
    });

    const fixture = TestBed.createComponent(EquipmentStatusBreakdown);
    fixture.detectChanges();
    return fixture;
  };

  const fleet: readonly EquipmentStatusBucket[] = [
    { status: 'operational', count: 28 },
    { status: 'under_maintenance', count: 4 },
    { status: 'in_stock', count: 5 },
    { status: 'decommissioned', count: 3 },
  ];

  it('should render one legend row per status', () => {
    expect(legendRows(createComponent(fleet))).toHaveLength(4);
  });

  // The canvas is aria-hidden, so the legend is the only accessible carrier of
  // both the status names and their counts.
  it('should name every status in the legend', () => {
    const text: string = createComponent(fleet).nativeElement.textContent ?? '';

    expect(text).toContain('Operational');
    expect(text).toContain('Under Maintenance');
    expect(text).toContain('In Stock');
    expect(text).toContain('Decommissioned');
  });

  it('should show the fleet total at the centre', () => {
    expect(createComponent(fleet).nativeElement.textContent).toContain('40');
  });

  // Chart.js draws no arc for an all-zero dataset, leaving a blank square where
  // the doughnut should be.
  it('should show an empty message instead of a blank doughnut for an empty fleet', () => {
    const fixture = createComponent([
      { status: 'operational', count: 0 },
      { status: 'under_maintenance', count: 0 },
      { status: 'in_stock', count: 0 },
      { status: 'decommissioned', count: 0 },
    ]);

    expect(fixture.nativeElement.querySelector('p-chart')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('No equipment recorded yet.');
  });

  it('should render the doughnut when the fleet has equipment', () => {
    expect(createComponent(fleet).nativeElement.querySelector('p-chart')).not.toBeNull();
  });

  // An unknown status must still be counted and labelled rather than dropped.
  it('should fall back to a readable label for a status outside the registry', () => {
    const fixture = createComponent([{ status: 'awaiting_parts', count: 7 }]);

    expect(fixture.nativeElement.textContent).toContain('awaiting parts');
    expect(fixture.nativeElement.textContent).toContain('7');
  });
});
