import type { InterventionChangeStatus } from './intervention-change-status.type';

/**
 * Input used to update a proposed intervention change.
 */
export interface UpdateInterventionChangeInput {
  readonly patch?: Readonly<Record<string, unknown>>;
  readonly status?: Extract<InterventionChangeStatus, 'proposed' | 'rejected'>;
}
