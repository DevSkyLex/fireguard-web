export interface UpdateFacilityInput {
  readonly name?: string;
  readonly code?: string | null;
  readonly address?: string | null;
  readonly metadata?: Readonly<Record<string, string | null>>;
}
