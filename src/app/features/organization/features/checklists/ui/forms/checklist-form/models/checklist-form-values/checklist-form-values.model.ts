import type { ChecklistFormItemValues } from '../checklist-form-item-values';

/**
 * Interface ChecklistFormValues
 * @interface ChecklistFormValues
 *
 * @description
 * Raw values emitted by the checklist creation form.
 *
 * @since 1.0.0
 */
export interface ChecklistFormValues {
  readonly name: string;
  readonly version: string;
  readonly items: ReadonlyArray<ChecklistFormItemValues>;
}
