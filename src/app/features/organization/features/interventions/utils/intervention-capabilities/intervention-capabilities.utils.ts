import { computed, type Signal } from '@angular/core';
import type {
  InterventionCapabilities,
  InterventionCapabilityDeps,
  InterventionOutput,
  InterventionPhase,
  InterventionStatus,
  InterventionTransitionCapability,
} from '@features/organization/features/interventions/models';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { isInterventionDeletable } from '../intervention-deletable/intervention-deletable.utils';
import {
  capabilityForTransition,
  resolveAllowedTransitions,
} from '../intervention-status-transition/intervention-status-transition.utils';

/**
 * Function createInterventionCapabilities
 *
 * @description
 * Builds the intervention detail workspace's capability surface — phase,
 * permission gates, the replanning mutability matrix and the status-menu
 * targets — as computed signals over the deps the page already owns. A
 * factory rather than store computeds so it stays injector-free (the
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
  const canPlan: Signal<boolean> = computed<boolean>(() =>
    deps.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN),
  );
  const canExecute: Signal<boolean> = computed<boolean>(() =>
    deps.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_EXECUTE),
  );
  const canReview: Signal<boolean> = computed<boolean>(() =>
    deps.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_REVIEW),
  );
  const canPublish: Signal<boolean> = computed<boolean>(() =>
    deps.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_PUBLISH),
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
      const current: InterventionPhase = phase();

      if (current === 'prepare') return 'planned';
      if (current === 'execute') return 'submitted';

      return null;
    });

  const canSubmit: Signal<boolean> = computed<boolean>(() => {
    const responsible: string | null = deps.intervention()?.responsible ?? null;
    const memberId: string | undefined = deps.memberId();

    return (
      responsible !== null &&
      memberId !== undefined &&
      responsible === `/api/organizations/${deps.organizationId()}/members/${memberId}`
    );
  });

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
    canPublish,
    canSubmit,
    canEditSchedule: computed<boolean>(() => {
      const status: InterventionStatus | undefined = deps.intervention()?.status;

      return (
        canPlan() &&
        (status === 'draft' ||
          status === 'planned' ||
          status === 'in_progress' ||
          status === 'changes_requested')
      );
    }),
    canEditSite: computed<boolean>(() => canPlan() && deps.intervention()?.status === 'draft'),
    canEditResponsible: computed<boolean>(() => {
      const status: InterventionStatus | undefined = deps.intervention()?.status;

      return canPlan() && (status === 'draft' || status === 'planned');
    }),
    canEditDetails: computed<boolean>(() => {
      const status: InterventionStatus | undefined = deps.intervention()?.status;

      return canPlan() && status !== undefined && status !== 'published' && status !== 'abandoned';
    }),
    canManageLabels: computed<boolean>(() =>
      deps.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_WRITE),
    ),
    canAssignTeam: computed<boolean>(() => {
      const status: InterventionStatus | undefined = deps.intervention()?.status;

      return (
        canPlan() &&
        (status === 'draft' ||
          status === 'planned' ||
          status === 'in_progress' ||
          status === 'changes_requested')
      );
    }),
    canAddWorkItem: computed<boolean>(() => canPlan() && deps.intervention()?.status === 'draft'),
    canSkipWorkItem: computed<boolean>(() => canExecute() && phase() === 'execute'),
    canAbandon: computed<boolean>(() => {
      const intervention: InterventionOutput | null = deps.intervention();
      if (!intervention) return false;

      return (
        resolveAllowedTransitions(intervention).includes('abandoned') &&
        hasCapability(capabilityForTransition(intervention.status, 'abandoned'))
      );
    }),
    canDeleteIntervention: computed<boolean>(() => {
      const intervention: InterventionOutput | null = deps.intervention();
      if (!intervention || !isInterventionDeletable(intervention)) return false;

      return intervention.status === 'draft' ? canPlan() : canExecute();
    }),
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
            !(intervention.status === 'submitted' && status === 'in_progress') || canSubmit(),
        );
    }),
    canRejectChange: computed<boolean>(() => {
      const status: InterventionStatus | undefined = deps.intervention()?.status;
      if (status === undefined) return false;
      if (status === 'submitted') return canReview();

      return (status === 'in_progress' || status === 'changes_requested') && canExecute();
    }),
    canManageAttachments: computed<boolean>(() => {
      const status: InterventionStatus | undefined = deps.intervention()?.status;
      if (status === undefined) return false;
      if (status === 'submitted' || status === 'published' || status === 'abandoned') return false;

      return status === 'draft' ? canPlan() : canExecute();
    }),
    canScanWorkItem: computed<boolean>(() => phase() === 'execute' && deps.scanSupported()),
    hasCapability,
  };
}
