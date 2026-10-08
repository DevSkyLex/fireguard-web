import { HttpErrorResponse } from '@angular/common/http';
import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { EquipmentTypeService } from '@features/organization/features/equipments/data-access';
import type { EquipmentTypeOutput } from '@features/organization/features/equipments/models';
import { EquipmentTypeCatalogStore } from '../equipment-type-catalog.store';

const entry = (
  value: string,
  overrides: Partial<EquipmentTypeOutput> = {},
): EquipmentTypeOutput => ({
  '@id': `/api/types/${value}`,
  '@type': 'EquipmentType',
  value,
  label: value,
  family: 'fire',
  archived: false,
  revision: 1,
  ...overrides,
});

describe('EquipmentTypeCatalogStore', () => {
  const setup = (platform = 'browser') => {
    const listAll = vi
      .fn()
      .mockReturnValue(of([entry('fire_extinguisher'), entry('foam_monitor')]));
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        EquipmentTypeCatalogStore,
        { provide: PLATFORM_ID, useValue: platform },
        { provide: EquipmentTypeService, useValue: { listAll } },
      ],
    });
    return { store: TestBed.inject(EquipmentTypeCatalogStore), listAll };
  };

  it('preserves custom codes, localized historical labels and archived read choices', () => {
    const { store, listAll } = setup();
    listAll.mockReturnValue(
      of([
        entry('fire_extinguisher'),
        entry('foam_monitor', { archived: true }),
        entry('camera', { label: 'Reception camera', revision: 2 }),
      ]),
    );
    store.load('org-a');
    expect(store.options().map((option) => option.label)).toEqual([
      'Fire extinguisher',
      'foam_monitor',
      'Reception camera',
    ]);
    expect(store.options()[1].icon).toBe('lucideBox');
    expect(store.activeOptions().map((option) => option.value)).toEqual([
      'fire_extinguisher',
      'camera',
    ]);
  });

  it('cancels stale organization reads and clears unauthorized previous choices', () => {
    const { store, listAll } = setup();
    const first = new Subject<readonly EquipmentTypeOutput[]>();
    const second = new Subject<readonly EquipmentTypeOutput[]>();
    listAll.mockReturnValueOnce(first).mockReturnValueOnce(second);
    store.seed('org-before', [entry('private_type')]);
    store.load('org-a');
    expect(store.options()).toEqual([]);
    store.load('org-b');
    first.next([entry('wrong_type')]);
    second.next([entry('allowed_type')]);
    expect(store.organizationId()).toBe('org-b');
    expect(store.options().map((option) => option.value)).toEqual(['allowed_type']);
  });

  it('retains the same organization catalog on refresh failure and supports retry', () => {
    const { store, listAll } = setup();
    store.load('org-a');
    listAll.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 503 })));
    store.load('org-a');
    expect(store.loadCallState().status).toBe('error');
    expect(store.options()).toHaveLength(2);
    store.load('org-a');
    expect(store.loadCallState().status).toBe('success');
  });

  it('makes no secondary catalog request during server rendering', () => {
    const { store, listAll } = setup('server');
    store.load('org-a');
    expect(listAll).not.toHaveBeenCalled();
  });

  it('cancels an in-flight catalog read when access is revoked', () => {
    const { store, listAll } = setup();
    const late = new Subject<readonly EquipmentTypeOutput[]>();
    listAll.mockReturnValue(late);
    store.load('org-a');
    store.clear();
    late.next([entry('revoked')]);
    expect(store.organizationId()).toBeNull();
    expect(store.options()).toEqual([]);
    expect(store.loadCallState().status).toBe('idle');
  });
});
