import { resolveOrganizationStatusTag } from '../organization-status-tag.util';

describe('resolveOrganizationStatusTag', () => {
  it('resolves organization status descriptors', () => {
    expect(resolveOrganizationStatusTag('status', 'active').severity).toBe('success');
    expect(resolveOrganizationStatusTag('status', 'inactive').severity).toBe('danger');
  });

  it('falls back to a neutral descriptor for unknown values', () => {
    const descriptor = resolveOrganizationStatusTag('status', 'something_else');
    expect(descriptor.severity).toBe('secondary');
    expect(descriptor.label).toBe('something else');
    expect(descriptor.icon).toBe('pi pi-tag');
  });
});
