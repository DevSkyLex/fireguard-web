import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { OrganizationMemberService } from '@features/organization/data-access';
import {
  InterventionOfflineService,
  InterventionService,
} from '@features/organization/features/interventions/data-access';
import type { InterventionOutput } from '@features/organization/features/interventions/models';
import { MyInterventionsStore } from '../my-interventions.store';

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve));

const planned = { id: 'a', status: 'planned' } as unknown as InterventionOutput;
const draft = { id: 'b', status: 'draft' } as unknown as InterventionOutput;

describe('MyInterventionsStore', () => {
  let store: InstanceType<typeof MyInterventionsStore>;
  let service: { listAll: ReturnType<typeof vi.fn> };
  let members: { getCurrentProfile: ReturnType<typeof vi.fn> };
  let offline: { listInterventions: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    service = { listAll: vi.fn().mockReturnValue(of([planned])) };
    members = { getCurrentProfile: vi.fn().mockReturnValue(of({ id: 'm1' })) };
    offline = { listInterventions: vi.fn().mockResolvedValue([planned, draft]) };

    TestBed.configureTestingModule({
      providers: [
        MyInterventionsStore,
        { provide: InterventionService, useValue: service },
        { provide: OrganizationMemberService, useValue: members },
        { provide: InterventionOfflineService, useValue: offline },
      ],
    });

    store = TestBed.inject(MyInterventionsStore);
  });

  it('should merge responsible and participant interventions without duplicates when online', async () => {
    service.listAll.mockReturnValueOnce(of([planned])).mockReturnValueOnce(of([planned, draft]));

    store.load({ organizationId: 'org-1', online: true });
    await flush();

    expect(store.interventions().map((intervention) => intervention.id)).toEqual(['a', 'b']);
    expect(store.loading()).toBe(false);
  });

  it('should expose only actionable interventions through activeInterventions', async () => {
    service.listAll.mockReturnValueOnce(of([planned])).mockReturnValueOnce(of([draft]));

    store.load({ organizationId: 'org-1', online: true });
    await flush();

    expect(store.activeInterventions().map((intervention) => intervention.id)).toEqual(['a']);
  });

  it('should read from the offline cache when disconnected', async () => {
    store.load({ organizationId: 'org-1', online: false });
    await flush();

    expect(offline.listInterventions).toHaveBeenCalledWith('org-1');
    expect(members.getCurrentProfile).not.toHaveBeenCalled();
    expect(store.interventions()).toHaveLength(2);
  });

  it('should short-circuit to an empty list without an organization', async () => {
    store.load({ organizationId: null, online: true });
    await flush();

    expect(store.interventions()).toEqual([]);
    expect(members.getCurrentProfile).not.toHaveBeenCalled();
  });
});
