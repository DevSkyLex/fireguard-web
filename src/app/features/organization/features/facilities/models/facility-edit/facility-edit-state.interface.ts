import type { FacilityEditTarget } from './facility-edit-target.type';

/**
 * Interface FacilityEditState
 *
 * @description
 * Which in-place field is open, writing, or showing a rejection. The page
 * owns all four, so "one field open at a time" is structural and a rejection
 * is attributed to the one field that caused it.
 *
 * @since 1.0.0
 */
export interface FacilityEditState {
  readonly open: FacilityEditTarget | null;
  readonly saving: FacilityEditTarget | null;
  readonly failed: FacilityEditTarget | null;
  readonly failure: string | null;
}
