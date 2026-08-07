import type {
  InterventionPriority,
  InterventionType,
} from '@features/organization/features/interventions/models';

/**
 * Interface InterventionCreateFormValues
 * @interface InterventionCreateFormValues
 *
 * @description
 * What the creation form emits once its rules are met.
 *
 * Only the name, the objective and the priority are required: an intervention
 * opens as a draft, and the backend asks for the rest at the planning gate.
 *
 * @since 3.0.0
 */
export interface InterventionCreateFormValues {
  /** What to call the intervention. */
  readonly name: string;

  /** What the intervention prepares. */
  readonly type: InterventionType;

  /** How urgent it is. */
  readonly priority: InterventionPriority;

  /** IRI of the site it concerns, or an empty string. */
  readonly site: string;

  /** IRI of the responsible member, or an empty string. */
  readonly responsible: string;

  /** When work should start. */
  readonly plannedStartAt: Date | null;

  /** When it is due. */
  readonly dueAt: Date | null;
}
