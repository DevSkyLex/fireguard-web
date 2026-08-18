/**
 * Type InspectionStatusTagKind
 *
 * @description
 * Discriminator for every inspection enum that renders as a status
 * indicator: the workflow `status` (draft/submitted/closed/cancelled), the
 * `result` (pass/fail/partial), a non-conformity's `nonConformitySeverity`
 * (low/medium/high/critical), and its `nonConformityStatus`
 * (open/in_progress/done/waived).
 *
 * @since 1.0.0
 */
export type InspectionStatusTagKind =
  | 'status'
  | 'result'
  | 'nonConformitySeverity'
  | 'nonConformityStatus';
