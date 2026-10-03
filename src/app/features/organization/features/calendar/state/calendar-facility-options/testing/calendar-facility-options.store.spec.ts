import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import { CalendarFacilityOptionsStore } from '../calendar-facility-options.store';

describe('CalendarFacilityOptionsStore', () => {
  let service: { list: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> };
  let store: InstanceType<typeof CalendarFacilityOptionsStore>;

  beforeEach(() => {
    service = {
      list: vi.fn(() =>
        of({ member: [{ id: 'page-1', name: 'First facility' }], totalItems: 300 }),
      ),
      get: vi.fn((organizationId: string, id: string) => of({ id, name: 'Selected facility' })),
    };
    TestBed.configureTestingModule({
      providers: [
        CalendarFacilityOptionsStore,
        { provide: FacilityService, useValue: service },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });
    store = TestBed.inject(CalendarFacilityOptionsStore);
  });

  it('stays idle until opened and resolves the selected value beyond the first page', () => {
    expect(service.list).not.toHaveBeenCalled();
    store.open('org-a', 'selected-299');
    expect(service.list).toHaveBeenCalledExactlyOnceWith('org-a', {
      page: 1,
      itemsPerPage: 25,
      search: '',
    });
    expect(service.get).toHaveBeenCalledExactlyOnceWith('org-a', 'selected-299');
    expect(store.options()).toEqual([
      { value: 'selected-299', label: 'Selected facility' },
      { value: 'page-1', label: 'First facility' },
    ]);
    expect(store.hasNextPage()).toBe(true);
  });

  it('queries server pages and resets the cursor on a new search while keeping the association', () => {
    store.open('org-a', 'selected-299');
    store.requestPage(12);
    expect(service.list).toHaveBeenLastCalledWith('org-a', {
      page: 12,
      itemsPerPage: 25,
      search: '',
    });
    store.requestPage(1, 'fire station');
    expect(service.list).toHaveBeenLastCalledWith('org-a', {
      page: 1,
      itemsPerPage: 25,
      search: 'fire station',
    });
    expect(store.page()).toBe(1);
    expect(store.selectedId()).toBe('selected-299');
    expect(store.options()[0].value).toBe('selected-299');
  });

  it('retains a newly selected value independently of later pages', () => {
    store.open('org-a', null);
    store.resolveSelected('page-1');
    service.list.mockReturnValue(
      of({ member: [{ id: 'page-2', name: 'Other facility' }], totalItems: 300 }),
    );
    store.requestPage(2);
    expect(store.options()).toEqual([
      { value: 'page-1', label: 'Selected facility' },
      { value: 'page-2', label: 'Other facility' },
    ]);
  });

  it('exposes a page error, preserves the previous page and supports retry', () => {
    store.open('org-a', null);
    service.list.mockReturnValueOnce(throwError(() => new Error('Facilities unavailable')));
    store.requestPage(2);
    expect(store.loadCallState().status).toBe('error');
    expect(store.loadCallState().error?.message).toBe('Facilities unavailable');
    expect(store.options()).toEqual([{ value: 'page-1', label: 'First facility' }]);
    store.requestPage(store.page());
    expect(store.loadCallState().status).toBe('success');
  });

  it('cancels obsolete pages and selected-value reads on organization changes and close', () => {
    const list = new Subject<{ member: { id: string; name: string }[]; totalItems: number }>();
    const selected = new Subject<{ id: string; name: string }>();
    service.list.mockReturnValueOnce(list);
    service.get.mockReturnValueOnce(selected);
    store.open('org-a', 'old-selected');
    expect(list.observed).toBe(true);
    expect(selected.observed).toBe(true);
    store.open('org-b', null);
    expect(list.observed).toBe(false);
    expect(selected.observed).toBe(false);
    list.next({ member: [{ id: 'old', name: 'Wrong organization' }], totalItems: 1 });
    selected.next({ id: 'old-selected', name: 'Wrong association' });
    expect(store.options().some((option) => option.value === 'old')).toBe(false);
    store.close();
    expect(store.options()).toEqual([]);
    expect(store.organizationId()).toBeNull();
  });

  it('keeps an unresolved selected id and retries its independent error', () => {
    service.get.mockReturnValueOnce(throwError(() => new Error('Selection unavailable')));
    store.open('org-a', 'selected-299');
    expect(store.selectedId()).toBe('selected-299');
    expect(store.selectedCallState().status).toBe('error');
    expect(store.selectedCallState().error?.message).toBe('Selection unavailable');
    store.resolveSelected(store.selectedId());
    expect(store.selectedCallState().status).toBe('success');
    expect(store.options()[0].value).toBe('selected-299');
  });

  it('does not issue picker requests during SSR', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        CalendarFacilityOptionsStore,
        { provide: FacilityService, useValue: service },
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    });
    const serverStore = TestBed.inject(CalendarFacilityOptionsStore);
    serverStore.open('org-a', 'selected');
    expect(service.list).not.toHaveBeenCalled();
    expect(service.get).not.toHaveBeenCalled();
  });
});
