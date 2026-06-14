/**
 * Persisted intervention resource or issue.
 */
export interface InterventionResourceRecord {
  readonly interventionId: string;
  readonly kind: string;
  readonly value: unknown;
}
