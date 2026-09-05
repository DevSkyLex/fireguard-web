import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, Subject, throwError } from 'rxjs';
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
  let facilities: { list: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> };
  let equipment: { list: ReturnType<typeof vi.fn> };
  let members: { list: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> };
  let labels: { list: ReturnType<typeof vi.fn> };
  let templates: { list: ReturnType<typeof vi.fn> };
  let interventions: Record<string, never>;
  let dispatch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    dispatch = vi.fn();
    facilities = {
      get: vi.fn().mockReturnValue(of({ id: 'site-102', name: 'Remote site' })),
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
      get: vi
        .fn()
        .mockReturnValue(of({ id: 'member-102', displayName: 'Remote member', roleNames: [] })),
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

  it('resolves selected resources outside catalogue pages without changing coverage', () => {
    store.loadCreationOptions('org-1');
    const before = store.catalogues();
    const iris = ['/api/facilities/site-102', '/api/organizations/org-1/members/member-102'];
    store.ensureSelected('org-1', iris);
    store.ensureSelected('org-1', iris);
    expect(facilities.get).toHaveBeenCalledExactlyOnceWith('org-1', 'site-102');
    expect(members.get).toHaveBeenCalledExactlyOnceWith('org-1', 'member-102');
    expect(store.sites()).toContainEqual({ value: iris[0], label: 'Remote site' });
    expect(store.members().find((option) => option.value === iris[1])?.label).toBe('Remote member');
    expect(store.catalogues()).toEqual(before);
  });

  it('does not replace a rich catalogue label with a later sparse individual response', () => {
    const response = new Subject<{ id: string; userId: string }>();
    members.get.mockReturnValue(response);
    store.ensureSelected('org-1', ['/api/organizations/org-1/members/member-1']);
    store.loadCreationOptions('org-1');
    response.next({ id: 'member-1', userId: 'user-1' });
    expect(store.members()[0].label).toBe('Agent Alpha');
  });

  it('keeps independent selection errors retryable without losing successful options', () => {
    facilities.get.mockReturnValueOnce(throwError(() => new Error('Unavailable')));
    store.ensureSelected('org-1', [
      '/api/facilities/site-102',
      '/api/organizations/org-1/members/member-102',
    ]);
    expect(store.selectionFailed()).toBe(true);
    expect(store.members()).toHaveLength(1);
    store.ensureSelected('org-1', ['/api/facilities/site-102']);
    expect(store.selectionFailed()).toBe(false);
    expect(store.sites()[0].label).toBe('Remote site');
  });

  it('ignores late selected resource reads after an organization change and rejects foreign member references', () => {
    const response = new Subject<{ id: string; name: string }>();
    facilities.get.mockReturnValue(response);
    store.ensureSelected('org-1', ['/api/facilities/late']);
    store.ensureSelected('org-2', ['/api/organizations/org-1/members/member-102']);
    response.next({ id: 'late', name: 'Previous organization' });
    expect(store.sites()).toEqual([]);
    expect(store.selectionCallStates()).toEqual({});
    expect(members.get).not.toHaveBeenCalled();
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
    expect(templates.list).toHaveBeenCalledWith('/api/organizations/org-1', {
      page: 1,
      itemsPerPage: 100,
    });
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
  it('renders a successful source while another source is still loading', () => {
    members.list.mockReturnValue(new Subject());
    store.loadCreationOptions('org-1');
    expect(store.sites()).toHaveLength(1);
    expect(store.catalogues().sites?.callState.status).toBe('success');
    expect(store.catalogues().members?.callState.status).toBe('pending');
  });

  it('loads options beyond the first hundred and retains them when reopening preparation', () => {
    facilities.list.mockImplementation((_org: string, options: { page: number }) =>
      of({
        member: Array.from({ length: options.page === 1 ? 100 : 1 }, (_, index) => ({
          id: `site-${(options.page - 1) * 100 + index}`,
          name: `Site ${(options.page - 1) * 100 + index}`,
        })),
        totalItems: 101,
      }),
    );
    store.loadCreationOptions('org-1');
    store.loadMore('sites');
    expect(store.sites()).toHaveLength(101);
    store.loadWorkspaceOptions('org-1');
    expect(
      store.sites().find((option) => option.value === '/api/facilities/site-100'),
    ).toBeDefined();
    expect(store.catalogues().sites?.total).toBe(101);
  });

  it('searches the server after typing settles and keeps previously selected labels', async () => {
    vi.useFakeTimers();
    try {
      store.loadCreationOptions('org-1');
      facilities.list.mockReturnValue(
        of({ member: [{ id: 'remote', name: 'Remote site' }], totalItems: 1 }),
      );
      store.search({ kind: 'sites', search: 'Rem' });
      store.search({ kind: 'sites', search: 'Remote' });
      await vi.advanceTimersByTimeAsync(250);
      expect(facilities.list).toHaveBeenLastCalledWith('org-1', {
        rootsOnly: true,
        page: 1,
        itemsPerPage: 100,
        search: 'Remote',
      });
      expect(facilities.list).toHaveBeenCalledTimes(2);
      expect(store.sites()).toEqual(
        expect.arrayContaining([
          { label: 'Site A', value: '/api/facilities/site-1' },
          { label: 'Remote site', value: '/api/facilities/remote' },
        ]),
      );
    } finally {
      vi.useRealTimers();
    }
  });
});
