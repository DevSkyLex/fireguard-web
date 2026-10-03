import type { InterventionCommandAction } from '@features/organization/features/interventions/models';
import type { InterventionCommandContext } from '../../models/intervention-command-context.interface';

/**
 * Function resolveInterventionCommandAction
 *
 * @description
 * Chooses the single phase action from current access, readiness and outstanding work.
 * This projection never authorizes or executes a mutation; the page retains the operation gates.
 *
 * @access public
 *
 * @param {InterventionCommandContext} context - Current workspace state and capabilities.
 *
 * @returns {InterventionCommandAction | null} Available action and its localized unavailability
 *   reason.
 */
export function resolveInterventionCommandAction(
  context: InterventionCommandContext,
): InterventionCommandAction | null {
  if (context.status === null) return null;
  if (context.phase === 'prepare') {
    if (!context.canPlan || context.status !== 'draft') return null;
    const missing = context.readiness.filter((item) => item.id !== 'workItems' && !item.done);
    return {
      label: $localize`:@@intervention.cta.plan:Plan intervention`,
      icon: 'lucideCalendarCheck',
      disabled: missing.length > 0,
      disabledReason: missing.length === 0 ? null : missing.map((item) => item.label).join(' · '),
      loading: context.saving,
    };
  }
  if (context.phase === 'execute') {
    if (!context.canExecute) return null;
    if (context.transitionTarget === 'in_progress')
      return {
        label: $localize`:@@intervention.cta.startWork:Start field work`,
        icon: 'lucidePlay',
        disabled: false,
        disabledReason: null,
        loading: context.saving,
      };
    if (context.workItemCount === 0)
      return {
        label: $localize`:@@intervention.cta.recordWork:Record field work`,
        icon: 'lucideListChecks',
        disabled: false,
        disabledReason: null,
        loading: context.saving,
      };
    if (context.remainingWorkItems > 0)
      return {
        label:
          context.remainingWorkItems === 1
            ? $localize`:@@intervention.cta.completeOne:Complete 1 remaining item`
            : $localize`:@@intervention.cta.completeMany:Complete ${context.remainingWorkItems}:count: remaining items`,
        icon: 'lucideListChecks',
        disabled: false,
        disabledReason: null,
        loading: context.saving,
      };
    return {
      label: $localize`:@@intervention.cta.submit:Submit for review`,
      icon: 'lucideSend',
      disabled: !context.canSubmit,
      disabledReason: context.canSubmit
        ? null
        : $localize`:@@intervention.cta.submissionUnavailable:Submission is not currently available. Check your access and the intervention requirements.`,
      loading: context.saving,
    };
  }
  if (!context.canPublish || context.status !== 'submitted') return null;
  const ready: boolean = context.online && context.blockerCount === 0;
  let disabledReason: string | null = null;
  if (!context.online)
    disabledReason = $localize`:@@intervention.cta.reasonOffline:Connect to the network to publish.`;
  else if (context.blockerCount === 1)
    disabledReason = $localize`:@@intervention.cta.reasonBlockersOne:1 blocking issue to clear.`;
  else if (context.blockerCount > 1)
    disabledReason = $localize`:@@intervention.cta.reasonBlockersMany:${context.blockerCount}:count: blocking issues to clear.`;
  return {
    label: $localize`:@@intervention.cta.publish:Publish intervention`,
    icon: 'lucideCircleCheckBig',
    disabled: !ready,
    disabledReason: ready ? null : disabledReason,
    loading: context.saving || context.publishing,
  };
}
