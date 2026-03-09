import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FacilityEquipmentTab } from './facility-equipment-tab.component';
import { ActiveOrganizationStore } from '@core/stores/organization';
import { EquipmentStore } from '@core/stores/equipment';
import type { EquipmentOutput } from '@core/models/equipment';
import type { OrganizationOutput } from '@core/models/organization';

const MOCK_ORG: OrganizationOutput = {
  id: 'org-1',
  name: 'Acme Corp',
} as OrganizationOutput;

const MOCK_EQUIPMENT: EquipmentOutput = {
  '@id': '/api/equipment/eq-1',
  '@type': 'Equipment',
  id: 'eq-1',
  organizationId: 'org-1',
  facilityId: 'fac-1',
  type: 'Fire Extinguisher',
  subType: 'ABC',
  status: 'commissioned',
  brand: 'Amerex',
  model: 'B500',
  serialNumber: 'SN-001',
  locationLabel: null,
  installedAt: null,
  commissionedAt: null,
  tags: [],
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
} as unknown as EquipmentOutput;

describe('FacilityEquipmentTab', () => {
  const mockEquipmentStore = {
    isLoadingEquipment: signal<boolean>(false),
    isEmpty: signal<boolean>(true),
    equipmentList: signal<ReadonlyArray<EquipmentOutput>>([]),
    load: vi.fn(),
  };

  const mockActiveOrgStore = {
    selectedOrganization: signal<OrganizationOutput | null>(MOCK_ORG),
  };

  beforeEach(() => {
    mockEquipmentStore.isLoadingEquipment.set(false);
    mockEquipmentStore.isEmpty.set(true);
    mockEquipmentStore.equipmentList.set([]);
    mockEquipmentStore.load.mockReset();

    TestBed.configureTestingModule({
      imports: [FacilityEquipmentTab],
      providers: [
        { provide: ActiveOrganizationStore, useValue: mockActiveOrgStore },
      ],
    }).overrideComponent(FacilityEquipmentTab, {
      set: { providers: [{ provide: EquipmentStore, useValue: mockEquipmentStore }] },
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(FacilityEquipmentTab);
    fixture.componentRef.setInput('facilityId', 'fac-1');
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show skeletons while loading', () => {
    mockEquipmentStore.isLoadingEquipment.set(true);
    const fixture = TestBed.createComponent(FacilityEquipmentTab);
    fixture.componentRef.setInput('facilityId', 'fac-1');
    fixture.detectChanges();
    const skeletons = fixture.debugElement.queryAll(By.css('p-skeleton'));
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should show empty state when no equipment', () => {
    mockEquipmentStore.isEmpty.set(true);
    const fixture = TestBed.createComponent(FacilityEquipmentTab);
    fixture.componentRef.setInput('facilityId', 'fac-1');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No equipment');
  });

  it('should render equipment rows when list is populated', () => {
    mockEquipmentStore.isEmpty.set(false);
    mockEquipmentStore.equipmentList.set([MOCK_EQUIPMENT]);
    const fixture = TestBed.createComponent(FacilityEquipmentTab);
    fixture.componentRef.setInput('facilityId', 'fac-1');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Fire Extinguisher');
  });

  it('should not show empty state when equipment list is populated', () => {
    mockEquipmentStore.isEmpty.set(false);
    mockEquipmentStore.equipmentList.set([MOCK_EQUIPMENT]);
    const fixture = TestBed.createComponent(FacilityEquipmentTab);
    fixture.componentRef.setInput('facilityId', 'fac-1');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('No equipment');
  });
});
