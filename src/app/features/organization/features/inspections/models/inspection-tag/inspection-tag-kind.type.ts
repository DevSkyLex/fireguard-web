/**
 * Discriminator for every inspection-owned enum that renders as a status
 * indicator (badge or select option): inspection status/result plus the
 * non-conformity severity/status families the inspection feature owns.
 */
export type InspectionTagKind =
  | 'status'
  | 'result'
  | 'nonConformitySeverity'
  | 'nonConformityStatus';
