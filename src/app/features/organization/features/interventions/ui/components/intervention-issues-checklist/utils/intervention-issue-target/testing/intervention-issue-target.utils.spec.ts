import type { InterventionIssueOutput } from '@features/organization/features/interventions/models';
import { resolveInterventionIssueTarget } from '../intervention-issue-target.utils';

function issue(resource: string, field: string | null): InterventionIssueOutput {
  return {
    '@id': resource,
    '@type': 'InterventionIssue',
    severity: 'blocker',
    resource,
    field,
    message: 'Test issue',
  };
}

describe('resolveInterventionIssueTarget', () => {
  it('should route a facility resource to the facilities rail tab', () => {
    expect(resolveInterventionIssueTarget(issue('/api/facilities/1', null))).toEqual({
      kind: 'railTab',
      tab: 'facilities',
    });
  });

  it('should route an equipment resource to the equipment rail tab', () => {
    expect(resolveInterventionIssueTarget(issue('/api/equipment/1', 'facility'))).toEqual({
      kind: 'railTab',
      tab: 'equipment',
    });
  });

  it('should route an equipment resource with a recommendation field to the equipment rail tab', () => {
    expect(resolveInterventionIssueTarget(issue('/api/equipment/1', 'serialNumber'))).toEqual({
      kind: 'railTab',
      tab: 'equipment',
    });
  });

  it('should route an inspection resource to the inspections rail tab', () => {
    expect(resolveInterventionIssueTarget(issue('/api/inspections/1', null))).toEqual({
      kind: 'railTab',
      tab: 'inspections',
    });
  });

  it('should route an intervention issue with a known field to its in-place editor', () => {
    expect(resolveInterventionIssueTarget(issue('/api/interventions/abc', 'site'))).toEqual({
      kind: 'edit',
      target: 'site',
    });
  });

  it('should group plannedStartAt and dueAt under the combined schedule editor', () => {
    expect(
      resolveInterventionIssueTarget(issue('/api/interventions/abc', 'plannedStartAt')),
    ).toEqual({ kind: 'edit', target: 'schedule' });
    expect(resolveInterventionIssueTarget(issue('/api/interventions/abc', 'dueAt'))).toEqual({
      kind: 'edit',
      target: 'schedule',
    });
  });

  it("should fall back to workItems for an intervention issue with no field — the finder's actual shape today", () => {
    expect(resolveInterventionIssueTarget(issue('/api/interventions/abc', null))).toEqual({
      kind: 'workItems',
    });
  });

  it('should fall back to workItems for an intervention issue with an unrecognized field', () => {
    expect(
      resolveInterventionIssueTarget(issue('/api/interventions/abc', 'somethingUnmapped')),
    ).toEqual({ kind: 'workItems' });
  });

  it('should fall back to workItems for an unrecognized resource collection', () => {
    expect(resolveInterventionIssueTarget(issue('/api/changes/1', null))).toEqual({
      kind: 'workItems',
    });
  });

  it('should fall back to workItems for an unparsable resource IRI', () => {
    expect(resolveInterventionIssueTarget(issue('not-an-iri', null))).toEqual({
      kind: 'workItems',
    });
  });
});
