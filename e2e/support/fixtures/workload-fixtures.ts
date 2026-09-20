import type { WorkloadOutput } from '../../../src/app/features/organization/features/workload/models/projection/workload-output.interface';
import { E2E_ORGANIZATION_ID } from './api-fixtures';
import { E2E_MEMBER_ID, E2E_INTERVENTION_ID } from './intervention-fixtures';

/**
 * Function withWorkloadPlanningIssues
 *
 * @description
 * Adds repeated interventions, all exclusion reasons and independent draft work to a projection.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {WorkloadOutput} output - Date-scoped mock response before member filtering.
 * @returns {WorkloadOutput} Populated planning disclosure scenario.
 */
export function withWorkloadPlanningIssues(output: WorkloadOutput): WorkloadOutput {
  const first = output.projection.members[0];
  const source = first.unallocated[0];
  const estimates = Array.from({ length: 12 }, (_, index) => ({
    ...source,
    taskId: `planning-task-${index}`,
    interventionId:
      index < 2 ? source.interventionId : `planning-intervention-${Math.floor(index / 2)}`,
    label:
      index < 2
        ? 'Paris headquarters — emergency response equipment and fire safety documentation'
        : `Regional fire safety inspection ${Math.floor(index / 2)}`,
  }));
  return {
    ...output,
    projection: {
      ...output.projection,
      members: output.projection.members.map((member, index) => ({
        ...member,
        unallocated:
          index === 0
            ? [
                ...estimates,
                { ...estimates[0], taskId: 'planning-draft', commitment: 'draft' },
                { ...source, taskId: 'planning-dates', reason: 'undated', remainingMinutes: 90 },
                { ...source, taskId: 'planning-overdue', reason: 'overdue', remainingMinutes: 180 },
                {
                  ...source,
                  taskId: 'planning-capacity',
                  reason: 'unknown_capacity',
                  remainingMinutes: 120,
                },
                {
                  ...source,
                  taskId: 'planning-availability',
                  reason: 'no_available_day',
                  remainingMinutes: 60,
                },
              ]
            : [
                { ...estimates[0], taskId: `planning-member-${index}-a` },
                { ...estimates[0], taskId: `planning-member-${index}-b` },
              ],
      })),
      unassigned: [
        {
          ...source,
          taskId: 'planning-unassigned-a',
          label: 'Warehouse inventory',
          reason: 'unassigned',
          remainingMinutes: 120,
        },
        {
          ...source,
          taskId: 'planning-unassigned-b',
          label: 'Warehouse inventory',
          reason: 'unassigned',
          remainingMinutes: 60,
        },
      ],
    },
  };
}

/** Complete API totals; the browser must never distribute task minutes itself. */
export function workloadOutput(from = '2026-09-14', memberCount = 1): WorkloadOutput {
  const base: WorkloadOutput = {
    totalItems: 1,
    page: 1,
    pageSize: 10,
    '@id': '/api/organizations/' + E2E_ORGANIZATION_ID + '/workload',
    '@type': 'Workload',
    organizationId: E2E_ORGANIZATION_ID,
    canReadTeam: true,
    canManageCapacity: true,
    memberOptions: [
      {
        id: E2E_MEMBER_ID,
        name: 'Alexandrie Fernández — équipe de maintenance et sécurité incendie',
        avatarUrl: null,
        roleNames: ['Responsable de la maintenance et de la sécurité incendie'],
      },
    ],
    teams: [{ id: 'team-1', name: 'Maintenance' }],
    projection: {
      startsOn: from,
      endsOn: new Date(Date.parse(from + 'T12:00:00Z') + 6 * 86400000).toISOString().slice(0, 10),
      today: '2026-09-16',
      timezone: 'Europe/Paris',
      firstDayOfWeek: 'monday',
      calculatedAt: '2026-09-16T10:00:00Z',
      completeness: 'partial',
      unassigned: [],
      members: [
        {
          memberId: E2E_MEMBER_ID,
          displayName: 'Alexandrie Fernández — équipe de maintenance et sécurité incendie',
          unallocated: [
            {
              taskId: 'unknown-task',
              interventionId: E2E_INTERVENTION_ID,
              label: 'Emergency pump — estimate missing',
              reason: 'unestimated',
              remainingMinutes: null,
              commitment: 'committed',
            },
          ],
          days: Array.from({ length: 7 }, (_, index) => ({
            date: new Date(Date.parse(from + 'T12:00:00Z') + index * 86400000)
              .toISOString()
              .slice(0, 10),
            capacityMinutes: index < 5 ? 420 : 0,
            actualMinutes: index === 2 ? 120 : 0,
            remainingMinutes: index === 2 ? 360 : 0,
            draftMinutes: 0,
            overloadMinutes: index === 2 ? 60 : 0,
            utilizationPercent: index === 2 ? 114 : 0,
            completeness: 'partial',
            availability: index === 2 ? 'overloaded' : index < 5 ? 'unknown' : 'unavailable',
            contributions:
              index === 2
                ? [
                    {
                      taskId: 'e2e-work-item-1',
                      interventionId: E2E_INTERVENTION_ID,
                      label: 'Emergency pump',
                      kind: 'actual',
                      minutes: 120,
                    },
                    {
                      taskId: 'e2e-work-item-1',
                      interventionId: E2E_INTERVENTION_ID,
                      label: 'Emergency pump',
                      kind: 'committed',
                      minutes: 360,
                    },
                  ]
                : [],
          })),
        },
      ],
    },
  };
  const primary = base.projection.members[0];
  const members = Array.from({ length: memberCount }, (_, index) =>
    index === 0
      ? primary
      : {
          ...primary,
          memberId: `workload-member-${String(index + 1).padStart(2, '0')}`,
          displayName: `Member ${String(index + 1).padStart(2, '0')}`,
          unallocated: [],
          days: primary.days.map((day) => ({
            date: day.date,
            capacityMinutes: day.capacityMinutes,
            actualMinutes: 0,
            remainingMinutes: 0,
            draftMinutes: 0,
            overloadMinutes: 0,
            utilizationPercent: 0,
            completeness: 'complete' as const,
            availability: day.capacityMinutes ? ('available' as const) : ('unavailable' as const),
            contributions: [],
          })),
        },
  );
  return {
    ...base,
    totalItems: members.length,
    memberOptions: members.map((member) => ({
      id: member.memberId,
      name: member.displayName ?? member.memberId,
      avatarUrl: null,
      roleNames:
        member.memberId === E2E_MEMBER_ID
          ? ['Responsable de la maintenance et de la sécurité incendie']
          : [],
    })),
    projection: { ...base.projection, members },
  };
}
