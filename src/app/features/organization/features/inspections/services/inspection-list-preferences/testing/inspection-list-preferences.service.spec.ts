import { TestBed } from '@angular/core/testing';
import { CookieService } from '@core/cookie';
import type { InspectionListSort } from '@features/organization/features/inspections/models';
import { InspectionListPreferencesService } from '../inspection-list-preferences.service';

function build(cookieValue: string | null): {
  service: InspectionListPreferencesService;
  cookies: { getCookie: ReturnType<typeof vi.fn>; setCookie: ReturnType<typeof vi.fn> };
} {
  const cookies = {
    getCookie: vi.fn().mockReturnValue(cookieValue),
    setCookie: vi.fn(),
  };

  TestBed.configureTestingModule({
    providers: [InspectionListPreferencesService, { provide: CookieService, useValue: cookies }],
  });

  return { service: TestBed.inject(InspectionListPreferencesService), cookies };
}

describe('InspectionListPreferencesService', () => {
  describe('readSort', () => {
    it('should fall back to performedAt/desc when no cookie is stored', () => {
      const { service } = build(null);

      expect(service.readSort()).toEqual({ field: 'performedAt', direction: 'desc' });
    });

    it('should fall back to performedAt/desc when the cookie is corrupted JSON', () => {
      const { service } = build('{not-json');

      expect(service.readSort()).toEqual({ field: 'performedAt', direction: 'desc' });
    });

    it('should fall back to performedAt/desc when the JSON is not an object', () => {
      const { service } = build('"a string"');

      expect(service.readSort()).toEqual({ field: 'performedAt', direction: 'desc' });
    });

    it('should fall back to performedAt/desc when the stored sort field is stale', () => {
      const { service } = build(
        JSON.stringify({ sortField: 'retiredField', sortDirection: 'asc' }),
      );

      expect(service.readSort()).toEqual({ field: 'performedAt', direction: 'desc' });
    });

    it.each<InspectionListSort['field']>(['result', 'status', 'performedAt', 'createdAt'])(
      'should restore a valid stored sort field: %s',
      (field) => {
        const { service } = build(JSON.stringify({ sortField: field, sortDirection: 'asc' }));

        expect(service.readSort()).toEqual({ field, direction: 'asc' });
      },
    );

    it('should default the direction to desc when the stored direction is not asc', () => {
      const { service } = build(JSON.stringify({ sortField: 'status', sortDirection: 'sideways' }));

      expect(service.readSort()).toEqual({ field: 'status', direction: 'desc' });
    });
  });

  describe('writeSort', () => {
    it('should persist a single JSON cookie with sameSite Lax and a one-year maxAge', () => {
      const { service, cookies } = build(null);
      const sort: InspectionListSort = { field: 'result', direction: 'asc' };

      service.writeSort(sort);

      expect(cookies.setCookie).toHaveBeenCalledWith({
        name: 'fg-inspection-list',
        value: JSON.stringify({ sortField: 'result', sortDirection: 'asc' }),
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'Lax',
      });
    });
  });
});
