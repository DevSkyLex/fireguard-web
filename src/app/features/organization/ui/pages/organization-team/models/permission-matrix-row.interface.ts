import type { PermissionMatrixCell } from './permission-matrix-cell.interface';

/**
 * Interface PermissionMatrixRow
 *
 * @description
 * One resource row of the role permission matrix: the raw resource key, its
 * humanised display label and one cell per known action.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface PermissionMatrixRow {
  /** @type {string} Raw resource segment of the permission names (e.g. `roles`). */
  readonly resource: string;
  /** @type {string} Humanised resource label displayed in the first column. */
  readonly label: string;
  /** @type {readonly PermissionMatrixCell[]} One cell per known action, in column order. */
  readonly cells: readonly PermissionMatrixCell[];
}
