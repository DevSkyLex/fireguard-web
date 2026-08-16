import { TestBed } from '@angular/core/testing';
import { CookieService } from '@core/cookie';
import type { EquipmentListSort } from '@features/organization/features/equipments/models';
import { EquipmentListPreferencesService } from '../equipment-list-preferences.service';

function build(cookieValue: string | null): {
  service: EquipmentListPreferencesService;
  cookies: { getCookie: ReturnType<typeof vi.fn>; setCookie: ReturnType<typeof vi.fn> };
} {
  const cookies = {
    getCookie: vi.fn().mockReturnValue(cookieValue),
    setCookie: vi.fn(),
  };

  TestBed.configureTestingModule({
    providers: [EquipmentListPreferencesService, { provide: CookieService, useValue: cookies }],
  });

  return { service: TestBed.inject(EquipmentListPreferencesService), cookies };
}

describe('EquipmentListPreferencesService', () => {
  describe('readSort', () => {
    it('should fall back to createdAt/asc when no cookie is stored', () => {
      const { service } = build(null);

      expect(service.readSort()).toEqual({ field: 'createdAt', direction: 'asc' });
    });

    it('should fall back to createdAt/asc when the cookie is corrupted JSON', () => {
      const { service } = build('{not-json');

      expect(service.readSort()).toEqual({ field: 'createdAt', direction: 'asc' });
    });

    it('should fall back to createdAt/asc when the JSON is not an object', () => {
      const { service } = build('"a string"');

      expect(service.readSort()).toEqual({ field: 'createdAt', direction: 'asc' });
    });

    it('should fall back to createdAt/asc when the stored sort field is stale', () => {
      const { service } = build(
        JSON.stringify({ sortField: 'retiredField', sortDirection: 'desc' }),
      );

      expect(service.readSort()).toEqual({ field: 'createdAt', direction: 'asc' });
    });

    it.each<EquipmentListSort['field']>([
      'type',
      'status',
      'brand',
      'model',
      'createdAt',
      'updatedAt',
    ])('should restore a valid stored sort field: %s', (field) => {
      const { service } = build(JSON.stringify({ sortField: field, sortDirection: 'desc' }));

      expect(service.readSort()).toEqual({ field, direction: 'desc' });
    });

    it('should default the direction to asc when the stored direction is not desc', () => {
      const { service } = build(JSON.stringify({ sortField: 'brand', sortDirection: 'sideways' }));

      expect(service.readSort()).toEqual({ field: 'brand', direction: 'asc' });
    });
  });

  describe('write', () => {
    it('should persist a single JSON cookie with sameSite Lax and a one-year maxAge', () => {
      const { service, cookies } = build(null);
      const sort: EquipmentListSort = { field: 'status', direction: 'desc' };

      service.write(sort);

      expect(cookies.setCookie).toHaveBeenCalledWith({
        name: 'fg-equipment-list',
        value: JSON.stringify({ sortField: 'status', sortDirection: 'desc' }),
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'Lax',
      });
    });
  });
});
