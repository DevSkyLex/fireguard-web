import type { InterventionEditTarget } from './intervention-edit-target.type';

/**
 * Which in-place field is open, writing, or showing a rejection.
 *
 * The page owns all four, so "one field open at a time" is structural, a
 * readiness item can open an editor it does not contain, and the store's single
 * shared mutation flag can be attributed to the one field that caused it.
 */
export interface InterventionEditState {
  readonly open: InterventionEditTarget | null;
  readonly saving: InterventionEditTarget | null;
  readonly failed: InterventionEditTarget | null;
  readonly failure: string | null;
}
