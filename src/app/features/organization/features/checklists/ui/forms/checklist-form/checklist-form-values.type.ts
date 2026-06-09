/** Raw values emitted for one checklist item row. */
export interface ChecklistFormItemValues {
  readonly label: string;
  readonly description: string;
  readonly required: boolean;
}

/** Raw values emitted by the checklist creation form. */
export interface ChecklistFormValues {
  readonly name: string;
  readonly version: string;
  readonly items: ReadonlyArray<ChecklistFormItemValues>;
}
