import { organizationShellPrefix } from '../organization-shell-prefix.utils';

describe('organizationShellPrefix', () => {
  const ORG = 'org-1';

  it('returns the dashboard prefix outside the workspace shell', () => {
    expect(organizationShellPrefix('/organizations/org-1/interventions', ORG)).toEqual([
      '/organizations',
      'org-1',
    ]);
  });

  it('returns the workspace prefix inside the workspace shell', () => {
    expect(organizationShellPrefix('/organizations/org-1/workspace/channels/c1', ORG)).toEqual([
      '/organizations',
      'org-1',
      'workspace',
    ]);
  });

  it('scopes the workspace segment to the given organization', () => {
    // A `workspace` segment belonging to a different organization must not flip
    // the shell for this one.
    expect(organizationShellPrefix('/organizations/org-2/workspace', ORG)).toEqual([
      '/organizations',
      'org-1',
    ]);
  });

  it('treats the bare organization root as the dashboard shell', () => {
    expect(organizationShellPrefix('/organizations/org-1', ORG)).toEqual([
      '/organizations',
      'org-1',
    ]);
  });
});
