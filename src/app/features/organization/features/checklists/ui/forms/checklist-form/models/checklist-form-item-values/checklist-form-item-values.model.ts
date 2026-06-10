/**
 * Interface ChecklistFormItemValues
 * @interface ChecklistFormItemValues
 *
 * @description
 * Raw values emitted for one checklist item row.
 *
 * @since 1.0.0
 */
export interface ChecklistFormItemValues {
  readonly label: string;
  readonly description: string;
  readonly required: boolean;
}
