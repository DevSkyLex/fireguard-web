/** Segment each linkable subject type resolves under, relative to `/organizations/:organizationId`. */
const AUDIT_SUBJECT_SEGMENT: Record<string, string> = {
  facility: 'facilities',
  equipment: 'equipments',
  inspection: 'inspections',
  intervention: 'interventions',
  organization_member: 'members',
};

/** Subject types that link to their owning collection page rather than a per-record route. */
const AUDIT_SUBJECT_COLLECTION_SEGMENT: Record<string, string> = {
  approval_request: 'approvals',
  import_job: 'imports',
};

/**
 * Function resolveAuditSubjectRoute
 *
 * @description
 * Resolves an audit row's subject to `routerLink` commands, for the subject
 * types that have a real destination. `facility`, `equipment`, `inspection`,
 * `intervention` and `organization_member` link to their record;
 * `approval_request` and `import_job` link to their owning list, since
 * neither subfeature exposes a per-record route. Every other subject type —
 * and a linkable type missing its `subjectId` — renders plain: `null` means
 * "no link", never a broken one.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {string} organizationId - The active organization, prefixing every resolved route.
 * @param {string} [subjectType] - The event's raw subject type.
 * @param {string} [subjectId] - The event's raw subject id.
 *
 * @returns {ReadonlyArray<string> | null} Route commands for `[routerLink]`, or `null` to render plain.
 */
export function resolveAuditSubjectRoute(
  organizationId: string,
  subjectType?: string,
  subjectId?: string,
): ReadonlyArray<string> | null {
  if (!subjectType) return null;

  const collectionSegment: string | undefined = AUDIT_SUBJECT_COLLECTION_SEGMENT[subjectType];
  if (collectionSegment) return ['/organizations', organizationId, collectionSegment];

  const recordSegment: string | undefined = AUDIT_SUBJECT_SEGMENT[subjectType];
  if (!recordSegment || !subjectId) return null;

  return ['/organizations', organizationId, recordSegment, subjectId];
}
