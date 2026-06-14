/**
 * Persisted mission resource or issue.
 */
export interface MissionResourceRecord {
  readonly missionId: string;
  readonly kind: string;
  readonly value: unknown;
}
