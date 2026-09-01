import type { FacilityType } from '@features/organization/features/facilities/models';

/**
 * Type FacilityCreateFormDraft
 *
 * @description
 * The create form's own field shape: every value a plain string (or the
 * empty string standing in for "not chosen yet") so Signal Forms has
 * something to bind, converted to `CreateFacilityInput` on submit.
 *
 * @since 1.0.0
 */
export interface FacilityCreateFormDraft {
  readonly type: FacilityType | '';
  readonly name: string;
  readonly parentFacilityId: string;
  readonly code: string;
  readonly address: string;
  readonly latitude: string;
  readonly longitude: string;
  readonly levelIndex: string;
}
