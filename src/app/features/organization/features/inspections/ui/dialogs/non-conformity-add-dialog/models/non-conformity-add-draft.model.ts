import type { NonConformitySeverity } from '@features/organization/features/inspections/models';

/**
 * Interface NonConformityAddDraft
 * @interface NonConformityAddDraft
 *
 * @description
 * The Signal Forms model this dialog edits. `description` and `severity`
 * start blank so the required rules have something to reject; `dueAt` and
 * `notes` stay optional, mirroring `AddNonConformityInput`.
 *
 * @since 1.0.0
 */
export interface NonConformityAddDraft {
  /** What was found, or an empty string until typed. */
  readonly description: string;

  /** How urgent the finding is, or an empty string until one is picked. */
  readonly severity: NonConformitySeverity | '';

  /** When the finding must be resolved by, or `null` for no deadline. */
  readonly dueAt: Date | null;

  /** Free-form context for the finding. */
  readonly notes: string;
}
