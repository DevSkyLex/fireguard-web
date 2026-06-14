import { TestBed } from '@angular/core/testing';
import type { InterventionOutput } from '@features/organization/features/interventions/models';
import { InterventionDatabaseService } from '../intervention-database.service';
import { InterventionOfflineService } from '../intervention-offline.service';
import { InterventionOutboxStore } from '../intervention-outbox.store';
import { InterventionWorkspaceRepository } from '../intervention-workspace.repository';

describe('InterventionOfflineService', () => {
  it('does not replace a workspace snapshot while local operations are pending', async () => {
    const outbox = {
      hasUnsyncedChanges: () => true,
      listOutbox: vi.fn().mockResolvedValue([{ id: 'operation-1' }]),
    };
    const workspace = {
      saveWorkspace: vi.fn().mockResolvedValue(undefined),
    };
    TestBed.configureTestingModule({
      providers: [
        InterventionOfflineService,
        { provide: InterventionDatabaseService, useValue: {} },
        { provide: InterventionOutboxStore, useValue: outbox },
        { provide: InterventionWorkspaceRepository, useValue: workspace },
      ],
    });

    await TestBed.inject(InterventionOfflineService).saveWorkspace(
      { id: 'intervention-1' } as InterventionOutput,
      [],
      [],
      [],
    );

    expect(outbox.listOutbox).toHaveBeenCalledWith('intervention-1');
    expect(workspace.saveWorkspace).not.toHaveBeenCalled();
  });

  it('persists explicit local merges while operations are pending', async () => {
    const outbox = {
      hasUnsyncedChanges: () => true,
      listOutbox: vi.fn().mockResolvedValue([{ id: 'operation-1' }]),
    };
    const workspace = {
      saveWorkspace: vi.fn().mockResolvedValue(undefined),
    };
    TestBed.configureTestingModule({
      providers: [
        InterventionOfflineService,
        { provide: InterventionDatabaseService, useValue: {} },
        { provide: InterventionOutboxStore, useValue: outbox },
        { provide: InterventionWorkspaceRepository, useValue: workspace },
      ],
    });

    await TestBed.inject(InterventionOfflineService).saveWorkspace(
      { id: 'intervention-1' } as InterventionOutput,
      [],
      [],
      [],
      [],
      { replace: false },
    );

    expect(workspace.saveWorkspace).toHaveBeenCalledOnce();
  });
});
