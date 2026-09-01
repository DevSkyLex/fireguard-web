import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, Subject, throwError } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import type {
  EquipmentAttachmentOutput,
  EquipmentMaintenanceLogOutput,
  EquipmentOutput,
  EquipmentTagOutput,
} from '@features/organization/features/equipments/models';
import { ActiveEquipmentStore } from '../../active-equipment/active-equipment.store';
import { EquipmentStore } from '../equipment.store';

const flushEffects = async (): Promise<void> => {
  await Promise.resolve();
};

describe('EquipmentStore', () => {
  let store: EquipmentStore;
  let mockEquipmentService: {
    list: ReturnType<typeof vi.fn>;
    listMaintenanceLogs: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    assignToFacility: ReturnType<typeof vi.fn>;
    unassignFromFacility: ReturnType<typeof vi.fn>;
    commission: ReturnType<typeof vi.fn>;
    decommission: ReturnType<typeof vi.fn>;
    maintenance: ReturnType<typeof vi.fn>;
    listAttachments: ReturnType<typeof vi.fn>;
    addAttachment: ReturnType<typeof vi.fn>;
    deleteAttachment: ReturnType<typeof vi.fn>;
    listTagCatalog: ReturnType<typeof vi.fn>;
    addTag: ReturnType<typeof vi.fn>;
    removeTag: ReturnType<typeof vi.fn>;
  };
  let mockDispatcher: { dispatch: ReturnType<typeof vi.fn> };
  let mockActiveEquipmentStore: {
    selectedEquipment: ReturnType<typeof signal<EquipmentOutput | null>>;
    isLoadingEquipment: ReturnType<typeof signal<boolean>>;
    setEquipment: ReturnType<typeof vi.fn>;
  };

  const equipment = { id: 'equipment-1', name: 'Generator' } as unknown as EquipmentOutput;
  const collection: HydraCollection<EquipmentOutput> = {
    '@id': '/api/organizations/org-1/equipment',
    '@type': 'Collection',
    totalItems: 1,
    member: [equipment],
  };

  const tag = {
    id: 'tag-1',
    name: 'Critical',
    organizationId: 'org-1',
  } as unknown as EquipmentTagOutput;

  const attachment = {
    id: 'attachment-1',
    equipmentId: 'equipment-1',
    fileName: 'report.pdf',
  } as unknown as EquipmentAttachmentOutput;

  beforeEach(() => {
    mockEquipmentService = {
      list: vi.fn().mockReturnValue(of(collection)),
      listMaintenanceLogs: vi.fn().mockReturnValue(
        of({
          '@id': '/api/organizations/org-1/equipment/equipment-1/maintenance-logs',
          '@type': 'Collection',
          totalItems: 1,
          member: [
            { id: 'log-1', equipmentId: 'equipment-1' } as unknown as EquipmentMaintenanceLogOutput,
          ],
        }),
      ),
      remove: vi.fn().mockReturnValue(of(undefined)),
      create: vi.fn().mockReturnValue(of(equipment)),
      update: vi.fn().mockReturnValue(of(equipment)),
      assignToFacility: vi.fn().mockReturnValue(of(equipment)),
      unassignFromFacility: vi.fn().mockReturnValue(of(equipment)),
      commission: vi.fn().mockReturnValue(of(equipment)),
      decommission: vi.fn().mockReturnValue(of(equipment)),
      maintenance: vi.fn().mockReturnValue(of(equipment)),
      listAttachments: vi.fn().mockReturnValue(
        of({
          '@id': '/api/organizations/org-1/equipment/equipment-1/attachments',
          '@type': 'Collection',
          totalItems: 1,
          member: [attachment],
        }),
      ),
      addAttachment: vi.fn().mockReturnValue(of(attachment)),
      deleteAttachment: vi.fn().mockReturnValue(of(undefined)),
      listTagCatalog: vi.fn().mockReturnValue(
        of({
          '@id': '/api/organizations/org-1/equipment-tags',
          '@type': 'Collection',
          totalItems: 1,
          member: [tag],
        }),
      ),
      addTag: vi.fn().mockReturnValue(of(tag)),
      removeTag: vi.fn().mockReturnValue(of(undefined)),
    };
    mockDispatcher = { dispatch: vi.fn() };
    mockActiveEquipmentStore = {
      selectedEquipment: signal<EquipmentOutput | null>(null),
      isLoadingEquipment: signal(false),
      setEquipment: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        EquipmentStore,
        { provide: Dispatcher, useValue: mockDispatcher },
        { provide: EquipmentService, useValue: mockEquipmentService },
        {
          provide: ActiveEquipmentStore,
          useValue: mockActiveEquipmentStore,
        },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    store = TestBed.inject(EquipmentStore);
  });

  it('should load equipment', async () => {
    store.load({ organizationId: 'org-1' });
    await flushEffects();

    expect(mockEquipmentService.list).toHaveBeenCalledWith('org-1', undefined);
    expect(store.equipmentList()).toEqual([equipment]);
    expect(store.totalEquipment()).toBe(1);
  });

  it('should preload inspection-create options in the browser', async () => {
    store.ensureInspectionCreateOptionsLoaded('org-1');
    await flushEffects();

    expect(mockEquipmentService.list).toHaveBeenCalledWith('org-1', { itemsPerPage: 200 });
  });

  it('should load maintenance logs through the store', async () => {
    store.loadMaintenanceLogs({ organizationId: 'org-1', equipmentId: 'equipment-1' });
    await flushEffects();

    expect(mockEquipmentService.listMaintenanceLogs).toHaveBeenCalledWith(
      'org-1',
      'equipment-1',
      undefined,
    );
    expect(store.maintenanceLogs()).toHaveLength(1);
    expect(store.totalMaintenanceLogs()).toBe(1);
  });

  describe('remove', () => {
    it('should delete the equipment, drop it from the collection and dispatch a success toast', async () => {
      store.load({ organizationId: 'org-1' });
      await flushEffects();
      expect(store.equipmentList()).toEqual([equipment]);

      store.remove({ organizationId: 'org-1', equipmentId: 'equipment-1' });
      await flushEffects();

      expect(mockEquipmentService.remove).toHaveBeenCalledWith('equipment-1');
      expect(store.deleteCallState().status).toBe('success');
      expect(store.equipmentList()).toEqual([]);
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Equipment Store] deleteSucceeded' }),
      );
    });

    it('should set the delete error and dispatch deleteFailed on error', async () => {
      mockEquipmentService.remove.mockReturnValue(throwError(() => new Error('boom')));

      store.remove({ organizationId: 'org-1', equipmentId: 'equipment-1' });
      await flushEffects();

      expect(store.deleteCallState().status).toBe('error');
      expect(store.deleteCallState().error).toMatchObject({ message: expect.any(String) });
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Equipment Store] deleteFailed' }),
      );
    });
  });

  describe('create', () => {
    it('should add the created equipment to the collection, increment totalEquipment and dispatch createSucceeded', async () => {
      store.create({ organizationId: 'org-1', input: {} as never });
      await flushEffects();

      expect(mockEquipmentService.create).toHaveBeenCalledWith('org-1', {});
      expect(store.createCallState().status).toBe('success');
      expect(store.equipmentList()).toEqual([equipment]);
      expect(store.totalEquipment()).toBe(1);
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Equipment Store] createSucceeded' }),
      );
    });

    it('should set the create error and dispatch createFailed on a non-quota error', async () => {
      mockEquipmentService.create.mockReturnValue(throwError(() => new Error('validation failed')));

      store.create({ organizationId: 'org-1', input: {} as never });
      await flushEffects();

      expect(store.createCallState().status).toBe('error');
      expect(store.createError()).toMatchObject({ message: expect.any(String) });
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Equipment Store] createFailed' }),
      );
    });
  });

  describe('update', () => {
    it('should update the entity and sync ActiveEquipmentStore on success', async () => {
      store.update({ organizationId: 'org-1', equipmentId: 'equipment-1', input: {} as never });
      await flushEffects();

      expect(mockEquipmentService.update).toHaveBeenCalledWith('org-1', 'equipment-1', {});
      expect(store.updateCallState().status).toBe('success');
      expect(mockActiveEquipmentStore.setEquipment).toHaveBeenCalledWith(equipment);
    });

    it('should set the update error and dispatch updateFailed on error', async () => {
      mockEquipmentService.update.mockReturnValue(throwError(() => new Error('boom')));

      store.update({ organizationId: 'org-1', equipmentId: 'equipment-1', input: {} as never });
      await flushEffects();

      expect(store.updateCallState().status).toBe('error');
      expect(mockActiveEquipmentStore.setEquipment).not.toHaveBeenCalled();
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Equipment Store] updateFailed' }),
      );
    });
  });

  describe('assignToFacility', () => {
    it('should update the entity and sync ActiveEquipmentStore on success', async () => {
      store.assignToFacility({
        organizationId: 'org-1',
        equipmentId: 'equipment-1',
        input: { facilityId: 'facility-1' } as never,
      });
      await flushEffects();

      expect(mockEquipmentService.assignToFacility).toHaveBeenCalledWith('org-1', 'equipment-1', {
        facilityId: 'facility-1',
      });
      expect(store.assignToFacilityCallState().status).toBe('success');
      expect(mockActiveEquipmentStore.setEquipment).toHaveBeenCalledWith(equipment);
    });

    it('should set the error and dispatch assignToFacilityFailed on error', async () => {
      mockEquipmentService.assignToFacility.mockReturnValue(throwError(() => new Error('boom')));

      store.assignToFacility({
        organizationId: 'org-1',
        equipmentId: 'equipment-1',
        input: { facilityId: 'facility-1' } as never,
      });
      await flushEffects();

      expect(store.assignToFacilityCallState().status).toBe('error');
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Equipment Store] assignToFacilityFailed' }),
      );
    });
  });

  describe('unassignFromFacility', () => {
    it('should update the entity and sync ActiveEquipmentStore on success', async () => {
      store.unassignFromFacility({ organizationId: 'org-1', equipmentId: 'equipment-1' });
      await flushEffects();

      expect(mockEquipmentService.unassignFromFacility).toHaveBeenCalledWith(
        'org-1',
        'equipment-1',
      );
      expect(store.unassignFromFacilityCallState().status).toBe('success');
      expect(mockActiveEquipmentStore.setEquipment).toHaveBeenCalledWith({
        ...equipment,
        facilityId: null,
        facilityName: null,
      });
    });

    it('should set the error and dispatch unassignFromFacilityFailed on error', async () => {
      mockEquipmentService.unassignFromFacility.mockReturnValue(
        throwError(() => new Error('boom')),
      );

      store.unassignFromFacility({ organizationId: 'org-1', equipmentId: 'equipment-1' });
      await flushEffects();

      expect(store.unassignFromFacilityCallState().status).toBe('error');
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Equipment Store] unassignFromFacilityFailed' }),
      );
    });
  });

  describe('write responses merge into the known entity', () => {
    const known = {
      id: 'equipment-1',
      facilityId: 'facility-1',
      facilityName: 'Main building',
      locationLabel: 'Hall east wall',
      status: 'in_stock',
    } as unknown as EquipmentOutput;

    beforeEach(async () => {
      mockEquipmentService.list.mockReturnValue(
        of({ ...collection, member: [known], totalItems: 1 }),
      );
      store.load({ organizationId: 'org-1' });
      await flushEffects();
    });

    it('should keep known fields a lifecycle response omits', async () => {
      const response = { id: 'equipment-1', status: 'operational' } as unknown as EquipmentOutput;
      mockEquipmentService.commission.mockReturnValue(of(response));

      store.commission({ organizationId: 'org-1', equipmentId: 'equipment-1' });
      await flushEffects();

      const merged = expect.objectContaining({
        id: 'equipment-1',
        status: 'operational',
        facilityId: 'facility-1',
        facilityName: 'Main building',
        locationLabel: 'Hall east wall',
      });
      expect(store.equipmentEntityMap()['equipment-1']).toEqual(merged);
      expect(mockActiveEquipmentStore.setEquipment).toHaveBeenCalledWith(merged);
    });

    it('should clear the facility relation on unassign even when the response omits it', async () => {
      const response = { id: 'equipment-1', status: 'in_stock' } as unknown as EquipmentOutput;
      mockEquipmentService.unassignFromFacility.mockReturnValue(of(response));

      store.unassignFromFacility({ organizationId: 'org-1', equipmentId: 'equipment-1' });
      await flushEffects();

      expect(store.equipmentEntityMap()['equipment-1']).toEqual(
        expect.objectContaining({ facilityId: null, facilityName: null }),
      );
    });
  });

  describe('commission', () => {
    it('should update the entity and sync ActiveEquipmentStore on success', async () => {
      store.commission({ organizationId: 'org-1', equipmentId: 'equipment-1' });
      await flushEffects();

      expect(mockEquipmentService.commission).toHaveBeenCalledWith('org-1', 'equipment-1');
      expect(store.commissionCallState().status).toBe('success');
      expect(mockActiveEquipmentStore.setEquipment).toHaveBeenCalledWith(equipment);
    });

    it('should reflect isChangingLifecycle while pending and set the error on failure', async () => {
      mockEquipmentService.commission.mockReturnValue(throwError(() => new Error('boom')));

      store.commission({ organizationId: 'org-1', equipmentId: 'equipment-1' });
      await flushEffects();

      expect(store.commissionCallState().status).toBe('error');
      expect(store.isChangingLifecycle()).toBe(false);
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Equipment Store] commissionFailed' }),
      );
    });
  });

  describe('decommission', () => {
    it('should update the entity and sync ActiveEquipmentStore on success', async () => {
      store.decommission({ organizationId: 'org-1', equipmentId: 'equipment-1' });
      await flushEffects();

      expect(mockEquipmentService.decommission).toHaveBeenCalledWith('org-1', 'equipment-1');
      expect(store.decommissionCallState().status).toBe('success');
      expect(mockActiveEquipmentStore.setEquipment).toHaveBeenCalledWith(equipment);
    });

    it('should set the error and dispatch decommissionFailed on error', async () => {
      mockEquipmentService.decommission.mockReturnValue(throwError(() => new Error('boom')));

      store.decommission({ organizationId: 'org-1', equipmentId: 'equipment-1' });
      await flushEffects();

      expect(store.decommissionCallState().status).toBe('error');
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Equipment Store] decommissionFailed' }),
      );
    });
  });

  describe('maintenance', () => {
    it('should update the entity and sync ActiveEquipmentStore on success', async () => {
      store.maintenance({ organizationId: 'org-1', equipmentId: 'equipment-1' });
      await flushEffects();

      expect(mockEquipmentService.maintenance).toHaveBeenCalledWith('org-1', 'equipment-1');
      expect(store.maintenanceCallState().status).toBe('success');
      expect(mockActiveEquipmentStore.setEquipment).toHaveBeenCalledWith(equipment);
    });

    it('should set the error and dispatch maintenanceFailed on error', async () => {
      mockEquipmentService.maintenance.mockReturnValue(throwError(() => new Error('boom')));

      store.maintenance({ organizationId: 'org-1', equipmentId: 'equipment-1' });
      await flushEffects();

      expect(store.maintenanceCallState().status).toBe('error');
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Equipment Store] maintenanceFailed' }),
      );
    });
  });

  describe('attachments', () => {
    it('should load attachments and track totalAttachments', async () => {
      expect(store.isLoadingAttachments()).toBe(false);

      store.loadAttachments({ organizationId: 'org-1', equipmentId: 'equipment-1' });
      await flushEffects();

      expect(mockEquipmentService.listAttachments).toHaveBeenCalledWith(
        'org-1',
        'equipment-1',
        undefined,
      );
      expect(store.attachments()).toEqual([attachment]);
      expect(store.totalAttachments()).toBe(1);
    });

    it('should set attachmentsListCallState error and dispatch attachmentsListFailed on error', async () => {
      mockEquipmentService.listAttachments.mockReturnValue(throwError(() => new Error('boom')));

      store.loadAttachments({ organizationId: 'org-1', equipmentId: 'equipment-1' });
      await flushEffects();

      expect(store.attachmentsListCallState().status).toBe('error');
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Equipment Store] attachmentsListFailed' }),
      );
    });

    it('should add an attachment and increment totalAttachments on success', async () => {
      store.addAttachment({
        organizationId: 'org-1',
        equipmentId: 'equipment-1',
        input: {} as never,
      });
      await flushEffects();

      expect(store.attachments()).toEqual([attachment]);
      expect(store.totalAttachments()).toBe(1);
      expect(store.addAttachmentCallState().status).toBe('success');
    });

    it('should set addAttachmentCallState error and dispatch addAttachmentFailed on error', async () => {
      mockEquipmentService.addAttachment.mockReturnValue(throwError(() => new Error('boom')));

      store.addAttachment({
        organizationId: 'org-1',
        equipmentId: 'equipment-1',
        input: {} as never,
      });
      await flushEffects();

      expect(store.addAttachmentCallState().status).toBe('error');
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Equipment Store] addAttachmentFailed' }),
      );
    });

    it('should delete an attachment and decrement totalAttachments on success', async () => {
      store.loadAttachments({ organizationId: 'org-1', equipmentId: 'equipment-1' });
      await flushEffects();
      expect(store.attachments()).toEqual([attachment]);

      store.deleteAttachment({
        organizationId: 'org-1',
        equipmentId: 'equipment-1',
        attachmentId: 'attachment-1',
      });
      await flushEffects();

      expect(store.attachments()).toEqual([]);
      expect(store.totalAttachments()).toBe(0);
      expect(store.deleteAttachmentCallState().status).toBe('success');
    });

    it('should set deleteAttachmentCallState error and dispatch deleteAttachmentFailed on error', async () => {
      mockEquipmentService.deleteAttachment.mockReturnValue(throwError(() => new Error('boom')));

      store.deleteAttachment({
        organizationId: 'org-1',
        equipmentId: 'equipment-1',
        attachmentId: 'attachment-1',
      });
      await flushEffects();

      expect(store.deleteAttachmentCallState().status).toBe('error');
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Equipment Store] deleteAttachmentFailed' }),
      );
    });
  });

  describe('tags', () => {
    it('should load the tag catalog and track totalTags', async () => {
      expect(store.isLoadingTags()).toBe(false);

      store.loadTags({ organizationId: 'org-1' });
      await flushEffects();

      expect(mockEquipmentService.listTagCatalog).toHaveBeenCalledWith(
        'org-1',
        undefined,
        undefined,
      );
      expect(store.tags()).toEqual([tag]);
      expect(store.totalTags()).toBe(1);
    });

    it('should set tagsListCallState error and dispatch tagsListFailed on error', async () => {
      mockEquipmentService.listTagCatalog.mockReturnValue(throwError(() => new Error('boom')));

      store.loadTags({ organizationId: 'org-1' });
      await flushEffects();

      expect(store.tagsListCallState().status).toBe('error');
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Equipment Store] tagsListFailed' }),
      );
    });

    describe('addTag', () => {
      it('should add a tag and increment totalTags on success', async () => {
        store.addTag({ organizationId: 'org-1', equipmentId: 'equipment-1', input: {} as never });
        await flushEffects();

        expect(store.tags()).toEqual([tag]);
        expect(store.totalTags()).toBe(1);
        expect(store.addTagCallState().status).toBe('success');
      });

      it('should sync ActiveEquipmentStore when the active equipment matches and does not already have the tag', async () => {
        const activeEquipment = { ...equipment, tags: [] } as unknown as EquipmentOutput;
        mockActiveEquipmentStore.selectedEquipment.set(activeEquipment);

        store.addTag({ organizationId: 'org-1', equipmentId: 'equipment-1', input: {} as never });
        await flushEffects();

        expect(mockActiveEquipmentStore.setEquipment).toHaveBeenCalledWith({
          ...activeEquipment,
          tags: [tag],
        });
      });

      it('should not sync ActiveEquipmentStore when the active equipment already has the tag', async () => {
        const activeEquipment = { ...equipment, tags: [tag] } as unknown as EquipmentOutput;
        mockActiveEquipmentStore.selectedEquipment.set(activeEquipment);

        store.addTag({ organizationId: 'org-1', equipmentId: 'equipment-1', input: {} as never });
        await flushEffects();

        expect(mockActiveEquipmentStore.setEquipment).not.toHaveBeenCalled();
      });

      it('should not sync ActiveEquipmentStore when the active equipment does not match', async () => {
        const activeEquipment = {
          ...equipment,
          id: 'equipment-2',
          tags: [],
        } as unknown as EquipmentOutput;
        mockActiveEquipmentStore.selectedEquipment.set(activeEquipment);

        store.addTag({ organizationId: 'org-1', equipmentId: 'equipment-1', input: {} as never });
        await flushEffects();

        expect(mockActiveEquipmentStore.setEquipment).not.toHaveBeenCalled();
      });

      it('should set addTagCallState error and dispatch addTagFailed on error', async () => {
        mockEquipmentService.addTag.mockReturnValue(throwError(() => new Error('boom')));

        store.addTag({ organizationId: 'org-1', equipmentId: 'equipment-1', input: {} as never });
        await flushEffects();

        expect(store.addTagCallState().status).toBe('error');
        expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
          expect.objectContaining({ type: '[Equipment Store] addTagFailed' }),
        );
      });
    });

    describe('removeTag', () => {
      it('should remove a tag and decrement totalTags on success', async () => {
        store.loadTags({ organizationId: 'org-1' });
        await flushEffects();
        expect(store.tags()).toEqual([tag]);

        store.removeTag({ organizationId: 'org-1', equipmentId: 'equipment-1', tagId: 'tag-1' });
        await flushEffects();

        expect(store.tags()).toEqual([]);
        expect(store.totalTags()).toBe(0);
        expect(store.removeTagCallState().status).toBe('success');
      });

      it('should sync ActiveEquipmentStore removing the tag when the active equipment matches', async () => {
        const activeEquipment = { ...equipment, tags: [tag] } as unknown as EquipmentOutput;
        mockActiveEquipmentStore.selectedEquipment.set(activeEquipment);

        store.removeTag({ organizationId: 'org-1', equipmentId: 'equipment-1', tagId: 'tag-1' });
        await flushEffects();

        expect(mockActiveEquipmentStore.setEquipment).toHaveBeenCalledWith({
          ...activeEquipment,
          tags: [],
        });
      });

      it('should not sync ActiveEquipmentStore when the active equipment does not match', async () => {
        const activeEquipment = {
          ...equipment,
          id: 'equipment-2',
          tags: [tag],
        } as unknown as EquipmentOutput;
        mockActiveEquipmentStore.selectedEquipment.set(activeEquipment);

        store.removeTag({ organizationId: 'org-1', equipmentId: 'equipment-1', tagId: 'tag-1' });
        await flushEffects();

        expect(mockActiveEquipmentStore.setEquipment).not.toHaveBeenCalled();
      });

      it('should set removeTagCallState error and dispatch removeTagFailed on error', async () => {
        mockEquipmentService.removeTag.mockReturnValue(throwError(() => new Error('boom')));

        store.removeTag({ organizationId: 'org-1', equipmentId: 'equipment-1', tagId: 'tag-1' });
        await flushEffects();

        expect(store.removeTagCallState().status).toBe('error');
        expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
          expect.objectContaining({ type: '[Equipment Store] removeTagFailed' }),
        );
      });
    });
  });

  describe('loadMaintenanceLogs error path', () => {
    it('should set maintenanceLogsListCallState error and dispatch listFailed on error', async () => {
      mockEquipmentService.listMaintenanceLogs.mockReturnValue(throwError(() => new Error('boom')));

      expect(store.isLoadingMaintenanceLogs()).toBe(false);

      store.loadMaintenanceLogs({ organizationId: 'org-1', equipmentId: 'equipment-1' });
      await flushEffects();

      expect(store.maintenanceLogsListCallState().status).toBe('error');
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Equipment Store] listFailed' }),
      );
    });
  });

  describe('computed signals', () => {
    it('should report isEmpty as true when there is no equipment and no in-flight request', () => {
      expect(store.isEmpty()).toBe(true);
    });

    it('should report isEmpty as false once equipment is loaded', async () => {
      store.load({ organizationId: 'org-1' });
      await flushEffects();

      expect(store.isEmpty()).toBe(false);
    });

    it('should report isCreating true while create is pending', () => {
      mockEquipmentService.create.mockReturnValue(new Subject<EquipmentOutput>());

      store.create({ organizationId: 'org-1', input: {} as never });

      expect(store.isCreating()).toBe(true);
    });

    it('should report isUpdating true while update is pending', () => {
      mockEquipmentService.update.mockReturnValue(new Subject<EquipmentOutput>());

      store.update({ organizationId: 'org-1', equipmentId: 'equipment-1', input: {} as never });

      expect(store.isUpdating()).toBe(true);
    });

    it('should expose createError as null before any create attempt', () => {
      expect(store.createError()).toBeNull();
    });
  });

  describe('resetCreateOperation / resetUpdateOperation', () => {
    it('should reset createCallState back to idle', async () => {
      store.create({ organizationId: 'org-1', input: {} as never });
      await flushEffects();
      expect(store.createCallState().status).toBe('success');

      store.resetCreateOperation();

      expect(store.createCallState().status).toBe('idle');
    });

    it('should reset updateCallState back to idle', async () => {
      store.update({ organizationId: 'org-1', equipmentId: 'equipment-1', input: {} as never });
      await flushEffects();
      expect(store.updateCallState().status).toBe('success');

      store.resetUpdateOperation();

      expect(store.updateCallState().status).toBe('idle');
    });
  });
});
