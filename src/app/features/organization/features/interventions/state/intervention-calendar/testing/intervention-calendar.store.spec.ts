import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, throwError } from 'rxjs';
import { OrganizationMemberService } from '@features/organization/data-access';
import { InterventionService } from '@features/organization/features/interventions/data-access';
import type { InterventionOutput } from '@features/organization/features/interventions/models';
import { InterventionCalendarStore } from '../intervention-calendar.store';

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve));

const planned = { id: 'a', status: 'planned' } as unknown as InterventionOutput;
const draft = { id: 'b', status: 'draft' } as unknown as InterventionOutput;

describe('InterventionCalendarStore', () => {
  let store: InstanceType<typeof InterventionCalendarStore>;
  let service: { listAll: ReturnType<typeof vi.fn> };
  let members: { getCurrentProfile: ReturnType<typeof vi.fn> };
  let dispatch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = { listAll: vi.fn().mockReturnValue(of([planned, draft])) };
    members = { getCurrentProfile: vi.fn().mockReturnValue(of({ id: 'm1' })) };
    dispatch = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        InterventionCalendarStore,
        { provide: Dispatcher, useValue: { dispatch } },
        { provide: InterventionService, useValue: service },
        { provide: OrganizationMemberService, useValue: members },
      ],
    });

    store = TestBed.inject(InterventionCalendarStore);
  });

  it('should load all org interventions and resolve the current member IRI', async () => {
    store.load({ organizationId: 'org-1' });
    await flush();

    expect(service.listAll).toHaveBeenCalledWith('org-1');
    expect(store.interventions().map((intervention) => intervention.id)).toEqual(['a', 'b']);
    expect(store.currentMemberIri()).toBe('/api/organizations/org-1/members/m1');
    expect(store.loading()).toBe(false);
  });

  it('should short-circuit to an empty calendar without an organization', async () => {
    store.load({ organizationId: null });
    await flush();

    expect(store.interventions()).toEqual([]);
    expect(store.currentMemberIri()).toBeNull();
    expect(service.listAll).not.toHaveBeenCalled();
    expect(members.getCurrentProfile).not.toHaveBeenCalled();
  });

  it('should still expose interventions when the member profile lookup fails', async () => {
    members.getCurrentProfile.mockReturnValueOnce(throwError(() => new Error('no profile')));

    store.load({ organizationId: 'org-1' });
    await flush();

    expect(store.interventions().map((intervention) => intervention.id)).toEqual(['a', 'b']);
    expect(store.currentMemberIri()).toBeNull();
    expect(store.loading()).toBe(false);
    expect(store.loadError()).toBeNull();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('should surface an error and reset the calendar when the list request fails', async () => {
    service.listAll.mockReturnValueOnce(throwError(() => new Error('boom')));

    store.load({ organizationId: 'org-1' });
    await flush();

    expect(store.interventions()).toEqual([]);
    expect(store.loading()).toBe(false);
    expect(store.loadError()).not.toBeNull();
    expect(dispatch).toHaveBeenCalled();
  });
});
