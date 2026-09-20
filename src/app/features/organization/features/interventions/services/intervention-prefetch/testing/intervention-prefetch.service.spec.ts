import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { ConnectivityService } from '@core/connectivity';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { OrganizationMemberService } from '@features/organization/data-access';
import {
  InterventionOfflineService,
  InterventionService,
  InterventionTimeService,
  InterventionTimeRepository,
} from '@features/organization/features/interventions/data-access';
import { ActiveOrganizationStore } from '@features/organization/state';
import { InterventionPrefetchService } from '../intervention-prefetch.service';

describe('InterventionPrefetchService', () => {
  const isAuthenticated = signal(true);
  let connectivity: { isOffline: ReturnType<typeof vi.fn> };
  let service: {
    listAll: ReturnType<typeof vi.fn>;
    listAllWorkItems: ReturnType<typeof vi.fn>;
    listAllChanges: ReturnType<typeof vi.fn>;
    listIssues: ReturnType<typeof vi.fn>;
  };
  const offline = { publicationOwner: () => 'account', saveWorkspace: vi.fn() };
  const time = { journal: vi.fn() };
  const timeRepository = { saveJournal: vi.fn() };
  let members: { getCurrentProfile: ReturnType<typeof vi.fn> };

  function build(): InterventionPrefetchService {
    TestBed.configureTestingModule({
      providers: [
        InterventionPrefetchService,
        { provide: AUTH_SESSION_PORT, useValue: { isAuthenticated } },
        { provide: ConnectivityService, useValue: connectivity },
        { provide: InterventionService, useValue: service },
        { provide: OrganizationMemberService, useValue: members },
        { provide: InterventionOfflineService, useValue: offline },
        { provide: InterventionTimeService, useValue: time },
        { provide: InterventionTimeRepository, useValue: timeRepository },
        {
          provide: ActiveOrganizationStore,
          useValue: {
            selectedOrganization: () => ({ id: 'org-1' }),
            selectedOrganizationId: () => 'org-1',
          },
        },
      ],
    });

    return TestBed.inject(InterventionPrefetchService);
  }

  beforeEach(() => {
    isAuthenticated.set(true);
    connectivity = { isOffline: vi.fn().mockReturnValue(true) };
    service = {
      listAll: vi.fn(),
      listAllWorkItems: vi.fn(),
      listAllChanges: vi.fn().mockReturnValue(of([])),
      listIssues: vi.fn().mockReturnValue(of({ member: [] })),
    };
    offline.saveWorkspace.mockResolvedValue(undefined);
    timeRepository.saveJournal.mockResolvedValue(undefined);
    members = { getCurrentProfile: vi.fn() };
  });
  afterEach(() => vi.clearAllMocks());

  it('prefetches only authorized journals and leaves failed history unknown without losing other journals', async () => {
    connectivity.isOffline.mockReturnValue(false);
    members.getCurrentProfile.mockReturnValue(of({ id: 'member' }));
    service.listAll.mockReturnValue(of([{ id: 'intervention', status: 'planned' }]));
    service.listAllWorkItems.mockReturnValue(
      of([
        { id: 'authorized', allowedActions: { canLogTime: true } },
        { id: 'forbidden', allowedActions: { canLogTime: false, canManageTime: false } },
        { id: 'failed', allowedActions: { canManageTime: true } },
      ]),
    );
    time.journal.mockImplementation((id: string) =>
      id === 'failed' ? throwError(() => new Error('Connection lost')) : of({ entries: [] }),
    );
    build().start();
    TestBed.inject(ApplicationRef).tick();
    await vi.waitFor(() => expect(timeRepository.saveJournal).toHaveBeenCalledOnce());
    expect(time.journal).toHaveBeenCalledTimes(2);
    expect(time.journal).not.toHaveBeenCalledWith('forbidden');
    expect(timeRepository.saveJournal).toHaveBeenCalledWith(
      {
        interventionId: 'intervention',
        workItemId: 'authorized',
        entries: [],
      },
      'account',
    );
    expect(offline.saveWorkspace).toHaveBeenCalledOnce();
  });

  it('should create', () => {
    expect(build()).toBeTruthy();
  });

  it('waits for authentication and cancels background reads when the session ends', () => {
    isAuthenticated.set(false);
    connectivity.isOffline.mockReturnValue(false);
    const pending = new Subject<never>();
    members.getCurrentProfile.mockReturnValue(pending);
    const prefetch = build();
    prefetch.start();
    TestBed.inject(ApplicationRef).tick();
    expect(members.getCurrentProfile).not.toHaveBeenCalled();

    isAuthenticated.set(true);
    TestBed.inject(ApplicationRef).tick();
    expect(members.getCurrentProfile).toHaveBeenCalledOnce();
    expect(pending.observed).toBe(true);

    isAuthenticated.set(false);
    TestBed.inject(ApplicationRef).tick();
    expect(pending.observed).toBe(false);
    expect(service.listAll).not.toHaveBeenCalled();
  });

  it('should stay inert and never fetch while offline once armed', () => {
    const prefetch = build();

    prefetch.start();
    TestBed.inject(ApplicationRef).tick();

    expect(service.listAll).not.toHaveBeenCalled();
    expect(members.getCurrentProfile).not.toHaveBeenCalled();
  });
});
