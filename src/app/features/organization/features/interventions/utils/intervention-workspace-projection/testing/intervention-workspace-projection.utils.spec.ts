import type {
  InterventionWorkspaceData,
  InterventionOutboxOperation,
} from '@features/organization/features/interventions/models';
import {
  projectInterventionWorkspace,
  searchSavedChanges,
  searchSavedWorkItems,
} from '../intervention-workspace-projection.utils';

describe('saved intervention table projection', () => {
  const snapshot = {
    intervention: { id: 'A', status: 'in_progress' },
    workItems: [
      {
        id: 'work',
        '@id': '/api/intervention-work-items/work',
        intervention: '/api/interventions/A',
        status: 'planned',
        action: 'inventory',
        targetSummary: { label: 'Emergency pump' },
        assigneeProfile: {
          member: '/api/members/marie',
          userId: 'marie',
          displayName: 'Marie',
          avatarUrl: null,
        },
      },
    ],
    changes: [
      {
        id: 'change',
        workItem: null,
        intervention: '/api/interventions/A',
        status: 'proposed',
        resource: '/api/equipment/pump',
        patch: { locationLabel: 'Rack B' },
      },
    ],
    issues: [],
  } as unknown as InterventionWorkspaceData;
  const operations: readonly InterventionOutboxOperation[] = [
    {
      id: 'op1',
      interventionId: 'A',
      type: 'work-item.update',
      payload: { workItemId: 'work', status: 'completed' },
      createdAt: '2026-09-15',
    },
    {
      id: 'op2',
      interventionId: 'A',
      type: 'change.update',
      payload: { changeId: 'change', status: 'rejected' },
      status: 'conflict',
      createdAt: '2026-09-15',
    },
  ];

  it('applies pending and conflicted local intent before filtering the complete snapshot', () => {
    const projected = projectInterventionWorkspace(snapshot, operations);
    expect(
      searchSavedWorkItems(projected.workItems, {
        search: '',
        statuses: ['planned', 'in_progress'],
      }),
    ).toEqual([]);
    expect(searchSavedChanges(projected.changes, { search: '', status: 'proposed' })).toEqual([]);
    expect(projected.changes[0]?.status).toBe('rejected');
    expect(snapshot.workItems[0]?.status).toBe('planned');
  });

  it('searches embedded labels and patch values, not only identifiers', () => {
    expect(
      searchSavedWorkItems(snapshot.workItems, { search: 'MARIE', statuses: null }),
    ).toHaveLength(1);
    expect(
      searchSavedWorkItems(snapshot.workItems, { search: 'Emergency', statuses: ['planned'] }),
    ).toHaveLength(1);
    expect(searchSavedChanges(snapshot.changes, { search: 'rack b', status: null })).toHaveLength(
      1,
    );
  });

  it('searches displayed field, boolean and fallback resource labels offline', () => {
    const change = snapshot.changes[0];
    if (!change) throw new Error('Expected a change fixture');
    const rows = [
      {
        ...change,
        resource: '/api/unknown/resource',
        patch: { locationLabel: 'Rack B', enabled: true },
      },
    ];
    for (const search of ['location label', 'yes', 'linked resource']) {
      expect(searchSavedChanges(rows, { search, status: null })).toHaveLength(1);
    }
  });

  it('searches the label of a saved result resource as displayed by the table', () => {
    const item = snapshot.workItems[0];
    if (!item) throw new Error('Expected a work-item fixture');
    const items = [{ ...item, target: null, resultResource: '/api/equipment/pump' }];
    expect(
      searchSavedChanges(snapshot.changes, { search: 'emergency pump', status: null }, items),
    ).toHaveLength(1);
  });

  it('overlays remaining operations on fresh server rows without restoring stale unrelated rows', () => {
    const item = snapshot.workItems[0];
    if (!item) throw new Error('Expected the saved work-item fixture');
    const fresh = {
      ...snapshot,
      workItems: [
        {
          ...item,
          targetSummary: {
            kind: 'equipment' as const,
            label: 'Fresh pump',
            resource: '/api/equipment/pump',
          },
        },
      ],
    };
    const projected = projectInterventionWorkspace(fresh, operations, snapshot);
    expect(projected.workItems[0]?.targetSummary?.label).toBe('Fresh pump');
    expect(projected.workItems[0]?.status).toBe('completed');
  });

  it('ignores a different intervention and does not duplicate an already cached create', () => {
    const operation = operations[0];
    if (!operation) throw new Error('Expected the pending-operation fixture');
    const create: InterventionOutboxOperation = {
      id: 'op3',
      interventionId: 'A',
      type: 'work-item.create',
      payload: {
        clientId: 'work',
        intervention: '/api/interventions/A',
        action: 'inventory',
        source: 'planned',
        required: true,
      },
      createdAt: '2026-09-15',
    };
    const projected = projectInterventionWorkspace(snapshot, [
      create,
      { ...operation, interventionId: 'B' },
    ]);
    expect(projected.workItems).toHaveLength(1);
    expect(projected.workItems[0]?.status).toBe('planned');
  });

  it('projects new offline work once, including its schedule and derived progress', () => {
    const createWithSchedule: InterventionOutboxOperation = {
      id: 'create-scheduled',
      interventionId: 'A',
      type: 'work-item.create',
      payload: {
        clientId: 'scheduled',
        intervention: '/api/interventions/A',
        action: 'inventory',
        target: '/api/equipment/pump',
        resultResource: '/api/equipment/replacement',
        assignee: '/api/members/marie',
        source: 'planned',
        required: true,
        estimatedMinutes: 45,
        workStartsOn: '2026-09-24',
        workEndsOn: '2026-09-25',
      },
      createdAt: '2026-09-23T10:00:00Z',
    };
    const createWithoutOptionalFields: InterventionOutboxOperation = {
      id: 'create-unestimated',
      interventionId: 'A',
      type: 'work-item.create',
      payload: {
        clientId: 'unestimated',
        intervention: '/api/interventions/A',
        action: 'inventory',
        source: 'planned',
        required: false,
      },
      createdAt: '2026-09-23T10:01:00Z',
    };
    const createWithoutClientId: InterventionOutboxOperation = {
      ...createWithoutOptionalFields,
      id: 'create-without-id',
      payload: { ...createWithoutOptionalFields.payload, clientId: undefined },
    };
    const pending = [createWithSchedule, createWithoutOptionalFields, createWithoutClientId];

    const projected = projectInterventionWorkspace(snapshot, pending);
    const projectedAgain = projectInterventionWorkspace(projected, pending);

    expect(projected.workItems.map((item) => item.id)).toEqual([
      'work',
      'scheduled',
      'unestimated',
    ]);
    expect(projected.workItems[1]).toMatchObject({
      status: 'planned',
      estimatedMinutes: 45,
      remainingMinutes: 45,
      workStartsOn: '2026-09-24',
      workEndsOn: '2026-09-25',
      assignee: '/api/members/marie',
      target: '/api/equipment/pump',
      resultResource: '/api/equipment/replacement',
    });
    expect(projected.workItems[2]).toMatchObject({
      target: null,
      resultResource: null,
      assignee: null,
      estimatedMinutes: null,
      remainingMinutes: null,
      workStartsOn: null,
      workEndsOn: null,
    });
    expect(projected.intervention.workItemsCount).toBe(3);
    expect(projected.intervention.completedWorkItemsCount).toBe(0);
    expect(projectedAgain.workItems).toEqual(projected.workItems);
    expect(snapshot.workItems).toHaveLength(1);
  });

  it.each(['completed', 'skipped'] as const)(
    'clears stale remaining time when a %s work item is reopened offline',
    (status) => {
      const item = snapshot.workItems[0];
      if (!item) throw new Error('Expected the saved work-item fixture');
      const base: InterventionWorkspaceData = {
        ...snapshot,
        intervention: {
          ...snapshot.intervention,
          workItemsCount: 1,
          completedWorkItemsCount: 1,
        },
        workItems: [{ ...item, status, remainingMinutes: 0 }],
      };
      const reopen: InterventionOutboxOperation = {
        id: `reopen-${status}`,
        interventionId: 'A',
        type: 'work-item.update',
        payload: { workItemId: 'work', status: 'in_progress' },
        createdAt: '2026-09-23',
      };

      const projected = projectInterventionWorkspace(base, [reopen]);
      expect(projected.workItems[0]?.remainingMinutes).toBeNull();
      expect(projected.intervention.completedWorkItemsCount).toBe(0);

      const explicit = projectInterventionWorkspace(base, [
        { ...reopen, payload: { ...reopen.payload, remainingMinutes: 15 } },
      ]);
      expect(explicit.workItems[0]?.remainingMinutes).toBe(15);
    },
  );

  it('uses the saved assignee label when a fresh server row is reassigned offline', () => {
    const item = snapshot.workItems[0];
    if (!item) throw new Error('Expected the saved work-item fixture');
    if (!item.assigneeProfile) throw new Error('Expected the saved assignee fixture');
    const fresh: InterventionWorkspaceData = {
      ...snapshot,
      workItems: [
        {
          ...item,
          assignee: '/api/members/alex',
          assigneeProfile: { ...item.assigneeProfile, displayName: 'Alex' },
        },
      ],
    };
    const saved: InterventionWorkspaceData = {
      ...snapshot,
      workItems: [{ ...item, assignee: '/api/members/marie' }],
    };
    const reassign: InterventionOutboxOperation = {
      id: 'reassign',
      interventionId: 'A',
      type: 'work-item.update',
      payload: { workItemId: 'work', assignee: '/api/members/marie' },
      createdAt: '2026-09-23',
    };

    expect(projectInterventionWorkspace(fresh, [reassign], saved).workItems[0]).toMatchObject({
      assignee: '/api/members/marie',
      assigneeProfile: { displayName: 'Marie' },
    });
    expect(projectInterventionWorkspace(fresh, [reassign], fresh).workItems[0]).toMatchObject({
      assignee: '/api/members/marie',
      assigneeProfile: null,
    });
  });

  it('keeps locally proposed changes and saved conflicts visible across a server refresh', () => {
    const fresh: InterventionWorkspaceData = { ...snapshot, changes: [] };
    const create: InterventionOutboxOperation = {
      id: 'create-change',
      interventionId: 'A',
      type: 'change.create',
      payload: {
        clientId: 'local-change',
        intervention: '/api/interventions/A',
        workItem: '/api/intervention-work-items/work',
        resource: '/api/equipment/pump',
        patch: { locationLabel: 'Rack C' },
      },
      createdAt: '2026-09-23',
    };
    const reject: InterventionOutboxOperation = {
      id: 'reject-change',
      interventionId: 'A',
      type: 'change.update',
      payload: { changeId: 'change', status: 'rejected' },
      createdAt: '2026-09-23',
    };

    const projected = projectInterventionWorkspace(fresh, [create, reject], snapshot);
    expect(projected.changes.map((change) => change.id)).toEqual(['local-change', 'change']);
    expect(projected.changes[0]).toMatchObject({
      status: 'proposed',
      workItem: '/api/intervention-work-items/work',
      patch: { locationLabel: 'Rack C' },
    });
    expect(projected.changes[1]?.status).toBe('rejected');
    expect(projectInterventionWorkspace(projected, [create, reject], snapshot).changes).toEqual(
      projected.changes,
    );
    expect(fresh.changes).toHaveLength(0);
  });

  it('keeps saved labels while applying an offline intervention update to fresh data', () => {
    const saved: InterventionWorkspaceData = {
      ...snapshot,
      intervention: {
        ...snapshot.intervention,
        labels: [{ id: 'safety', name: 'Safety', color: '#ff0000' }],
      },
    };
    const fresh: InterventionWorkspaceData = {
      ...snapshot,
      intervention: { ...snapshot.intervention, labels: [], revision: 7 },
    };
    const update: InterventionOutboxOperation = {
      id: 'update-intervention',
      interventionId: 'A',
      type: 'intervention.update',
      payload: { name: 'Pump inspection', labelIds: ['safety'], revision: 6 },
      createdAt: '2026-09-23',
    };

    const projected = projectInterventionWorkspace(fresh, [update], saved);
    expect(projected.intervention.name).toBe('Pump inspection');
    expect(projected.intervention.labels).toEqual(saved.intervention.labels);
    expect(projected.intervention.revision).toBe(7);
    expect(fresh.intervention.labels).toEqual([]);
  });

  it('finds a change through the display label of its linked work item', () => {
    const change = snapshot.changes[0];
    if (!change) throw new Error('Expected the saved change fixture');
    const linked = {
      ...change,
      resource: '/api/unknown/resource',
      workItem: '/api/intervention-work-items/work',
    };

    expect(
      searchSavedChanges(
        [linked],
        { search: 'emergency pump', status: 'proposed' },
        snapshot.workItems,
      ),
    ).toEqual([linked]);
    expect(
      searchSavedChanges(
        [linked],
        { search: 'emergency pump', status: 'rejected' },
        snapshot.workItems,
      ),
    ).toEqual([]);
  });

  it('restores only queued edits for rows omitted by a fresh server response', () => {
    const fresh: InterventionWorkspaceData = { ...snapshot, workItems: [], changes: [] };
    const pending: readonly InterventionOutboxOperation[] = [
      {
        id: 'restore-work',
        interventionId: 'A',
        type: 'work-item.update',
        payload: { workItemId: 'work', status: 'completed' },
        createdAt: '2026-09-23',
      },
      {
        id: 'missing-work',
        interventionId: 'A',
        type: 'work-item.update',
        payload: { workItemId: 'unknown', status: 'completed' },
        createdAt: '2026-09-23',
      },
      {
        id: 'missing-change',
        interventionId: 'A',
        type: 'change.update',
        payload: { changeId: 'unknown', status: 'rejected' },
        createdAt: '2026-09-23',
      },
    ];

    const projected = projectInterventionWorkspace(fresh, pending, snapshot);
    expect(projected.workItems.map((item) => item.id)).toEqual(['work']);
    expect(projected.workItems[0]?.status).toBe('completed');
    expect(projected.changes).toEqual([]);
    expect(projected.intervention.completedWorkItemsCount).toBe(1);
  });

  it('leaves fresh server labels unchanged for an offline edit unrelated to labels', () => {
    const fresh: InterventionWorkspaceData = {
      ...snapshot,
      intervention: {
        ...snapshot.intervention,
        labels: [{ id: 'safety', name: 'Safety', color: '#ff0000' }],
      },
    };
    const pending: readonly InterventionOutboxOperation[] = [
      {
        id: 'create-unlinked-change',
        interventionId: 'A',
        type: 'change.create',
        payload: {
          clientId: 'unlinked',
          intervention: '/api/interventions/A',
          resource: '/api/equipment/pump',
          patch: { locationLabel: 'Rack C' },
        },
        createdAt: '2026-09-23',
      },
      {
        id: 'rename',
        interventionId: 'A',
        type: 'intervention.update',
        payload: { name: 'Revised inspection' },
        createdAt: '2026-09-23',
      },
    ];

    const projected = projectInterventionWorkspace(fresh, pending);
    expect(projected.changes[1]?.workItem).toBeNull();
    expect(projected.intervention.name).toBe('Revised inspection');
    expect(projected.intervention.labels).toEqual(fresh.intervention.labels);
  });
});
