import { TestBed } from '@angular/core/testing';
import { ConnectivityService } from '@core/services/connectivity';
import { MissionOfflineService } from '../../mission-offline';
import { MissionPhotoCompressorService } from '../../mission-photo-compressor';
import { MissionQrScannerService } from '../../mission-qr-scanner';
import { MissionSyncCoordinatorService } from '../../mission-sync-coordinator';
import { MissionFieldExecutionService } from '../mission-field-execution.service';

describe('MissionFieldExecutionService', () => {
  it('keeps a compressed photo in the outbox until upload succeeds', async () => {
    const clientId = '00000000-0000-4000-8000-000000000001';
    const compressed = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' });
    const offline = {
      queue: vi.fn().mockResolvedValue(undefined),
      listOutbox: vi.fn().mockResolvedValue([
        {
          id: 'operation-1',
          type: 'media.create',
          payload: { clientId },
        },
      ]),
    };
    const sync = { syncAll: vi.fn().mockResolvedValue(undefined) };
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(clientId);
    TestBed.configureTestingModule({
      providers: [
        MissionFieldExecutionService,
        { provide: ConnectivityService, useValue: { isOffline: () => false } },
        { provide: MissionOfflineService, useValue: offline },
        { provide: MissionQrScannerService, useValue: {} },
        { provide: MissionPhotoCompressorService, useValue: { compress: () => compressed } },
        { provide: MissionSyncCoordinatorService, useValue: sync },
      ],
    });

    const queued = await TestBed.inject(MissionFieldExecutionService).attachPhoto(
      'mission-1',
      'equipment-1',
      compressed,
    );

    expect(offline.queue).toHaveBeenCalledWith('mission-1', 'media.create', {
      clientId,
      equipmentId: 'equipment-1',
      file: compressed,
      fileName: 'photo.jpg',
    });
    expect(sync.syncAll).toHaveBeenCalledOnce();
    expect(queued).toBe(true);
  });
});
