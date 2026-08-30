import { computed, type Signal } from '@angular/core';
import type {
  InterventionAllowedActionsOutput,
  InterventionCapabilities,
  InterventionCapabilityDeps,
  InterventionOutput,
  InterventionPhase,
  InterventionStatus,
  InterventionTransitionCapability,
} from '@features/organization/features/interventions/models';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { resolveCommandTransitionTarget } from '../intervention-command-target/intervention-command-target.utils';
import {
  capabilityForTransition,
  resolveAllowedTransitions,
} from '../intervention-status-transition/intervention-status-transition.utils';

/**
 * Function createInterventionCapabilities
 *
 * @description
 * Builds the intervention detail workspace's capability surface as computed
 * signals over the deps the page already owns. The action gates read the
 * API's own `allowedActions` block — computed server-side by the same policy
 * that enforces each mutation, so they can never drift from what a write
 * would actually accept; only the purely presentational derivations (phase,
 * the status-menu targets, label management, QR scanning) remain client-side,
 * since the backend does not advertise them. When `allowedActions` is absent
 * — an intervention rehydrated from a pre-upgrade offline cache — every
 * server-advertised gate degrades to denied until the next sync.
 *
 * A factory rather than store computeds so it stays injector-free (the
 * workspace store and the route-provided member-access store live in
 * different injectors) and testable with bare signals.
 *
 * @access public
 * @since 5.1.0
 *
 * @param {InterventionCapabilityDeps} deps - The page-owned signals and accessors.
 *
 * @returns {InterventionCapabilities} The derived capability surface.
 */
export function createInterventionCapabilities(
  deps: InterventionCapabilityDeps,
): InterventionCapabilities {
  const actions: Signal<InterventionAllowedActionsOutput | null> =
    computed<InterventionAllowedActionsOutput | null>(
      () => deps.intervention()?.allowedActions ?? null,
    );

  const canPlan: Signal<boolean> = computed<boolean>(() =>
    deps.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN),
  );
  const canExecute: Signal<boolean> = computed<boolean>(() =>
    deps.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_EXECUTE),
  );
  const canReview: Signal<boolean> = computed<boolean>(() =>
    deps.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_REVIEW),
  );

  const phase: Signal<InterventionPhase> = computed<InterventionPhase>(() => {
    const status: InterventionStatus | undefined = deps.intervention()?.status;

    if (status === 'planned' || status === 'in_progress' || status === 'changes_requested')
      return 'execute';
    if (status === 'submitted' || status === 'published') return 'review';

    return 'prepare';
  });

  const commandTransitionTarget: Signal<InterventionStatus | null> =
    computed<InterventionStatus | null>(() => {
      const intervention = deps.intervention();

      return intervention ? resolveCommandTransitionTarget(intervention) : null;
    });

  const canSubmit: Signal<boolean> = computed<boolean>(() => actions()?.canSubmit === true);

  const hasCapability = (capability: InterventionTransitionCapability): boolean => {
    if (capability === 'plan') return canPlan();
    if (capability === 'review') return canReview();

    return canExecute();
  };

  return {
    phase,
    commandTransitionTarget,
    canPlan,
    canExecute,
    canReview,
    canPublish: computed<boolean>(() => actions()?.canPublish === true),
    canSubmit,
    canEditSchedule: computed<boolean>(() => actions()?.canEditPlanning === true),
    canEditSite: computed<boolean>(() => actions()?.canEditSite === true),
    canEditResponsible: computed<boolean>(() => actions()?.canEditResponsible === true),
    canEditDetails: computed<boolean>(() => actions()?.canEditDetails === true),
    canManageLabels: computed<boolean>(() =>
      deps.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_WRITE),
    ),
    canAssignTeam: computed<boolean>(() => actions()?.canAssignTeam === true),
    canAddWorkItem: computed<boolean>(() => actions()?.canMutateWorkItems === true),
    canSkipWorkItem: computed<boolean>(
      () => actions()?.canMutateWorkItems === true && phase() === 'execute',
    ),
    canAbandon: computed<boolean>(() => {
      const intervention: InterventionOutput | null = deps.intervention();
      if (!intervention) return false;

      return (
        resolveAllowedTransitions(intervention).includes('abandoned') &&
        hasCapability(capabilityForTransition(intervention.status, 'abandoned'))
      );
    }),
    canDeleteIntervention: computed<boolean>(() => actions()?.canDelete === true),
    transitionTargets: computed<readonly InterventionStatus[]>(() => {
      const intervention: InterventionOutput | null = deps.intervention();
      if (!intervention) return [];

      const owned: InterventionStatus | null = commandTransitionTarget();

      return resolveAllowedTransitions(intervention)
        .filter((status) => status !== 'abandoned')
        .filter((status) => status !== owned)
        .filter((status) => hasCapability(capabilityForTransition(intervention.status, status)))
        .filter(
          (status) =>
            !(intervention.status === 'submitted' && status === 'in_progress') ||
            actions()?.canWithdraw === true,
        );
    }),
    canRejectChange: computed<boolean>(() => {
      const status: InterventionStatus | undefined = deps.intervention()?.status;
      if (status === undefined) return false;
      if (status === 'submitted') return canReview();

      return (status === 'in_progress' || status === 'changes_requested') && canExecute();
    }),
    canManageAttachments: computed<boolean>(() => actions()?.canManageAttachments === true),
    canScanWorkItem: computed<boolean>(() => phase() === 'execute' && deps.scanSupported()),
    hasCapability,
  };
}
