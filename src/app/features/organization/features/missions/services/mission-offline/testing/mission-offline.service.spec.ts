import { TestBed } from '@angular/core/testing';
import type { MissionOutput } from '@features/organization/features/missions/models';
import { MissionDatabaseService } from '../mission-database.service';
import { MissionOfflineService } from '../mission-offline.service';
import { MissionOutboxStore } from '../mission-outbox.store';
import { MissionWorkspaceRepository } from '../mission-workspace.repository';

describe('MissionOfflineService', () => {
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
        MissionOfflineService,
        { provide: MissionDatabaseService, useValue: {} },
        { provide: MissionOutboxStore, useValue: outbox },
        { provide: MissionWorkspaceRepository, useValue: workspace },
      ],
    });

    await TestBed.inject(MissionOfflineService).saveWorkspace(
      { id: 'mission-1' } as MissionOutput,
      [],
      [],
      [],
    );

    expect(outbox.listOutbox).toHaveBeenCalledWith('mission-1');
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
        MissionOfflineService,
        { provide: MissionDatabaseService, useValue: {} },
        { provide: MissionOutboxStore, useValue: outbox },
        { provide: MissionWorkspaceRepository, useValue: workspace },
      ],
    });

    await TestBed.inject(MissionOfflineService).saveWorkspace(
      { id: 'mission-1' } as MissionOutput,
      [],
      [],
      [],
      [],
      { replace: false },
    );

    expect(workspace.saveWorkspace).toHaveBeenCalledOnce();
  });
});
