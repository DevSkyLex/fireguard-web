import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { FacilityPlanOverlayOutput } from '@features/organization/features/facilities/models';
import { FacilityPlanOverlay } from '../facility-plan-overlay.component';

const overlay = (
  overrides: Partial<FacilityPlanOverlayOutput> = {},
): FacilityPlanOverlayOutput => ({
  attachmentId: 'plan-1',
  imageWidth: 1200,
  imageHeight: 800,
  zones: [
    {
      facilityId: 'facility-zone-1',
      name: 'Zone A',
      type: 'zone',
      status: 'active',
      points: [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ],
    },
  ],
  equipment: [
    {
      equipmentId: 'equipment-1',
      type: 'fire_extinguisher',
      serialNumber: 'SN-1',
      locationLabel: 'Extinguisher',
      status: 'operational',
      x: 0.5,
      y: 0.25,
    },
  ],
  ...overrides,
});

describe('FacilityPlanOverlay', () => {
  let fixture: ComponentFixture<FacilityPlanOverlay>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const byTestId = (id: string): HTMLElement | null =>
    root().querySelector(`[data-testid="${id}"]`);
  const allByTestId = (id: string): NodeListOf<HTMLElement> =>
    root().querySelectorAll(`[data-testid="${id}"]`);

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(FacilityPlanOverlay);
  });

  it('renders nothing when the overlay is unloaded', async () => {
    await fixture.whenStable();

    expect(byTestId('facility-plan-overlay-zones')).toBeNull();
    expect(allByTestId('facility-plan-overlay-equipment').length).toBe(0);
  });

  it('renders a polygon per zone and a button per equipment pin', async () => {
    fixture.componentRef.setInput('overlay', overlay());
    await fixture.whenStable();

    expect(allByTestId('facility-plan-overlay-zone').length).toBe(1);
    expect(allByTestId('facility-plan-overlay-equipment').length).toBe(1);
  });

  it("positions an equipment pin at the normalized point scaled by the overlay's image size", async () => {
    fixture.componentRef.setInput('overlay', overlay());
    await fixture.whenStable();

    const pin = byTestId('facility-plan-overlay-equipment') as HTMLButtonElement;
    expect(pin.style.left).toBe('600px');
    expect(pin.style.top).toBe('200px');
  });

  it('counter-scales an equipment pin by the inverse of the viewer scale', async () => {
    fixture.componentRef.setInput('overlay', overlay());
    fixture.componentRef.setInput('scale', 2);
    await fixture.whenStable();

    const pin = byTestId('facility-plan-overlay-equipment') as HTMLButtonElement;
    expect(pin.style.transform).toContain('scale(0.5)');
  });

  it('gives the zone and the equipment pin an accessible name carrying their status', async () => {
    fixture.componentRef.setInput('overlay', overlay());
    await fixture.whenStable();

    expect(byTestId('facility-plan-overlay-zone')?.getAttribute('aria-label')).toBe(
      'Zone Zone A — Active',
    );
    expect(byTestId('facility-plan-overlay-equipment')?.getAttribute('aria-label')).toBe(
      'Extinguisher — Operational',
    );
  });

  it('marks the selected zone aria-pressed and with a thicker outline, and leaves the rest unmarked', async () => {
    fixture.componentRef.setInput('overlay', overlay());
    fixture.componentRef.setInput('selectedZoneId', 'facility-zone-1');
    await fixture.whenStable();

    const zone = byTestId('facility-plan-overlay-zone');
    expect(zone?.getAttribute('aria-pressed')).toBe('true');
    expect(zone?.querySelector('polygon')?.getAttribute('stroke-width')).toBe('4');
  });

  it('leaves an unselected zone aria-pressed false with the default outline', async () => {
    fixture.componentRef.setInput('overlay', overlay());
    await fixture.whenStable();

    const zone = byTestId('facility-plan-overlay-zone');
    expect(zone?.getAttribute('aria-pressed')).toBe('false');
    expect(zone?.querySelector('polygon')?.getAttribute('stroke-width')).toBe('2');
  });

  it('marks the selected equipment pin aria-pressed and with an added ring', async () => {
    fixture.componentRef.setInput('overlay', overlay());
    fixture.componentRef.setInput('selectedEquipmentId', 'equipment-1');
    await fixture.whenStable();

    const pin = byTestId('facility-plan-overlay-equipment');
    expect(pin?.getAttribute('aria-pressed')).toBe('true');
    expect(pin?.querySelector('span')?.classList.contains('ring-2')).toBe(true);
  });

  it('emits zoneActivated when a zone is clicked', async () => {
    fixture.componentRef.setInput('overlay', overlay());
    await fixture.whenStable();

    const activated: string[] = [];
    fixture.componentInstance.zoneActivated.subscribe((facilityId) => activated.push(facilityId));

    byTestId('facility-plan-overlay-zone')?.dispatchEvent(new MouseEvent('click'));

    expect(activated).toEqual(['facility-zone-1']);
  });

  it('emits zoneActivated when a zone is activated with the keyboard (Enter or Space)', async () => {
    fixture.componentRef.setInput('overlay', overlay());
    await fixture.whenStable();

    const activated: string[] = [];
    fixture.componentInstance.zoneActivated.subscribe((facilityId) => activated.push(facilityId));

    const zone = byTestId('facility-plan-overlay-zone') as HTMLElement;
    zone.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    zone.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));

    expect(activated).toEqual(['facility-zone-1', 'facility-zone-1']);
  });

  it('is keyboard-reachable: the zone control carries tabindex 0', async () => {
    fixture.componentRef.setInput('overlay', overlay());
    await fixture.whenStable();

    expect(byTestId('facility-plan-overlay-zone')?.getAttribute('tabindex')).toBe('0');
  });

  it('is keyboard-reachable: the equipment pin carries tabindex 0', async () => {
    fixture.componentRef.setInput('overlay', overlay());
    await fixture.whenStable();

    expect(byTestId('facility-plan-overlay-equipment')?.getAttribute('tabindex')).toBe('0');
  });

  it('emits equipmentActivated when a pin is clicked', async () => {
    fixture.componentRef.setInput('overlay', overlay());
    await fixture.whenStable();

    const activated: string[] = [];
    fixture.componentInstance.equipmentActivated.subscribe((equipmentId) =>
      activated.push(equipmentId),
    );

    byTestId('facility-plan-overlay-equipment')?.dispatchEvent(new MouseEvent('click'));

    expect(activated).toEqual(['equipment-1']);
  });

  it('hides the zone layer when showZones is false', async () => {
    fixture.componentRef.setInput('overlay', overlay());
    fixture.componentRef.setInput('showZones', false);
    await fixture.whenStable();

    expect(byTestId('facility-plan-overlay-zones')).toBeNull();
    expect(allByTestId('facility-plan-overlay-equipment').length).toBe(1);
  });

  it('hides the equipment layer when showEquipment is false', async () => {
    fixture.componentRef.setInput('overlay', overlay());
    fixture.componentRef.setInput('showEquipment', false);
    await fixture.whenStable();

    expect(byTestId('facility-plan-overlay-zones')).not.toBeNull();
    expect(allByTestId('facility-plan-overlay-equipment').length).toBe(0);
  });
});
