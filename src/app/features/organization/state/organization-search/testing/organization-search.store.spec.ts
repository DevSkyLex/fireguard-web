import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { OrganizationService } from '@features/organization/data-access';
import type { OrganizationSearchOutput } from '@features/organization/models';
import { OrganizationSearchStore } from '../organization-search.store';

const RESULTS = {
  query: 'extinguisher',
  results: [
    { type: 'equipment', id: 'eq-1', title: 'Brand X100' },
    { type: 'facility', id: 'fa-1', title: 'Main site' },
  ],
} as unknown as OrganizationSearchOutput;

describe('OrganizationSearchStore', () => {
  let store: InstanceType<typeof OrganizationSearchStore>;
  let service: { search: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.useFakeTimers();
    service = { search: vi.fn().mockReturnValue(of(RESULTS)) };

    TestBed.configureTestingModule({
      providers: [OrganizationSearchStore, { provide: OrganizationService, useValue: service }],
    });

    store = TestBed.inject(OrganizationSearchStore);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should be idle before any search', () => {
    expect(store.isQueryLoading()).toBe(false);
    expect(store.queryData()).toBeNull();
    expect(store.hits()).toEqual([]);
  });

  it('should debounce keystrokes 300 ms and fetch once for the settled term', () => {
    store.search({ organizationId: 'org-1', term: 'ex' });
    store.search({ organizationId: 'org-1', term: 'ext' });
    store.search({ organizationId: 'org-1', term: 'extinguisher' });

    vi.advanceTimersByTime(299);
    expect(service.search).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(service.search).toHaveBeenCalledTimes(1);
    expect(service.search).toHaveBeenCalledWith('org-1', 'extinguisher');
    expect(store.isQueryLoaded()).toBe(true);
    expect(store.hits()).toHaveLength(2);
  });

  it('should never dial for a settled term under 2 characters and reset to idle instead', () => {
    store.search({ organizationId: 'org-1', term: 'extinguisher' });
    vi.advanceTimersByTime(300);
    expect(store.hits()).toHaveLength(2);

    store.search({ organizationId: 'org-1', term: 'e' });
    vi.advanceTimersByTime(300);

    expect(service.search).toHaveBeenCalledTimes(1);
    expect(store.isQueryLoaded()).toBe(false);
    expect(store.queryData()).toBeNull();
    expect(store.hits()).toEqual([]);
  });

  it('should trim the term before both the length guard and the request', () => {
    store.search({ organizationId: 'org-1', term: '  ab  ' });
    vi.advanceTimersByTime(300);

    expect(service.search).toHaveBeenCalledWith('org-1', 'ab');
  });

  it('should surface a normalized error when the fetch fails', () => {
    service.search.mockReturnValueOnce(throwError(() => new Error('boom')));

    store.search({ organizationId: 'org-1', term: 'extinguisher' });
    vi.advanceTimersByTime(300);

    expect(store.isQueryLoading()).toBe(false);
    expect(store.queryHasError()).toBe(true);
    expect(store.queryError()).not.toBeNull();
  });

  it('should reset to idle and drop results on reset()', () => {
    store.search({ organizationId: 'org-1', term: 'extinguisher' });
    vi.advanceTimersByTime(300);
    expect(store.hits()).toHaveLength(2);

    store.reset();

    expect(store.isQueryLoaded()).toBe(false);
    expect(store.queryData()).toBeNull();
    expect(store.queryError()).toBeNull();
  });
});
