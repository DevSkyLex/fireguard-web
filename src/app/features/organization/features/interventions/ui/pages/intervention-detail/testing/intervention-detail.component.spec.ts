import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ConfirmationService } from 'primeng/api';
import { ConnectivityService } from '@core/services/connectivity';
import { OrganizationPermissionService } from '@features/organization/access';
import { InterventionOfflineService } from '@features/organization/features/interventions/data-access';
import type {
  InterventionOutput,
  InterventionWorkItemOutput,
  InterventionWorkItemStatusChange,
} from '@features/organization/features/interventions/models';
import {
  InterventionFieldExecutionService,
  InterventionSyncCoordinatorService,
} from '@features/organization/features/interventions/services';
import { InterventionDiscoveryService } from '@features/organization/features/interventions/services/intervention-discovery';
import { InterventionPublicationService } from '@features/organization/features/interventions/services/intervention-publication';
import { ActiveInterventionStore } from '@features/organization/features/interventions/state';
import { InterventionPlanningOptionsStore } from '@features/organization/features/interventions/state/intervention-planning-options';
import { InterventionWorkspaceStore } from '@features/organization/features/interventions/state/intervention-workspace';
import {
  ActiveOrganizationStore,
  OrganizationMemberAccessStore,
} from '@features/organization/state';
import { InterventionDetailPage } from '../intervention-detail.component';

interface ConfirmConfig {
  readonly header?: string;
  readonly accept?: () => void;
}

type InterventionDetailPageHarness = {
  readonly phase: () => 'prepare' | 'execute' | 'review';
  planIntervention(): void;
  updateWorkItem(event: InterventionWorkItemStatusChange): void;
  confirmDeleteWorkItems(workItems: readonly InterventionWorkItemOutput[]): void;
};

describe('InterventionDetailPage', () => {
  let store: {
    intervention: ReturnType<typeof signal<InterventionOutput | null>>;
    transition: ReturnType<typeof vi.fn>;
    setWorkItemStatus: ReturnType<typeof vi.fn>;
    deleteWorkItems: ReturnType<typeof vi.fn>;
    load: ReturnType<typeof vi.fn>;
  };
  let confirmationService: { confirm: ReturnType<typeof vi.fn> };

  function build(): InterventionDetailPageHarness {
    const fixture = TestBed.createComponent(InterventionDetailPage);
    fixture.componentRef.setInput('interventionId', 'i-1');
    return fixture.componentInstance as unknown as InterventionDetailPageHarness;
  }

  beforeEach(() => {
    store = {
      intervention: signal<InterventionOutput | null>(null),
      transition: vi.fn(),
      setWorkItemStatus: vi.fn(),
      deleteWorkItems: vi.fn(),
      load: vi.fn(),
    };
    confirmationService = { confirm: vi.fn() };

    const planningOptions = {
      sites: signal([]),
      members: signal([]),
      targets: signal([]),
      equipmentTypes: signal([]),
      loadWorkspaceOptions: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [InterventionDetailPage],
      providers: [
        { provide: ConfirmationService, useValue: confirmationService },
        { provide: ConnectivityService, useValue: { online: signal(true) } },
        { provide: OrganizationPermissionService, useValue: { hasPermission: () => true } },
        { provide: InterventionOfflineService, useValue: {} },
        { provide: InterventionSyncCoordinatorService, useValue: { discardBlocked: vi.fn() } },
        {
          provide: InterventionFieldExecutionService,
          useValue: { scanSupported: () => false, scan: vi.fn(), attachPhoto: vi.fn() },
        },
        {
          provide: InterventionDiscoveryService,
          useValue: { create: vi.fn(), normalizeScannedTarget: (value: string) => value },
        },
        { provide: InterventionPublicationService, useValue: { publish: vi.fn() } },
        { provide: ActiveInterventionStore, useValue: { setIntervention: vi.fn() } },
        { provide: ActiveOrganizationStore, useValue: { selectedOrganization: signal(null) } },
        { provide: OrganizationMemberAccessStore, useValue: { profile: signal(null) } },
      ],
    }).overrideComponent(InterventionDetailPage, {
      set: {
        providers: [
          { provide: InterventionWorkspaceStore, useValue: store },
          { provide: InterventionPlanningOptionsStore, useValue: planningOptions },
        ],
      },
    });
  });

  it('should create', () => {
    expect(build()).toBeTruthy();
  });

  it('should derive the workspace phase from the intervention status', () => {
    const harness = build();

    expect(harness.phase()).toBe('prepare');

    store.intervention.set({ status: 'in_progress' } as InterventionOutput);
    expect(harness.phase()).toBe('execute');

    store.intervention.set({ status: 'submitted' } as InterventionOutput);
    expect(harness.phase()).toBe('review');
  });

  it('should transition the intervention to planned', () => {
    build().planIntervention();

    expect(store.transition).toHaveBeenCalledWith({ interventionId: 'i-1', status: 'planned' });
  });

  it('should forward a work-item status change to the store', () => {
    build().updateWorkItem({ workItemId: 'wi-1', status: 'completed' });

    expect(store.setWorkItemStatus).toHaveBeenCalledWith({
      interventionId: 'i-1',
      workItemId: 'wi-1',
      status: 'completed',
    });
  });

  it('should confirm before deleting work items and delete on accept', () => {
    const workItems = [{ id: 'wi-1' }] as unknown as readonly InterventionWorkItemOutput[];

    build().confirmDeleteWorkItems(workItems);

    expect(confirmationService.confirm).toHaveBeenCalledTimes(1);
    const config = confirmationService.confirm.mock.calls[0][0] as ConfirmConfig;
    expect(config.header).toBe('Delete work item');
    expect(store.deleteWorkItems).not.toHaveBeenCalled();

    config.accept?.();
    expect(store.deleteWorkItems).toHaveBeenCalledWith({ interventionId: 'i-1', workItems });
  });

  it('should not open a confirmation for an empty deletion request', () => {
    build().confirmDeleteWorkItems([]);

    expect(confirmationService.confirm).not.toHaveBeenCalled();
  });
});
