import { resolveNotFoundOrigin } from '../resolve-not-found-origin.utils';

describe('resolveNotFoundOrigin', () => {
  it('should read the organization and the collection from a workspace address', () => {
    expect(resolveNotFoundOrigin('/organizations/org-1/interventions/does-not-exist')).toEqual({
      organizationId: 'org-1',
      collection: 'interventions',
    });
  });

  it('should read the organization alone when no collection follows', () => {
    expect(resolveNotFoundOrigin('/organizations/org-1')).toEqual({
      organizationId: 'org-1',
      collection: null,
    });
  });

  it('should ignore a query string', () => {
    expect(resolveNotFoundOrigin('/organizations/org-1/facilities?tab=all')).toEqual({
      organizationId: 'org-1',
      collection: 'facilities',
    });
  });

  it('should refuse a collection the application does not serve', () => {
    expect(resolveNotFoundOrigin('/organizations/org-1/not-a-collection')).toEqual({
      organizationId: 'org-1',
      collection: null,
    });
  });

  it('should refuse the public invitation route, which names no organization', () => {
    expect(resolveNotFoundOrigin('/organizations/invitations/accept')).toEqual({
      organizationId: null,
      collection: null,
    });
  });

  it('should resolve to nothing for an address outside the workspace', () => {
    expect(resolveNotFoundOrigin('/auth/login')).toEqual({
      organizationId: null,
      collection: null,
    });
  });

  it('should resolve to nothing when no address was carried', () => {
    expect(resolveNotFoundOrigin(null)).toEqual({ organizationId: null, collection: null });
  });
});
