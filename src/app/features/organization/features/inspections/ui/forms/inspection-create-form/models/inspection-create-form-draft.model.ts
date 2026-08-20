import type {
  InspectionResult,
  InspectorType,
} from '@features/organization/features/inspections/models';

/**
 * Interface InspectionCreateFormDraft
 * @interface InspectionCreateFormDraft
 *
 * @description
 * The Signal Forms model this form actually edits. `equipmentId`,
 * `result` and `performedAt` start blank/null so the required rules have
 * something to reject; `inspectorType` defaults to `'user'`, the common
 * case, and never needs its own required rule. `checklistId` is optional
 * and starts blank — an empty string means "no checklist", never a rule
 * violation.
 *
 * @since 1.0.0
 */
export interface InspectionCreateFormDraft {
  /** The inspected equipment's id, or an empty string until one is picked. */
  readonly equipmentId: string;

  /** The inspection's outcome, or an empty string until one is picked. */
  readonly result: InspectionResult | '';

  /** The date the inspection was carried out, or `null` until picked. */
  readonly performedAt: Date | null;

  /** Whether the inspector is a team member or an external party. */
  readonly inspectorType: InspectorType;

  /** The inspector's name. */
  readonly inspectorName: string;

  /** The picked checklist template's id, or an empty string for "no checklist". */
  readonly checklistId: string;
}
