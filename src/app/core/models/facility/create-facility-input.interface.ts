import type { FacilityType } from './facility-output.interface';

export interface CreateFacilityInput {
  readonly type: FacilityType;
  readonly name: string;
  readonly parentFacilityId?: string | null;
  readonly code?: string | null;
  readonly address?: string | null;
  readonly metadata?: Readonly<Record<string, string | null>>;
}
