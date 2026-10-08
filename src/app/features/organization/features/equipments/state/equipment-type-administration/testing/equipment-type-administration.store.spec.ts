import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, Subject } from 'rxjs';
import { EquipmentTypeService } from '@features/organization/features/equipments/data-access';
import type { EquipmentTypeOutput } from '@features/organization/features/equipments/models';
import {
  EquipmentTypeAdministrationStore,
  type EquipmentTypeAdministrationStoreType,
} from '../equipment-type-administration.store';
import { equipmentTypeAdministrationEvents } from '../events';

describe('EquipmentTypeAdministrationStore', () => {
  let store: EquipmentTypeAdministrationStoreType;
  const entry: EquipmentTypeOutput = {
    '@id': '/api/organizations/org-1/equipment-types/blanket',
    '@type': 'EquipmentType',
    value: 'blanket',
    label: 'Blanket',
    family: 'fire',
    archived: false,
    revision: 3,
  };
  let service: {
    listAll: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let dispatcher: { dispatch: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    service = { listAll: vi.fn().mockReturnValue(of([entry])), create: vi.fn(), update: vi.fn() };
    dispatcher = { dispatch: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        EquipmentTypeAdministrationStore,
        { provide: EquipmentTypeService, useValue: service },
        { provide: Dispatcher, useValue: dispatcher },
      ],
    });
    store = TestBed.inject(EquipmentTypeAdministrationStore);
    store.load('org-1');
  });

  it('cancels obsolete reads and clears old organization descriptors immediately', () => {
    const oldRead = new Subject<readonly EquipmentTypeOutput[]>();
    const newRead = new Subject<readonly EquipmentTypeOutput[]>();
    service.listAll.mockReturnValueOnce(oldRead).mockReturnValueOnce(newRead);
    store.load('org-1');
    store.load('org-2');
    expect(store.equipmentTypeEntities()).toEqual([]);
    oldRead.next([entry]);
    expect(store.equipmentTypeEntities()).toEqual([]);
    newRead.next([{ ...entry, value: 'pump' }]);
    expect(store.equipmentTypeEntities().map((type) => type.value)).toEqual(['pump']);
    expect(store.listCallState().status).toBe('success');
  });

  it('does not cancel or duplicate an accepted write on repeated submit', () => {
    const response = new Subject<EquipmentTypeOutput>();
    service.update.mockReturnValue(response);
    const command = {
      kind: 'update' as const,
      organizationId: 'org-1',
      value: entry.value,
      input: { revision: 3, label: 'New label' },
    };
    store.save(command);
    store.save(command);
    store.clearWrite();
    expect(service.update).toHaveBeenCalledTimes(1);
    expect(store.writeCallState().status).toBe('pending');
    response.next({ ...entry, label: 'New label', revision: 4 });
    response.complete();
    expect(store.equipmentTypeEntities()[0]?.label).toBe('New label');
    expect(store.writeCallState().status).toBe('success');
    expect(dispatcher.dispatch).toHaveBeenCalledWith(
      equipmentTypeAdministrationEvents.saved({ organizationId: 'org-1', value: entry.value }),
    );
  });

  it('retains old descriptor and conflict detail without advancing its reviewed revision', () => {
    const response = new Subject<EquipmentTypeOutput>();
    service.update.mockReturnValue(response);
    store.save({
      kind: 'update',
      organizationId: 'org-1',
      value: entry.value,
      input: { revision: 3, archived: true },
    });
    response.error(new HttpErrorResponse({ status: 409, error: { detail: 'Revision changed.' } }));
    expect(store.writeCallState().status).toBe('error');
    expect(store.writeCallState().error).toMatchObject({ code: 409, message: 'Revision changed.' });
    expect(store.equipmentTypeEntities()).toEqual([entry]);
    expect(dispatcher.dispatch).not.toHaveBeenCalled();
    expect(service.update).toHaveBeenCalledWith('org-1', entry.value, {
      revision: 3,
      archived: true,
    });
  });

  it('does not leak late command feedback after leaving and revisiting its organization', () => {
    const response = new Subject<EquipmentTypeOutput>();
    service.update.mockReturnValue(response);
    store.save({
      kind: 'update',
      organizationId: 'org-1',
      value: entry.value,
      input: { revision: 3, label: 'Stale session' },
    });
    store.load('org-2');
    store.load('org-1');
    response.next({ ...entry, label: 'Stale session', revision: 4 });
    response.complete();
    expect(store.equipmentTypeEntities()).toEqual([entry]);
    expect(store.writeCallState().status).toBe('idle');
    expect(dispatcher.dispatch).not.toHaveBeenCalled();
  });

  it('does not regress a confirmed descriptor when an older list response arrives later', () => {
    const response = new Subject<readonly EquipmentTypeOutput[]>();
    service.listAll.mockReturnValue(response);
    store.load('org-1');
    service.update.mockReturnValue(of({ ...entry, archived: true, revision: 4 }));
    store.save({
      kind: 'update',
      organizationId: 'org-1',
      value: entry.value,
      input: { revision: 3, archived: true },
    });
    response.next([entry]);
    expect(store.equipmentTypeEntities()[0]).toMatchObject({ archived: true, revision: 4 });
  });

  it('keeps archives in the catalogue and resets only feedback for a new editor', () => {
    service.update.mockReturnValue(of({ ...entry, archived: true, revision: 4 }));
    store.save({
      kind: 'update',
      organizationId: 'org-1',
      value: entry.value,
      input: { revision: 3, archived: true },
    });
    expect(store.equipmentTypeEntities()[0]?.archived).toBe(true);
    store.clearWrite();
    expect(store.writeCallState().status).toBe('idle');
    expect(store.equipmentTypeEntities()[0]?.archived).toBe(true);
  });

  it('adds a confirmed custom type and refuses commands for another organization', () => {
    service.create.mockReturnValue(of({ ...entry, value: 'camera', family: 'safety' }));
    store.save({
      kind: 'create',
      organizationId: 'org-2',
      input: { value: 'camera', label: 'Camera', family: 'safety' },
    });
    expect(service.create).not.toHaveBeenCalled();
    store.save({
      kind: 'create',
      organizationId: 'org-1',
      input: { value: 'camera', label: 'Camera', family: 'safety' },
    });
    expect(store.equipmentTypeEntities().map((type) => type.value)).toEqual(['blanket', 'camera']);
  });
});
