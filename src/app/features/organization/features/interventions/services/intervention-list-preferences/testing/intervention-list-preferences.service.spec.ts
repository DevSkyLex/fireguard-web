import { TestBed } from '@angular/core/testing';
import { CookieService } from '@core/cookie';
import type { InterventionListSort } from '@features/organization/features/interventions/models';
import { InterventionListPreferencesService } from '../intervention-list-preferences.service';

function build(cookieValue: string | null): {
  service: InterventionListPreferencesService;
  cookies: { getCookie: ReturnType<typeof vi.fn>; setCookie: ReturnType<typeof vi.fn> };
} {
  const cookies = {
    getCookie: vi.fn().mockReturnValue(cookieValue),
    setCookie: vi.fn(),
  };

  TestBed.configureTestingModule({
    providers: [InterventionListPreferencesService, { provide: CookieService, useValue: cookies }],
  });

  return { service: TestBed.inject(InterventionListPreferencesService), cookies };
}

describe('InterventionListPreferencesService', () => {
  describe('readSort', () => {
    it('should fall back to dueAt/asc when no cookie is stored', () => {
      const { service } = build(null);

      expect(service.readSort()).toEqual({ field: 'dueAt', direction: 'asc' });
    });

    it('should fall back to dueAt/asc when the cookie is corrupted JSON', () => {
      const { service } = build('{not-json');

      expect(service.readSort()).toEqual({ field: 'dueAt', direction: 'asc' });
    });

    it('should fall back to dueAt/asc when the JSON is not an object', () => {
      const { service } = build('"a string"');

      expect(service.readSort()).toEqual({ field: 'dueAt', direction: 'asc' });
    });

    it('should fall back to dueAt/asc when the stored sort field is stale', () => {
      const { service } = build(
        JSON.stringify({ sortField: 'retiredField', sortDirection: 'desc' }),
      );

      expect(service.readSort()).toEqual({ field: 'dueAt', direction: 'asc' });
    });

    it.each<InterventionListSort['field']>([
      'name',
      'dueAt',
      'plannedStartAt',
      'createdAt',
      'updatedAt',
      'priority',
    ])('should restore a valid stored sort field: %s', (field) => {
      const { service } = build(JSON.stringify({ sortField: field, sortDirection: 'desc' }));

      expect(service.readSort()).toEqual({ field, direction: 'desc' });
    });

    it('should default the direction to asc when the stored direction is not desc', () => {
      const { service } = build(JSON.stringify({ sortField: 'name', sortDirection: 'sideways' }));

      expect(service.readSort()).toEqual({ field: 'name', direction: 'asc' });
    });
  });

  describe('readHiddenColumns', () => {
    it('should return an empty set when no cookie is stored', () => {
      const { service } = build(null);

      expect(service.readHiddenColumns()).toEqual(new Set());
    });

    it('should return the stored raw column ids', () => {
      const { service } = build(JSON.stringify({ hiddenColumns: ['owner', 'facility'] }));

      expect(service.readHiddenColumns()).toEqual(new Set(['owner', 'facility']));
    });

    it('should return an empty set when hiddenColumns is not an array', () => {
      const { service } = build(JSON.stringify({ hiddenColumns: 'owner' }));

      expect(service.readHiddenColumns()).toEqual(new Set());
    });

    it('should drop non-string entries and cap the set at 24 entries', () => {
      const columns = Array.from({ length: 30 }, (_, index) => `column-${index}`);
      const { service } = build(JSON.stringify({ hiddenColumns: [...columns, 7, null] }));

      const result = service.readHiddenColumns();

      expect(result.size).toBe(24);
      expect(result.has('column-0')).toBe(true);
      expect(result.has('column-23')).toBe(true);
      expect(result.has('column-24')).toBe(false);
    });
  });

  describe('readPageSize', () => {
    it('should return null when no cookie is stored', () => {
      const { service } = build(null);

      expect(service.readPageSize()).toBeNull();
    });

    it('should return the stored positive integer page size', () => {
      const { service } = build(JSON.stringify({ pageSize: 50 }));

      expect(service.readPageSize()).toBe(50);
    });

    it('should return null for a non-integer page size', () => {
      const { service } = build(JSON.stringify({ pageSize: 12.5 }));

      expect(service.readPageSize()).toBeNull();
    });

    it('should return null for a zero or negative page size', () => {
      const { service } = build(JSON.stringify({ pageSize: 0 }));

      expect(service.readPageSize()).toBeNull();
    });

    it('should return null for a non-numeric page size', () => {
      const { service } = build(JSON.stringify({ pageSize: '50' }));

      expect(service.readPageSize()).toBeNull();
    });
  });

  describe('write', () => {
    it('should persist a single JSON cookie with sameSite Lax and a one-year maxAge', () => {
      const { service, cookies } = build(null);
      const sort: InterventionListSort = { field: 'priority', direction: 'desc' };

      service.write(sort, new Set(['owner', 'facility']), 25);

      expect(cookies.setCookie).toHaveBeenCalledWith({
        name: 'fg-intervention-list',
        value: JSON.stringify({
          sortField: 'priority',
          sortDirection: 'desc',
          hiddenColumns: ['owner', 'facility'],
          pageSize: 25,
        }),
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'Lax',
      });
    });

    it('should cap the persisted hidden columns at 24 entries', () => {
      const { service, cookies } = build(null);
      const columns = Array.from({ length: 30 }, (_, index) => `column-${index}`);

      service.write({ field: 'dueAt', direction: 'asc' }, new Set(columns), 25);

      const payload = JSON.parse(cookies.setCookie.mock.calls[0][0].value) as {
        readonly hiddenColumns: readonly string[];
      };
      expect(payload.hiddenColumns).toHaveLength(24);
    });
  });
});
