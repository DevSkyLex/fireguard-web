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
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('prepares a stable facility creation intention within the active organization', () => {
    configureScanner(vi.fn());
    const plan = TestBed.inject(InterventionFieldExecutionService).prepareDiscoveryResource(
      'org-1',
      'intervention-1',
      { action: 'site_setup', target: 'New boiler room', result: 'pass' },
      'client-1',
    );

    expect(plan).toEqual({
      type: 'facility.create',
      payload: {
        clientId: 'client-1',
        organization: '/api/organizations/org-1',
        intervention: '/api/interventions/intervention-1',
        type: 'area',
        name: 'New boiler room',
      },
      targetResource: '/api/facilities/client-1',
    });
  });

  it('prepares discovered equipment with its client identifier and canonical target', () => {
    configureScanner(vi.fn());
    const plan = TestBed.inject(InterventionFieldExecutionService).prepareDiscoveryResource(
      'org-1',
      'intervention-1',
      { action: 'inventory', target: 'fire_extinguisher', result: 'pass' },
      'client-1',
    );

    expect(plan).toEqual({
      type: 'equipment.create',
      payload: {
        clientId: 'client-1',
        organization: '/api/organizations/org-1',
        intervention: '/api/interventions/intervention-1',
        type: 'fire_extinguisher',
      },
      targetResource: '/api/equipment/client-1',
    });
  });

  it('prepares inspection evidence with a canonical equipment id and the observation time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-22T10:00:00Z'));
    configureScanner(vi.fn());

    expect(
      TestBed.inject(InterventionFieldExecutionService).prepareDiscoveryResource(
        'org-1',
        'intervention-1',
        { action: 'inspection', target: '/api/equipment/equipment-1', result: 'fail' },
        'client-1',
      ),
    ).toEqual({
      type: 'inspection.create',
      payload: {
        clientId: 'client-1',
        organization: '/api/organizations/org-1',
        intervention: '/api/interventions/intervention-1',
        equipmentId: 'equipment-1',
        result: 'fail',
        performedAt: '2026-09-22T10:00:00.000Z',
        inspectorType: 'external',
        inspectorName: 'Field agent',
      },
      targetResource: '/api/equipment/equipment-1',
      resultResource: '/api/inspections/client-1',
    });
  });

  it.each(['equipment-1', '/api/facilities/facility-1', '/api/equipment/equipment-1?other=2'])(
    'refuses an invalid inspection target: %s',
    (target) => {
      configureScanner(vi.fn());

      expect(() =>
        TestBed.inject(InterventionFieldExecutionService).prepareDiscoveryResource(
          'org-1',
          'intervention-1',
          { action: 'inspection', target, result: 'pass' },
          'client-1',
        ),
      ).toThrow('Invalid equipment resource');
    },
  );

  it.each([true, false])('reports the scanner capability as %s', (supported) => {
    configureScanner(vi.fn());
    TestBed.overrideProvider(InterventionQrScannerService, {
      useValue: { isSupported: () => supported },
    });

    expect(TestBed.inject(InterventionFieldExecutionService).scanSupported()).toBe(supported);
  });

  it.each([true, false])(
    'preserves photo evidence until persisted and synchronizes only when online (%s)',
    async (offlineMode) => {
      const clientId = '00000000-0000-4000-8000-000000000002';
      const source = new File(['original'], 'photo.png', { type: 'image/png' });
      const compressed = new File(['compressed'], 'photo.jpg', { type: 'image/jpeg' });
      const queue = vi.fn().mockResolvedValue(undefined);
      const listOutbox = vi
        .fn()
        .mockResolvedValue(
          offlineMode
            ? [{ type: 'media.create', payload: { clientId } }]
            : [{ type: 'media.create', payload: { clientId: 'other-photo' } }],
        );
      const syncAll = vi.fn().mockResolvedValue(undefined);
      const compress = vi.fn().mockResolvedValue(compressed);
      vi.spyOn(crypto, 'randomUUID').mockReturnValue(clientId);
      TestBed.configureTestingModule({
        providers: [
          InterventionFieldExecutionService,
          { provide: ConnectivityService, useValue: { isOffline: () => offlineMode } },
          { provide: InterventionOfflineService, useValue: { queue, listOutbox } },
          { provide: InterventionQrScannerService, useValue: {} },
          { provide: InterventionPhotoCompressorService, useValue: { compress } },
          { provide: InterventionSyncCoordinatorService, useValue: { syncAll } },
        ],
      });

      expect(
        await TestBed.inject(InterventionFieldExecutionService).attachPhoto(
          'intervention-1',
          'equipment-1',
          source,
        ),
      ).toBe(offlineMode);
      expect(compress).toHaveBeenCalledExactlyOnceWith(source);
      expect(queue).toHaveBeenCalledExactlyOnceWith('intervention-1', 'media.create', {
        clientId,
        equipmentId: 'equipment-1',
        file: compressed,
        fileName: 'photo.jpg',
      });
      expect(syncAll).toHaveBeenCalledTimes(offlineMode ? 0 : 1);
      expect(listOutbox).toHaveBeenCalledExactlyOnceWith('intervention-1');
    },
  );

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
    it.each([
      ' https://fireguard.example/api/equipment/equipment-1?label=true ',
      ' /api/equipment/equipment-1 ',
    ])('matches an equipment URL after normalization: %s', async (decoded) => {
      configureScanner(vi.fn().mockResolvedValue(decoded));
      const item = workItem();

      expect(
        await TestBed.inject(InterventionFieldExecutionService).scanToWorkItem(
          new File(['qr'], 'qr.png'),
          [item],
        ),
      ).toEqual({ kind: 'matched', item });
    });

    it.each(['unreadable label text', 'https://fireguard.example/not-equipment'])(
      'keeps an unsupported decoded value unmatched: %s',
      async (decoded) => {
        configureScanner(vi.fn().mockResolvedValue(decoded));

        expect(
          await TestBed.inject(InterventionFieldExecutionService).scanToWorkItem(
            new File(['qr'], 'qr.png'),
            [workItem()],
          ),
        ).toEqual({ kind: 'noMatch' });
      },
    );

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
