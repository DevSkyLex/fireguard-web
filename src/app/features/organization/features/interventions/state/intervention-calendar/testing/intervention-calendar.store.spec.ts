import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, throwError } from 'rxjs';
import { OrganizationMemberService } from '@features/organization/data-access';
import { InterventionService } from '@features/organization/features/interventions/data-access';
import type { InterventionOutput } from '@features/organization/features/interventions/models';
import { InterventionCalendarStore } from '../intervention-calendar.store';
import type { InterventionCalendarWindow } from '../models';

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve));

const planned = { id: 'a', status: 'planned' } as unknown as InterventionOutput;
const draft = { id: 'b', status: 'draft' } as unknown as InterventionOutput;

const WINDOW: InterventionCalendarWindow = {
  after: new Date(2026, 5, 1),
  before: new Date(2026, 7, 0, 23, 59, 59),
};

describe('InterventionCalendarStore', () => {
  let store: InstanceType<typeof InterventionCalendarStore>;
  let service: { listCalendarWindow: ReturnType<typeof vi.fn> };
  let members: { getCurrentProfile: ReturnType<typeof vi.fn> };
  let dispatch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = { listCalendarWindow: vi.fn().mockReturnValue(of([planned, draft])) };
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

  it('should load the windowed org interventions and resolve the current member IRI', async () => {
    store.load({ organizationId: 'org-1', window: WINDOW });
    await flush();

    expect(service.listCalendarWindow).toHaveBeenCalledWith('org-1', WINDOW.after, WINDOW.before);
    expect(store.interventions().map((intervention) => intervention.id)).toEqual(['a', 'b']);
    expect(store.currentMemberIri()).toBe('/api/organizations/org-1/members/m1');
    expect(store.loading()).toBe(false);
  });

  it('should reuse the resolved member IRI across window refetches of the same org', async () => {
    store.load({ organizationId: 'org-1', window: WINDOW });
    await flush();
    store.load({ organizationId: 'org-1', window: WINDOW });
    await flush();

    expect(service.listCalendarWindow).toHaveBeenCalledTimes(2);
    expect(members.getCurrentProfile).toHaveBeenCalledTimes(1);
    expect(store.currentMemberIri()).toBe('/api/organizations/org-1/members/m1');
  });

  it('should short-circuit to an empty calendar without an organization', async () => {
    store.load({ organizationId: null, window: WINDOW });
    await flush();

    expect(store.interventions()).toEqual([]);
    expect(store.currentMemberIri()).toBeNull();
    expect(service.listCalendarWindow).not.toHaveBeenCalled();
    expect(members.getCurrentProfile).not.toHaveBeenCalled();
  });

  it('should still expose interventions when the member profile lookup fails', async () => {
    members.getCurrentProfile.mockReturnValueOnce(throwError(() => new Error('no profile')));

    store.load({ organizationId: 'org-1', window: WINDOW });
    await flush();

    expect(store.interventions().map((intervention) => intervention.id)).toEqual(['a', 'b']);
    expect(store.currentMemberIri()).toBeNull();
    expect(store.loading()).toBe(false);
    expect(store.loadError()).toBeNull();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('should surface an error and reset the calendar when the list request fails', async () => {
    service.listCalendarWindow.mockReturnValueOnce(throwError(() => new Error('boom')));

    store.load({ organizationId: 'org-1', window: WINDOW });
    await flush();

    expect(store.interventions()).toEqual([]);
    expect(store.loading()).toBe(false);
    expect(store.loadError()).not.toBeNull();
    expect(dispatch).toHaveBeenCalled();
  });
});
