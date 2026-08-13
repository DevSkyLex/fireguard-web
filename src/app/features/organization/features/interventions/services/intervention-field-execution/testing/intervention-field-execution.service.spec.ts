import { TestBed } from '@angular/core/testing';
import { ConnectivityService } from '@core/connectivity';
import { InterventionOfflineService } from '@features/organization/features/interventions/data-access';
import type { InterventionWorkItemOutput } from '@features/organization/features/interventions/models';
import { InterventionPhotoCompressorService } from '../../intervention-photo-compressor';
import { InterventionQrScannerService } from '../../intervention-qr-scanner';
import { InterventionSyncCoordinatorService } from '../../intervention-sync-coordinator';
import { InterventionFieldExecutionService } from '../intervention-field-execution.service';

const workItem = (
  overrides: Partial<InterventionWorkItemOutput> = {},
): InterventionWorkItemOutput =>
  ({
    id: 'wi-1',
    intervention: '/api/interventions/intervention-1',
    action: 'inspection',
    target: '/api/equipment/equipment-1',
    targetSummary: null,
    resultResource: null,
    assignee: null,
    assigneeProfile: null,
    source: 'planned',
    status: 'planned',
    required: true,
    skipReason: null,
    evidenceCount: 0,
    revision: 1,
    createdAt: '2026-01-05T09:00:00Z',
    updatedAt: '2026-01-05T09:00:00Z',
    ...overrides,
  }) as InterventionWorkItemOutput;

const configureScanner = (scan: ReturnType<typeof vi.fn>): void => {
  TestBed.configureTestingModule({
    providers: [
      InterventionFieldExecutionService,
      { provide: ConnectivityService, useValue: { isOffline: () => false } },
      { provide: InterventionOfflineService, useValue: {} },
      { provide: InterventionQrScannerService, useValue: { scan } },
      { provide: InterventionPhotoCompressorService, useValue: {} },
      { provide: InterventionSyncCoordinatorService, useValue: {} },
    ],
  });
};

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

  describe('scanToWorkItem', () => {
    it('returns the matching work item for a decoded canonical target', async () => {
      configureScanner(vi.fn().mockResolvedValue('/api/equipment/equipment-1'));
      const items = [workItem()];

      const result = await TestBed.inject(InterventionFieldExecutionService).scanToWorkItem(
        new File(['qr'], 'qr.png', { type: 'image/png' }),
        items,
      );

      expect(result).toEqual({ kind: 'matched', item: items[0] });
    });

    it('normalizes a bare equipment uuid before matching', async () => {
      const uuid = '00000000-0000-4000-8000-000000000001';
      configureScanner(vi.fn().mockResolvedValue(uuid));
      const items = [workItem({ target: `/api/equipment/${uuid}` })];

      const result = await TestBed.inject(InterventionFieldExecutionService).scanToWorkItem(
        new File(['qr'], 'qr.png', { type: 'image/png' }),
        items,
      );

      expect(result).toEqual({ kind: 'matched', item: items[0] });
    });

    it('reports unreadable when nothing could be decoded', async () => {
      configureScanner(vi.fn().mockResolvedValue(null));

      const result = await TestBed.inject(InterventionFieldExecutionService).scanToWorkItem(
        new File(['qr'], 'qr.png', { type: 'image/png' }),
        [workItem()],
      );

      expect(result).toEqual({ kind: 'unreadable' });
    });

    it('reports no match when the decoded target hits no work item', async () => {
      configureScanner(vi.fn().mockResolvedValue('/api/equipment/other-equipment'));

      const result = await TestBed.inject(InterventionFieldExecutionService).scanToWorkItem(
        new File(['qr'], 'qr.png', { type: 'image/png' }),
        [workItem()],
      );

      expect(result).toEqual({ kind: 'noMatch' });
    });
  });
});
