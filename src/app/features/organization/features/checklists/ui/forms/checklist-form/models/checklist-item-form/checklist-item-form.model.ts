import type { FormControl, FormGroup } from '@angular/forms';

/**
 * Type ChecklistItemForm
 * @type {ChecklistItemForm}
 *
 * @description
 * Strictly typed controls for one checklist item row.
 *
 * @since 1.0.0
 */
export type ChecklistItemForm = FormGroup<{
  label: FormControl<string>;
  description: FormControl<string>;
  required: FormControl<boolean>;
}>;
