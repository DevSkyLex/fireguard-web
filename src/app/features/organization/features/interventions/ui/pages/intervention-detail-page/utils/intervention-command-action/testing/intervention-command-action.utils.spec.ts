import type { InterventionCommandContext } from '../../../models/intervention-command-context.interface';
import { resolveInterventionCommandAction } from '../intervention-command-action.utils';

/**
 * Function commandContext
 *
 * @description
 * Builds an entitled workspace snapshot, letting each test change the decision under examination.
 *
 * @access private
 *
 * @param {Partial<InterventionCommandContext>} overrides - State overrides for the scenario.
 *
 * @returns {InterventionCommandContext} Complete immutable action inputs.
 */
function commandContext(
  overrides: Partial<InterventionCommandContext> = {},
): InterventionCommandContext {
  return {
    phase: 'prepare',
    status: 'draft',
    canPlan: true,
    canExecute: true,
    canSubmit: true,
    canPublish: true,
    readiness: [],
    transitionTarget: null,
    workItemCount: 0,
    remainingWorkItems: 0,
    blockerCount: 0,
    online: true,
    saving: false,
    publishing: false,
    ...overrides,
  };
}

describe('resolveInterventionCommandAction', () => {
  it.each(['prepare', 'execute', 'review'] as const)(
    'offers no %s action while the intervention is unavailable',
    (phase) => {
      expect(resolveInterventionCommandAction(commandContext({ phase, status: null }))).toBeNull();
    },
  );

  it.each([{ canPlan: false }, { status: 'planned' as const }])(
    'requires both draft status and planning permission: %o',
    (overrides) => {
      expect(resolveInterventionCommandAction(commandContext(overrides))).toBeNull();
    },
  );

  it('reports missing planning prerequisites in checklist order, ignoring optional work items', () => {
    const readiness = Object.freeze([
      { id: 'site', target: 'site' as const, label: 'Select a site', done: false },
      { id: 'workItems', target: 'workItems' as const, label: 'Add work items', done: false },
      { id: 'due', target: 'schedule' as const, label: 'Set a due date', done: false },
    ]);
    expect(resolveInterventionCommandAction(commandContext({ readiness }))).toMatchObject({
      disabled: true,
      disabledReason: 'Select a site · Set a due date',
    });
    expect(readiness).toHaveLength(3);
  });

  it('permits planning with no required prerequisite missing, even without tasks', () => {
    expect(
      resolveInterventionCommandAction(
        commandContext({
          readiness: [
            { id: 'workItems', target: 'workItems', label: 'Add work items', done: false },
          ],
        }),
      ),
    ).toEqual({
      label: 'Plan intervention',
      icon: 'lucideCalendarCheck',
      disabled: false,
      disabledReason: null,
      loading: false,
    });
  });

  it.each([
    { transitionTarget: 'in_progress' as const, workItemCount: 0, remainingWorkItems: 2 },
    { transitionTarget: null, workItemCount: 0, remainingWorkItems: 0 },
    { transitionTarget: null, workItemCount: 3, remainingWorkItems: 2 },
    { transitionTarget: null, workItemCount: 3, remainingWorkItems: 0 },
  ])('hides every execution action when the member cannot execute: %o', (work) => {
    expect(
      resolveInterventionCommandAction(
        commandContext({
          phase: 'execute',
          status: 'planned',
          canExecute: false,
          ...work,
        }),
      ),
    ).toBeNull();
  });

  it('prioritizes starting work over empty or unfinished tasks', () => {
    expect(
      resolveInterventionCommandAction(
        commandContext({
          phase: 'execute',
          status: 'planned',
          transitionTarget: 'in_progress',
          remainingWorkItems: 2,
        }),
      ),
    ).toEqual({
      label: 'Start field work',
      icon: 'lucidePlay',
      disabled: false,
      disabledReason: null,
      loading: false,
    });
  });

  it('offers recording before submission when no work exists', () => {
    expect(
      resolveInterventionCommandAction(
        commandContext({
          phase: 'execute',
          status: 'in_progress',
          canSubmit: false,
          remainingWorkItems: 2,
        }),
      ),
    ).toEqual({
      label: 'Record field work',
      icon: 'lucideListChecks',
      disabled: false,
      disabledReason: null,
      loading: false,
    });
  });

  it.each([1, 3])(
    'guides the operator to the %s remaining tasks before submission',
    (remainingWorkItems) => {
      expect(
        resolveInterventionCommandAction(
          commandContext({
            phase: 'execute',
            status: 'in_progress',
            workItemCount: 3,
            remainingWorkItems,
            canSubmit: false,
          }),
        ),
      ).toMatchObject({
        label:
          remainingWorkItems === 1 ? 'Complete 1 remaining item' : 'Complete 3 remaining items',
        disabled: false,
      });
    },
  );

  it.each([true, false])(
    'reflects current submission capabilities after work is complete: %s',
    (canSubmit) => {
      const action = resolveInterventionCommandAction(
        commandContext({ phase: 'execute', status: 'in_progress', workItemCount: 1, canSubmit }),
      );
      expect(action).toMatchObject({ label: 'Submit for review', disabled: !canSubmit });
      expect(action?.disabledReason).toBe(
        canSubmit
          ? null
          : 'Submission is not currently available. Check your access and the intervention requirements.',
      );
    },
  );

  it.each([
    { canPublish: false, status: 'submitted' as const },
    { canPublish: true, status: 'published' as const },
    { canPublish: true, status: 'abandoned' as const },
  ])('requires publication access and submitted status: %o', (overrides) => {
    expect(
      resolveInterventionCommandAction(commandContext({ phase: 'review', ...overrides })),
    ).toBeNull();
  });

  it.each([
    [false, 2, 'Connect to the network to publish.'],
    [true, 1, '1 blocking issue to clear.'],
    [true, 3, '3 blocking issues to clear.'],
    [true, 0, null],
  ] as const)(
    'resolves publication connectivity %s and blockers %s',
    (online, blockerCount, reason) => {
      expect(
        resolveInterventionCommandAction(
          commandContext({ phase: 'review', status: 'submitted', online, blockerCount }),
        ),
      ).toMatchObject({
        label: 'Publish intervention',
        disabled: !online || blockerCount !== 0,
        disabledReason: reason,
      });
    },
  );

  it.each([
    { phase: 'prepare' as const, status: 'draft' as const, saving: true, publishing: false },
    { phase: 'execute' as const, status: 'in_progress' as const, saving: true, publishing: false },
    { phase: 'review' as const, status: 'submitted' as const, saving: true, publishing: false },
    { phase: 'review' as const, status: 'submitted' as const, saving: false, publishing: true },
  ])('retains the applicable operation spinner: %o', (overrides) => {
    expect(resolveInterventionCommandAction(commandContext(overrides))?.loading).toBe(true);
  });

  it.each(['prepare', 'execute'] as const)(
    'does not use a publication spinner for the %s phase',
    (phase) => {
      expect(
        resolveInterventionCommandAction(commandContext({ phase, publishing: true }))?.loading,
      ).toBe(false);
    },
  );
});
