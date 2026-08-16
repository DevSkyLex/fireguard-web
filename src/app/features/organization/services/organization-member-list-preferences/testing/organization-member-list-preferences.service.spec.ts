import { TestBed } from '@angular/core/testing';
import { CookieService } from '@core/cookie';
import type { OrganizationMemberListSort } from '@features/organization/models';
import { OrganizationMemberListPreferencesService } from '../organization-member-list-preferences.service';

function build(cookieValue: string | null): {
  service: OrganizationMemberListPreferencesService;
  cookies: { getCookie: ReturnType<typeof vi.fn>; setCookie: ReturnType<typeof vi.fn> };
} {
  const cookies = {
    getCookie: vi.fn().mockReturnValue(cookieValue),
    setCookie: vi.fn(),
  };

  TestBed.configureTestingModule({
    providers: [
      OrganizationMemberListPreferencesService,
      { provide: CookieService, useValue: cookies },
    ],
  });

  return { service: TestBed.inject(OrganizationMemberListPreferencesService), cookies };
}

describe('OrganizationMemberListPreferencesService', () => {
  describe('readSort', () => {
    it('should fall back to joinedAt/asc when no cookie is stored', () => {
      const { service } = build(null);

      expect(service.readSort()).toEqual({ field: 'joinedAt', direction: 'asc' });
    });

    it('should fall back to joinedAt/asc when the cookie is corrupted JSON', () => {
      const { service } = build('{not-json');

      expect(service.readSort()).toEqual({ field: 'joinedAt', direction: 'asc' });
    });

    it('should fall back to joinedAt/asc when the JSON is not an object', () => {
      const { service } = build('"a string"');

      expect(service.readSort()).toEqual({ field: 'joinedAt', direction: 'asc' });
    });

    it('should fall back to joinedAt/asc when the stored sort field is stale', () => {
      const { service } = build(JSON.stringify({ field: 'retiredField', direction: 'desc' }));

      expect(service.readSort()).toEqual({ field: 'joinedAt', direction: 'asc' });
    });

    it.each<OrganizationMemberListSort['field']>(['joinedAt', 'displayName'])(
      'should restore a valid stored sort field: %s',
      (field) => {
        const { service } = build(JSON.stringify({ field, direction: 'desc' }));

        expect(service.readSort()).toEqual({ field, direction: 'desc' });
      },
    );

    it('should default the direction to asc when the stored direction is not desc', () => {
      const { service } = build(JSON.stringify({ field: 'displayName', direction: 'sideways' }));

      expect(service.readSort()).toEqual({ field: 'displayName', direction: 'asc' });
    });
  });

  describe('write', () => {
    it('should persist a single JSON cookie with sameSite Lax and a one-year maxAge', () => {
      const { service, cookies } = build(null);
      const sort: OrganizationMemberListSort = { field: 'displayName', direction: 'desc' };

      service.write(sort);

      expect(cookies.setCookie).toHaveBeenCalledWith({
        name: 'fg-organization-member-list',
        value: JSON.stringify({ field: 'displayName', direction: 'desc' }),
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'Lax',
      });
    });
  });
});
