import type { InterventionPriority } from './intervention-priority.type';
import type { InterventionStatus } from './intervention-status.type';

/**
 * Input used to patch an intervention.
 *
 * Every field is optional because the endpoint is a merge-patch: a key that is
 * absent is left alone, which is what lets a single property be written on its
 * own. `labelIds` is the exception to read carefully — it replaces the whole
 * label set rather than adding to it.
 */
export interface UpdateInterventionInput {
  readonly name?: string;
  readonly status?: InterventionStatus;
  readonly site?: string | null;
  readonly responsible?: string | null;
  readonly participants?: readonly string[];
  readonly priority?: InterventionPriority;
  readonly plannedStartAt?: Date | null;
  readonly dueAt?: Date | null;
  readonly reviewNote?: string | null;
  readonly description?: string | null;
  readonly labelIds?: readonly string[];
}
