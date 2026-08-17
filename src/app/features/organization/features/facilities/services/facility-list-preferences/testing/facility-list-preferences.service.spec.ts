import { TestBed } from '@angular/core/testing';
import { CookieService } from '@core/cookie';
import type { FacilityListSort } from '@features/organization/features/facilities/models';
import { FacilityListPreferencesService } from '../facility-list-preferences.service';

function build(cookieValue: string | null): {
  service: FacilityListPreferencesService;
  cookies: { getCookie: ReturnType<typeof vi.fn>; setCookie: ReturnType<typeof vi.fn> };
} {
  const cookies = {
    getCookie: vi.fn().mockReturnValue(cookieValue),
    setCookie: vi.fn(),
  };

  TestBed.configureTestingModule({
    providers: [FacilityListPreferencesService, { provide: CookieService, useValue: cookies }],
  });

  return { service: TestBed.inject(FacilityListPreferencesService), cookies };
}

describe('FacilityListPreferencesService', () => {
  describe('readSort', () => {
    it('should fall back to name/asc when no cookie is stored', () => {
      const { service } = build(null);

      expect(service.readSort()).toEqual({ field: 'name', direction: 'asc' });
    });

    it('should fall back to name/asc when the cookie is corrupted JSON', () => {
      const { service } = build('{not-json');

      expect(service.readSort()).toEqual({ field: 'name', direction: 'asc' });
    });

    it('should fall back to name/asc when the JSON is not an object', () => {
      const { service } = build('"a string"');

      expect(service.readSort()).toEqual({ field: 'name', direction: 'asc' });
    });

    it('should fall back to name/asc when the stored sort field is stale', () => {
      const { service } = build(
        JSON.stringify({ sortField: 'retiredField', sortDirection: 'desc' }),
      );

      expect(service.readSort()).toEqual({ field: 'name', direction: 'asc' });
    });

    it.each<FacilityListSort['field']>([
      'name',
      'type',
      'status',
      'createdAt',
      'updatedAt',
      'code',
    ])('should restore a valid stored sort field: %s', (field) => {
      const { service } = build(JSON.stringify({ sortField: field, sortDirection: 'desc' }));

      expect(service.readSort()).toEqual({ field, direction: 'desc' });
    });

    it('should default the direction to asc when the stored direction is not desc', () => {
      const { service } = build(JSON.stringify({ sortField: 'type', sortDirection: 'sideways' }));

      expect(service.readSort()).toEqual({ field: 'type', direction: 'asc' });
    });
  });

  describe('write', () => {
    it('should persist a single JSON cookie with sameSite Lax and a one-year maxAge', () => {
      const { service, cookies } = build(null);
      const sort: FacilityListSort = { field: 'code', direction: 'desc' };

      service.write(sort);

      expect(cookies.setCookie).toHaveBeenCalledWith({
        name: 'fg-facility-list',
        value: JSON.stringify({ sortField: 'code', sortDirection: 'desc' }),
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'Lax',
      });
    });
  });
});
