import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import {
  ServiceRequestTargetStore,
  type ServiceRequestTargetStoreType,
} from '../service-request-target.store';
describe('ServiceRequestTargetStore', () => {
  const equipment = {
    id: 'equipment',
    type: 'fire_extinguisher',
    name: 'Extinguisher',
    status: 'operational',
    recordStatus: 'published',
  } as unknown as EquipmentOutput;
  const site = {
    id: 'site',
    type: 'site',
    name: 'Hospital',
    parentFacilityId: null,
  } as unknown as FacilityOutput;
  let equipmentService: {
    list: ReturnType<typeof vi.fn>;
    listByFacility: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    openWork: ReturnType<typeof vi.fn>;
  };
  let facilities: { list: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> };
  let store: ServiceRequestTargetStoreType;
  beforeEach(() => {
    equipmentService = {
      list: vi.fn().mockReturnValue(of({ member: [equipment], totalItems: 95 })),
      listByFacility: vi.fn().mockReturnValue(of({ member: [equipment], totalItems: 95 })),
      get: vi.fn().mockReturnValue(of(equipment)),
      openWork: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })),
    };
    facilities = {
      list: vi.fn().mockReturnValue(of({ member: [site], totalItems: 35 })),
      get: vi.fn().mockReturnValue(of(site)),
    };
    TestBed.configureTestingModule({
      providers: [
        ServiceRequestTargetStore,
        { provide: EquipmentService, useValue: equipmentService },
        { provide: FacilityService, useValue: facilities },
      ],
    });
    store = TestBed.inject(ServiceRequestTargetStore);
  });
  it('queries a site subtree for every qualification page and never forwards a global traversal flag', () => {
    store.loadEquipment({ organizationId: 'org', siteId: 'site', page: 2, search: 'Ext' });
    expect(equipmentService.listByFacility).toHaveBeenCalledWith('org', 'site', {
      page: 2,
      itemsPerPage: 30,
      search: 'Ext',
      params: { includeDescendants: true },
    });
    expect(store.equipmentPageCount()).toBe(4);
    store.loadEquipment({ organizationId: 'org' });
    expect(equipmentService.list).toHaveBeenLastCalledWith('org', {
      page: 1,
      itemsPerPage: 30,
      search: undefined,
      params: {},
    });
  });
  it('cancels old organization/site choices and retains the current server count', () => {
    const old = new Subject<HydraCollection<EquipmentOutput>>();
    equipmentService.listByFacility.mockReturnValueOnce(old);
    store.loadEquipment({ organizationId: 'org', siteId: 'old' });
    store.loadEquipment({ organizationId: 'other', siteId: 'site' });
    expect(old.observed).toBe(false);
    expect(store.equipmentEntities()).toEqual([equipment]);
    expect(store.equipmentTotal()).toBe(95);
    store.loadEquipment(null);
    expect(store.equipmentEntities()).toEqual([]);
    expect(store.equipmentCallState().status).toBe('idle');
  });
  it('offers root sites and hydrates their label outside search pages', () => {
    store.loadSites({ organizationId: 'org', page: 2 });
    expect(facilities.list).toHaveBeenCalledWith(
      'org',
      expect.objectContaining({ page: 2, params: { rootsOnly: true } }),
    );
    store.readSite({ organizationId: 'org', siteId: 'site' });
    expect(store.selectedSiteOption()?.label).toBe('Hospital');
    expect(store.siteOptions()[0].type).toBe('site');
    expect(store.sitePageCount()).toBe(2);
  });
  it('does not treat denied or failed open-work reads as an empty confirmed queue', () => {
    const old = new Subject<HydraCollection<EquipmentOutput>>();
    equipmentService.openWork.mockReturnValue(old);
    store.loadOpenWork({ organizationId: 'org', equipmentId: 'equipment' });
    expect(store.openWorkCallState().status).toBe('pending');
    expect(store.openWorkCallState().data).toBeNull();
    old.error(new Error('Denied'));
    expect(store.openWorkCallState().status).toBe('error');
    expect(store.openWorkCallState().data).toBeNull();
  });
});
