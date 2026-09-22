import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, Subject, throwError } from 'rxjs';
import type { ApiError, HydraCollection } from '@core/api/models';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import {
  FacilityAttachmentService,
  FacilityService,
} from '@features/organization/features/facilities/data-access';
import type {
  FacilityAttachmentOutput,
  FacilityOutput,
  FacilityPlanOverlayOutput,
} from '@features/organization/features/facilities/models';
import { FacilityPlansStore, type FacilityPlansStoreType } from '../facility-plans.store';

const flushEffects = async (): Promise<void> => {
  const testBedWithFlush = TestBed as typeof TestBed & {
    flushEffects?: () => void;
  };

  testBedWithFlush.flushEffects?.();
  await Promise.resolve();
};

const apiError = (status: number, detail: string, code?: string): ApiError => ({
  code,
  '@id': '',
  '@type': 'Error',
  status,
  type: 'about:blank',
  title: 'Error',
  detail,
});

const plan = (overrides: Partial<FacilityAttachmentOutput> = {}): FacilityAttachmentOutput => ({
  '@id': `/api/facility-attachments/${overrides.id ?? 'plan-1'}`,
  '@type': 'FacilityAttachment',
  id: 'plan-1',
  facilityId: 'facility-1',
  fileName: 'ground-floor.png',
  mimeType: 'image/png',
  size: 2048,
  kind: 'floor_plan',
  isPrimaryPlan: false,
  imageWidth: 1200,
  imageHeight: 800,
  revision: 1,
  uploadedAt: '2026-08-01T00:00:00+00:00',
  ...overrides,
});

const overlay = (
  overrides: Partial<FacilityPlanOverlayOutput> = {},
): FacilityPlanOverlayOutput => ({
  attachmentId: 'plan-1',
  imageWidth: 1200,
  imageHeight: 800,
  zones: [],
  equipment: [],
  ...overrides,
});

const zoneFacility = (overrides: Partial<FacilityOutput> = {}): FacilityOutput => ({
  '@id': `/api/facilities/${overrides.id ?? 'zone-1'}`,
  '@type': 'Facility',
  id: 'zone-1',
  organizationId: 'org-1',
  parentFacilityId: 'facility-1',
  hasChildren: false,
  type: 'zone',
  name: 'Zone A',
  code: null,
  status: 'active',
  address: null,
  metadata: {},
  path: [],
  createdAt: '2026-08-01T00:00:00+00:00',
  updatedAt: '2026-08-01T00:00:00+00:00',
  ...overrides,
});

const facilityEquipment = (overrides: Partial<EquipmentOutput> = {}): EquipmentOutput => ({
  '@id': `/api/equipment/${overrides.id ?? 'equipment-1'}`,
  '@type': 'Equipment',
  id: 'equipment-1',
  organizationId: 'org-1',
  facilityId: 'facility-1',
  type: 'fire_extinguisher',
  subType: null,
  brand: null,
  model: null,
  serialNumber: null,
  locationLabel: null,
  facilityName: 'Facility 1',
  status: 'operational',
  installedAt: null,
  commissionedAt: null,
  tags: [],
  maintenanceDueStatus: 'unscheduled',
  createdAt: '2026-08-01T00:00:00+00:00',
  updatedAt: '2026-08-01T00:00:00+00:00',
  ...overrides,
});

describe('FacilityPlansStore', () => {
  let store: FacilityPlansStoreType;
  let mockService: {
    list: ReturnType<typeof vi.fn>;
    upload: ReturnType<typeof vi.fn>;
    setPrimary: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    download: ReturnType<typeof vi.fn>;
  };
  let mockFacilityService: {
    getPlanOverlay: ReturnType<typeof vi.fn>;
    setPlanGeometry: ReturnType<typeof vi.fn>;
    listChildren: ReturnType<typeof vi.fn>;
  };
  let mockEquipmentService: {
    setPlanPosition: ReturnType<typeof vi.fn>;
    listByFacility: ReturnType<typeof vi.fn>;
  };
  let mockDispatcher: { dispatch: ReturnType<typeof vi.fn> };

  function loadReadyPlan(): void {
    mockService.list.mockReturnValue(
      of({ '@id': '', '@type': 'Collection', member: [plan()], totalItems: 1 }),
    );
    store.load({ facilityId: 'facility-1', organizationId: 'org-1' });
    TestBed.tick();
    expect(store.selectedPlanReady()).toBe(true);
  }

  beforeEach(() => {
    const emptyCollection = { '@id': '', '@type': 'Collection', member: [], totalItems: 0 };

    mockService = {
      list: vi.fn().mockReturnValue(of(emptyCollection)),
      upload: vi.fn(),
      setPrimary: vi.fn(),
      remove: vi.fn(),
      download: vi.fn().mockReturnValue(of(new Blob(['plan'], { type: 'image/png' }))),
    };
    mockFacilityService = {
      getPlanOverlay: vi.fn().mockReturnValue(of(overlay())),
      setPlanGeometry: vi.fn().mockReturnValue(of(undefined)),
      listChildren: vi.fn().mockReturnValue(of(emptyCollection)),
    };
    mockEquipmentService = {
      setPlanPosition: vi.fn().mockReturnValue(of(undefined)),
      listByFacility: vi.fn().mockReturnValue(of(emptyCollection)),
    };
    mockDispatcher = { dispatch: vi.fn() };

    vi.spyOn(URL, 'createObjectURL').mockImplementation(
      (): string => `blob:${Math.random().toString(36).slice(2)}`,
    );
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation((): void => undefined);

    TestBed.configureTestingModule({
      providers: [
        FacilityPlansStore,
        { provide: FacilityAttachmentService, useValue: mockService },
        { provide: FacilityService, useValue: mockFacilityService },
        { provide: EquipmentService, useValue: mockEquipmentService },
        { provide: Dispatcher, useValue: mockDispatcher },
      ],
    });

    store = TestBed.inject(FacilityPlansStore);
  });

  it('starts idle with no plans', () => {
    expect(store.orderedPlans()).toEqual([]);
    expect(store.selectedPlan()).toBeNull();
    expect(store.isLoading()).toBe(false);
    expect(store.planImageUrl()).toBeNull();
    expect(store.overlay()).toBeNull();
    expect(store.showZones()).toBe(true);
    expect(store.showEquipment()).toBe(true);
  });

  describe('load', () => {
    it('populates the plan entities on success', () => {
      const primary = plan({ id: 'plan-1', isPrimaryPlan: true });
      const secondary = plan({ id: 'plan-2', fileName: 'level-2.png', isPrimaryPlan: false });
      mockService.list.mockReturnValue(
        of({ '@id': '', '@type': 'Collection', member: [secondary, primary], totalItems: 2 }),
      );

      store.load({ facilityId: 'facility-1', organizationId: 'org-1' });

      expect(mockService.list).toHaveBeenCalledWith('facility-1', 'floor_plan');
      expect(store.orderedPlans().map((item: FacilityAttachmentOutput) => item.id)).toEqual([
        'plan-1',
        'plan-2',
      ]);
      expect(store.selectedPlan()?.id).toBe('plan-1');
      expect(store.listCallState().status).toBe('success');
    });

    it('carries the normalized error on failure', () => {
      mockService.list.mockReturnValue(throwError(() => apiError(500, 'boom')));

      store.load({ facilityId: 'facility-1', organizationId: 'org-1' });

      expect(store.listCallState().status).toBe('error');
      expect(store.listCallState().error?.message).toBe('boom');
    });
  });

  describe('upload', () => {
    it('adds the uploaded plan and selects it', () => {
      const uploaded = plan({ id: 'plan-new' });
      mockService.upload.mockReturnValue(of(uploaded));
      const file = new File(['plan'], 'ground-floor.png', { type: 'image/png' });

      store.upload({ facilityId: 'facility-1', file });

      expect(mockService.upload).toHaveBeenCalledWith(
        'facility-1',
        file,
        'ground-floor.png',
        'floor_plan',
      );
      expect(store.orderedPlans().map((item: FacilityAttachmentOutput) => item.id)).toEqual([
        'plan-new',
      ]);
      expect(store.uploadCallState().status).toBe('success');
    });

    it('surfaces the upload error', () => {
      mockService.upload.mockReturnValue(throwError(() => apiError(422, 'Not an image')));
      const file = new File(['plan'], 'doc.pdf', { type: 'application/pdf' });

      store.upload({ facilityId: 'facility-1', file });

      expect(store.uploadCallState().status).toBe('error');
      expect(store.uploadCallState().error?.message).toBe('Not an image');
    });
  });

  describe('setPrimary', () => {
    it('swaps the primary flag between the previous and the new plan', () => {
      mockService.list.mockReturnValue(
        of({
          '@id': '',
          '@type': 'Collection',
          member: [
            plan({ id: 'plan-1', isPrimaryPlan: true }),
            plan({ id: 'plan-2', fileName: 'level-2.png', isPrimaryPlan: false }),
          ],
          totalItems: 2,
        }),
      );
      store.load({ facilityId: 'facility-1', organizationId: 'org-1' });

      mockService.setPrimary.mockReturnValue(of(plan({ id: 'plan-2', isPrimaryPlan: true })));
      store.setPrimary({ attachmentId: 'plan-2' });

      expect(store.planEntityMap()['plan-1']?.isPrimaryPlan).toBe(false);
      expect(store.planEntityMap()['plan-2']?.isPrimaryPlan).toBe(true);
      expect(store.setPrimaryCallState().status).toBe('success');
      expect(store.settingPrimaryId()).toBeNull();
    });
  });

  describe('remove', () => {
    it('drops the plan from the collection', () => {
      mockService.list.mockReturnValue(
        of({
          '@id': '',
          '@type': 'Collection',
          member: [plan({ id: 'plan-1' })],
          totalItems: 1,
        }),
      );
      store.load({ facilityId: 'facility-1', organizationId: 'org-1' });

      mockService.remove.mockReturnValue(of(undefined));
      store.remove({ attachmentId: 'plan-1', revision: 1 });

      expect(mockService.remove).toHaveBeenCalledWith('plan-1', 1);
      expect(store.orderedPlans()).toEqual([]);
      expect(store.deleteCallState().status).toBe('success');
      expect(store.deletingId()).toBeNull();
    });

    it('surfaces the delete error and clears the pending row lock', () => {
      mockService.remove.mockReturnValue(throwError(() => apiError(409, 'conflict')));

      store.remove({ attachmentId: 'plan-1', revision: 1 });

      expect(store.deleteCallState().status).toBe('error');
      expect(store.deletingId()).toBeNull();
    });
  });

  describe('selectPlan', () => {
    it('overrides the default primary-first selection', () => {
      mockService.list.mockReturnValue(
        of({
          '@id': '',
          '@type': 'Collection',
          member: [
            plan({ id: 'plan-1', isPrimaryPlan: true }),
            plan({ id: 'plan-2', fileName: 'level-2.png' }),
          ],
          totalItems: 2,
        }),
      );
      store.load({ facilityId: 'facility-1', organizationId: 'org-1' });

      store.selectPlan('plan-2');

      expect(store.selectedPlan()?.id).toBe('plan-2');
    });
  });

  describe('image loading', () => {
    it('fetches the selected plan bytes and republishes them as an object URL', async () => {
      mockService.list.mockReturnValue(
        of({
          '@id': '',
          '@type': 'Collection',
          member: [plan({ id: 'plan-1', isPrimaryPlan: true })],
          totalItems: 1,
        }),
      );

      store.load({ facilityId: 'facility-1', organizationId: 'org-1' });
      await flushEffects();

      expect(mockService.download).toHaveBeenCalledWith('plan-1');
      expect(store.planImageUrl()).toMatch(/^blob:/);
      expect(store.imageCallState().status).toBe('success');
    });

    it('revokes the previous object URL when the selection changes', async () => {
      mockService.list.mockReturnValue(
        of({
          '@id': '',
          '@type': 'Collection',
          member: [
            plan({ id: 'plan-1', isPrimaryPlan: true }),
            plan({ id: 'plan-2', fileName: 'level-2.png' }),
          ],
          totalItems: 2,
        }),
      );
      store.load({ facilityId: 'facility-1', organizationId: 'org-1' });
      await flushEffects();
      const firstUrl = store.planImageUrl();

      store.selectPlan('plan-2');
      await flushEffects();

      expect(URL.revokeObjectURL).toHaveBeenCalledWith(firstUrl);
      expect(mockService.download).toHaveBeenCalledWith('plan-2');
      expect(store.planImageUrl()).not.toBe(firstUrl);
    });

    it('surfaces the image download error without touching the plan list', async () => {
      mockService.list.mockReturnValue(
        of({
          '@id': '',
          '@type': 'Collection',
          member: [plan({ id: 'plan-1', isPrimaryPlan: true })],
          totalItems: 1,
        }),
      );
      mockService.download.mockReturnValue(throwError(() => apiError(404, 'not found')));

      store.load({ facilityId: 'facility-1', organizationId: 'org-1' });
      await flushEffects();

      expect(store.imageCallState().status).toBe('error');
      expect(store.planImageUrl()).toBeNull();
      expect(mockDispatcher.dispatch).toHaveBeenCalled();
    });
  });

  describe('overlay loading', () => {
    it('fetches the selected plan overlay alongside its image', async () => {
      mockService.list.mockReturnValue(
        of({
          '@id': '',
          '@type': 'Collection',
          member: [plan({ id: 'plan-1', isPrimaryPlan: true })],
          totalItems: 1,
        }),
      );
      const loaded = overlay({
        zones: [
          {
            facilityId: 'facility-zone-1',
            name: 'Zone A',
            type: 'zone',
            status: 'active',
            points: [
              [0, 0],
              [1, 0],
              [1, 1],
            ],
          },
        ],
        equipment: [
          {
            equipmentId: 'equipment-1',
            type: 'fire_extinguisher',
            serialNumber: 'SN-1',
            locationLabel: 'Extinguisher',
            status: 'operational',
            x: 0.5,
            y: 0.5,
          },
        ],
      });
      mockFacilityService.getPlanOverlay.mockReturnValue(of(loaded));

      store.load({ facilityId: 'facility-1', organizationId: 'org-1' });
      await flushEffects();

      expect(mockFacilityService.getPlanOverlay).toHaveBeenCalledWith(
        'org-1',
        'facility-1',
        'plan-1',
      );
      expect(store.overlay()).toEqual(loaded);
      expect(store.overlayCallState().status).toBe('success');
      expect(store.overlayHasContent()).toBe(true);
    });

    it('surfaces the overlay load error and dispatches a failure event', async () => {
      mockService.list.mockReturnValue(
        of({
          '@id': '',
          '@type': 'Collection',
          member: [plan({ id: 'plan-1', isPrimaryPlan: true })],
          totalItems: 1,
        }),
      );
      mockFacilityService.getPlanOverlay.mockReturnValue(throwError(() => apiError(404, 'gone')));

      store.load({ facilityId: 'facility-1', organizationId: 'org-1' });
      await flushEffects();

      expect(store.overlayCallState().status).toBe('error');
      expect(store.overlay()).toBeNull();
      expect(mockDispatcher.dispatch).toHaveBeenCalled();
    });

    it('reports no content for an overlay with neither zones nor equipment', async () => {
      mockService.list.mockReturnValue(
        of({
          '@id': '',
          '@type': 'Collection',
          member: [plan({ id: 'plan-1', isPrimaryPlan: true })],
          totalItems: 1,
        }),
      );
      mockFacilityService.getPlanOverlay.mockReturnValue(of(overlay()));

      store.load({ facilityId: 'facility-1', organizationId: 'org-1' });
      await flushEffects();

      expect(store.overlayHasContent()).toBe(false);
    });
  });

  describe('layer toggles', () => {
    it('sets showZones and showEquipment independently', () => {
      store.setShowZones(false);
      expect(store.showZones()).toBe(false);
      expect(store.showEquipment()).toBe(true);

      store.setShowEquipment(false);
      expect(store.showEquipment()).toBe(false);
    });
  });

  describe('editor mode', () => {
    beforeEach(() => loadReadyPlan());
    it('enters draw-zone mode with an empty draft', () => {
      store.enterDrawZoneMode('zone-1');

      expect(store.editMode()).toBe('draw-zone');
      expect(store.draftPoints()).toEqual([]);
    });

    it('enters place-pin mode, clearing any draw-zone target', () => {
      store.enterDrawZoneMode('zone-1');
      store.enterPlacePinMode('equipment-1');

      expect(store.editMode()).toBe('place-pin');
    });

    it('adds and undoes draft vertices only in draw-zone mode', () => {
      store.addDraftVertex([0.1, 0.1]);
      expect(store.draftPoints()).toEqual([]);

      store.enterDrawZoneMode('zone-1');
      store.addDraftVertex([0.1, 0.1]);
      store.addDraftVertex([0.2, 0.2]);
      expect(store.draftPoints()).toEqual([
        [0.1, 0.1],
        [0.2, 0.2],
      ]);

      store.undoDraftVertex();
      expect(store.draftPoints()).toEqual([[0.1, 0.1]]);
    });

    it('cancelEditing resets mode, target and draft', () => {
      store.enterDrawZoneMode('zone-1');
      store.addDraftVertex([0.1, 0.1]);

      store.cancelEditing();

      expect(store.editMode()).toBe('none');
      expect(store.draftPoints()).toEqual([]);
    });
  });

  describe('finishDrawZone', () => {
    it('does nothing below three vertices', () => {
      loadReadyPlan();
      store.enterDrawZoneMode('zone-1');
      store.addDraftVertex([0.1, 0.1]);

      store.finishDrawZone();

      expect(mockFacilityService.setPlanGeometry).not.toHaveBeenCalled();
    });

    it('writes the outline and reloads the overlay on success', async () => {
      mockService.list.mockReturnValue(
        of({
          '@id': '',
          '@type': 'Collection',
          member: [plan({ id: 'plan-1', isPrimaryPlan: true })],
          totalItems: 1,
        }),
      );
      mockFacilityService.setPlanGeometry.mockReturnValue(of(undefined));
      loadReadyPlan();
      await flushEffects();
      mockFacilityService.getPlanOverlay.mockClear();

      store.enterDrawZoneMode('zone-1');
      store.addDraftVertex([0, 0]);
      store.addDraftVertex([1, 0]);
      store.addDraftVertex([1, 1]);
      store.finishDrawZone();

      expect(mockFacilityService.setPlanGeometry).toHaveBeenCalledWith('org-1', 'zone-1', {
        attachmentId: 'plan-1',
        points: [
          [0, 0],
          [1, 0],
          [1, 1],
        ],
      });
      expect(store.saveZoneGeometryCallState().status).toBe('success');
      expect(store.editMode()).toBe('none');
      expect(store.draftPoints()).toEqual([]);
      expect(mockFacilityService.getPlanOverlay).toHaveBeenCalledWith(
        'org-1',
        'facility-1',
        'plan-1',
      );
    });

    it('uses the ancestry code and preserves the polygon after refreshing the overlay', () => {
      mockService.list.mockReturnValue(
        of({
          '@id': '',
          '@type': 'Collection',
          member: [plan({ id: 'plan-1', isPrimaryPlan: true })],
          totalItems: 1,
        }),
      );
      mockFacilityService.setPlanGeometry.mockReturnValue(
        throwError(() => apiError(409, 'raw backend detail', 'floor_plan_outside_ancestry')),
      );
      loadReadyPlan();

      store.enterDrawZoneMode('zone-1');
      store.addDraftVertex([0, 0]);
      store.addDraftVertex([1, 0]);
      store.addDraftVertex([1, 1]);
      store.finishDrawZone();

      expect(store.saveZoneGeometryCallState().status).toBe('error');
      const dispatched = mockDispatcher.dispatch.mock.calls.at(-1)?.[0];
      expect(dispatched.payload.message).toContain('ancestry');
      expect(store.draftPoints()).toEqual([
        [0, 0],
        [1, 0],
        [1, 1],
      ]);
      expect(store.editMode()).toBe('draw-zone');
      expect(mockFacilityService.getPlanOverlay).toHaveBeenCalledWith(
        'org-1',
        'facility-1',
        'plan-1',
      );
    });
  });

  describe('clearZoneGeometry', () => {
    it('writes null attachment and points', () => {
      mockFacilityService.setPlanGeometry.mockReturnValue(of(undefined));
      loadReadyPlan();

      store.clearZoneGeometry('zone-1');

      expect(mockFacilityService.setPlanGeometry).toHaveBeenCalledWith('org-1', 'zone-1', {
        attachmentId: null,
        points: null,
      });
    });
  });

  describe('placePin / movePin / removePinFromPlan', () => {
    it('placePin is a no-op outside place-pin mode', () => {
      loadReadyPlan();

      store.placePin([0.5, 0.5]);

      expect(mockEquipmentService.setPlanPosition).not.toHaveBeenCalled();
    });

    it('placePin writes the position and leaves place-pin mode on success', () => {
      mockEquipmentService.setPlanPosition.mockReturnValue(of(undefined));
      mockService.list.mockReturnValue(
        of({
          '@id': '',
          '@type': 'Collection',
          member: [plan({ id: 'plan-1', isPrimaryPlan: true })],
          totalItems: 1,
        }),
      );
      loadReadyPlan();
      store.enterPlacePinMode('equipment-1');

      store.placePin([0.4, 0.6]);

      expect(mockEquipmentService.setPlanPosition).toHaveBeenCalledWith('org-1', 'equipment-1', {
        attachmentId: 'plan-1',
        x: 0.4,
        y: 0.6,
      });
      expect(store.savePinPositionCallState().status).toBe('success');
      expect(store.editMode()).toBe('none');
    });

    it('movePin writes without requiring place-pin mode', () => {
      mockEquipmentService.setPlanPosition.mockReturnValue(of(undefined));
      mockService.list.mockReturnValue(
        of({
          '@id': '',
          '@type': 'Collection',
          member: [plan({ id: 'plan-1', isPrimaryPlan: true })],
          totalItems: 1,
        }),
      );
      loadReadyPlan();

      store.movePin('equipment-2', [0.1, 0.9]);

      expect(mockEquipmentService.setPlanPosition).toHaveBeenCalledWith('org-1', 'equipment-2', {
        attachmentId: 'plan-1',
        x: 0.1,
        y: 0.9,
      });
    });

    it('removePinFromPlan writes null attachment and coordinates', () => {
      mockEquipmentService.setPlanPosition.mockReturnValue(of(undefined));
      loadReadyPlan();

      store.removePinFromPlan('equipment-1');

      expect(mockEquipmentService.setPlanPosition).toHaveBeenCalledWith('org-1', 'equipment-1', {
        attachmentId: null,
        x: null,
        y: null,
      });
    });

    it('rewords a 409 into the assignment constraint message', () => {
      mockEquipmentService.setPlanPosition.mockReturnValue(
        throwError(() => apiError(409, 'raw backend detail', 'equipment_facility_required')),
      );
      loadReadyPlan();

      store.removePinFromPlan('equipment-1');

      expect(store.savePinPositionCallState().status).toBe('error');
      const dispatched = mockDispatcher.dispatch.mock.calls.at(-1)?.[0];
      expect(dispatched.payload.message).toContain('assigned');
    });
  });

  it('keeps an accepted pin write active when the member submits twice', () => {
    const write = new Subject<EquipmentOutput>();
    mockEquipmentService.setPlanPosition.mockReturnValue(write);
    loadReadyPlan();
    store.removePinFromPlan('equipment-1');
    store.removePinFromPlan('equipment-1');
    expect(mockEquipmentService.setPlanPosition).toHaveBeenCalledTimes(1);
    expect(store.savePinPositionCallState().status).toBe('pending');
    write.next(facilityEquipment());
    write.complete();
    expect(store.savePinPositionCallState().status).toBe('success');
  });

  describe('selection ownership', () => {
    it('hides old bytes synchronously and waits for both current resources before editing', () => {
      loadReadyPlan();
      const oldUrl = store.planImageUrl();
      const imageB = new Subject<Blob>();
      const overlayB = new Subject<FacilityPlanOverlayOutput>();
      mockService.list.mockReturnValue(
        of({
          '@id': '',
          '@type': 'Collection',
          member: [plan(), plan({ id: 'plan-2' })],
          totalItems: 2,
        }),
      );
      store.load({ organizationId: 'org-1', facilityId: 'facility-1' });
      store.enterDrawZoneMode('zone-1');
      store.addDraftVertex([0, 0]);
      mockService.download.mockReturnValue(imageB);
      mockFacilityService.getPlanOverlay.mockReturnValue(overlayB);

      store.selectPlan('plan-2');
      expect(store.planImageUrl()).toBeNull();
      expect(store.overlay()).toBeNull();
      expect(store.editMode()).toBe('none');
      expect(store.draftPoints()).toEqual([]);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(oldUrl);
      TestBed.tick();
      imageB.next(new Blob(['B']));
      expect(store.selectedPlanReady()).toBe(false);
      store.movePin('equipment-1', [0.2, 0.3]);
      expect(mockEquipmentService.setPlanPosition).not.toHaveBeenCalled();
      overlayB.next(overlay({ attachmentId: 'plan-2' }));
      expect(store.selectedPlanReady()).toBe(true);
      store.movePin('equipment-1', [0.2, 0.3]);
      expect(mockEquipmentService.setPlanPosition).toHaveBeenCalledWith('org-1', 'equipment-1', {
        attachmentId: 'plan-2',
        x: 0.2,
        y: 0.3,
      });
    });

    it('cancels A reads through A-B-A and cancels reads when selection disappears', () => {
      const imageA = new Subject<Blob>();
      const overlayA = new Subject<FacilityPlanOverlayOutput>();
      mockService.download.mockReturnValue(imageA);
      mockFacilityService.getPlanOverlay.mockReturnValue(overlayA);
      mockService.list.mockReturnValue(
        of({
          '@id': '',
          '@type': 'Collection',
          member: [plan(), plan({ id: 'plan-2' })],
          totalItems: 2,
        }),
      );
      store.load({ organizationId: 'org-1', facilityId: 'facility-1' });
      TestBed.tick();
      store.selectPlan('plan-2');
      expect(imageA.observed).toBe(false);
      expect(overlayA.observed).toBe(false);
      const currentImage = new Subject<Blob>();
      const currentOverlay = new Subject<FacilityPlanOverlayOutput>();
      mockService.download.mockReturnValue(currentImage);
      mockFacilityService.getPlanOverlay.mockReturnValue(currentOverlay);
      store.selectPlan('plan-1');
      TestBed.tick();
      expect(currentImage.observed).toBe(true);
      expect(currentOverlay.observed).toBe(true);
      imageA.next(new Blob(['stale']));
      overlayA.next(overlay());
      expect(store.selectedPlanReady()).toBe(false);
      store.reset();
      expect(currentImage.observed).toBe(false);
      expect(currentOverlay.observed).toBe(false);
      currentImage.next(new Blob(['late']));
      expect(store.planImageUrl()).toBeNull();
      expect(store.overlay()).toBeNull();
    });

    it('keeps a failed selection uneditable and permits a fresh read', () => {
      loadReadyPlan();
      mockService.download.mockReturnValue(throwError(() => apiError(500, 'failed')));
      store.loadImage({ attachmentId: 'plan-1' });
      expect(store.selectedPlanReady()).toBe(false);
      expect(store.planImageUrl()).toBeNull();
      store.enterPlacePinMode('equipment-1');
      store.removePinFromPlan('equipment-1');
      expect(store.editMode()).toBe('none');
      expect(mockEquipmentService.setPlanPosition).not.toHaveBeenCalled();
      mockService.download.mockReturnValue(of(new Blob(['retry'])));
      store.loadImage({ attachmentId: 'plan-1' });
      expect(store.selectedPlanReady()).toBe(true);
    });

    it('does not settle a new facility editor when an old pin write completes', () => {
      loadReadyPlan();
      const write = new Subject<EquipmentOutput>();
      mockEquipmentService.setPlanPosition.mockReturnValue(write);
      store.movePin('equipment-1', [0.2, 0.3]);
      store.load({ organizationId: 'org-2', facilityId: 'facility-2' });
      TestBed.tick();
      write.next(facilityEquipment());
      write.complete();
      expect(store.savePinPositionCallState().status).toBe('idle');
      expect(mockDispatcher.dispatch).not.toHaveBeenCalled();
    });
  });

  describe('candidate lists', () => {
    it('loads and filters zone candidates to zone/area descendants', () => {
      mockFacilityService.listChildren.mockReturnValue(
        of({
          '@id': '',
          '@type': 'Collection',
          member: [
            zoneFacility({ id: 'zone-1', type: 'zone' }),
            zoneFacility({ id: 'floor-1', type: 'floor', name: 'Floor 1' }),
            zoneFacility({ id: 'area-1', type: 'area', name: 'Area 1' }),
          ],
          totalItems: 3,
        }),
      );
      store.load({ facilityId: 'facility-1', organizationId: 'org-1' });

      store.ensureZoneCandidatesLoaded();

      expect(mockFacilityService.listChildren).toHaveBeenCalledWith('org-1', 'facility-1', {
        itemsPerPage: 200,
      });
      expect(store.zoneCandidates().map((candidate) => candidate.id)).toEqual(['zone-1', 'area-1']);
    });

    it('does not re-fetch once already loading or loaded', () => {
      mockFacilityService.listChildren.mockReturnValue(
        of({ '@id': '', '@type': 'Collection', member: [], totalItems: 0 }),
      );
      store.load({ facilityId: 'facility-1', organizationId: 'org-1' });

      store.ensureZoneCandidatesLoaded();
      store.ensureZoneCandidatesLoaded();

      expect(mockFacilityService.listChildren).toHaveBeenCalledTimes(1);
    });

    it('excludes zone candidates already drawn on the selected plan overlay', async () => {
      mockFacilityService.listChildren.mockReturnValue(
        of({
          '@id': '',
          '@type': 'Collection',
          member: [zoneFacility({ id: 'zone-1' }), zoneFacility({ id: 'zone-2', name: 'Zone B' })],
          totalItems: 2,
        }),
      );
      mockService.list.mockReturnValue(
        of({
          '@id': '',
          '@type': 'Collection',
          member: [plan({ id: 'plan-1', isPrimaryPlan: true })],
          totalItems: 1,
        }),
      );
      mockFacilityService.getPlanOverlay.mockReturnValue(
        of(
          overlay({
            zones: [
              {
                facilityId: 'zone-1',
                name: 'Zone A',
                type: 'zone',
                status: 'active',
                points: [
                  [0, 0],
                  [1, 0],
                  [1, 1],
                ],
              },
            ],
          }),
        ),
      );
      store.load({ facilityId: 'facility-1', organizationId: 'org-1' });
      await flushEffects();

      store.ensureZoneCandidatesLoaded();

      expect(store.availableZoneCandidates().map((candidate) => candidate.id)).toEqual(['zone-2']);
    });

    it('loads facility equipment candidates', () => {
      mockEquipmentService.listByFacility.mockReturnValue(
        of({
          '@id': '',
          '@type': 'Collection',
          member: [facilityEquipment({ id: 'equipment-1' })],
          totalItems: 1,
        }),
      );
      store.load({ facilityId: 'facility-1', organizationId: 'org-1' });

      store.ensureFacilityEquipmentLoaded();

      expect(mockEquipmentService.listByFacility).toHaveBeenCalledWith('org-1', 'facility-1', {
        itemsPerPage: 200,
      });
      expect(store.facilityEquipment().map((item) => item.id)).toEqual(['equipment-1']);
    });
  });
  describe('commands across replaced contexts', () => {
    it('keeps uploads accepted in different facilities independent without installing the old plan', () => {
      loadReadyPlan();
      const first = new Subject<FacilityAttachmentOutput>();
      const second = new Subject<FacilityAttachmentOutput>();
      mockService.upload.mockReturnValueOnce(first).mockReturnValueOnce(second);
      const file = new File(['plan'], 'plan.png', { type: 'image/png' });
      store.upload({ facilityId: 'facility-1', file });
      mockService.list.mockReturnValue(
        of({
          '@id': '',
          '@type': 'Collection',
          member: [plan({ id: 'plan-b', facilityId: 'facility-2' })],
          totalItems: 1,
        }),
      );
      store.load({ organizationId: 'org-2', facilityId: 'facility-2' });
      store.upload({ facilityId: 'facility-2', file });
      expect(first.observed).toBe(true);
      expect(mockService.upload).toHaveBeenCalledTimes(2);
      first.next(plan({ id: 'old-upload' }));
      expect(store.orderedPlans().map((entry) => entry.id)).toEqual(['plan-b']);
      expect(store.uploadCallState().status).toBe('pending');
      expect(mockDispatcher.dispatch).not.toHaveBeenCalled();
      second.next(plan({ id: 'new-upload', facilityId: 'facility-2' }));
      expect(store.selectedPlan()?.id).toBe('new-upload');
      expect(store.uploadCallState().status).toBe('success');
    });

    it('ignores old primary changes and removal failures after a facility replacement', () => {
      loadReadyPlan();
      const primary = new Subject<FacilityAttachmentOutput>();
      const removal = new Subject<void>();
      mockService.setPrimary.mockReturnValue(primary);
      mockService.remove.mockReturnValue(removal);
      store.setPrimary({ attachmentId: 'plan-1' });
      store.remove({ attachmentId: 'plan-1', revision: 1 });
      const planB = plan({ id: 'plan-b', facilityId: 'facility-2', isPrimaryPlan: true });
      mockService.list.mockReturnValue(
        of({ '@id': '', '@type': 'Collection', member: [planB], totalItems: 1 }),
      );
      store.load({ organizationId: 'org-2', facilityId: 'facility-2' });
      primary.next(plan({ isPrimaryPlan: true }));
      removal.error(apiError(409, 'old revision'));
      expect(store.orderedPlans()).toEqual([planB]);
      expect(store.primaryPlan()).toEqual(planB);
      expect(store.setPrimaryCallState().status).toBe('idle');
      expect(store.deleteCallState().status).toBe('idle');
      expect(mockDispatcher.dispatch).not.toHaveBeenCalled();
    });

    it('accepts a pin move on a new selection while the previous selection write remains pending', () => {
      mockService.list.mockReturnValue(
        of({
          '@id': '',
          '@type': 'Collection',
          member: [plan(), plan({ id: 'plan-2' })],
          totalItems: 2,
        }),
      );
      store.load({ organizationId: 'org-1', facilityId: 'facility-1' });
      TestBed.tick();
      const first = new Subject<EquipmentOutput>();
      const second = new Subject<EquipmentOutput>();
      mockEquipmentService.setPlanPosition.mockReturnValueOnce(first).mockReturnValueOnce(second);
      store.movePin('equipment-1', [0.1, 0.2]);
      store.selectPlan('plan-2');
      TestBed.tick();
      store.movePin('equipment-2', [0.3, 0.4]);
      expect(first.observed).toBe(true);
      expect(mockEquipmentService.setPlanPosition).toHaveBeenCalledTimes(2);
      first.next(facilityEquipment());
      expect(store.savePinPositionCallState().status).toBe('pending');
      expect(mockDispatcher.dispatch).not.toHaveBeenCalled();
      second.next(facilityEquipment({ id: 'equipment-2' }));
      expect(store.savePinPositionCallState().status).toBe('success');
    });

    it('accepts a new zone command after A to B to A and does not settle it with the first A result', () => {
      mockService.list.mockReturnValue(
        of({
          '@id': '',
          '@type': 'Collection',
          member: [plan(), plan({ id: 'plan-2' })],
          totalItems: 2,
        }),
      );
      store.load({ organizationId: 'org-1', facilityId: 'facility-1' });
      TestBed.tick();
      const first = new Subject<void>();
      const second = new Subject<void>();
      mockFacilityService.setPlanGeometry.mockReturnValueOnce(first).mockReturnValueOnce(second);
      store.clearZoneGeometry('zone-1');
      store.selectPlan('plan-2');
      store.selectPlan('plan-1');
      TestBed.tick();
      store.clearZoneGeometry('zone-2');
      expect(first.observed).toBe(true);
      expect(mockFacilityService.setPlanGeometry).toHaveBeenCalledTimes(2);
      first.error(apiError(409, 'old zone failure'));
      expect(store.saveZoneGeometryCallState().status).toBe('pending');
      expect(mockDispatcher.dispatch).not.toHaveBeenCalled();
      second.next();
      expect(store.saveZoneGeometryCallState().status).toBe('success');
    });

    it('ignores duplicate upload requests without cancelling the accepted upload', () => {
      loadReadyPlan();
      const response = new Subject<FacilityAttachmentOutput>();
      mockService.upload.mockReturnValue(response);
      const file = new File(['plan'], 'plan.png', { type: 'image/png' });
      store.upload({ facilityId: 'facility-1', file });
      store.upload({ facilityId: 'facility-1', file });
      expect(mockService.upload).toHaveBeenCalledOnce();
      expect(response.observed).toBe(true);
      expect(store.uploadCallState().status).toBe('pending');
    });
  });

  describe('candidate context cancellation', () => {
    it('cancels both candidate reads when the facility changes and permits retry in the new context', () => {
      store.load({ organizationId: 'org-1', facilityId: 'facility-1' });
      const zones = new Subject<HydraCollection<FacilityOutput>>();
      const equipment = new Subject<HydraCollection<EquipmentOutput>>();
      mockFacilityService.listChildren.mockReturnValueOnce(zones);
      mockEquipmentService.listByFacility.mockReturnValueOnce(equipment);
      store.ensureZoneCandidatesLoaded();
      store.ensureFacilityEquipmentLoaded();
      store.reset();
      store.load({ organizationId: 'org-2', facilityId: 'facility-2' });
      expect(zones.observed).toBe(false);
      expect(equipment.observed).toBe(false);
      zones.next({ '@id': '', '@type': 'Collection', member: [zoneFacility()], totalItems: 1 });
      equipment.next({
        '@id': '',
        '@type': 'Collection',
        member: [facilityEquipment()],
        totalItems: 1,
      });
      expect(store.zoneCandidates()).toEqual([]);
      expect(store.facilityEquipment()).toEqual([]);
      store.ensureZoneCandidatesLoaded();
      store.ensureFacilityEquipmentLoaded();
      expect(mockFacilityService.listChildren).toHaveBeenLastCalledWith('org-2', 'facility-2', {
        itemsPerPage: 200,
      });
      expect(mockEquipmentService.listByFacility).toHaveBeenLastCalledWith('org-2', 'facility-2', {
        itemsPerPage: 200,
      });
    });

    it('keeps candidate loaders reusable after errors', () => {
      store.load({ organizationId: 'org-1', facilityId: 'facility-1' });
      mockFacilityService.listChildren.mockReturnValueOnce(
        throwError(() => apiError(500, 'offline')),
      );
      mockEquipmentService.listByFacility.mockReturnValueOnce(
        throwError(() => apiError(500, 'offline')),
      );
      store.ensureZoneCandidatesLoaded();
      store.ensureFacilityEquipmentLoaded();
      expect(store.zoneCandidatesCallState().status).toBe('error');
      expect(store.facilityEquipmentCallState().status).toBe('error');
      store.ensureZoneCandidatesLoaded();
      store.ensureFacilityEquipmentLoaded();
      expect(store.zoneCandidatesCallState().status).toBe('success');
      expect(store.facilityEquipmentCallState().status).toBe('success');
    });
  });
});
