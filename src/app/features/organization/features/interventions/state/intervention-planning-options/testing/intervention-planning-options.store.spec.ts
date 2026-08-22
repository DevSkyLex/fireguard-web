import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, throwError } from 'rxjs';
import { OrganizationMemberService } from '@features/organization/data-access';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import {
  InterventionLabelService,
  InterventionService,
  InterventionTemplateService,
} from '@features/organization/features/interventions/data-access';
import { InterventionPlanningOptionsStore } from '../intervention-planning-options.store';

describe('InterventionPlanningOptionsStore', () => {
  let store: InstanceType<typeof InterventionPlanningOptionsStore>;
  let facilities: { list: ReturnType<typeof vi.fn> };
  let equipment: { list: ReturnType<typeof vi.fn> };
  let members: { list: ReturnType<typeof vi.fn> };
  let labels: { list: ReturnType<typeof vi.fn> };
  let templates: { list: ReturnType<typeof vi.fn> };
  let interventions: Record<string, never>;
  let dispatch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    dispatch = vi.fn();
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
      list: vi.fn().mockReturnValue(
        of({
          member: [
            {
              id: 'member-1',
              userId: 'user-1',
              firstName: 'Agent',
              lastName: 'Alpha',
              displayName: 'Agent Alpha',
              avatarUrl: 'https://api.test/avatar/agent-alpha',
              roleNames: ['Field inspector'],
            },
          ],
          totalItems: 1,
        }),
      ),
    };
    labels = {
      list: vi.fn().mockReturnValue(
        of({
          member: [{ id: 'label-1', name: 'Compliance', color: '#ff0000' }],
          totalItems: 1,
        }),
      ),
    };
    templates = {
      list: vi.fn().mockReturnValue(
        of({
          member: [{ id: 'template-1', name: 'Annual inspection round' }],
          totalItems: 1,
        }),
      ),
    };
    interventions = {};

    TestBed.configureTestingModule({
      providers: [
        InterventionPlanningOptionsStore,
        { provide: Dispatcher, useValue: { dispatch } },
        { provide: FacilityService, useValue: facilities },
        { provide: EquipmentService, useValue: equipment },
        { provide: OrganizationMemberService, useValue: members },
        { provide: InterventionLabelService, useValue: labels },
        { provide: InterventionTemplateService, useValue: templates },
        { provide: InterventionService, useValue: interventions },
      ],
    });
    store = TestBed.inject(InterventionPlanningOptionsStore);
  });

  it('loads sites, members and labels for intervention creation', async () => {
    store.loadCreationOptions('org-1');

    await vi.waitFor(() => expect(store.loading()).toBe(false));

    expect(facilities.list).toHaveBeenCalledOnce();
    expect(facilities.list).toHaveBeenCalledWith('org-1', {
      rootsOnly: true,
      page: 1,
      itemsPerPage: 100,
    });
    expect(equipment.list).not.toHaveBeenCalled();
    expect(store.targets()).toEqual([]);
    expect(store.sites()).toEqual([{ label: 'Site A', value: '/api/facilities/site-1' }]);
    expect(store.members()).toEqual([
      {
        label: 'Agent Alpha',
        value: '/api/organizations/org-1/members/member-1',
        displayName: 'Agent Alpha',
        roleLabel: 'Field inspector',
        avatarUrl: 'https://api.test/avatar/agent-alpha',
        initials: 'AA',
      },
    ]);
    expect(labels.list).toHaveBeenCalledWith('/api/organizations/org-1');
    expect(store.labels()).toEqual([{ id: 'label-1', name: 'Compliance', color: '#ff0000' }]);
    expect(templates.list).toHaveBeenCalledWith('/api/organizations/org-1', { itemsPerPage: 100 });
    expect(store.templates()).toEqual([{ id: 'template-1', name: 'Annual inspection round' }]);
    expect(store.hasTemplates()).toBe(true);
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
    expect(labels.list).toHaveBeenCalledWith('/api/organizations/org-1');
    expect(store.labels()).toEqual([{ id: 'label-1', name: 'Compliance', color: '#ff0000' }]);
    expect(templates.list).not.toHaveBeenCalled();
    expect(store.templates()).toEqual([]);
    expect(store.hasTemplates()).toBe(false);
  });

  it('keeps the option lists that answered when one source fails', async () => {
    templates.list.mockReturnValue(throwError(() => new Error('boom')));

    store.loadCreationOptions('org-1');

    await vi.waitFor(() => expect(store.loading()).toBe(false));

    expect(store.sites()).not.toEqual([]);
    expect(store.members()).not.toEqual([]);
    expect(store.labels()).not.toEqual([]);
    expect(store.templates()).toEqual([]);
    expect(dispatch).toHaveBeenCalled();
  });

  it('reports the degradation rather than swallowing it', async () => {
    facilities.list.mockReturnValue(throwError(() => new Error('boom')));

    store.loadCreationOptions('org-1');

    await vi.waitFor(() => expect(store.loading()).toBe(false));

    expect(store.sites()).toEqual([]);
    expect(store.members()).not.toEqual([]);
    expect(dispatch).toHaveBeenCalled();
  });

  it('surfaces a real error only when every source fails', async () => {
    facilities.list.mockReturnValue(throwError(() => new Error('boom')));
    members.list.mockReturnValue(throwError(() => new Error('boom')));
    labels.list.mockReturnValue(throwError(() => new Error('boom')));
    templates.list.mockReturnValue(throwError(() => new Error('boom')));

    store.loadCreationOptions('org-1');

    await vi.waitFor(() => expect(store.loading()).toBe(false));

    expect(store.sites()).toEqual([]);
    expect(store.members()).toEqual([]);
    expect(store.templates()).toEqual([]);
    expect(store.loadError()).not.toBeNull();
    expect(dispatch).toHaveBeenCalled();
  });
});
