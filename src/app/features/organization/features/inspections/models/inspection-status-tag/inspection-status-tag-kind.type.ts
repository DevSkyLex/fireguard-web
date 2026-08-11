/**
 * Type InspectionStatusTagKind
 *
 * @description
 * Discriminator for every inspection enum that renders as a status
 * indicator: the workflow `status` (draft/submitted/closed/cancelled) and
 * the `result` (pass/fail/partial).
 *
 * @since 1.0.0
 */
export type InspectionStatusTagKind = 'status' | 'result';
