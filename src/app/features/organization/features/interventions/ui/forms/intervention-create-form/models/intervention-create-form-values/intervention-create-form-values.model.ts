import type {
  InterventionPriority,
  InterventionType,
} from '@features/organization/features/interventions/models';

/** Values emitted when creating an intervention draft. */
export interface InterventionCreateFormValues {
  readonly name: string;
  readonly type: InterventionType;
  readonly site: string;
  readonly responsible: string;
  readonly participants: readonly string[];
  readonly priority: InterventionPriority;
  readonly plannedStartAt: Date | null;
  readonly dueAt: Date | null;
  readonly referencePack: string;
}
