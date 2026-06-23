import { TestBed } from '@angular/core/testing';
import { ConnectivityService } from '@core/connectivity';
import { InterventionOfflineService } from '@features/organization/features/interventions/data-access';
import { InterventionPhotoCompressorService } from '../../intervention-photo-compressor';
import { InterventionQrScannerService } from '../../intervention-qr-scanner';
import { InterventionSyncCoordinatorService } from '../../intervention-sync-coordinator';
import { InterventionFieldExecutionService } from '../intervention-field-execution.service';

describe('InterventionFieldExecutionService', () => {
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
        InterventionFieldExecutionService,
        { provide: ConnectivityService, useValue: { isOffline: () => false } },
        { provide: InterventionOfflineService, useValue: offline },
        { provide: InterventionQrScannerService, useValue: {} },
        { provide: InterventionPhotoCompressorService, useValue: { compress: () => compressed } },
        { provide: InterventionSyncCoordinatorService, useValue: sync },
      ],
    });

    const queued = await TestBed.inject(InterventionFieldExecutionService).attachPhoto(
      'intervention-1',
      'equipment-1',
      compressed,
    );

    expect(offline.queue).toHaveBeenCalledWith('intervention-1', 'media.create', {
      clientId,
      equipmentId: 'equipment-1',
      file: compressed,
      fileName: 'photo.jpg',
    });
    expect(sync.syncAll).toHaveBeenCalledOnce();
    expect(queued).toBe(true);
  });
});
