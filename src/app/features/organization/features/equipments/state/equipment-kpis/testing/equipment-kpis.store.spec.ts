import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import type { EquipmentKpiOutput } from '@features/organization/features/equipments/models';
import { EquipmentKpisStore } from '../equipment-kpis.store';

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve));

const KPIS = {
  totalAssets: 40,
  compliant: 30,
  dueSoon: 5,
  openNonConformities: 2,
} as unknown as EquipmentKpiOutput;

describe('EquipmentKpisStore', () => {
  let store: InstanceType<typeof EquipmentKpisStore>;
  let service: { kpis: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    service = { kpis: vi.fn().mockReturnValue(of(KPIS)) };

    TestBed.configureTestingModule({
      providers: [EquipmentKpisStore, { provide: EquipmentService, useValue: service }],
    });

    store = TestBed.inject(EquipmentKpisStore);
  });

  it('should be idle before any load', () => {
    expect(store.isQueryLoading()).toBe(false);
    expect(store.queryData()).toBeNull();
  });

  it('should load the KPI snapshot for the given organization', async () => {
    store.load('org-1');
    await flush();

    expect(service.kpis).toHaveBeenCalledWith('org-1');
    expect(store.queryData()).toEqual(KPIS);
    expect(store.isQueryLoading()).toBe(false);
  });

  it('should short-circuit without an organization id', async () => {
    store.load(undefined);
    await flush();

    expect(service.kpis).not.toHaveBeenCalled();
    expect(store.queryData()).toBeNull();
  });

  it('should surface a normalized error when the fetch fails', async () => {
    service.kpis.mockReturnValueOnce(throwError(() => new Error('boom')));

    store.load('org-1');
    await flush();

    expect(store.isQueryLoading()).toBe(false);
    expect(store.queryError()).not.toBeNull();
  });
});
