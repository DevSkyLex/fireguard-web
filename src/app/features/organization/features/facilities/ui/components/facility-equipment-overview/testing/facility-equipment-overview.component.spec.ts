import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import { FacilityOverviewStore } from '@features/organization/features/facilities/state';
import type { FacilityEquipmentStatusRow } from '@features/organization/features/facilities/state/facility-overview/models';
import { FacilityEquipmentOverview } from '../facility-equipment-overview.component';

const MOCK_STATUS_ROWS: ReadonlyArray<FacilityEquipmentStatusRow> = [
  {
    label: 'Commissioned',
    count: 3,
    total: 4,
    ratio: 0.75,
    colorClass: 'bg-green-600',
  },
  {
    label: 'In stock',
    count: 1,
    total: 4,
    ratio: 0.25,
    colorClass: 'bg-blue-600',
  },
];

describe('FacilityEquipmentOverview', () => {
  const mockOverviewStore = {
    isLoadingEquipment: signal<boolean>(false),
    equipmentCount: signal<number>(0),
    equipmentStatusRows: signal<ReadonlyArray<FacilityEquipmentStatusRow>>([]),
    equipment: signal<ReadonlyArray<EquipmentOutput>>([]),
  };

  beforeEach(() => {
    mockOverviewStore.isLoadingEquipment.set(false);
    mockOverviewStore.equipmentCount.set(0);
    mockOverviewStore.equipmentStatusRows.set([]);
    mockOverviewStore.equipment.set([]);

    TestBed.configureTestingModule({
      imports: [FacilityEquipmentOverview],
      providers: [{ provide: FacilityOverviewStore, useValue: mockOverviewStore }],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(FacilityEquipmentOverview);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show skeletons while loading', () => {
    mockOverviewStore.isLoadingEquipment.set(true);
    const fixture = TestBed.createComponent(FacilityEquipmentOverview);
    fixture.detectChanges();

    const skeletons = fixture.debugElement.queryAll(By.css('p-skeleton'));
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should show empty state when there is no equipment', () => {
    mockOverviewStore.isLoadingEquipment.set(false);
    mockOverviewStore.equipmentCount.set(0);
    const fixture = TestBed.createComponent(FacilityEquipmentOverview);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No equipment assigned');
  });

  it('should render per-status progress rows when equipment is present', () => {
    mockOverviewStore.isLoadingEquipment.set(false);
    mockOverviewStore.equipmentCount.set(4);
    mockOverviewStore.equipmentStatusRows.set(MOCK_STATUS_ROWS);
    const fixture = TestBed.createComponent(FacilityEquipmentOverview);
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Commissioned');
    expect(text).toContain('In stock');
    expect(text).not.toContain('No equipment assigned');
  });

  it('should display the equipment count in the header', () => {
    mockOverviewStore.equipmentCount.set(7);
    const fixture = TestBed.createComponent(FacilityEquipmentOverview);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('7');
  });

  it('should render a progress bar width proportional to each row ratio', () => {
    mockOverviewStore.equipmentCount.set(4);
    mockOverviewStore.equipmentStatusRows.set(MOCK_STATUS_ROWS);
    const fixture = TestBed.createComponent(FacilityEquipmentOverview);
    fixture.detectChanges();

    const bars: HTMLElement[] = fixture.debugElement
      .queryAll(By.css('.h-full.rounded-full'))
      .map((debugElement) => debugElement.nativeElement as HTMLElement);
    expect(bars.length).toBe(MOCK_STATUS_ROWS.length);
    expect(bars[0].style.width).toBe('75%');
    expect(bars[1].style.width).toBe('25%');
  });
});
