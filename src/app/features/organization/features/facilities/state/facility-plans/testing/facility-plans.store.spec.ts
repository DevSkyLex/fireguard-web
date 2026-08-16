import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, throwError } from 'rxjs';
import type { ApiError } from '@core/api/models';
import { FacilityAttachmentService } from '@features/organization/features/facilities/data-access';
import type { FacilityAttachmentOutput } from '@features/organization/features/facilities/models';
import { FacilityPlansStore, type FacilityPlansStoreType } from '../facility-plans.store';

const flushEffects = async (): Promise<void> => {
  const testBedWithFlush = TestBed as typeof TestBed & {
    flushEffects?: () => void;
  };

  testBedWithFlush.flushEffects?.();
  await Promise.resolve();
};

const apiError = (status: number, detail: string): ApiError => ({
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

describe('FacilityPlansStore', () => {
  let store: FacilityPlansStoreType;
  let mockService: {
    list: ReturnType<typeof vi.fn>;
    upload: ReturnType<typeof vi.fn>;
    setPrimary: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    download: ReturnType<typeof vi.fn>;
  };
  let mockDispatcher: { dispatch: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockService = {
      list: vi.fn(),
      upload: vi.fn(),
      setPrimary: vi.fn(),
      remove: vi.fn(),
      download: vi.fn().mockReturnValue(of(new Blob(['plan'], { type: 'image/png' }))),
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
  });

  describe('load', () => {
    it('populates the plan entities on success', () => {
      const primary = plan({ id: 'plan-1', isPrimaryPlan: true });
      const secondary = plan({ id: 'plan-2', fileName: 'level-2.png', isPrimaryPlan: false });
      mockService.list.mockReturnValue(
        of({ '@id': '', '@type': 'Collection', member: [secondary, primary], totalItems: 2 }),
      );

      store.load({ facilityId: 'facility-1' });

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

      store.load({ facilityId: 'facility-1' });

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
      store.load({ facilityId: 'facility-1' });

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
      store.load({ facilityId: 'facility-1' });

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
      store.load({ facilityId: 'facility-1' });

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

      store.load({ facilityId: 'facility-1' });
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
      store.load({ facilityId: 'facility-1' });
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

      store.load({ facilityId: 'facility-1' });
      await flushEffects();

      expect(store.imageCallState().status).toBe('error');
      expect(store.planImageUrl()).toBeNull();
      expect(mockDispatcher.dispatch).toHaveBeenCalled();
    });
  });
});
