import type { InterventionStatus } from '../intervention/intervention-status.type';

/**
 * Intervention status transition requested by the workspace.
 */
export interface InterventionTransitionRequest {
  readonly interventionId: string;
  readonly status: InterventionStatus;
  readonly reviewNote?: string;
}
