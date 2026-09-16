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
        assigneeProfile: { displayName: 'Marie' },
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
});
