/**
 * Input used to create a proposed mission change.
 */
export interface CreateMissionChangeInput {
  readonly clientId?: string;
  readonly mission: string;
  readonly workItem?: string | null;
  readonly resource: string;
  readonly patch: Readonly<Record<string, unknown>>;
}
