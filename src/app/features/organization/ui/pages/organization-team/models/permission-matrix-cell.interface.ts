/**
 * Interface PermissionMatrixCell
 *
 * @description
 * One action column cell of the role permission matrix: the action name and
 * whether the viewed role is granted it, denied it, or the permission does not
 * exist for the row's resource.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface PermissionMatrixCell {
  /** @type {string} Action segment of the permission name (e.g. `read`). */
  readonly action: string;
  /** @type {'granted' | 'denied' | 'absent'} Grant state for the viewed role. */
  readonly state: 'granted' | 'denied' | 'absent';
}
