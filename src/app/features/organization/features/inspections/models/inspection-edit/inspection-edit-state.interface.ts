import type { InspectionEditTarget } from './inspection-edit-target.type';

/**
 * Interface InspectionEditState
 *
 * @description
 * Which in-place field is open, writing, or showing a rejection. The page
 * owns all four, so "one field open at a time" is structural and a
 * rejection is attributed to the one field that caused it.
 *
 * @since 1.0.0
 */
export interface InspectionEditState {
  readonly open: InspectionEditTarget | null;
  readonly saving: InspectionEditTarget | null;
  readonly failed: InspectionEditTarget | null;
  readonly failure: string | null;
}
