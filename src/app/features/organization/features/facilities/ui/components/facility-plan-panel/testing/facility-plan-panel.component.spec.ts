import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type {
  FacilityPlanOverlayEquipment,
  FacilityPlanOverlayZone,
} from '@features/organization/features/facilities/models';
import { FacilityPlanPanel } from '../facility-plan-panel.component';

const ZONES: ReadonlyArray<FacilityPlanOverlayZone> = [
  { facilityId: 'zone-1', name: 'Server room', type: 'zone', status: 'active', points: [] },
  { facilityId: 'zone-2', name: 'Storage', type: 'zone', status: 'archived', points: [] },
];

const EQUIPMENT: FacilityPlanOverlayEquipment = {
  equipmentId: 'equipment-1',
  type: 'fire_extinguisher',
  serialNumber: 'SN-1',
  locationLabel: 'Corridor A',
  status: 'operational',
  x: 0.2,
  y: 0.4,
};

const EQUIPMENT_LIST: ReadonlyArray<FacilityPlanOverlayEquipment> = [
  EQUIPMENT,
  {
    equipmentId: 'equipment-2',
    type: 'smoke_detector',
    serialNumber: null,
    locationLabel: 'Corridor B',
    status: 'in_stock',
    x: 0.5,
    y: 0.5,
  },
];

function stubMatchMedia(matches: boolean): void {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

describe('FacilityPlanPanel', () => {
  let fixture: ComponentFixture<FacilityPlanPanel>;

  const byTestId = (id: string): HTMLElement | null =>
    (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${id}"]`);

  beforeEach(async () => {
    stubMatchMedia(false);
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(FacilityPlanPanel);
    fixture.componentRef.setInput('zones', ZONES);
    fixture.componentRef.setInput('equipment', EQUIPMENT_LIST);
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();
  });

  it('renders the zone list with no detail block while nothing is selected', () => {
    expect(byTestId('facility-plan-panel')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-facility-zone-list')).not.toBeNull();
    expect(byTestId('facility-plan-detail')).toBeNull();
  });

  it('shows the no-content empty state instead of the zone list when the plan has nothing drawn', async () => {
    fixture.componentRef.setInput('hasNoContent', true);
    await fixture.whenStable();

    expect(byTestId('facility-plan-no-content')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-facility-zone-list')).toBeNull();
  });

  it('renders the zone detail block when a zone is selected, without navigating', async () => {
    fixture.componentRef.setInput('selectedZone', ZONES[0]);
    await fixture.whenStable();

    const detail = byTestId('facility-plan-detail');
    expect(detail).not.toBeNull();
    expect(detail?.textContent).toContain('Server room');
  });

  it('emits zoneRecordRequested only when the explicit action is activated', async () => {
    fixture.componentRef.setInput('selectedZone', ZONES[0]);
    await fixture.whenStable();

    const requested = vi.fn();
    fixture.componentInstance.zoneRecordRequested.subscribe(requested);

    expect(requested).not.toHaveBeenCalled();
    (byTestId('facility-plan-detail-view-record') as HTMLButtonElement).click();

    expect(requested).toHaveBeenCalled();
  });

  it('renders the equipment detail block when a pin is selected', async () => {
    fixture.componentRef.setInput('selectedEquipment', EQUIPMENT);
    await fixture.whenStable();

    const detail = byTestId('facility-plan-detail');
    expect(detail).not.toBeNull();
    expect(detail?.textContent).toContain('Corridor A');
  });

  it('forwards a zone-list activation as zoneActivated', () => {
    const activated = vi.fn();
    fixture.componentInstance.zoneActivated.subscribe(activated);

    (fixture.nativeElement as HTMLElement)
      .querySelectorAll<HTMLButtonElement>('button[role="option"]')[1]
      .click();

    expect(activated).toHaveBeenCalledWith('zone-2');
  });

  it('renders every equipment pin in the equipment roster', () => {
    const options = byTestId('facility-plan-equipment-list')?.querySelectorAll(
      '[data-testid="facility-plan-equipment-list-option"]',
    );

    expect(options).toHaveLength(2);
    expect(options?.[0].textContent).toContain('Corridor A');
    expect(options?.[1].textContent).toContain('Corridor B');
  });

  it('forwards an equipment-roster activation as equipmentActivated', () => {
    const activated = vi.fn();
    fixture.componentInstance.equipmentActivated.subscribe(activated);

    byTestId('facility-plan-equipment-list')
      ?.querySelectorAll<HTMLButtonElement>(
        '[data-testid="facility-plan-equipment-list-option"]',
      )[1]
      .click();

    expect(activated).toHaveBeenCalledWith('equipment-2');
  });

  it('hides "Edit coordinates" on a selected zone without the write permission', async () => {
    fixture.componentRef.setInput('selectedZone', ZONES[0]);
    fixture.componentRef.setInput('canWrite', false);
    await fixture.whenStable();

    expect(byTestId('facility-plan-detail-edit')).toBeNull();
  });

  it('shows "Edit coordinates" and emits zoneEditRequested with the write permission', async () => {
    fixture.componentRef.setInput('selectedZone', ZONES[0]);
    fixture.componentRef.setInput('canWrite', true);
    await fixture.whenStable();

    const requested = vi.fn();
    fixture.componentInstance.zoneEditRequested.subscribe(requested);

    (byTestId('facility-plan-detail-edit') as HTMLButtonElement).click();

    expect(requested).toHaveBeenCalled();
  });

  it('hides "Edit position"/"Remove from plan" on a selected pin without the equipment permission', async () => {
    fixture.componentRef.setInput('selectedEquipment', EQUIPMENT);
    fixture.componentRef.setInput('canEditEquipment', false);
    await fixture.whenStable();

    expect(byTestId('facility-plan-detail-edit')).toBeNull();
    expect(byTestId('facility-plan-detail-remove')).toBeNull();
  });

  it('shows and wires "Edit position"/"Remove from plan" with the equipment permission', async () => {
    fixture.componentRef.setInput('selectedEquipment', EQUIPMENT);
    fixture.componentRef.setInput('canEditEquipment', true);
    await fixture.whenStable();

    const editRequested = vi.fn();
    const removeRequested = vi.fn();
    fixture.componentInstance.equipmentEditRequested.subscribe(editRequested);
    fixture.componentInstance.equipmentRemoveRequested.subscribe(removeRequested);

    (byTestId('facility-plan-detail-edit') as HTMLButtonElement).click();
    (byTestId('facility-plan-detail-remove') as HTMLButtonElement).click();

    expect(editRequested).toHaveBeenCalled();
    expect(removeRequested).toHaveBeenCalled();
  });
});
