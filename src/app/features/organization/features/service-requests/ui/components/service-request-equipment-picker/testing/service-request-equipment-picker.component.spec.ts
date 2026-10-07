import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { OrganizationPermissionService } from '@features/organization/access';
import {
  EquipmentService,
  EquipmentTypeService,
} from '@features/organization/features/equipments/data-access';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import { ServiceRequestEquipmentPicker } from '../service-request-equipment-picker.component';
describe('ServiceRequestEquipmentPicker', () => {
  beforeAll(() => {
    globalThis.ResizeObserver ??= class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as typeof ResizeObserver;
  });
  const current = {
    id: 'current',
    organizationId: 'org',
    name: 'Reserve extinguisher',
    assetCode: 'FIRE-1',
    type: 'fire_extinguisher',
    status: 'in_stock',
    recordStatus: 'published',
  } as unknown as EquipmentOutput;
  it('does not read secondary equipment or catalogue data during SSR', async () => {
    const equipment = { list: vi.fn(), listByFacility: vi.fn(), get: vi.fn() },
      catalogue = { listAll: vi.fn() };
    TestBed.configureTestingModule({
      imports: [ServiceRequestEquipmentPicker],
      providers: [
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: EquipmentService, useValue: equipment },
        { provide: EquipmentTypeService, useValue: catalogue },
        { provide: FacilityService, useValue: {} },
        { provide: OrganizationPermissionService, useValue: { hasPermission: () => true } },
      ],
    });
    const fixture = TestBed.createComponent(ServiceRequestEquipmentPicker);
    fixture.componentRef.setInput('organizationId', 'org');
    fixture.componentRef.setInput('value', 'current');
    await fixture.whenStable();
    expect(equipment.list).not.toHaveBeenCalled();
    expect(equipment.get).not.toHaveBeenCalled();
    expect(catalogue.listAll).not.toHaveBeenCalled();
  });
  it('hydrates a selection outside the search page and refuses retired or draft new assignments', async () => {
    const retired = { ...current, id: 'retired', status: 'decommissioned' },
      draft = { ...current, id: 'draft', recordStatus: 'draft' };
    const equipment = {
      list: vi.fn().mockReturnValue(of({ member: [retired, draft], totalItems: 2 })),
      listByFacility: vi.fn(),
      get: vi.fn().mockReturnValue(of(current)),
    };
    TestBed.configureTestingModule({
      imports: [ServiceRequestEquipmentPicker],
      providers: [
        { provide: EquipmentService, useValue: equipment },
        { provide: EquipmentTypeService, useValue: { listAll: vi.fn().mockReturnValue(of([])) } },
        { provide: FacilityService, useValue: {} },
        { provide: OrganizationPermissionService, useValue: { hasPermission: () => true } },
      ],
    });
    const fixture = TestBed.createComponent(ServiceRequestEquipmentPicker);
    fixture.componentRef.setInput('organizationId', 'org');
    fixture.componentRef.setInput('value', 'current');
    await fixture.whenStable();
    expect(fixture.componentInstance['labelOf']('current')).toContain('Reserve extinguisher');
    fixture.componentInstance['pick']('retired');
    fixture.componentInstance['pick']('draft');
    expect(fixture.componentInstance.value()).toBe('current');
    fixture.componentInstance['pick']('');
    expect(fixture.componentInstance.value()).toBe('');
  });
});
