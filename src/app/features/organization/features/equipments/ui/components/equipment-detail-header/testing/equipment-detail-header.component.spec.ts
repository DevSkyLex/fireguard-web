import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import { EquipmentDetailHeader } from '../equipment-detail-header.component';

const BASE_EQUIPMENT: EquipmentOutput = {
  '@id': '/api/equipment/eq-1',
  '@type': 'Equipment',
  id: 'eq-1',
  organizationId: 'org-1',
  facilityId: null,
  type: 'fire_extinguisher',
  subType: null,
  brand: 'Kidde',
  model: 'Pro 210',
  serialNumber: 'SN-1',
  locationLabel: null,
  status: 'in_stock',
  installedAt: null,
  commissionedAt: null,
  tags: [],
  createdAt: '2025-01-01',
  updatedAt: '2025-06-01',
} as unknown as EquipmentOutput;

describe('EquipmentDetailHeader', () => {
  const createFixture = (
    equipment: EquipmentOutput,
    canManage = true,
  ): ComponentFixture<EquipmentDetailHeader> => {
    TestBed.configureTestingModule({ imports: [EquipmentDetailHeader] });
    const fixture: ComponentFixture<EquipmentDetailHeader> =
      TestBed.createComponent(EquipmentDetailHeader);
    fixture.componentRef.setInput('equipment', equipment);
    fixture.componentRef.setInput('canManage', canManage);
    fixture.detectChanges();
    return fixture;
  };

  it('should create', () => {
    const fixture = createFixture(BASE_EQUIPMENT);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should never render an Edit button — the record is the edit surface now', () => {
    const fixture = createFixture(BASE_EQUIPMENT);
    const host: HTMLElement = fixture.nativeElement as HTMLElement;

    expect(host.textContent).not.toContain('Edit');
  });

  it('should render no actions at all when the member cannot manage equipment', () => {
    const fixture = createFixture(BASE_EQUIPMENT, false);
    const host: HTMLElement = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('[actions]')).toBeNull();
  });

  it('should name Commission as the primary action for in-stock equipment, disabled with a reason when unassigned', () => {
    const fixture = createFixture({ ...BASE_EQUIPMENT, status: 'in_stock', facilityId: null });

    expect(fixture.componentInstance['lifecycleAction']()).toMatchObject({
      label: 'Commission',
      disabled: true,
      disabledReason: 'Assign a facility before commissioning',
    });
    expect(fixture.componentInstance['canDecommission']()).toBe(true);
  });

  it('should enable Commission once in-stock equipment is assigned to a facility', () => {
    const fixture = createFixture({ ...BASE_EQUIPMENT, status: 'in_stock', facilityId: 'fac-1' });

    expect(fixture.componentInstance['lifecycleAction']()).toMatchObject({
      label: 'Commission',
      disabled: false,
      disabledReason: null,
    });
  });

  it('should name Maintenance as the primary action for operational equipment', () => {
    const fixture = createFixture({
      ...BASE_EQUIPMENT,
      status: 'operational',
      facilityId: 'fac-1',
    });

    expect(fixture.componentInstance['lifecycleAction']()).toMatchObject({
      label: 'Maintenance',
      severity: 'warn',
      disabled: false,
    });
    expect(fixture.componentInstance['canDecommission']()).toBe(true);
  });

  it('should name Resume service as the primary action for equipment under maintenance', () => {
    const fixture = createFixture({
      ...BASE_EQUIPMENT,
      status: 'under_maintenance',
      facilityId: 'fac-1',
    });

    expect(fixture.componentInstance['lifecycleAction']()).toMatchObject({
      label: 'Resume service',
      disabled: false,
    });
  });

  it('should name no primary action and offer no Decommission button once decommissioned — a terminal status', () => {
    const fixture = createFixture({ ...BASE_EQUIPMENT, status: 'decommissioned' });

    expect(fixture.componentInstance['lifecycleAction']()).toBeNull();
    expect(fixture.componentInstance['canDecommission']()).toBe(false);
    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    // The status badge itself reads "Decommissioned", so assert on the
    // actions area specifically rather than the whole header's text.
    expect(host.querySelector('[actions] p-button')).toBeNull();
  });

  it('should emit commission when the primary action for in-stock, assigned equipment is invoked', () => {
    const fixture = createFixture({ ...BASE_EQUIPMENT, status: 'in_stock', facilityId: 'fac-1' });
    const emitted: void[] = [];
    fixture.componentInstance.commission.subscribe(() => emitted.push(undefined));

    fixture.componentInstance['lifecycleAction']()?.run();

    expect(emitted.length).toBe(1);
  });

  it('should emit maintenance when the primary action for operational equipment is invoked', () => {
    const fixture = createFixture({
      ...BASE_EQUIPMENT,
      status: 'operational',
      facilityId: 'fac-1',
    });
    const emitted: void[] = [];
    fixture.componentInstance.maintenance.subscribe(() => emitted.push(undefined));

    fixture.componentInstance['lifecycleAction']()?.run();

    expect(emitted.length).toBe(1);
  });

  it('should emit decommission when the secondary action is clicked', () => {
    const fixture = createFixture({ ...BASE_EQUIPMENT, status: 'operational' });
    const emitted: void[] = [];
    fixture.componentInstance.decommission.subscribe(() => emitted.push(undefined));

    const buttons: NodeListOf<HTMLElement> = (
      fixture.nativeElement as HTMLElement
    ).querySelectorAll('p-button');
    const decommissionButton: HTMLElement | undefined = Array.from(buttons).find((button) =>
      button.textContent?.includes('Decommission'),
    );
    decommissionButton?.querySelector('button')?.click();

    expect(emitted.length).toBe(1);
  });
});
