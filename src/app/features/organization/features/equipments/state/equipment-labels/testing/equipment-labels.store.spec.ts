import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, Subject, throwError } from 'rxjs';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import { EquipmentLabelsStore } from '../equipment-labels.store';

describe('EquipmentLabelsStore', () => {
  let store: InstanceType<typeof EquipmentLabelsStore>;
  let service: { list: ReturnType<typeof vi.fn>; exportLabels: ReturnType<typeof vi.fn> };
  let dispatch: ReturnType<typeof vi.fn>;
  const revision = signal(0);
  const authenticated = signal(true);

  beforeEach(() => {
    revision.set(0);
    authenticated.set(true);
    dispatch = vi.fn();
    service = {
      list: vi.fn().mockReturnValue(of({ member: [], totalItems: 500 })),
      exportLabels: vi.fn().mockReturnValue(of(new Blob(['pdf']))),
    };
    TestBed.configureTestingModule({
      providers: [
        EquipmentLabelsStore,
        { provide: PLATFORM_ID, useValue: 'browser' },
        {
          provide: AUTH_SESSION_PORT,
          useValue: { sessionRevision: revision, isAuthenticated: authenticated },
        },
        { provide: EquipmentService, useValue: service },
        { provide: Dispatcher, useValue: { dispatch } },
      ],
    });
    store = TestBed.inject(EquipmentLabelsStore);
  });

  it('never exports an empty selection as the whole inventory', () => {
    const query = { organizationId: 'org-1', scope: { kind: 'selection' as const, ids: [] } };
    store.preview(query);
    store.print(query);
    expect(store.count()).toBe(0);
    expect(store.canPrint()).toBe(false);
    expect(service.list).not.toHaveBeenCalled();
    expect(service.exportLabels).not.toHaveBeenCalled();
  });

  it('counts the inventory on the server and accepts exactly 500 labels', () => {
    const query = { organizationId: 'org-1', scope: { kind: 'inventory' as const } };
    store.preview(query);
    expect(service.list).toHaveBeenCalledWith('org-1', { page: 1, itemsPerPage: 1 });
    expect(store.count()).toBe(500);
    store.print(query);
    expect(service.exportLabels).toHaveBeenCalledWith('org-1', undefined);
    expect(dispatch).toHaveBeenCalledOnce();
  });

  it('blocks 501 matching labels before downloading', () => {
    service.list.mockReturnValue(of({ member: [], totalItems: 501 }));
    const query = { organizationId: 'org-1', scope: { kind: 'inventory' as const } };
    store.preview(query);
    store.print(query);
    expect(store.count()).toBe(501);
    expect(store.canPrint()).toBe(false);
    expect(service.exportLabels).not.toHaveBeenCalled();
  });

  it('uses the same site criterion for count and PDF export', () => {
    service.list.mockReturnValue(of({ member: [], totalItems: 4 }));
    const query = {
      organizationId: 'org-1',
      scope: { kind: 'facility' as const, facilityId: 'site-2' },
    };
    store.preview(query);
    expect(service.list).toHaveBeenCalledWith('org-1', {
      page: 1,
      itemsPerPage: 1,
      params: { facilityId: 'site-2' },
    });
    store.print(query);
    expect(service.exportLabels).toHaveBeenCalledWith('org-1', { facilityId: 'site-2' });
  });

  it('exports only the distinct explicitly selected records', () => {
    const query = {
      organizationId: 'org-1',
      scope: { kind: 'selection' as const, ids: ['e-1', 'e-1', 'e-3'] },
    };
    store.preview(query);
    expect(store.count()).toBe(2);
    store.print(query);
    expect(service.exportLabels).toHaveBeenCalledWith('org-1', { ids: ['e-1', 'e-3'] });
  });

  it('cancels an obsolete export and retries failures in the current scope', () => {
    const pending = new Subject<Blob>();
    service.exportLabels
      .mockReturnValueOnce(pending)
      .mockReturnValueOnce(throwError(() => new Error('offline')));
    const inventory = { organizationId: 'org-1', scope: { kind: 'inventory' as const } };
    const selected = {
      organizationId: 'org-1',
      scope: { kind: 'selection' as const, ids: ['e-1'] },
    };
    store.preview(inventory);
    store.print(inventory);
    store.preview(selected);
    expect(pending.observed).toBe(false);
    store.print(selected);
    expect(store.printCallState().status).toBe('error');
    store.print(selected);
    expect(store.printCallState().status).toBe('success');
    expect(dispatch).toHaveBeenCalledOnce();
  });

  it('clears previews on a session transition and prevents SSR reads', () => {
    store.preview({ organizationId: 'org-1', scope: { kind: 'inventory' } });
    revision.set(1);
    TestBed.tick();
    expect(store.count()).toBe(0);
    expect(store.canPrint()).toBe(false);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        EquipmentLabelsStore,
        { provide: PLATFORM_ID, useValue: 'server' },
        {
          provide: AUTH_SESSION_PORT,
          useValue: { sessionRevision: revision, isAuthenticated: authenticated },
        },
        { provide: EquipmentService, useValue: service },
        { provide: Dispatcher, useValue: { dispatch } },
      ],
    });
    service.list.mockClear();
    TestBed.inject(EquipmentLabelsStore).preview({
      organizationId: 'org-1',
      scope: { kind: 'inventory' },
    });
    expect(service.list).not.toHaveBeenCalled();
  });
});
