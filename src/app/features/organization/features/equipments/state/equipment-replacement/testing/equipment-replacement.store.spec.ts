import { HttpErrorResponse } from '@angular/common/http';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import type {
  EquipmentOutput,
  ReplaceEquipmentInput,
  ReplaceEquipmentOutput,
} from '@features/organization/features/equipments/models';
import { ActiveEquipmentStore } from '@features/organization/features/equipments/state';
import { EquipmentReplacementStore } from '../equipment-replacement.store';

const command: ReplaceEquipmentInput = {
  clientOperationId: 'd2389ec7-894c-4aab-89d3-e5b3f427b1ff',
  successor: { type: 'fire_extinguisher', assetCode: 'EXT-2' },
};
const receipt: ReplaceEquipmentOutput = {
  clientOperationId: command.clientOperationId,
  predecessorEquipmentId: 'old',
  successorEquipmentId: 'new',
  replayed: true,
};

const setup = () => {
  const selectedEquipment = signal({ id: 'old', status: 'operational' } as EquipmentOutput);
  const setEquipment = vi.fn();
  const replace = vi.fn();
  const list = vi.fn().mockReturnValue(of({ member: [], totalItems: 0 }));
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      EquipmentReplacementStore,
      { provide: EquipmentService, useValue: { replace, list } },
      { provide: ActiveEquipmentStore, useValue: { selectedEquipment, setEquipment } },
    ],
  });
  return {
    store: TestBed.inject(EquipmentReplacementStore),
    replace,
    list,
    selectedEquipment,
    setEquipment,
  };
};

describe('EquipmentReplacementStore', () => {
  it('replays the exact accepted command after a lost response instead of creating another successor', () => {
    const { store, replace, setEquipment } = setup();
    replace
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 0 })))
      .mockReturnValueOnce(of(receipt));
    store.replace({ organizationId: 'org', equipmentId: 'old', input: command });
    expect(store.replaceCallState().error?.retryable).toBe(true);
    store.reset();
    expect(store.command()).toBe(command);
    store.replace({
      organizationId: 'org',
      equipmentId: 'old',
      input: { clientOperationId: 'another', successorEquipmentId: 'different' },
    });
    expect(replace.mock.calls[1][2]).toBe(command);
    expect(store.replaceCallState().data).toEqual(receipt);
    expect(setEquipment).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'old', status: 'decommissioned', successorEquipmentId: 'new' }),
    );
  });

  it('ignores repeated clicks while the accepted transaction is in flight', () => {
    const { store, replace } = setup();
    const pending = new Subject<ReplaceEquipmentOutput>();
    replace.mockReturnValue(pending);
    store.replace({ organizationId: 'org', equipmentId: 'old', input: command });
    store.replace({ organizationId: 'org', equipmentId: 'old', input: command });
    expect(replace).toHaveBeenCalledOnce();
    expect(store.replaceCallState().status).toBe('pending');
    pending.next(receipt);
    pending.complete();
    expect(store.replaceCallState().status).toBe('success');
  });

  it('allows a corrected command after a definitive refusal', () => {
    const { store, replace } = setup();
    replace
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 409 })))
      .mockReturnValueOnce(of(receipt));
    store.replace({ organizationId: 'org', equipmentId: 'old', input: command });
    store.reset();
    expect(store.command()).toBeNull();
    const corrected: ReplaceEquipmentInput = {
      clientOperationId: command.clientOperationId,
      successorEquipmentId: 'new',
    };
    store.replace({ organizationId: 'org', equipmentId: 'old', input: corrected });
    expect(replace.mock.calls[1][2]).toBe(corrected);
  });

  it('never applies an old equipment receipt to another active dossier', () => {
    const { store, replace, selectedEquipment, setEquipment } = setup();
    const pending = new Subject<ReplaceEquipmentOutput>();
    replace.mockReturnValue(pending);
    store.replace({ organizationId: 'org', equipmentId: 'old', input: command });
    selectedEquipment.set({ id: 'other' } as EquipmentOutput);
    pending.next(receipt);
    expect(setEquipment).not.toHaveBeenCalled();
  });
});
