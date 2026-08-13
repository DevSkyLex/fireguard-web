import type {
  InterventionEditTarget,
  InterventionIssueOutput,
  InterventionIssueTarget,
} from '@features/organization/features/interventions/models';

/**
 * Constant FIELD_EDIT_TARGETS
 * @const FIELD_EDIT_TARGETS
 *
 * @description
 * Maps an intervention-level issue `field` to the in-place editor that fixes
 * it. Only fields the properties/about editors actually own are listed —
 * `plannedStartAt` and `dueAt` both resolve to the combined `schedule`
 * editor, matching `InterventionEditTarget`'s own grouping.
 *
 * @since 1.0.0
 *
 * @type {Readonly<Record<string, InterventionEditTarget>>}
 */
const FIELD_EDIT_TARGETS: Readonly<Record<string, InterventionEditTarget>> = {
  site: 'site',
  responsible: 'responsible',
  participants: 'participants',
  plannedStartAt: 'schedule',
  dueAt: 'schedule',
  schedule: 'schedule',
  priority: 'priority',
  description: 'description',
  labels: 'labels',
  labelIds: 'labels',
};

/**
 * Function resourceCollectionSegment
 * @function resourceCollectionSegment
 *
 * @description
 * Reads the collection segment off an API Platform resource IRI —
 * `/api/equipment/{id}` → `equipment`. The backend's `InterventionIssueOutput`
 * carries an IRI, not a bare resource-type literal, so the mapper matches
 * against this segment rather than `issue.resource` directly.
 *
 * @since 1.0.0
 *
 * @param {string} resourceIri - The issue's `resource` IRI.
 *
 * @return {string} The collection segment, or an empty string if unparsable.
 */
function resourceCollectionSegment(resourceIri: string): string {
  return /^\/api\/([^/]+)\//.exec(resourceIri)?.[1] ?? '';
}

/**
 * Function resolveInterventionIssueTarget
 * @function resolveInterventionIssueTarget
 *
 * @description
 * Maps a publication issue to where activating it should send the operator,
 * grounded in the exact `resource`/`field` pairs `InterventionIssueFinder`
 * (the backend service that produces every issue today) emits: a
 * `facilities`/`equipment`/`inspections` resource routes to that rail tab; an
 * `interventions` resource with a field the page can edit in place routes to
 * that editor. Every other pair — including every issue the finder emits
 * today for the intervention resource itself, which never carries a `field`
 * — falls back to the field-work section, since a missing facility, missing
 * equipment, missing inspection or incomplete work item is, without a more
 * specific field, closest addressed by the checklist an operator already
 * works through there.
 *
 * @since 1.0.0
 *
 * @param {InterventionIssueOutput} issue - The issue to route.
 *
 * @return {InterventionIssueTarget} Where activating the issue should send the operator.
 */
export function resolveInterventionIssueTarget(
  issue: InterventionIssueOutput,
): InterventionIssueTarget {
  const segment: string = resourceCollectionSegment(issue.resource);

  if (segment === 'facilities') return { kind: 'railTab', tab: 'facilities' };
  if (segment === 'equipment') return { kind: 'railTab', tab: 'equipment' };
  if (segment === 'inspections') return { kind: 'railTab', tab: 'inspections' };

  if (segment === 'interventions' && issue.field !== null) {
    const target: InterventionEditTarget | undefined = FIELD_EDIT_TARGETS[issue.field];
    if (target !== undefined) return { kind: 'edit', target };
  }

  return { kind: 'workItems' };
}
