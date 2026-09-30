/**
 * Interface ChecklistItemDraft
 * @interface
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
  /**
   * Property label
   * @readonly
   *
   * @description
   * Provides the text displayed to identify this checklist item.
   *
   * @access public
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property description
   * @readonly
   *
   * @description
   * Provides descriptive text entered for this record.
   *
   * @access public
   *
   * @type {string}
   */
  readonly description: string;

  /**
   * Property required
   * @readonly
   *
   * @description
   * Indicates whether completing this checklist item is required.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly required: boolean;
}
