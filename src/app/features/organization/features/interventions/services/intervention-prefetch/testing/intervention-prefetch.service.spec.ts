import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ConnectivityService } from '@core/connectivity';
import { OrganizationMemberService } from '@features/organization/data-access';
import {
  InterventionOfflineService,
  InterventionService,
} from '@features/organization/features/interventions/data-access';
import { ActiveOrganizationStore } from '@features/organization/state';
import { InterventionPrefetchService } from '../intervention-prefetch.service';

describe('InterventionPrefetchService', () => {
  let connectivity: { isOffline: ReturnType<typeof vi.fn> };
  let service: { listAll: ReturnType<typeof vi.fn> };
  let members: { getCurrentProfile: ReturnType<typeof vi.fn> };

  function build(): InterventionPrefetchService {
    TestBed.configureTestingModule({
      providers: [
        InterventionPrefetchService,
        { provide: ConnectivityService, useValue: connectivity },
        { provide: InterventionService, useValue: service },
        { provide: OrganizationMemberService, useValue: members },
        { provide: InterventionOfflineService, useValue: {} },
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
    connectivity = { isOffline: vi.fn().mockReturnValue(true) };
    service = { listAll: vi.fn() };
    members = { getCurrentProfile: vi.fn() };
  });

  it('should create', () => {
    expect(build()).toBeTruthy();
  });

  it('should stay inert and never fetch while offline once armed', () => {
    const prefetch = build();

    prefetch.start();
    TestBed.inject(ApplicationRef).tick();

    expect(service.listAll).not.toHaveBeenCalled();
    expect(members.getCurrentProfile).not.toHaveBeenCalled();
  });
});
