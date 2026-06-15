import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { OrganizationMemberService } from '@features/organization/data-access';
import { InterventionService } from '@features/organization/features/interventions/data-access';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import { InterventionPlanningOptionsStore } from '../intervention-planning-options.store';

describe('InterventionPlanningOptionsStore', () => {
  let store: InstanceType<typeof InterventionPlanningOptionsStore>;
  let facilities: { list: ReturnType<typeof vi.fn> };
  let equipment: { list: ReturnType<typeof vi.fn> };
  let members: { list: ReturnType<typeof vi.fn> };
  let interventions: { listReferencePacks: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    facilities = {
      list: vi
        .fn()
        .mockReturnValue(of({ member: [{ id: 'site-1', name: 'Site A' }], totalItems: 1 })),
    };
    equipment = {
      list: vi.fn().mockReturnValue(
        of({
          member: [{ id: 'equipment-1', type: 'extinguisher', serialNumber: 'SN-1' }],
          totalItems: 1,
        }),
      ),
    };
    members = {
      list: vi
        .fn()
        .mockReturnValue(of({ member: [{ id: 'member-1', userId: 'Agent A' }], totalItems: 1 })),
    };
    interventions = {
      listReferencePacks: vi
        .fn()
        .mockReturnValue(
          of({ member: [{ id: 'fr-erp-ert-v1', name: 'France ERP / ERT' }], totalItems: 1 }),
        ),
    };

    TestBed.configureTestingModule({
      providers: [
        InterventionPlanningOptionsStore,
        { provide: FacilityService, useValue: facilities },
        { provide: EquipmentService, useValue: equipment },
        { provide: OrganizationMemberService, useValue: members },
        { provide: InterventionService, useValue: interventions },
      ],
    });
    store = TestBed.inject(InterventionPlanningOptionsStore);
  });

  it('loads only sites and members for intervention creation', async () => {
    store.loadCreationOptions('org-1');

    await vi.waitFor(() => expect(store.loading()).toBe(false));

    expect(facilities.list).toHaveBeenCalledOnce();
    expect(facilities.list).toHaveBeenCalledWith('org-1', {
      rootsOnly: true,
      page: 1,
      itemsPerPage: 100,
    });
    expect(equipment.list).not.toHaveBeenCalled();
    expect(interventions.listReferencePacks).toHaveBeenCalledOnce();
    expect(store.targets()).toEqual([]);
    expect(store.sites()).toEqual([{ label: 'Site A', value: '/api/facilities/site-1' }]);
    expect(store.referencePacks()).toEqual([
      { label: 'France ERP / ERT', value: '/api/reference-packs/fr-erp-ert-v1' },
    ]);
  });

  it('loads target resources only for the intervention workspace', async () => {
    store.loadWorkspaceOptions('org-1');

    await vi.waitFor(() => expect(store.loading()).toBe(false));

    expect(facilities.list).toHaveBeenCalledTimes(2);
    expect(equipment.list).toHaveBeenCalledOnce();
    expect(store.targets()).toEqual([
      { label: 'Site A', value: '/api/facilities/site-1' },
      { label: 'extinguisher · SN-1', value: '/api/equipment/equipment-1' },
    ]);
  });
});
