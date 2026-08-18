import { iriId } from '../iri-id.utils';

describe('iriId', () => {
  it('should return the trailing segment of a resource IRI', () => {
    expect(iriId('/api/equipment/equipment-uuid-1')).toBe('equipment-uuid-1');
  });

  it('should return the trailing segment of a nested-path IRI', () => {
    expect(iriId('/api/organizations/org-uuid-1')).toBe('org-uuid-1');
  });

  it('should return the input unchanged when it carries no slash', () => {
    expect(iriId('bare-id')).toBe('bare-id');
  });

  it('should return an empty string for a trailing-slash IRI', () => {
    expect(iriId('/api/equipment/')).toBe('');
  });
});
