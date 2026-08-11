/**
 * Type InspectionStatusTagKind
 *
 * @description
 * Discriminator for every inspection enum that renders as a status
 * indicator: the workflow `status` (draft/submitted/closed/cancelled), the
 * `result` (pass/fail/partial), and a non-conformity's `nonConformitySeverity`
 * (low/medium/high/critical).
 *
 * @since 1.0.0
 */
export type InspectionStatusTagKind = 'status' | 'result' | 'nonConformitySeverity';
