import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { ParkService } from '@features/organization/data-access';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import { OrganizationParkStore, type OrganizationParkStoreType } from '../organization-park.store';

describe('OrganizationParkStore', () => {
  let store: OrganizationParkStoreType;
  let equipment: {
    summary: ReturnType<typeof vi.fn>;
    summaryByFacility: ReturnType<typeof vi.fn>;
    list: ReturnType<typeof vi.fn>;
    listByFacility: ReturnType<typeof vi.fn>;
  };
  let park: { anomaliesSummary: ReturnType<typeof vi.fn> };
  let facilities: { list: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> };
  const summary = {
    '@id': 'summary',
    '@type': 'Summary',
    scope: 'organization',
    totalItems: 120,
    byStatus: { under_maintenance: 3, decommissioned: 80, in_stock: 7, operational: 30 },
    needingAttentionCount: 83,
  };
  beforeEach(() => {
    equipment = {
      summary: vi.fn().mockReturnValue(of(summary)),
      summaryByFacility: vi.fn().mockReturnValue(of(summary)),
      list: vi.fn().mockReturnValue(of({ member: [], totalItems: 27 })),
      listByFacility: vi.fn().mockReturnValue(of({ member: [], totalItems: 27 })),
    };
    park = {
      anomaliesSummary: vi
        .fn()
        .mockReturnValue(
          of({ openAnomalies: 8, bySeverity: { low: 1, medium: 2, high: 3, critical: 2 } }),
        ),
    };
    facilities = {
      list: vi.fn().mockReturnValue(of({ member: [], totalItems: 44 })),
      get: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        OrganizationParkStore,
        { provide: EquipmentService, useValue: equipment },
        { provide: ParkService, useValue: park },
        { provide: FacilityService, useValue: facilities },
      ],
    });
    store = TestBed.inject(OrganizationParkStore);
  });
  it('counts unavailable equipment without counting retired history and shares the complete filter scope', () => {
    store.load({
      organizationId: 'org',
      family: 'fire',
      customerId: 'customer',
      facilityId: 'site',
      equipmentEnabled: true,
      anomaliesEnabled: true,
    });
    expect(store.unavailableCallState().data).toBe(3);
    expect(store.controlsCallState().data).toBe(27);
    expect(store.anomaliesCallState().data).toBe(8);
    expect(equipment.summaryByFacility).toHaveBeenCalledWith('org', 'site', true, {
      params: { family: 'fire', customerId: 'customer' },
    });
    expect(equipment.listByFacility).toHaveBeenCalledWith('org', 'site', {
      itemsPerPage: 1,
      page: 1,
      params: {
        family: 'fire',
        customerId: 'customer',
        maintenanceDueStatus: 'due',
        includeDescendants: true,
      },
    });
    expect(park.anomaliesSummary).toHaveBeenCalledWith('org', {
      params: {
        family: 'fire',
        customerId: 'customer',
        facilityId: 'site',
      },
    });
  });
  it('uses organization-wide scope without sending site-only traversal flags', () => {
    store.load({
      organizationId: 'org',
      family: 'fire',
      equipmentEnabled: true,
      anomaliesEnabled: true,
    });
    expect(equipment.list).toHaveBeenCalledExactlyOnceWith('org', {
      itemsPerPage: 1,
      page: 1,
      params: { family: 'fire', maintenanceDueStatus: 'due' },
    });
    expect(park.anomaliesSummary).toHaveBeenCalledExactlyOnceWith('org', {
      params: { family: 'fire' },
    });
  });
  it('cancels all old client counts and never reuses old-scope results', () => {
    const oldEquipment = new Subject(),
      oldControls = new Subject(),
      oldAnomalies = new Subject();
    equipment.summary.mockReturnValueOnce(oldEquipment);
    equipment.list.mockReturnValueOnce(oldControls);
    park.anomaliesSummary.mockReturnValueOnce(oldAnomalies);
    store.load({
      organizationId: 'org',
      family: 'fire',
      customerId: 'old',
      equipmentEnabled: true,
      anomaliesEnabled: true,
    });
    store.load({
      organizationId: 'org',
      family: 'fire',
      customerId: 'new',
      equipmentEnabled: true,
      anomaliesEnabled: true,
    });
    expect(oldEquipment.observed).toBe(false);
    expect(oldControls.observed).toBe(false);
    expect(oldAnomalies.observed).toBe(false);
    expect(store.unavailableCallState().data).toBe(3);
  });
  it('keeps a failed count unknown while other queues complete and suppresses denied reads', () => {
    park.anomaliesSummary.mockReturnValue(
      throwError(() => ({ status: 403, title: 'Forbidden', detail: 'Missing read permission' })),
    );
    store.load({ organizationId: 'org', equipmentEnabled: true, anomaliesEnabled: true });
    expect(store.anomaliesCallState().status).toBe('error');
    expect(store.anomaliesCallState().data).toBeNull();
    expect(store.controlsCallState().data).toBe(27);
    equipment.summary.mockClear();
    equipment.list.mockClear();
    park.anomaliesSummary.mockClear();
    store.load({ organizationId: 'org', equipmentEnabled: false, anomaliesEnabled: false });
    expect(equipment.summary).not.toHaveBeenCalled();
    expect(equipment.list).not.toHaveBeenCalled();
    expect(park.anomaliesSummary).not.toHaveBeenCalled();
    expect(store.controlsCallState().data).toBeNull();
  });
  it('searches and pages only the current customer root sites', () => {
    store.loadSites({ organizationId: 'org', customerId: 'customer', search: 'north', page: 2 });
    expect(facilities.list).toHaveBeenCalledWith('org', {
      rootsOnly: true,
      includePath: true,
      page: 2,
      itemsPerPage: 20,
      search: 'north',
      params: { customerId: 'customer' },
    });
    expect(store.sitePageCount()).toBe(3);
  });

  it('retains each confirmed quantity during a same-scope retry and clears it on reset', () => {
    const query = { organizationId: 'org', equipmentEnabled: true, anomaliesEnabled: true };
    store.load(query);
    const pendingEquipment = new Subject();
    const pendingControls = new Subject();
    const pendingAnomalies = new Subject();
    equipment.summary.mockReturnValue(pendingEquipment);
    equipment.list.mockReturnValue(pendingControls);
    park.anomaliesSummary.mockReturnValue(pendingAnomalies);

    store.load(query);

    expect(store.unavailableCallState()).toMatchObject({ status: 'pending', data: 3 });
    expect(store.controlsCallState()).toMatchObject({ status: 'pending', data: 27 });
    expect(store.anomaliesCallState()).toMatchObject({ status: 'pending', data: 8 });
    pendingAnomalies.error({ status: 503 });
    expect(store.anomaliesCallState()).toMatchObject({ status: 'error', data: 8 });

    store.load(null);

    expect(pendingEquipment.observed).toBe(false);
    expect(pendingControls.observed).toBe(false);
    expect(store.unavailableCallState()).toMatchObject({ status: 'idle', data: null });
    expect(store.controlsCallState()).toMatchObject({ status: 'idle', data: null });
    expect(store.anomaliesCallState()).toMatchObject({ status: 'idle', data: null });
  });
});
