import type { InterventionReadinessTarget } from './intervention-readiness-target.type';

/**
 * One prerequisite on the way to the next phase, and where to go to satisfy it.
 *
 * The label is already localized by the page, so the checklist renders it
 * without knowing which phase produced it.
 */
export interface InterventionReadinessItem {
  readonly id: string;
  readonly label: string;
  readonly done: boolean;
  readonly target: InterventionReadinessTarget;
}
