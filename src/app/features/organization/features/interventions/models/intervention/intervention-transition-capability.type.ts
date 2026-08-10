/**
 * Type InterventionTransitionCapability
 *
 * @description
 * The RBAC capability a workflow transition requires, mirroring the backend
 * `MutateInterventionWorkflowHandler::permission()` mapping. Consumers resolve
 * it to the matching `INTERVENTIONS_{PLAN,EXECUTE,REVIEW}` permission so the UI
 * only offers moves the server would authorize.
 *
 * @since 1.0.0
 */
export type InterventionTransitionCapability = 'plan' | 'execute' | 'review';
