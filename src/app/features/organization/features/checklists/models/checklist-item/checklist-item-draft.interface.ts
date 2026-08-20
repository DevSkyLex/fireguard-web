/**
 * Interface ChecklistItemDraft
 *
 * @description
 * One staged checklist item row, shared by `ChecklistCreateForm` and
 * `ChecklistEditForm`, before it is emitted as a `ChecklistItemInput`.
 * `position` is the row's index in the staged list, assigned at submit
 * time rather than kept here, so reordering never needs to renumber
 * anything but the array itself.
 *
 * @since 1.0.0
 */
export interface ChecklistItemDraft {
  readonly label: string;
  readonly description: string;
  readonly required: boolean;
}
