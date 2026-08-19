import { resolveAuditSubjectRoute } from '../resolve-audit-subject-route.utils';

describe('resolveAuditSubjectRoute', () => {
  const organizationId = 'org-1';

  it('should return null when subjectType is absent', () => {
    expect(resolveAuditSubjectRoute(organizationId)).toBeNull();
  });

  it.each([
    ['facility', 'facilities'],
    ['equipment', 'equipments'],
    ['inspection', 'inspections'],
    ['intervention', 'interventions'],
    ['organization_member', 'members'],
  ])('should link a %s subject to its record route', (subjectType, segment) => {
    expect(resolveAuditSubjectRoute(organizationId, subjectType, 'subject-1')).toEqual([
      '/organizations',
      organizationId,
      segment,
      'subject-1',
    ]);
  });

  it('should return null for a linkable subject type missing its id', () => {
    expect(resolveAuditSubjectRoute(organizationId, 'facility')).toBeNull();
  });

  it('should link an approval_request subject to the approvals inbox, with no id segment', () => {
    expect(resolveAuditSubjectRoute(organizationId, 'approval_request', 'request-1')).toEqual([
      '/organizations',
      organizationId,
      'approvals',
    ]);
  });

  it('should link an import_job subject to the imports page, with no id segment', () => {
    expect(resolveAuditSubjectRoute(organizationId, 'import_job', 'job-1')).toEqual([
      '/organizations',
      organizationId,
      'imports',
    ]);
  });

  it('should return null for an unmapped subject type', () => {
    expect(resolveAuditSubjectRoute(organizationId, 'webhook_subscription', 'sub-1')).toBeNull();
  });
});
